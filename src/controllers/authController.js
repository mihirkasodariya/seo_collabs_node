import {
    authValidation,
    authModel,
    loginValidation,
    idValidation,
} from "../models/authModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";
import { generateJWToken, increaseOtpAttempt, resetOtpAttempts } from "../middleware/auth.js";
// import { hash, compare } from "bcrypt";
import sendMail from "../../config/mailer/index.js";
import { emailValidation, otpModel, verifyOtpValidation } from "../models/otpModel.js";
import { encrypt, decrypt } from "../utils/secureCipher.js";
import { websiteModel } from "../models/websiteModel.js";
import { userExchangeModel } from "../models/userExchangeModel.js";
import { messageModel } from "../models/chatModel.js"
import mongoose from "mongoose";

export async function register(req, res) {
    const { name, email, password, country, referralCode } = req.body;
    const { error } = authValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const userExists = await authModel.findOne({ email });
        if (userExists?.email && userExists?.isVerified === true) {
            return response.error(res, resStatusCode.CONFLICT, resMessage.USER_FOUND, {});
        };
        let encryptPassword = await encrypt(password, function (pass) {
            return pass;
        });
        console.log('encryptPassword', encryptPassword)
        if (userExists?._id) {
            await otpModel.deleteMany({ userId: userExists._id });
        }

        let createNewUser
        if (!userExists?.email && userExists?.isVerified !== false) {
            if (userExists?.email && userExists?.isVerified === true) {
                return response.error(res, resStatusCode.CONFLICT, resMessage.USER_FOUND, {});
            };
            let referredBy = null;

            if (referralCode) {
                const referrer = await authModel.findById({ _id: referralCode });
                if (referrer) {
                    referredBy = referrer._id;
                };
            };
            createNewUser = await authModel.create({
                name,
                email,
                password: encryptPassword,
                country,
                referredBy,
            });
        } else {
            await authModel.updateOne(
                { email },
                { name, password: encryptPassword, country }
            );

            createNewUser = await authModel.findOne({ email });
        };
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpires = Date.now() + 10 * 60 * 1000;

        await otpModel.create({
            userId: createNewUser._id,
            otp,
            otpExpires,
        });

        await sendMail("verify_otp", "SEO Collabs: Your Verification OTP", email, {
            fullName: name,
            email: email,
            otp: otp,
        });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.USER_REGISTER, { _id: createNewUser._id });
    } catch (error) {
        console.error('Error in register:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function verifyOtp(req, res) {
    const { error } = verifyOtpValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    const { email, otp } = req.body;
    try {
        const user = await authModel.findOne({ email });

        if (!user) {
            return response.error(res, resStatusCode.FORBIDDEN, resMessage.USER_NOT_FOUND, {});
        };
        const otpRecord = await otpModel.findOne({ userId: user._id }).sort({ createdAt: -1 });
        if (!otpRecord) {
            return response.error(res, resStatusCode.UNAUTHORISED, resMessage.RETRY_OTP, {});
        };
        if (otpRecord.otp.toString() !== otp.toString()) {

            const blockTime = increaseOtpAttempt(email);

            if (blockTime) {
                const remainingMs = blockTime - Date.now();
                const remainingSec = Math.ceil(remainingMs / 1000);

                let timeMsg = "";
                if (remainingSec < 60) {
                    timeMsg = `${remainingSec} seconds`;
                } else {
                    const minutes = Math.ceil(remainingSec / 60);
                    timeMsg = `${minutes} minute${minutes > 1 ? "s" : ""}`;
                };
                return response.error(res, resStatusCode.TOO_MANY_REQUESTS, `Too many wrong attempts. Try again after ${timeMsg}.`, {});
            };
            return response.error(res, resStatusCode.UNAUTHORISED, resMessage.INVALID_OTP, {});
        };
        if (otpRecord.otpExpires < Date.now()) {
            return response.error(res, resStatusCode.UNAUTHORISED, resMessage.EXPIRED_OTP, {});
        };
        resetOtpAttempts(email);

        await authModel.findByIdAndUpdate(user._id, { isVerified: true });
        await authModel.findByIdAndUpdate(
            user.referredBy,
            {
                $inc: {
                    "referralStats.total": 1,
                    "referralStats.pending": 1
                }
            }
        );
        await otpModel.deleteMany({ userId: user._id });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.EMAIL_VERIFIED_SUCCESSFULLY, {});
    } catch (error) {
        console.error("OTP Verify Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function resendOtp(req, res) {
    const { email } = req.body;

    const { error } = emailValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const user = await authModel.findOne({ email });

        if (!user) {
            return response.error(res, resStatusCode.FORBIDDEN, resMessage.USER_NOT_FOUND, {});
        };
        if (user.isVerified) {
            return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.OTP_ALREDY_USE, {});
        };
        const otp = Math.floor(100000 + Math.random() * 900000);
        const otpExpires = Date.now() + 10 * 60 * 1000;

        await otpModel.deleteMany({ userId: user._id });

        await otpModel.create({ userId: user._id, otp, otpExpires, });

        await sendMail("verify_otp", "SEO Collabe: New Verification OTP", email, {
            fullName: user.name,
            email,
            otp,
        });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.OTP_SEND, {});
    } catch (error) {
        console.error("Resend OTP Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function login(req, res) {
    const { email, password } = req.body;
    const { error } = loginValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        console.log(email)
        const user = await authModel.findOne({ email, isActive: true });
        console.log('user', user)
        if (user) {

            if (user?.isVerified === true) {
                await decrypt(user?.password, async (responsePassword) => {
                    if (password === responsePassword) {
                        const token = await generateJWToken({ _id: user._id });
                        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.LOGIN_SUCCESS, { _id: user._id, token: token });
                    } else {
                        return response.error(res, resStatusCode.UNAUTHORISED, resMessage.INCORRECT_PASSWORD, {});
                    };
                });
            } else {
                return response.error(res, resStatusCode.FORBIDDEN, resMessage.OTP_VERIFICATION_NOT_COMPLETED, {});
            };
        } else {
            return response.error(res, resStatusCode.FORBIDDEN, resMessage.USER_NOT_FOUND, {});
        };

    } catch (error) {
        console.error('Error in login:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getProfile(req, res) {
    try {
        const userId = req.user._id;
        console.log('userId', userId)
        const user = await authModel.findOne({ _id: userId }).select('-password');
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.LOGIN_SUCCESS, user);
    } catch (error) {
        console.error('Error in login:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getUsersList(req, res) {
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        page = page < 1 ? 1 : page;
        limit = limit < 1 ? 10 : limit;

        const skip = (page - 1) * limit;
        const totalUsers = await authModel.countDocuments();

        const users = await authModel.find().select("-password").skip(skip).limit(limit).sort({ createdAt: -1 });

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.ACTION_COMPLETE, {
            records: users,
            pagination: {
                page,
                limit,
                totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
            },
        });

    } catch (error) {
        console.error("Error in getUsersList:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
}


export async function getActiveUsersList(req, res) {
    try {
        let page = parseInt(req.query.page) || 1;
        let limit = parseInt(req.query.limit) || 10;
        let search = req.query.search ? req.query.search.trim() : "";
        let userType = req.query.userType || "";
        let selectedCountry = req.query.selectedCountry || "";
        page = page < 1 ? 1 : page;
        limit = limit < 1 ? 10 : limit;
        const skip = (page - 1) * limit;
        let filter = { isActive: true };

        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        if (userType === "premium") {
            filter.isSubscription = true
        }
        if (userType === "normal") {
            filter.isSubscription = false
        }
        if (selectedCountry) {
            filter.country = selectedCountry;
        }
        const reqUserId = req.user._id;

        const totalUsers = await authModel.countDocuments({ ...filter, _id: { $ne: reqUserId } });

        const users = await authModel.find({ ...filter, _id: { $ne: reqUserId } }).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 });
        const updatedUsers = await Promise.all(
            users.map(async (user) => {

                const completedTasks = await userExchangeModel.aggregate([
                    {
                        $match: {
                            status: "completed",
                            isActive: true,
                        },
                    },
                    {
                        $group: {
                            _id: "$taskId",
                            records: { $push: "$$ROOT" },
                            count: { $sum: 1 },
                        },
                    },
                    {
                        $match: {
                            count: 2,
                        },
                    },
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $gt: [
                                            {
                                                $size: {
                                                    $filter: {
                                                        input: "$records",
                                                        as: "r",
                                                        cond: { $eq: ["$$r.userId", user._id] },
                                                    },
                                                },
                                            },
                                            0,
                                        ],
                                    },
                                    {
                                        $gt: [
                                            {
                                                $size: {
                                                    $filter: {
                                                        input: "$records",
                                                        as: "r",
                                                        cond: { $eq: ["$$r.ownerId", user._id] },
                                                    },
                                                },
                                            },
                                            0,
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                ]);

                const completedExchangeCount = completedTasks.length;

                const totalWebCount = await websiteModel.countDocuments({
                    userId: user._id,
                    isActive: true,
                    isLinkExchange: true,
                });

                return {
                    ...user.toObject(),
                    websiteCount: totalWebCount,
                    completedExchangeCount,
                };
            })
        );

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.ACTION_COMPLETE, {
            records: updatedUsers,
            pagination: {
                page,
                limit,
                totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
            },
        });

    } catch (error) {
        console.error("Error in getUsersList:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
}

export async function getUserById(req, res) {
    const { userId } = req.params;
    const { error } = idValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        console.log('userId', userId)
        const user = await authModel.findOne({ _id: userId }).select('-password');
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.LOGIN_SUCCESS, user);
    } catch (error) {
        console.error('Error in login:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};


export async function getNetworkUserById(req, res) {
    try {
        const { ownerId, userId } = req.params;
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
        const pageWeb = parseInt(req.query.pageWeb) || 1;
        const limitWeb = parseInt(req.query.limitWeb) || 10;

        const pageEx = parseInt(req.query.pageEx) || 1;
        const limitEx = parseInt(req.query.limitEx) || 10;

        const skipWeb = (pageWeb - 1) * limitWeb;
        const skipEx = (pageEx - 1) * limitEx;

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const reqUser = req.user._id
        const [user, allWebsites, allExchanges, chats] = await Promise.all([
            authModel.findOne({ _id: userObjectId }).select("-password"),

            websiteModel.find({ userId: userObjectId, _id: { $ne: reqUser } }),

            userExchangeModel.find({
                isActive: true,
                $or: [
                    { userId: userObjectId, ownerId: ownerObjectId },
                    { userId: ownerObjectId, ownerId: userObjectId }
                ]
            }),

            messageModel.find({
                $or: [
                    { senderId: ownerObjectId, receiverId: userObjectId },
                    { senderId: userObjectId, receiverId: ownerObjectId }
                ],
                createdAt: { $gte: oneWeekAgo }
            }).sort({ createdAt: 1 })
        ]);

        const [webList, webTotal, exchangesWorks, exTotal] = await Promise.all([
            websiteModel
                .find({ userId: userObjectId, isLinkExchange: true })
                .skip(skipWeb)
                .limit(limitWeb),

            websiteModel.countDocuments({ userId: userObjectId, isLinkExchange: true }),

            userExchangeModel
                .find({
                    isActive: true,
                    status: "completed",
                    ownerId: ownerObjectId,
                    userId: userObjectId
                })
                .skip(skipEx)
                .limit(limitEx),

            userExchangeModel.countDocuments({
                isActive: true,
                status: "completed",
                ownerId: ownerObjectId,
                userId: userObjectId
            }),
        ]);

        const completedTasks = await userExchangeModel.aggregate([
            {
                $match: {
                    status: "completed",
                    isActive: true
                }
            },
            {
                $group: {
                    _id: "$taskId",
                    records: { $push: "$$ROOT" },
                    count: { $sum: 1 }
                }
            },
            {
                $match: { count: 2 }
            },
            {
                $match: {
                    $expr: {
                        $and: [
                            { $in: [userObjectId, "$records.userId"] },
                            { $in: [userObjectId, "$records.ownerId"] },
                            { $in: [ownerObjectId, "$records.userId"] },
                            { $in: [ownerObjectId, "$records.ownerId"] }
                        ]
                    }
                }
            }
        ]);

        const completedTaskCount = completedTasks.length;

        let sentByYou = 0, repliedByOpponent = 0;

        chats.forEach(msg => {
            if (msg.senderId.toString() === ownerId) sentByYou++;
            if (msg.senderId.toString() === userId) repliedByOpponent++;
        });

        let normalRate = sentByYou > 0
            ? Math.round((repliedByOpponent / sentByYou) * 100)
            : 0;

        let totalResponseTime = 0;
        let responseCount = 0;
        let weightedPointsTotal = 0;
        let totalRequests = 0;

        for (let i = 0; i < chats.length - 1; i++) {
            const a = chats[i];
            const b = chats[i + 1];

            if (
                a.senderId.toString() === ownerId &&
                b.senderId.toString() === userId
            ) {
                const diffMs = new Date(b.createdAt) - new Date(a.createdAt);
                const diffHours = diffMs / 3600000;

                totalResponseTime += diffMs;
                responseCount++;
                totalRequests++;

                let points = 0;
                if (diffHours <= 12) points = 1.0;
                else if (diffHours <= 24) points = 0.9;
                else if (diffHours <= 48) points = 0.8;
                else if (diffHours <= 72) points = 0.7;
                else if (diffHours <= 96) points = 0.6;
                else points = 0.4;

                weightedPointsTotal += points;
            }
        }

        const noResponse = sentByYou - responseCount;
        if (noResponse > 0) totalRequests += noResponse;

        let weightedRate = totalRequests > 0
            ? Math.round((weightedPointsTotal / totalRequests) * 100)
            : 0;

        let finalResponseRate = Math.round((normalRate + weightedRate * 2) / 3);
        finalResponseRate = Math.min(100, Math.max(0, finalResponseRate));

        let avgResponseTime = responseCount > 0
            ? Math.round(totalResponseTime / responseCount / 3600000)
            : 0;

        const totalTasks = new Set(allExchanges.map(e => e.taskId)).size;

        const collabScore = totalTasks > 0
            ? Math.round((completedTaskCount / totalTasks) * 100)
            : 0;

        const responseRateScore = finalResponseRate;

        let resSpeed = 0;
        if (avgResponseTime <= 6) resSpeed = 100;
        else if (avgResponseTime <= 12) resSpeed = 90;
        else if (avgResponseTime <= 24) resSpeed = 80;
        else if (avgResponseTime <= 48) resSpeed = 60;
        else resSpeed = 40;

        const accountAgeDays = Math.floor(
            (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
        );

        let ageScore = 0;
        if (accountAgeDays <= 30) ageScore = 40;
        else if (accountAgeDays <= 90) ageScore = 60;
        else if (accountAgeDays <= 180) ageScore = 80;
        else ageScore = 100;

        const trustScore =
            collabScore * 0.40 +
            responseRateScore * 0.30 +
            resSpeed * 0.20 +
            ageScore * 0.10;

        const finalTrustScore = Math.round(trustScore);

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            "User details fetched successfully",
            {
                user,
                webList,
                webPagination: {
                    page: pageWeb,
                    limit: limitWeb,
                    total: webTotal,
                    totalPages: Math.ceil(webTotal / limitWeb)
                },

                exchangesWorks,
                exchangePagination: {
                    page: pageEx,
                    limit: limitEx,
                    total: exTotal,
                    totalPages: Math.ceil(exTotal / limitEx)
                },


                completedTaskCount,

                resRate: `${finalResponseRate}%`,
                avgResTime: `${avgResponseTime} hours`,
                trustScore: `${finalTrustScore}%`
            }
        );

    } catch (error) {
        console.error("Error:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}


export const updateUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = {
            name: req.body.name,
            email: req.body.email,
            bio: req.body.bio,
            img: req.body.img,
            role: Number(req.body.role),
            isVerified: req.body.isVerified === "true",
            isActive: req.body.isActive === "true",
        };

        Object.keys(updateData).forEach(
            (key) => updateData[key] === undefined && delete updateData[key]
        );

        const updatedUser = await authModel.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            "User updated successfully",
            updatedUser
        );

    } catch (error) {
        console.log(error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            "Internal Server Error"
        );
    }
};


export const updateProfile = async (req, res) => {
    const _id = req.user._id;
    const updateData = req.body;
    try {
        await authModel.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.ACTION_COMPLETE, {});
    } catch (error) {
        console.error('Error in updateBlogById:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function adminLogin(req, res) {
    const { email, password } = req.body;
    const { error } = loginValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const user = await authModel.findOne({ email, isActive: true });
        if (user) {
            if (user?.isVerified === true && user.role === 0) {
                await decrypt(user?.password, async (responsePassword) => {
                    if (password === responsePassword) {
                        const token = await generateJWToken({ _id: user._id, role: user.role });
                        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.LOGIN_SUCCESS, { _id: user._id, token: token });
                    } else {
                        return response.error(res, resStatusCode.UNAUTHORISED, resMessage.INCORRECT_PASSWORD, {});
                    };
                });
            } else {
                return response.error(res, resStatusCode.FORBIDDEN, resMessage.OTP_VERIFICATION_NOT_COMPLETED, {});
            };
        } else {
            return response.error(res, resStatusCode.FORBIDDEN, resMessage.ADMIN_NOT_FOUND, {});
        };
    } catch (error) {
        console.error('Error in login:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export const blockUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const myId = req.user._id;
        const { isBlock } = req.body;

        const user = await authModel.findById(myId);
        const targetUser = await authModel.findById(userId);

        if (!user || !targetUser) {
            return res.status(404).json({ message: "User not found" });
        }
        if (isBlock) {
            await authModel.findByIdAndUpdate(myId, {
                $addToSet: { blocksList: userId }
            });

            await authModel.findByIdAndUpdate(userId, {
                $addToSet: { blockedBy: myId }
            });

        } else {
            await authModel.findByIdAndUpdate(myId, {
                $pull: { blocksList: userId }
            });

            await authModel.findByIdAndUpdate(userId, {
                $pull: { blockedBy: myId }
            });
        }

        return res.status(200).json({
            success: true,
            message: isBlock ? "User Blocked" : "User Unblocked",
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export async function getReferralsDetails(req, res) {
    try {
        const userId = req.user._id;
        const user = await authModel
            .findById(userId)
            .select("referralStats _id");

        const topReferrers = await authModel
            .find({ "referralStats.successful": { $gt: 0 } })
            .sort({ "referralStats.successful": -1 })
            .limit(5)
            .select("name img referralStats.successful");

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            "Referral details fetched",
            {
                userId: user._id,
                stats: {
                    totalReferrals: user?.referralStats?.total || 0,
                    pendingInvites: user?.referralStats?.pending || 0,
                    successfulReferrals: user?.referralStats?.successful || 0,
                },

                milestones: [
                    {
                        progress: user?.referralStats?.successful || 0,
                    },
                    {
                        progress: user?.referralStats?.successful || 0,
                    },
                ],

                topReferrers: topReferrers.map((u) => ({
                    id: u._id,
                    name: u.name,
                    avatar: u.img || "",
                    referrals: u.referralStats.successful,
                })),
            }
        );
    } catch (error) {
        console.error("Error in getReferralsDetails:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}


import {
    authValidation,
    authModel,
    loginValidation,
    idValidation,
} from "../models/authModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";
import { generateJWToken, increaseOtpAttempt, resetOtpAttempts } from "../middleware/auth.js";
import { hash, compare } from "bcrypt";
import sendMail from "../../config/mailer/index.js";
import { emailValidation, otpModel, verifyOtpValidation } from "../models/otpModel.js";
import { encrypt, decrypt } from "../utils/secureCipher.js";
import { websiteModel } from "../models/websiteModel.js";
import { userExchangeModel } from "../models/userExchangeModel.js";
import { messageModel } from "../models/chatModel.js"

export async function register(req, res) {
    const { name, email, password, country } = req.body;
    const { error } = authValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const userExists = await authModel.findOne({ email });
        if (userExists?.email && userExists?.isVerified === true) {
            return response.error(res, resStatusCode.CONFLICT, resMessage.USER_FOUND, {});
        };
        // const hashedPassword = await hash(password, 10);
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
            createNewUser = await authModel.create({
                name,
                email,
                password: encryptPassword,
                country,
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

        await sendMail("verify_otp", "SEO Collabe: Your Verification OTP", email, {
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

            // if (blockTime) {
            //     const waitSec = Math.ceil((blockTime - Date.now()) / 1000);
            //     return response.error(res, resStatusCode.TOO_MANY_REQUESTS, `Too many wrong attempts. Try again after ${waitSec} seconds.`, {});
            // };
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
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

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
        const user = await authModel.findOne({ email, isActive: true });

        // if (user?.isVerified !== true) {
        //     return response.error(res, resStatusCode.FORBIDDEN, resMessage.OTP_VERIFICATION_NOT_COMPLETED, {});
        // }
        // if (!user) {
        //     return response.error(res, resStatusCode.FORBIDDEN, resMessage.USER_NOT_FOUND, {});
        // };
        // const validPassword = await compare(password, user.password);
        // if (!validPassword) {
        //     return response.error(res, resStatusCode.UNAUTHORISED, resMessage.INCORRECT_PASSWORD, {});
        // };
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
        page = page < 1 ? 1 : page;
        limit = limit < 1 ? 10 : limit;
        console.log('userType', userType)
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
        const totalUsers = await authModel.countDocuments(filter);

        const users = await authModel.find(filter).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 })
        const updatedUsers = await Promise.all(
            users.map(async (user) => {
                const totalWebCount = await websiteModel.countDocuments({ userId: user._id, isActive: true, isLinkExchange: true, });

                return {
                    ...user.toObject(),
                    websiteCount: totalWebCount,
                };
            })
        ); return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.ACTION_COMPLETE, {
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

// export async function getNetworkUserById(req, res) {
//     try {
//         const { ownerId, userId } = req.params;
//         console.log('owenerId', ownerId)
//         console.log('userId', userId)
//         // LAST 7 DAYS
//         const oneWeekAgo = new Date();
//         oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

//         // SUPER FAST PARALLEL CALLS
//         const [user, webList, exchangesWorks, chats] = await Promise.all([
//             authModel.findOne({ _id: userId }).select("-password"),
//             websiteModel.find({ userId }),
//             userExchangeModel.find({
//                 isActive: true,
//                 $or: [
//                     { userId, ownerId },
//                     { userId: ownerId, ownerId: userId }
//                 ]
//             }),
//             messageModel.find({
//                 $or: [
//                     { senderId: ownerId, receiverId: userId },
//                     { senderId: userId, receiverId: ownerId }
//                 ],
//                 createdAt: { $gte: oneWeekAgo }
//             }).sort({ createdAt: 1 })
//         ]);

//         // ----------------------------------
//         // COMPLETED TASK COUNT
//         // ----------------------------------
//         let completedTaskCount = 0;
//         const grouped = {};

//         for (const item of exchangesWorks)
//             (grouped[item.taskId] ??= []).push(item);

//         // for (const items of Object.values(grouped)) {
//         //     if (
//         //         items.length === 2 &&
//         //         items[0].status === "completed" &&
//         //         items[1].status === "completed"
//         //     ) completedTaskCount++;
//         // }
//         for (const items of Object.values(grouped)) {
//             // Jis taskId ke kisi bhi record me status completed ho → count as completed task
//             const isCompleted = items.some(x => x.status === "completed");
//             // console.log('isCompleted', isCompleted)
//             if (isCompleted) completedTaskCount++;
//         }


//         // ----------------------------------
//         // NORMAL RESPONSE RATE
//         // ----------------------------------
//         let sentByYou = 0;
//         let repliedByOpponent = 0;

//         chats.forEach(msg => {
//             if (msg.senderId.toString() === ownerId) sentByYou++;
//             if (msg.senderId.toString() === userId) repliedByOpponent++;
//         });

//         let normalRate =
//             sentByYou > 0 ? Math.round((repliedByOpponent / sentByYou) * 100) : 0;

//         // ----------------------------------
//         // WEIGHTED RESPONSE CALCULATION
//         // ----------------------------------
//         let totalResponseTime = 0;
//         let responseCount = 0;
//         let weightedPointsTotal = 0;
//         let totalRequests = 0;

//         for (let i = 0; i < chats.length - 1; i++) {
//             const a = chats[i];
//             const b = chats[i + 1];

//             if (
//                 a.senderId.toString() === ownerId &&
//                 b.senderId.toString() === userId
//             ) {
//                 const diffMs = new Date(b.createdAt) - new Date(a.createdAt);
//                 totalResponseTime += diffMs;
//                 responseCount++;

//                 const diffHours = diffMs / 3600000;
//                 totalRequests++;

//                 let points = 0;
//                 if (diffHours <= 12) points = 1.0;
//                 else if (diffHours <= 24) points = 0.9;
//                 else if (diffHours <= 48) points = 0.8;
//                 else if (diffHours <= 72) points = 0.7;
//                 else if (diffHours <= 96) points = 0.6;
//                 else points = 0.4;

//                 weightedPointsTotal += points;
//             }
//         }

//         // No response add
//         const noResponse = sentByYou - responseCount;
//         if (noResponse > 0) totalRequests += noResponse;

//         let weightedRate = 0;
//         if (totalRequests > 0)
//             weightedRate = Math.round((weightedPointsTotal / totalRequests) * 100);

//         // ----------------------------------
//         // FINAL MERGED RESPONSE RATE (0–100 CLAMPED)
//         // ----------------------------------
//         let finalResponseRate = Math.round((normalRate + weightedRate * 2) / 3);

//         // clamp 0–100 range
//         finalResponseRate = Math.min(100, Math.max(0, finalResponseRate));

//         // ----------------------------------
//         // AVG RESPONSE TIME (HOURS)
//         // ----------------------------------
//         let avgResponseTime = 0;
//         if (responseCount > 0)
//             avgResponseTime = Math.round(totalResponseTime / responseCount / 3600000);

//         // ----------------------------------
//         // SEND FINAL RESPONSE
//         // ----------------------------------
//         return response.success(
//             res,
//             resStatusCode.ACTION_COMPLETE,
//             "User details fetched successfully",
//             {
//                 user,
//                 webList,
//                 exchangesWorks,
//                 completedTaskCount: Math.floor(completedTaskCount / 2),
//                 resRate: `${finalResponseRate}%`,
//                 avgResTime: `${avgResponseTime} hours`
//             }
//         );

//     } catch (error) {
//         console.error("Error:", error);
//         return response.error(
//             res,
//             resStatusCode.INTERNAL_SERVER_ERROR,
//             resMessage.INTERNAL_SERVER_ERROR,
//             {}
//         );
//     }
// }

export async function getNetworkUserById(req, res) {
    try {
        const { ownerId, userId } = req.params;

        // =============== PAGINATION PARAMS =================
        const pageWeb = parseInt(req.query.pageWeb) || 1;
        const limitWeb = parseInt(req.query.limitWeb) || 10;

        const pageEx = parseInt(req.query.pageEx) || 1;
        const limitEx = parseInt(req.query.limitEx) || 10;

        const skipWeb = (pageWeb - 1) * limitWeb;
        const skipEx = (pageEx - 1) * limitEx;

        // LAST 7 DAYS
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // --------------------------------------------
        // MAIN DATA (NO PAGINATION)
        // --------------------------------------------
        const [user, allWebsites, allExchanges, chats] = await Promise.all([
            authModel.findOne({ _id: userId }).select("-password"),
            websiteModel.find({ userId }),
            userExchangeModel.find({
                isActive: true,
                $or: [
                    { userId, ownerId },
                    { userId: ownerId, ownerId: userId }
                ]
            }),
            messageModel.find({
                $or: [
                    { senderId: ownerId, receiverId: userId },
                    { senderId: userId, receiverId: ownerId }
                ],
                createdAt: { $gte: oneWeekAgo }
            }).sort({ createdAt: 1 })
        ]);

        // --------------------------------------------
        // PAGINATION DATA ONLY
        // --------------------------------------------
        const [webList, webTotal, exchangesWorks, exTotal] = await Promise.all([
            websiteModel.find({ userId }).skip(skipWeb).limit(limitWeb),
            websiteModel.countDocuments({ userId }),

            userExchangeModel.find({
                isActive: true,
                $or: [
                    { userId, ownerId },
                    { userId: ownerId, ownerId: userId }
                ]
            }).skip(skipEx).limit(limitEx),

            userExchangeModel.countDocuments({
                isActive: true,
                $or: [
                    { userId, ownerId },
                    { userId: ownerId, ownerId: userId }
                ]
            })
        ]);

        // ============================================
        // COMPLETED TASK CALCULATION
        // ============================================
        let completedTaskCount = 0;
        const grouped = {};

        for (const item of allExchanges)
            (grouped[item.taskId] ??= []).push(item);

        for (const items of Object.values(grouped)) {
            const isCompleted = items.some(x => x.status === "completed");
            if (isCompleted) completedTaskCount++;
        }

        // ============================================
        // RESPONSE RATE CALCULATION
        // ============================================
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

        // ============================================
        // ⭐ TRUST SCORE CALCULATION
        // ============================================

        // 1) Collaboration success (40%)
        const totalTasks = Object.keys(grouped).length;
        const collabScore = totalTasks > 0
            ? Math.round((completedTaskCount / totalTasks) * 100)
            : 0;

        // 2) Response rate (30%)
        const responseRateScore = finalResponseRate;

        // 3) Response speed (20%)
        let resSpeed = 0;
        if (avgResponseTime <= 6) resSpeed = 100;
        else if (avgResponseTime <= 12) resSpeed = 90;
        else if (avgResponseTime <= 24) resSpeed = 80;
        else if (avgResponseTime <= 48) resSpeed = 60;
        else resSpeed = 40;

        // 4) Account age (10%)
        const accountAgeDays = Math.floor(
            (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24)
        );

        let ageScore = 0;
        if (accountAgeDays <= 30) ageScore = 40;
        else if (accountAgeDays <= 90) ageScore = 60;
        else if (accountAgeDays <= 180) ageScore = 80;
        else ageScore = 100;

        // ⭐ FINAL TRUST SCORE (0–100)
        const trustScore =
            collabScore * 0.40 +
            responseRateScore * 0.30 +
            resSpeed * 0.20 +
            ageScore * 0.10;

        const finalTrustScore = Math.round(trustScore);

        // ===========================
        // SEND FINAL RESPONSE
        // ===========================
        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            "User details fetched successfully",
            {
                user,

                // 🚀 PAGINATED WEBSITE LIST
                webList,
                webPagination: {
                    page: pageWeb,
                    limit: limitWeb,
                    total: webTotal,
                    totalPages: Math.ceil(webTotal / limitWeb)
                },

                // 🚀 PAGINATED EXCHANGE LIST
                exchangesWorks,
                exchangePagination: {
                    page: pageEx,
                    limit: limitEx,
                    total: exTotal,
                    totalPages: Math.ceil(exTotal / limitEx)
                },

                completedTaskCount: Math.floor(completedTaskCount / 2),
                resRate: `${finalResponseRate}%`,
                avgResTime: `${avgResponseTime} hours`,
                trustScore: `${finalTrustScore}%`,
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

        // Fix: convert data types
        const updateData = {
            name: req.body.name,
            email: req.body.email,
            bio: req.body.bio,
            img: req.body.img,
            role: Number(req.body.role),
            isVerified: req.body.isVerified === "true",
            isActive: req.body.isActive === "true",
        };

        // Remove undefined fields
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
        console.log('user', user)
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
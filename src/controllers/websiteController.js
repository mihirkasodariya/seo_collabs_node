import {
    idValidation,
    websiteModel,
    websiteValidation
} from "../models/websiteModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";
import { verifyWebsiteMeta } from "../utils/verifyWebsiteMeta.js";
import sendMail from "../../config/mailer/index.js";
import { otpModel } from "../models/otpModel.js";
import { authModel } from "../models/authModel.js";
import { addActivity } from "./activityController.js";

export async function addWebsite(req, res) {
    const { url, type, Categories, linkReqs, isLinkExchange } = req.body;
    const userId = req.user._id;
    const { error } = websiteValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const websiteExists = await websiteModel.findOne({ url });
        if (websiteExists) {
            return response.error(res, resStatusCode.CONFLICT, resMessage.WEBSITE_EXISTS, {});
        };
        const newWebsite = await websiteModel.create({ userId, url, type, Categories, linkReqs, isLinkExchange });
        await addActivity({
            userId,
            type: "WEBSITE_ADD",
            title: `Add New Website: '${url}'`,
        });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_ADD, newWebsite);
    } catch (error) {
        console.error("Error in addWebsite:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getWebsiteList(req, res) {
    try {
        let { page = 1, limit = 10 } = req.query;
        let userId;
        if (req.user.role === 0) {
            userId = req.query.userId;
            console.log('jjdfd', userId)
        } else {
            userId = req.user._id;

        }
        console.log('userId', userId)
        page = parseInt(page);
        limit = parseInt(limit);

        const skip = (page - 1) * limit;

        const websites = await websiteModel.find({ userId, isActive: true }).skip(skip).limit(limit).sort({ createdAt: -1 });

        const total = await websiteModel.countDocuments({ userId, isActive: true });

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_GET, {
            data: websites,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error in getWebsiteList:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
};

export async function getWebsite(req, res) {
    const { id } = req.params;
    const { error } = idValidation.validate(req.params);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const getWebsite = await websiteModel.findOne({ _id: id });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_GET, getWebsite);
    } catch (error) {
        console.error('Error in getWebsite:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export const updateWebsite = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        await websiteModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_UPDATED, {});
    } catch (error) {
        console.error('Error in updateBlogById:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export const deleteWebsites = async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return response.error(res, resStatusCode.BAD_REQUEST, "Website IDs are required", {});
    }

    try {
        const result = await websiteModel.deleteMany({
            _id: { $in: ids }
        });

        return response.success(res, resStatusCode.ACTION_COMPLETE, `Deleted ${result.deletedCount} website(s)`, {});
    } catch (error) {
        console.error("Error in deleteWebsites:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
};



export const verifyWebsite = async (req, res) => {
    const { websiteUrl, verifyToken, method, email, userId, otp } = req.body;
    try {
        if (method === "meta") {
            if (!websiteUrl || !verifyToken) {
                return res.status(400).json({ success: false, message: "Missing data" });
            }

            const isVerified = await verifyWebsiteMeta(websiteUrl, verifyToken);
            console.log('isVerified', isVerified)
            if (isVerified) {
                return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_VERIFY, { isVerified: true });
            } else {
                return response.error(res, resStatusCode.FORBIDDEN, resMessage.WEBSITE_FAILED, { isVerified: false });
            };
        } else if (method === "email") {
            if (!email, !websiteUrl, !userId) {
                return res.status(400).json({ success: false, message: "Missing data" });
            }
            await otpModel.deleteMany({ email, websiteUrl });
            const otp = Math.floor(100000 + Math.random() * 900000);
            const otpExpires = Date.now() + 10 * 60 * 1000;

            await otpModel.create({
                websiteUrl,
                email,
                otp,
                otpExpires,
            });
            const user = await authModel.findById({ _id: userId });
            console.log(user)
            await sendMail("web_verify_otp", "SEO Collabes: Website Verification Code...", email, {
                userName: user.name,
                otpCode: otp,
                websiteUrl: websiteUrl
            });
            return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEB_OTP_SEND);
        } else if (method === "otp") {
            const otpRecord = await otpModel.findOne({ email, websiteUrl }).sort({ createdAt: -1 });
            console.log('otpRecord', otpRecord)
            if (!otpRecord) {
                return response.error(res, resStatusCode.FORBIDDEN, resMessage.RETRY_OTP, {});
            };
            if (otpRecord.otp.toString() !== otp.toString()) {
                return response.error(res, resStatusCode.FORBIDDEN, resMessage.INVALID_OTP, {});
            };
            if (otpRecord.otpExpires < Date.now()) {
                return response.error(res, resStatusCode.FORBIDDEN, resMessage.EXPIRED_OTP, {});
            };
            await otpModel.deleteMany({ email, websiteUrl });
            return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.EMAIL_VERIFIED_SUCCESSFULLY, {});
        };
    } catch (error) {
        console.error('Error in updateBlogById:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};
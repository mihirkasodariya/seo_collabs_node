import {
    idValidation,
    websiteModel,
    websiteValidation
} from "../models/websiteModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";

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

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_ADD, newWebsite);
    } catch (error) {
        console.error("Error in addWebsite:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getWebsiteList(req, res) {
    try {
        const getWebsites = await websiteModel.find({ isActive: true });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_GET, getWebsites);
    } catch (error) {
        console.error('Error in getWebsiteList:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
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

export const deleteWebsite = async (req, res) => {
    const { id } = req.params;
    try {
        await websiteModel.findByIdAndUpdate(
            id,
            { $set: { isActive: false } },
            { new: true, runValidators: true }
        );
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_DELETED, {});
    } catch (error) {
        console.error('Error in updateBlogById:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};
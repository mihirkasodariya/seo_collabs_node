import {
    idValidation,
    websiteModel,
    websiteValidation
} from "../models/websiteModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";

// import Message from "../models/messageModel.js"; // Mongoose model

// export const saveMessage = async (req, res) => {
//     try {
//         const { senderId, receiverId, message } = req.body;
//         // const newMessage = await Message.create({ senderId, receiverId, message });
//         res.status(200).json({ success: true, message: "Message saved", data: newMessage });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: "Internal server error" });
//     }
// };

// export async function addWebsite(req, res) {
//     const { url, type, Categories, linkReqs, isLinkExchange } = req.body;
//     const userId = req.user._id;
//     const { error } = websiteValidation.validate(req.body);
//     if (error) {
//         return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
//     };
//     try {
//         const websiteExists = await websiteModel.findOne({ url });
//         if (websiteExists) {
//             return response.error(res, resStatusCode.CONFLICT, resMessage.WEBSITE_EXISTS, {});
//         };
//         const newWebsite = await websiteModel.create({ userId, url, type, Categories, linkReqs, isLinkExchange });

//         return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_ADD, newWebsite);
//     } catch (error) {
//         console.error("Error in addWebsite:", error);
//         return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
//     };
// };

export async function getLinkExchangeList(req, res) {
    try {
        const { search, type, category, page = 1, limit = 10 } = req.query;
        const filter = { isActive: true, isLinkExchange: true };

        if (search) {
            filter.$or = [
                { url: { $regex: search, $options: 'i' } },
                { type: { $regex: search, $options: 'i' } },
                { Categories: { $elemMatch: { $regex: search, $options: 'i' } } },
            ];
        };
        if (type) {
            filter.type = type;
        };

        if (category) {
            filter.Categories = { $in: [category] };
        };

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * limitNum;

        const total = await websiteModel.countDocuments(filter);

        const getLinkExchanges = await websiteModel.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }).populate('userId');

        const transformedRecords = getLinkExchanges.map(record => ({
            _id: record._id,
            userId: record.userId?._id || null,
            userName: record.userId?.name || null,
            email: record.userId?.email || null,
            url: record.url,
            type: record.type,
            Categories: record.Categories,
            linkReqs: record.linkReqs,
            isLinkExchange: record.isLinkExchange,
            isActive: record.isActive,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            __v: record.__v,
        }));

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.LINK_EXCHANGE_GET, {
            records: transformedRecords,
            // pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            // },
        });
    } catch (error) {
        console.error('Error in getLinkExchangeList:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
};




// export async function getgetLinkExchange(req, res) {
//     const { id } = req.params;
//     const { error } = idValidation.validate(req.params);
//     if (error) {
//         return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
//     };
//     try {
//         const getLinkExchange = await websiteModel.findOne({ _id: id });
//         return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.LINK_EXCHANGE_GET, getLinkExchange);
//     } catch (error) {
//         console.error('Error in getWebsite:', error);
//         return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
//     };
// };

// export const updateWebsite = async (req, res) => {
//     const { id } = req.params;
//     const updateData = req.body;
//     try {
//         await websiteModel.findByIdAndUpdate(
//             id,
//             { $set: updateData },
//             { new: true, runValidators: true }
//         );
//         return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_UPDATED, {});
//     } catch (error) {
//         console.error('Error in updateBlogById:', error);
//         return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
//     };
// };

// export const deleteWebsite = async (req, res) => {
//     const { id } = req.params;
//     try {
//         await websiteModel.findByIdAndUpdate(
//             id,
//             { $set: { isActive: false } },
//             { new: true, runValidators: true }
//         );
//         return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_DELETED, {});
//     } catch (error) {
//         console.error('Error in updateBlogById:', error);
//         return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
//     };
// };
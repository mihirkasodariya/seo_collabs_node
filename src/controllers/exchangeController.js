import {
    idValidation,
    websiteModel,
    websiteValidation
} from "../models/websiteModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";

// showing list all website
// export async function getLinkExchangeList(req, res) {
//     try {
//         const { search, type, category, page = 1, limit = 10 } = req.query;
//         const filter = { isActive: true, isLinkExchange: true };

//         if (search) {
//             filter.$or = [
//                 { url: { $regex: search, $options: 'i' } },
//                 { type: { $regex: search, $options: 'i' } },
//                 { Categories: { $elemMatch: { $regex: search, $options: 'i' } } },
//             ];
//         };
//         if (type) {
//             filter.type = type;
//         };

//         if (category) {
//             filter.Categories = { $in: [category] };
//         };

//         const pageNum = parseInt(page, 10) || 1;
//         const limitNum = parseInt(limit, 10) || 10;
//         const skip = (pageNum - 1) * limitNum;

//         const total = await websiteModel.countDocuments(filter);

//         const getLinkExchanges = await websiteModel.find(filter).skip(skip).limit(limitNum).sort({ createdAt: -1 }).populate('userId');

//         const transformedRecords = getLinkExchanges.map(record => ({
//             _id: record._id,
//             userId: record.userId?._id || null,
//             userName: record.userId?.name || null,
//             email: record.userId?.email || null,
//             url: record.url,
//             type: record.type,
//             Categories: record.Categories,
//             linkReqs: record.linkReqs,
//             isLinkExchange: record.isLinkExchange,
//             isActive: record.isActive,
//             createdAt: record.createdAt,
//             updatedAt: record.updatedAt,
//             __v: record.__v,
//         }));

//         return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.LINK_EXCHANGE_GET, {
//             records: finalRecords,
//             total,
//             page: pageNum,
//             limit: limitNum,
//             totalPages: Math.ceil(total / limitNum),
//         });
//     } catch (error) {
//         console.error('Error in getLinkExchangeList:', error);
//         return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
//     };
// };

export async function getLinkExchangeList(req, res) {
    try {
        const { search, type, category, page = 1, limit = 10 } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const skip = (pageNum - 1) * limitNum;
        const pipeline = [
            {
                $match: {
                    isActive: true,
                    isLinkExchange: true
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                },
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true
                },
            },
        ];

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { url: { $regex: search, $options: "i" } },
                        { type: { $regex: search, $options: "i" } },
                        { Categories: { $elemMatch: { $regex: search, $options: "i" } } },
                        { "user.name": { $regex: search, $options: "i" } },
                    ],
                },
            });
        };
        if (type) {
            pipeline.push({ $match: { type } });
        };
        if (category) {
            pipeline.push({
                $match: { Categories: { $in: [category] } }
            });
        };
        pipeline.push(
            {
                $facet: {
                    total: [{ $count: "count" }],
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limitNum },
                    ],
                },
            },
        );
        const result = await websiteModel.aggregate(pipeline);
        const total = result[0].total[0]?.count || 0;
        const data = result[0].data;
        const finalRecords = data.map((record) => ({
            _id: record._id,
            url: record.url,
            type: record.type,
            Categories: record.Categories,
            isLinkExchange: record.isLinkExchange,
            isActive: record.isActive,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            userId: record.user?._id || null,
            userName: record.user?.name || null,
            email: record.user?.email || null
        }));

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.LINK_EXCHANGE_GET, {
            records: finalRecords,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error("Error in getLinkExchangeList:", err);
        return response.error(res, 500, "Internal Server Error", {});
    }
}

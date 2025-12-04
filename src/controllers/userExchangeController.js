import {
    websiteModel,
} from "../models/websiteModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";
import {
    idUpdateStatusValidation,
    idValidation,
    seenExchangeIdValidation,
    userExchangeModel,
    userExchangeValidation
} from "../models/userExchangeModel.js";
import { customAlphabet } from "nanoid";
import mongoose from "mongoose";
import { authModel } from "../models/authModel.js";
import { extractDomain } from "../utils/secureCipher.js";

const generateTaskId = customAlphabet("0123456789", 7);

//Generate a UNIQUE taskId (retry if duplicate)
async function generateUniqueTaskId() {
    let id = generateTaskId();
    let exists = await userExchangeModel.findOne({ taskId: id });

    while (exists) {
        id = generateTaskId();
        exists = await userExchangeModel.findOne({ taskId: id });
    }

    return id;
}
export async function addRequestExchange(req, res) {
    const { url, landingPage, anchorText, instructions, status, myExchange, ownerId, userId, reqTaskId } = req.body;
    const { error } = userExchangeValidation.validate(req.body);
    console.log(req.body)
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const domain = extractDomain(url);
        console.log('domain', domain)
        console.log('userId', userId)

        const checkURL = await websiteModel.findOne({ url: domain, userId });
        console.log("checkURL", checkURL)
        if (checkURL?.url !== domain) {
            return response.error(res, resStatusCode.FORBIDDEN, resMessage.URL_NOT_MATCH, {});
        };
        if (reqTaskId) {
            req.body.taskId = reqTaskId;
            const getOldTask = await userExchangeModel.findOne({ taskId: reqTaskId, userId })
            if (getOldTask) {
                req.body.status = "waiting-for-approval"
                req.body.myExchange = "pending"
                const updated = await userExchangeModel.updateOne(
                    { taskId: reqTaskId, userId: userId }, {
                    $set: req.body
                }, { new: false, }
                );
                const getUpdatedWebsite = await userExchangeModel.findOne({ userId, taskId: reqTaskId })
                return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.REQUEST_EXCHANGE, getUpdatedWebsite);
            };
        } else {
            const taskId = await generateUniqueTaskId();
            req.body.taskId = taskId;
        }
        const addExchange = await userExchangeModel.create(req.body);
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.REQUEST_EXCHANGE, addExchange);
    } catch (error) {
        console.error("Error in requestExchange:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

// export async function getRequestExchangeById(req, res) {
//     const { taskId, id } = req.params;

//     const { error } = idValidation.validate(req.params);
//     if (error) {
//         return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
//     };
//     try {
//         let getRequestExchangeById = await userExchangeModel.find({ taskId });
//         console.log("ddfdfdfdfdfd", getRequestExchangeById)
//         const OwnerInfo = await authModel.findOne({ _id: getRequestExchangeById.ownerId });
//         const userInfo = await authModel.findOne({ _id: getRequestExchangeById.ownerId });
//         console.log('res1', getRequestExchangeById[0])
//         console.log('res2', getRequestExchangeById[1])
//         const ownerData = {
//             ...getRequestExchangeById[0],
//             name: OwnerInfo.name,
//             email: OwnerInfo.email,
//             img: OwnerInfo.img || "",
//         }
//         const userData = {
//             ...getRequestExchangeById[1][0],
//             name: userInfo.name,
//             email: userInfo.email,
//             img: userInfo.img || "",
//         }
//         // const resdata1 = {
//         //     // ...userInfo.toObject(),
//         //     name: userInfo.name,
//         //     email: userInfo.email,
//         //     img: userInfo.img || "",
//         //     getRequestExchangeById[0]
//         // }
//         const resdata = {
//             ...getRequestExchangeById[0],
//             ...getRequestExchangeById[1]
//         }

//         console.log("res", resdata)
//         // if (!getRequestExchangeById) {
//         //     getRequestExchangeById = await userExchangeModel.findOne({ taskId, ownerId: userId });
//         // };
//         return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.GET_EXCHANGE_LIST, resdata);
//     } catch (error) {
//         console.error("getPlanById Error:", error);
//         return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
//     };
// };

export async function getRequestExchangeById(req, res) {
    const { taskId } = req.params;

    try {
        const records = await userExchangeModel.find({ taskId });

        const ownerRecord = records.find(r => String(r.userId) !== String(r.ownerId));
        const userRecord = records.find(r => String(r.userId) === String(ownerRecord.ownerId));

        const ownerInfo = await authModel.findById(ownerRecord.ownerId).lean();
        const userInfo = await authModel.findById(ownerRecord.userId).lean();

        const ownerData = {
            ...ownerRecord.toObject(),
            name: ownerInfo?.name || "",
            email: ownerInfo?.email || "",
            img: ownerInfo?.img || ""
        };
        let userData = {};
        userData = {
            ...userRecord?.toObject(),
            // userId: ownerData?.id ?? null ,
            name: userInfo?.name || "",
            email: userInfo?.email || "",
            img: userInfo?.img || ""
        };

        const finalResponse = {
            owner: ownerData,
            user: userData
        };
        console.log('finalResponse', finalResponse)
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.GET_EXCHANGE_LIST, finalResponse);

    } catch (error) {
        console.error("getRequestExchangeById Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
}
// export async function getAllRequestExchange(req, res) {
//     try {
//         let { page = 1, limit = 10, status, myExchangeStatus } = req.query;
//         let userId = req.user.id;

//         page = Number(page);
//         limit = Number(limit);

//         const baseFilter = {
//             isActive: true,
//             userId: new mongoose.Types.ObjectId(userId),
//         };

//         let statusArr = [];
//         let myExchangeArr = [];

//         if (status) {
//             statusArr = status.split(",");
//         };
//         if (myExchangeStatus) {
//             myExchangeArr = myExchangeStatus.split(",");
//         };

//         let statusData = [];
//         let myExchangeData = [];

//         if (statusArr.length > 0) {
//             statusData = await userExchangeModel.find({
//                 ...baseFilter,
//                 status: { $in: statusArr },
//             });
//         };

//         if (myExchangeArr.length > 0) {
//             myExchangeData = await userExchangeModel.find({
//                 ...baseFilter,
//                 myExchange: { $in: myExchangeArr },
//             });
//         };

//         let finalData = [];

//         const statusMatched = statusData.length > 0;
//         const myExchangeMatched = myExchangeData.length > 0;

//         if (statusMatched && myExchangeMatched) {
//             const ids = new Set(myExchangeData.map((x) => String(x._id)));
//             finalData = statusData.filter((x) => ids.has(String(x._id)));
//         }
//         else if (statusMatched && !myExchangeMatched) {
//             finalData = statusData;
//         }
//         else if (!statusMatched && myExchangeMatched) {
//             finalData = myExchangeData;
//         }
//         else {
//             finalData = [];
//         };

//         const total = finalData.length;
//         const paginatedData = finalData
//             .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//             .slice((page - 1) * limit, page * limit);

//         return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.GET_EXCHANGE_LIST, {
//             data: paginatedData,
//             page,
//             limit,
//             totalPages: Math.ceil(total / limit),
//         });
//     } catch (error) {
//         console.error("getAllRequestExchange Error:", error);
//         return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
//     };
// };


export async function getAllRequestExchange(req, res) {
    try {
        let { page = 1, limit = 10, status, myExchangeStatus } = req.query;
        let userId = req.user.id;

        page = Number(page);
        limit = Number(limit);

        const baseFilter = {
            isActive: true,
            userId: new mongoose.Types.ObjectId(userId),
        };

        let statusArr = [];
        let myExchangeArr = [];

        if (status) statusArr = status.split(",");
        if (myExchangeStatus) myExchangeArr = myExchangeStatus.split(",");

        let statusData = [];
        let myExchangeData = [];

        if (statusArr.length > 0) {
            statusData = await userExchangeModel.find({
                ...baseFilter,
                status: { $in: statusArr },
            });
        }

        if (myExchangeArr.length > 0) {
            myExchangeData = await userExchangeModel.find({
                ...baseFilter,
                myExchange: { $in: myExchangeArr },
            });
        }

        let finalData = [];

        const statusMatched = statusData.length > 0;
        const myExchangeMatched = myExchangeData.length > 0;

        if (statusMatched && myExchangeMatched) {
            const ids = new Set(myExchangeData.map((x) => String(x._id)));
            finalData = statusData.filter((x) => ids.has(String(x._id)));
        } else if (statusMatched && !myExchangeMatched) {
            finalData = statusData;
        } else if (!statusMatched && myExchangeMatched) {
            finalData = myExchangeData;
        } else {
            finalData = [];
        }

        // ⭐⭐⭐ ADDING CUSTOM STATUS LOGIC HERE ⭐⭐⭐
        if (finalData.length > 0) {
            // group by taskId
            const groupedByTask = finalData.reduce((acc, item) => {
                const key = String(item.taskId);
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
            }, {});

            finalData = finalData.map((item) => {
                const taskGroup = groupedByTask[String(item.taskId)];

                // If both users exist for same taskId
                if (taskGroup.length === 2) {
                    const [a, b] = taskGroup;

                    const bothCompleted =
                        a.status === "completed" && b.status === "completed";

                    const taskOwnerId = String(a.ownerId); // ownerId DB mein stored hota hai

                    if (bothCompleted) {
                        item.customStatus = "Done for both";
                        return item;
                    }

                    // ❗ Only one side is completed
                    if (item.status === "completed") {
                        if (String(item.userId) === taskOwnerId) {
                            item.customStatus = "Done for Our Side";
                        } else {
                            item.customStatus = "Done for Third Party";
                        }
                    }
                }

                // If only single record exists for taskId
                else {
                    if (item.status === "completed") {
                        item.customStatus = "Done for Our Side";
                    }
                }

                return item;
            });
        }

        // ⭐ Pagination
        const total = finalData.length;
        const paginatedData = finalData
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice((page - 1) * limit, page * limit);

        // ⭐ Return modified status (customStatus if available)
        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            resMessage.GET_EXCHANGE_LIST,
            {
                data: paginatedData.map((x) => ({
                    ...x.toObject(),
                    status: x.customStatus ?? x.status,
                })),
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        );

    } catch (error) {
        console.error("getAllRequestExchange Error:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}

export async function getAllMyExchangePendingVerify(req, res) {
    try {
        let { page = 1, limit = 10, status, myExchangeStatus, ownerId } = req.query;

        page = Number(page);
        limit = Number(limit);

        const baseFilter = {
            isActive: true,
            $or: [
                { ownerId: new mongoose.Types.ObjectId(ownerId) },
                { userId: new mongoose.Types.ObjectId(ownerId) }
            ]
        };

        let statusArr = [];
        let myExchangeArr = [];

        if (status) statusArr = status.split(",");
        if (myExchangeStatus) myExchangeArr = myExchangeStatus.split(",");

        const statusData = statusArr.length > 0
            ? await userExchangeModel.find({
                ...baseFilter,
                status: { $in: statusArr },
            })
            : [];

        const myExchangeData = myExchangeArr.length > 0
            ? await userExchangeModel.find({
                ...baseFilter,
                myExchange: { $in: myExchangeArr },
            })
            : [];

        const merged = [...statusData, ...myExchangeData];
        let finalData = Array.from(
            new Map(merged.map((item) => [String(item._id), item])).values()
        );

        if (finalData.length > 0) {
            const grouped = finalData.reduce((acc, item) => {
                const key = String(item.taskId);
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
            }, {});

            const apiOwner = String(ownerId);

            finalData = finalData.map((item) => {
                const group = grouped[String(item.taskId)];

                if (group.length === 2) {
                    const [a, b] = group;

                    const bothCompleted =
                        a.status === "completed" &&
                        b.status === "completed";

                    if (bothCompleted) {
                        item.customStatus = "Done for both";
                        return item;
                    }

                    if (item.status === "completed") {
                        if (String(item.userId) === apiOwner) {
                            item.customStatus = "Done for Third Party";
                        } else {
                            item.customStatus = "Done for Our Side";
                        }
                    }
                } else {
                    if (item.status === "completed") {
                        if (String(item.userId) === apiOwner) {
                            item.customStatus = "Done for Our Side";
                        } else {
                            item.customStatus = "Done for Third Party";
                        }
                    }
                }

                return item;
            });
        }

        let finalOutput = [];

        finalData.forEach((item) => {
            console.log('item', item)
            const status = item.customStatus ?? item.status;

            if (status === "Done for both") {
                if (String(item.ownerId) === String(ownerId)) {
                    finalOutput.push(item);
                }
            } else if (status === "Done for Our Side" || status === "Done for Third Party") {
                finalOutput.push(item);
            } else {
                // if (String(item.ownerId) === String(ownerId)) {
                finalOutput.push(item);
                // } 
            }
        });

        finalData = finalOutput;

        // ⭐ Pagination + Sorting
        const total = finalData.length;
        const paginatedData = finalData
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice((page - 1) * limit, page * limit);

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            resMessage.GET_EXCHANGE_LIST,
            {
                data: paginatedData.map((x) => ({
                    ...x.toObject(),
                    status: x.customStatus ?? x.status,
                })),
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            }
        );
    } catch (error) {
        console.error("getAllMyExchangePendingVerify Error:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}




// export async function getAllMyExchangePendingVerify(req, res) {
//     try {
//         let { page = 1, limit = 10, status, myExchangeStatus, ownerId } = req.query;

//         page = Number(page);
//         limit = Number(limit);

//         const baseFilter = {
//             isActive: true,
//             ownerId: new mongoose.Types.ObjectId(ownerId),
//         };

//         let statusArr = [];
//         let myExchangeArr = [];

//         if (status) statusArr = status.split(",");
//         if (myExchangeStatus) myExchangeArr = myExchangeStatus.split(",");

//         const statusData = statusArr.length > 0
//             ? await userExchangeModel.find({
//                 ...baseFilter,
//                 status: { $in: statusArr },
//             })
//             : [];

//         const myExchangeData = myExchangeArr.length > 0
//             ? await userExchangeModel.find({
//                 ...baseFilter,
//                 myExchange: { $in: myExchangeArr },
//             })
//             : [];
//         const merged = [...statusData, ...myExchangeData];

//         const finalData = Array.from(
//             new Map(merged.map(item => [String(item._id), item])).values()
//         );

//         const total = finalData.length;
//         const paginatedData = finalData
//             .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//             .slice((page - 1) * limit, page * limit);

//         return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.GET_EXCHANGE_LIST, {
//             data: paginatedData,
//             page,
//             limit,
//             totalPages: Math.ceil(total / limit),
//         });

//     } catch (error) {
//         console.error("getAllRequestExchange Error:", error);
//         return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
//     };
// };

export const updateExchangeStatusById = async (req, res) => {
    const { id: _id } = req.params;
    const { status, MyExchangeStatus, improveText } = req.body;
    const { error } = idUpdateStatusValidation.validate(req.params);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    console.log(status)
    try {
        const updateRequestExchangeById = await userExchangeModel.findByIdAndUpdate(
            _id,
            {
                $set: {
                    status,
                    MyExchange: !MyExchangeStatus ? "pending" : MyExchangeStatus,
                    improvementNotes: improveText ?? ""
                }
            }, { new: true, runValidators: true }
        );
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.STATUS_UPDATE_EXCHANGE, updateRequestExchangeById);
    } catch (error) {
        console.log("updateRequestExchangeById Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export const updateSeenStatusRequestExchange = async (req, res) => {
    const { ids } = req.body;
    const { error } = seenExchangeIdValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };

    try {
        const updateResult = await userExchangeModel.updateMany(
            { _id: { $in: ids } },
            { $set: { isSeen: true } },
            { new: true }
        );

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.STATUS_UPDATE_EXCHANGE, updateResult);

    } catch (error) {
        console.log("updateRequestExchangeById Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
};


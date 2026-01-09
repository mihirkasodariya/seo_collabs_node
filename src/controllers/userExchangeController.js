import {
    websiteModel,
} from "../models/websiteModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";
import {
    idUpdateStatusValidation,
    seenExchangeIdValidation,
    userExchangeModel,
    userExchangeValidation
} from "../models/userExchangeModel.js";
import { customAlphabet } from "nanoid";
import mongoose from "mongoose";
import { authModel } from "../models/authModel.js";
import { extractDomain } from "../utils/secureCipher.js";
import { addExchangeCreatedActivity, addExchangeStatusActivity } from "./activityController.js";
import { getTodayMessageCount } from "../socket/chatSocket.js";

const generateTaskId = customAlphabet("0123456789", 7);

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
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const todayCount = await getTodayMessageCount(ownerId);
        console.log('todayCount', todayCount)
        if (todayCount >= 50) {
            return response.error(res, resStatusCode.TOO_MANY_REQUESTS, resMessage.MSG_LIMIT, {});
        };
        const domain = extractDomain(url);

        const checkURL = await websiteModel.findOne({ url: domain, userId });
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
                const getUpdatedWebsite = await userExchangeModel.findOne({ userId, taskId: reqTaskId, })
                await addExchangeCreatedActivity({
                    userId: userId,
                    websiteDomain: domain,
                });
                return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.REQUEST_EXCHANGE, getUpdatedWebsite);
            };
        } else {
            const taskId = await generateUniqueTaskId();
            req.body.taskId = taskId;
        }
        const addExchange = await userExchangeModel.create(req.body);
        await addExchangeCreatedActivity({
            userId: req.body.userId || ownerId,
            websiteDomain: domain,
        });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.REQUEST_EXCHANGE, addExchange);
    } catch (error) {
        console.error("Error in requestExchange:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

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
        if (finalData.length > 0) {
            const groupedByTask = finalData.reduce((acc, item) => {
                const key = String(item.taskId);
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
            }, {});

            finalData = finalData.map((item) => {
                const taskGroup = groupedByTask[String(item.taskId)];

                if (taskGroup.length === 2) {
                    const [a, b] = taskGroup;

                    const bothCompleted =
                        a.status === "completed" && b.status === "completed";

                    const taskOwnerId = String(a.ownerId);
                    if (bothCompleted && status === "Done_for_both") {
                        item.customStatus = "Done for both";
                        return item;
                    }
                    if (item.status === "completed") {
                        if (String(item.userId) === taskOwnerId) {
                            item.customStatus = "Done for Our Side";
                        } else {
                            item.customStatus = "Done for Third Party";
                        }
                    }
                }
                else {
                    if (item.status === "completed") {
                        item.customStatus = "Done for Our Side";
                    }
                }

                return item;
            });
        }
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
                finalOutput.push(item);
            }
        });

        finalData = finalOutput;
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

        if (updateRequestExchangeById) {
            await addExchangeStatusActivity({
                userId: updateRequestExchangeById.ownerId,
                status,
            });
        }
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


export async function getMyRequestList(req, res) {
    try {
        let { page = 1, limit = 10 } = req.query;
        const userId = String(req.user._id);

        page = Number(page);
        limit = Number(limit);
        const skip = (page - 1) * limit;

        const fullyCompletedTaskIdsAgg = await userExchangeModel.aggregate([
            { $match: { status: "completed" } },
            {
                $group: {
                    _id: "$taskId",
                    count: { $sum: 1 },
                },
            },
            { $match: { count: { $gte: 2 } } },
        ]);

        const fullyCompletedTaskIds = fullyCompletedTaskIdsAgg.map(
            (t) => String(t._id)
        );
        let getLinkExchanges = await userExchangeModel
            .find({
                ownerId: userId,
                taskId: { $nin: fullyCompletedTaskIds },
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "userId",
                select: "name"
            });

        getLinkExchanges = getLinkExchanges.map((item) => item.toObject());
        getLinkExchanges = getLinkExchanges.filter((item) => {
            console.log('String(item.userId)', String(item.ownerId))
            console.log('userId)', String(userId))
            console.log('userId)', String(userId))
            return !(
                String(item.userId) === String(userId) &&
                item.status === "rejected"
            );
        });
        getLinkExchanges = getLinkExchanges.map((item) => {
            if (item.status === "completed" && String(item.userId) === userId) {
                item.status = "Done for Our Side";
            } else if (item.status === "completed") {
                item.status = "Done for Third Party";
            }
            return item;
        });

        const totalCount = getLinkExchanges.length;

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            resMessage.GET_EXCHANGE_LIST,
            {
                myRequestList: getLinkExchanges,
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            }
        );
    } catch (error) {
        console.error("getMyRequestList Error:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}

export async function getPartnerRequestList(req, res) {
    try {
        let { page = 1, limit = 10 } = req.query;
        const userId = String(req.user._id);

        page = Number(page);
        limit = Number(limit);
        const skip = (page - 1) * limit;

        const totalCount = await userExchangeModel.countDocuments({
            userId: userId,
        });

        let getLinkExchanges = await userExchangeModel
            .find({ userId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit).populate({
                path: "ownerId",
                select: "name"
            });

        const completedItems = getLinkExchanges.filter(
            (item) => item.status === "completed"
        );

        const taskIds = completedItems.map((item) => item.taskId);

        let completedTaskIdCounts = [];

        if (taskIds.length > 0) {
            completedTaskIdCounts = await userExchangeModel.aggregate([
                {
                    $match: {
                        taskId: { $in: taskIds },
                        status: "completed",
                    },
                },
                {
                    $group: {
                        _id: "$taskId",
                        count: { $sum: 1 },
                    },
                },
            ]);
        }
        const fullyCompletedTaskIds = completedTaskIdCounts
            .filter((t) => t.count === 2)
            .map((t) => t._id);

        getLinkExchanges = getLinkExchanges.filter(
            (item) => !fullyCompletedTaskIds.includes(item.taskId)
        );

        getLinkExchanges = getLinkExchanges.map((item) => {
            if (item.status === "completed" && String(item.userId) === userId) {
                return {
                    ...item.toObject(),
                    status: "Done for Our Side",
                };
            }

            if (item.status === "completed") {
                return {
                    status: "Done for Third Party",
                    ...item.toObject(),
                };
            }

            return item;
        });

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            resMessage.GET_EXCHANGE_LIST,
            {
                partnerrequest: getLinkExchanges,
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            }
        );
    } catch (error) {
        console.error("getPartnerRequestList Error:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}

export async function getCompletedList(req, res) {
    try {
        let { page = 1, limit = 10 } = req.query;
        const userId = String(req.user._id);

        page = Number(page);
        limit = Number(limit);
        const skip = (page - 1) * limit;

        const totalCount = await userExchangeModel.countDocuments({
            ownerId: userId,
            status: "completed",
        });

        let completedList = await userExchangeModel
            .find({
                ownerId: userId,
                status: "completed",
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit).populate({
                path: "userId",
                select: "name"
            });

        const completedTaskCounts = await userExchangeModel.aggregate([
            {
                $match: {
                    ownerId: userId,
                    status: "completed",
                },
            },
            {
                $group: {
                    _id: "$taskId",
                    count: { $sum: 1 },
                },
            },
        ]);

        const doneForBothSet = new Set(
            completedTaskCounts
                .filter((t) => t.count === 2)
                .map((t) => String(t._id))
        );

        completedList = completedList.map((item) => {
            console.log('item', doneForBothSet)
            const obj = item.toObject();
            obj.status = "Done for both";
            return obj;
        });

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            resMessage.GET_EXCHANGE_LIST,
            {
                completedTaskList: completedList,
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            }
        );
    } catch (error) {
        console.error("getCompletedList Error:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}



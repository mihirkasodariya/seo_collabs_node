import {
    websiteModel,
} from "../models/websiteModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";
import { userExchangeModel } from "../models/userExchangeModel.js";
import { messageModel } from "../models/chatModel.js";
import { activityModel } from "../models/activityModel.js";

export async function getDashboard(req, res) {
    const userId = req.user._id;

    try {

        const websites = await websiteModel.countDocuments({ userId });
        const totalWebsite = await websiteModel.countDocuments({});

        const completedExchanges = await userExchangeModel.countDocuments({
            status: "completed",
            $or: [
                { ownerId: userId },
                { userId: userId }
            ]
        });

        const waitingForApproval = await userExchangeModel.countDocuments({
            status: "waiting-for-approval",
            $or: [
                { ownerId: userId },
                { userId: userId }
            ]
        });


        const inProgress = await userExchangeModel.countDocuments({
            status: "inprogress",
            $or: [
                { ownerId: userId },
                { userId: userId }
            ]
        });

        const submitted = await userExchangeModel.countDocuments({
            status: "submitted",
            $or: [
                { ownerId: userId },
                { userId: userId }
            ]
        });

        const userActivity = await activityModel
            .find({ userId })
            .sort({ createdAt: -1 });

        const now = new Date();
        const startOfCurrentMonth = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            1, 0, 0, 0
        ));

        const endOfCurrentMonth = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() + 1,
            0, 23, 59, 59, 999
        ));

        const startOfLastMonth = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth() - 1,
            1, 0, 0, 0
        ));

        const endOfLastMonth = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            0, 23, 59, 59, 999
        ));

        const calculatePercent = (current, previous) => {
            if (!previous || previous === 0) return "0%";

            const diff = ((current - previous) / previous) * 100;
            const fixed = Math.abs(diff).toFixed(1);

            return diff >= 0 ? `+${fixed}%` : `-${fixed}%`;
        };

        const totalWebsitesCurrent = await websiteModel.countDocuments({
            createdAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
        });

        const totalWebsitesLast = await websiteModel.countDocuments({
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        const yourWebsitesCurrent = await websiteModel.countDocuments({
            userId,
            createdAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
        });

        const yourWebsitesLast = await websiteModel.countDocuments({
            userId,
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        const completedCurrent = await userExchangeModel.countDocuments({
            ownerId: userId,
            status: "completed",
            createdAt: { $gte: startOfCurrentMonth, $lte: endOfCurrentMonth }
        });

        const completedLast = await userExchangeModel.countDocuments({
            ownerId: userId,
            status: "completed",
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        });

        const startOfDayUTC = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
        ));

        const endOfDayUTC = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            23, 59, 59, 999
        ));

        const todayMessageCount = await messageModel.countDocuments({
            senderId: userId,
            createdAt: { $gte: startOfDayUTC, $lte: endOfDayUTC }
        });

        const topChatUsers = await messageModel.aggregate([
            {
                $match: {
                    $or: [{ senderId: userId }, { receiverId: userId }]
                }
            },
            {
                $project: {
                    chatUser: {
                        $cond: [
                            { $eq: ["$senderId", userId] },
                            "$receiverId",
                            "$senderId"
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$chatUser",
                    messageCount: { $sum: 1 }
                }
            },
            { $sort: { messageCount: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    userId: "$user._id",
                    name: "$user.name",
                    email: "$user.email",
                    img: "$user.img",
                    messageCount: 1
                }
            }
        ]);

        const resData = {
            yourWebsite: websites ?? 0,
            totalWebsite: totalWebsite ?? 0,
            completedExchanges: completedExchanges
                ? Math.floor(completedExchanges / 2)
                : 0,
            waitingForApproval: waitingForApproval ?? 0,
            inProgress: inProgress ?? 0,
            submitted: submitted ?? 0,

            percent: {
                totalWebsite: calculatePercent(totalWebsitesCurrent, totalWebsitesLast),
                yourWebsite: calculatePercent(yourWebsitesCurrent, yourWebsitesLast),
                completedExchanges: calculatePercent(completedCurrent, completedLast),
            },

            todayMessageCount: todayMessageCount ?? 0,
            userActivity: userActivity ?? [],
            topChatUsers: topChatUsers ?? []
        };

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            resMessage.WEBSITE_ADD,
            resData
        );

    } catch (error) {
        console.error("Error in getDashboard:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}



export async function getNotifications(req, res) {
    const userId = req.user._id;

    try {

        const userActivity = await activityModel.find({ userId }).sort({ createdAt: -1 });

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            resMessage.WEBSITE_ADD,
            userActivity
        );

    } catch (error) {
        console.error("Error in getDashboard:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}

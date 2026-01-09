import { activityModel } from "../models/activityModel.js";
import { authModel } from "../models/authModel.js";

async function cleanupOldActivities(userId) {
    const extraActivities = await activityModel
        .find({ userId })
        .sort({ createdAt: -1 }) 
        .skip(15)
        .select("_id");

    if (extraActivities.length > 0) {
        await activityModel.deleteMany({
            _id: { $in: extraActivities.map(a => a._id) },
        });
    }
}


export async function addActivity({
    userId,
    type,
    title,
}) {
    await activityModel.create({ userId, type, title, });
    await cleanupOldActivities(userId);
};

export async function addMessageReceivedActivity({
    receiverId,
    senderId,
}) {
    try {
        const sender = await authModel.findById(senderId).select("name");

        await activityModel.create({
            userId: receiverId,
            type: "MESSAGE_RECEIVED",
            title: `New Message from '${sender?.name || "User"}'`,
        });

        await cleanupOldActivities(receiverId);
    } catch (error) {
        console.error("Error adding message activity:", error);
    }
}

export async function addExchangeCreatedActivity({
    userId,
    websiteDomain,
}) {
    try {
        await activityModel.create({
            userId,
            type: "EXCHANGE_CREATED",
            title: `Link Exchange with '${websiteDomain}'`,
        });

        await cleanupOldActivities(userId);
    } catch (error) {
        console.error("Error adding exchange activity:", error);
    }
}

export async function addExchangeStatusActivity({
    userId,
    status,
}) {
    try {
        await activityModel.create({
            userId,
            type: "EXCHANGE_STATUS",
            title: `Status Change: '${status}'`,
        });

        await cleanupOldActivities(userId);
    } catch (error) {
        console.error("Exchange status activity error:", error);
    }
}



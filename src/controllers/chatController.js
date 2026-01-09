import { messageModel } from "../models/chatModel.js";
import { authModel } from "../models/authModel.js";
import mongoose from "mongoose";
import { userExchangeModel } from "../models/userExchangeModel.js";
import { connectedUsers } from "../socket/chatSocket.js"; // adjust path

export const saveMessage = async (senderId, receiverId, message, seen = false) => {
    console.log('receiverId', receiverId)
    const newMsg = await messageModel.create({ senderId, receiverId, message, seen });
    return newMsg;
};

export const getMessages = async (req, res) => {
    try {
        const { userId, receiverId } = req.params;
        console.log('userId', userId)
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID(s)" });
        };
        const getTask = await userExchangeModel.find({
            userId: userId,
            status: { $in: ["refuse", "rejected"] }
        }).lean();
        console.log('getTask', getTask)
        const messages = await messageModel.find({
            $or: [
                { senderId: userId, receiverId },
                { senderId: receiverId, receiverId: userId },
            ],
        }).sort({ createdAt: 1 });

        await messageModel.updateMany(
            { receiverId: userId, senderId: receiverId, seen: false },
            { $set: { seen: true } }
        );
        const resData = {
            messages,
            task: getTask
        }
        res.status(200).json({ success: true, data: resData });
    } catch (err) {
        console.error("Error fetching chat messages:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


export const getChatUsers = async (req, res) => {
    try {
        const userId = req.user._id;

        const sentTo = await messageModel.distinct("receiverId", { senderId: userId });
        const receivedFrom = await messageModel.distinct("senderId", { receiverId: userId });

        const allUserIds = [...new Set([...sentTo, ...receivedFrom])];

        if (allUserIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        const users = await authModel
            .find({ _id: { $in: allUserIds } })
            .select("_id name email img");

        const updatedUsers = await Promise.all(
            users.map(async (u) => {

                const lastMsg = await messageModel
                    .findOne({
                        $or: [
                            { senderId: userId, receiverId: u._id },
                            { senderId: u._id, receiverId: userId }
                        ]
                    })
                    .sort({ createdAt: -1 })
                    .lean();
                const unreadMessages = await messageModel.countDocuments({
                    senderId: u._id,
                    receiverId: userId,
                    seen: false
                });

                return {
                    ...u._doc,
                    lastMessage: lastMsg?.message || "",
                    unread: unreadMessages,
                    isOnline: connectedUsers.has(u._id.toString()),
                };
            })
        );

        res.status(200).json({
            success: true,
            count: updatedUsers.length,
            data: updatedUsers,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



import { messageModel } from "../models/chatModel.js";
import { authModel } from "../models/authModel.js"; // ✅ Assuming you already have this
import mongoose from "mongoose";

// 📩 Save Message
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
        }

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
        res.status(200).json({ success: true, data: messages });
    } catch (err) {
        console.error("Error fetching chat messages:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// 👥 Get All Chat Users (Users the current user has chatted with)
export const getChatUsers = async (req, res) => {
    try {
        // const { userId } = req.params;
        // console.log(req.params)
        // if (!userId) {
        //     return res.status(400).json({ success: false, message: "userId is required" });
        // }
        const userId = req.user._id
        console.log('userId', userId)
        console.log("🔍 Fetching chat users for:", userId);

        // Find unique receiverIds (people this user sent messages to)
        const sentTo = await messageModel.distinct("receiverId", { senderId: userId });

        // Find unique senderIds (people who sent messages to this user)
        const receivedFrom = await messageModel.distinct("senderId", { receiverId: userId });

        // Combine both arrays and remove duplicates
        const allUserIds = [...new Set([...sentTo, ...receivedFrom])];

        if (allUserIds.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        // Fetch user details for those IDs
        const users = await authModel
            .find({ _id: { $in: allUserIds } })
            .select("_id name email img");

        res.status(200).json({
            success: true,
            count: users.length,
            data: users,
        });
    } catch (error) {
        console.error("❌ Error fetching chat users:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching chat users",
        });
    }
};
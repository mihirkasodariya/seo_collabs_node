import { Server } from "socket.io";
import { saveMessage } from "../controllers/chatController.js";
import { messageModel } from "../models/chatModel.js";
import { authModel } from "../models/authModel.js";
import { addMessageReceivedActivity } from "../controllers/activityController.js";

export const connectedUsers = new Map();

export const initChatSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_BASE_URL,
            methods: ["GET", "POST"],
            credentials: true,
            allowedHeaders: ["Authorization", "x-user-id"],
        },
    });

    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // USER REGISTRATION 
        socket.on("registerUser", async (userId) => {
            connectedUsers.set(userId, socket.id);
            socket.userId = userId;

            console.log("Registered user:", userId);

            // UPDATE USER LIST IN REAL-TIME
            await sendUpdatedUserList(io, userId);
        });

        // SEND MESSAGE
        socket.on("sendMessage", async ({ senderId, receiverId, message, fileName, fileType, fileUrl }) => {
            try {
                const todayCount = await getTodayMessageCount(senderId);
                console.log('todayCount', todayCount)
                if (todayCount >= 50) {
                    socket.emit("messageError", {
                        code: "LIMIT_REACHED",
                        message: "Daily message limit reached"
                    });

                    return;
                }
                const newMsg = await saveMessage(senderId, receiverId, message, false, fileName, fileType, fileUrl);
                console.log("Message saved:", newMsg);

                // SEND TO RECEIVER IF ONLINE
                const receiverSocket = connectedUsers.get(receiverId);
                if (receiverSocket) {
                    io.to(receiverSocket).emit("receiveMessage", newMsg);
                }

                // SEND TO SENDER
                socket.emit("messageSent", newMsg);

                // UPDATE RECEIVER'S USER LIST
                await sendUpdatedUserList(io, receiverId);
                await addMessageReceivedActivity({
                    receiverId,
                    senderId,
                });
            } catch (err) {
                console.error("Error saving message:", err);
            }
        });

        // MARK SEEN
        socket.on("markSeen", async ({ userId, partnerId }) => {
            try {
                await messageModel.updateMany(
                    { receiverId: userId, senderId: partnerId, seen: false },
                    { $set: { seen: true } }
                );

                const senderSocket = connectedUsers.get(partnerId);
                if (senderSocket) {
                    io.to(senderSocket).emit("messageSeen", { userId, partnerId });
                }

                // UPDATE BOTH USER LISTS
                await sendUpdatedUserList(io, userId);
                await sendUpdatedUserList(io, partnerId);

            } catch (err) {
                console.error("Error marking seen:", err);
            }
        });

        // DISCONNECT
        socket.on("disconnect", async () => {
            console.log("Disconnected:", socket.id);

            for (let [userId, id] of connectedUsers.entries()) {
                if (id === socket.id) {
                    connectedUsers.delete(userId);

                    // UPDATE ONLINE LIST FOR ALL USERS
                    await broadcastUserListForAll(io);

                    break;
                }
            }
        });
    });

    return io;
};

export const getTodayMessageCount = async (senderId) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return messageModel.countDocuments({
        senderId,
        createdAt: {
            $gte: startOfDay,
            $lte: endOfDay,
        },
    });
};


// --------------------------------------------------------------
// FUNCTION 1: SEND UPDATED USER LIST TO SPECIFIC USER
// --------------------------------------------------------------
async function sendUpdatedUserList(io, userId) {
    try {
        // Get distinct chat users
        const sentTo = await messageModel.distinct("receiverId", { senderId: userId });
        const receivedFrom = await messageModel.distinct("senderId", { receiverId: userId });

        const allUserIds = [...new Set([...sentTo, ...receivedFrom])];

        const users = await authModel
            .find({ _id: { $in: allUserIds } })
            .select("_id name email img blocksList blockedBy country isSubscription isReportUser isActive");

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
                    // isBlock: u.isBlock,
                    lastMessage: lastMsg,
                    unread: unreadMessages,
                    isOnline: connectedUsers.has(u._id.toString()),
                };
            })
        );

        const userSocket = connectedUsers.get(userId);
        if (userSocket) {
            io.to(userSocket).emit("chatUserListUpdate", updatedUsers);
        }

    } catch (error) {
        console.error("Error updating chat list:", error);
    }
}



// --------------------------------------------------------------
// FUNCTION 2: BROADCAST USER LIST TO ALL CONNECTED USERS
// --------------------------------------------------------------
async function broadcastUserListForAll(io) {
    for (let userId of connectedUsers.keys()) {
        await sendUpdatedUserList(io, userId);
    }
}

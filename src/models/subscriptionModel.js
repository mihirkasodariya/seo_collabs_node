import mongoose, { model } from "mongoose";
const { Schema, Types } = mongoose;
import { dbTableName } from "../utils/constants.js";

const subscriptionSchema = new Schema(
    {
        userId: { type: Types.ObjectId, ref: dbTableName.AUTH, required: true, index: true, },
        planId: { type: Types.ObjectId, ref: dbTableName.PLANS, required: true, },
        razorpayOrderId: { type: String, required: true, unique: true, },
        status: { type: String, enum: ["ACTIVE", "EXPIRED", "CANCELLED"], default: "ACTIVE", index: true, },
        startedAt: { type: Date, required: true, },
        expiresAt: { type: Date, required: true, index: true, },
        cancelledAt: { type: Date, default: null, },
        isActive: { type: Boolean, default: true, },
    },
    {
        timestamps: true,
    }
);

export const subscriptionModel = model(dbTableName.SUBSCRIPTION, subscriptionSchema);

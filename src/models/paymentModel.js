import mongoose, { model } from "mongoose";
const { Schema, Types } = mongoose;
import { dbTableName } from "../utils/constants.js";

const paymentSchema = new Schema(
    {
        userId: { type: Types.ObjectId, ref: dbTableName.AUTH, required: true, index: true, },
        planId: { type: Types.ObjectId, ref: dbTableName.PLANS, required: true, },
        usdAmount: { type: Number, required: true, },
        inrAmount: { type: Number, required: true, },
        exchangeRate: { type: Number, required: true, },
        amountPaid: { type: Number, required: true, },
        razorpayOrderId: { type: String, required: true, unique: true, },
        razorpayPaymentId: { type: String, default: null, },
        razorpaySignature: { type: String, default: null, },
        status: { type: String, enum: ["CREATED", "SUCCESS", "FAILED", "REFUNDED"], default: "CREATED", index: true, },
        paidAt: { type: Date, default: null, },
        failureReason: { type: String, default: null, },
    },
    {
        timestamps: true,
    }
);

export const paymentModel = model(dbTableName.PAYMENT_HISTORY, paymentSchema);

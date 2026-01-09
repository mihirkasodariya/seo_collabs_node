import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import axios from "axios";
import { paymentModel } from "../models/paymentModel.js";
import { subscriptionModel } from "../models/subscriptionModel.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


export async function createPayment(req, res) {
    try {
        const { amount, planId } = req.body;
        const userId = req.user._id;

        const rateRes = await axios.get(
            "https://open.er-api.com/v6/latest/USD"
        );
        const rate = rateRes.data.rates.INR;

        const inrAmount = Math.round(Number(amount) * rate);
        const amountInPaise = inrAmount * 100;
        console.log('amountInPaise', amountInPaise)
        const receipt = `u${userId.toString().slice(-6)}_${Date.now()}`;

        const order = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt,
            notes: {
                userId,
                planId,
                usdAmount: amount,
                rate,
                inrAmount,
            },
        });
        await paymentModel.create({
            userId,
            planId,
            usdAmount: amount,
            inrAmount,
            exchangeRate: rate,
            amountPaid: amountInPaise,
            razorpayOrderId: order.id,
            status: "CREATED",
        });

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.ACTION_COMPLETE, {
            order,
            usdAmount: amount,
            inrAmount,
            rate,
        }
        );

    } catch (err) {
        console.error("Create Payment Error:", err);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, err);
    }
}

export async function verifyPayment(req, res) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, amount, planTime } = req.body;
        const userId = req.user._id;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign).digest("hex");
        if (expectedSignature !== razorpay_signature) {
            return response.success(res, resStatusCode.CLIENT_ERROR, resMessage.ACTION_COMPLETE, {});
        };

        await paymentModel.updateOne(
            { razorpayOrderId: razorpay_order_id },
            {
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                status: "SUCCESS",
                paidAt: new Date(),
            }
        );
        const PLAN_DAYS_MAP = {
            "Month": 30,
            "One Month": 30,
            "Two Month": 60,
            "Three Month": 90,
            "Four Month": 120,
            "Five Month": 150,
            "Six Month": 180,
            "Seven Month": 210,
            "Eight Month": 240,
            "Nine Month": 270,
            "Ten Month": 300,
            "Eleven Month": 330,
            "One Year": 365,
        };

        const days = PLAN_DAYS_MAP[planTime];
        if (!days) {
            throw new Error("Invalid plan duration");
        }

        const existingSubscription = await subscriptionModel
            .findOne({
                userId,
                status: "ACTIVE",
                expiresAt: { $gte: new Date() },
            })
            .sort({ expiresAt: -1 });

        let startDate;
        let endDate;

        if (existingSubscription) {
            startDate = new Date(existingSubscription.expiresAt);
        } else {
            startDate = new Date();
        }

        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + days);

        const subscription = await subscriptionModel.create({
            userId,
            planId,
            razorpayOrderId: razorpay_order_id,
            status: "ACTIVE",
            startedAt: startDate,
            expiresAt: endDate,
        });

        console.log("Subscription created:", subscription);

        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.ACTION_COMPLETE, {});
    } catch (err) {
        console.log('err', err)
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, err);
    }
}



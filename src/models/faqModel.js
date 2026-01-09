import Joi from "joi";
import mongoose, { model } from "mongoose";
const { Schema, Types } = mongoose;
import { dbTableName } from "../utils/constants.js";

const faqSchema = new Schema(
    {
        tab: { type: String, required: true, enum: ["General", "Pricing & Fees", "Features", "Account"], },
        question: { type: String, required: true, },
        answer: { type: String, required: true, },
        order: { type: Number, default: 0, },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);
export const faqModel = model(dbTableName.FAQ, faqSchema);

export const createFaqValidation = Joi.object({
    tab: Joi.string().valid("General", "Pricing & Fees", "Features", "Account").required().messages({
        "any.required": "Tab is required",
        "string.base": "Tab must be a string",
        "any.only": "Tab must be one of General, Pricing & Fees, Features, Account",
    }),
    question: Joi.string().trim().min(5).required().messages({
        "any.required": "Question is required",
        "string.base": "Question must be a string",
        "string.empty": "Question cannot be empty",
        "string.min": "Question must be at least 5 characters long",
    }),
    answer: Joi.string().trim().min(5).required().messages({
        "any.required": "Answer is required",
        "string.base": "Answer must be a string",
        "string.empty": "Answer cannot be empty",
        "string.min": "Answer must be at least 5 characters long",
    }),
    order: Joi.number().integer().min(0).default(0).messages({
        "number.base": "Order must be a number",
        "number.integer": "Order must be an integer",
        "number.min": "Order cannot be negative",
    }),
    isActive: Joi.boolean().default(true).messages({
        "boolean.base": "isActive must be true or false",
    }),
});


export const idValidation = Joi.object({
    id: Joi.string().length(24).hex().required().messages({
        "string.base": "ID must be a string",
        "string.empty": "ID is required",
        "string.length": "ID must be exactly 24 characters",
        "string.hex": "ID must be a valid hexadecimal string",
        "any.required": "ID is required",
    }),
});
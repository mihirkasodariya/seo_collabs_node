import Joi from "joi";
import mongoose, { model } from "mongoose";
const { Schema, Types } = mongoose;
import { dbTableName } from "../utils/constants.js";

const userExchangeSchema = new Schema(
    {
        taskId: { type: Number, required: true },
        userId: { type: Types.ObjectId, ref: dbTableName.AUTH, require: true },
        ownerId: { type: Types.ObjectId, ref: dbTableName.AUTH, require: true },
        url: { type: String, required: true },
        landingPage: { type: String, required: true },
        anchorText: { type: String, required: true },
        instructions: { type: String, required: false },
        improvementNotes: { type: String, default: "" },
        status: { type: String, required: true },
        isSeen: { type: Boolean, default: false },
        myExchange: { type: String, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);
export const userExchangeModel = model(dbTableName.USER_EXCHANGE, userExchangeSchema);

export const userExchangeValidation = Joi.object({
    userId: Joi.string().required().messages({
        "string.empty": "User ID is required",
        "any.required": "User ID is required",
    }),
    ownerId: Joi.string().required().messages({
        "string.empty": "Owner ID is required",
        "any.required": "Owner ID is required",
    }),
    url: Joi.string().uri().required().messages({
        "string.empty": "URL is required",
        "string.uri": "URL must be a valid link",
        "any.required": "URL is required",
    }),
    landingPage: Joi.string().uri().required().messages({
        "string.empty": "Landing Page URL is required",
        "string.uri": "Landing Page must be a valid URL",
        "any.required": "Landing Page is required",
    }),
    anchorText: Joi.string().required().messages({
        "string.empty": "Anchor text is required",
        "any.required": "Anchor text is required",
    }),
    instructions: Joi.string().optional().allow("").messages(),
    reqTaskId: Joi.string().optional(),
    status: Joi.string().valid("waiting-for-approval", "refuse", "inprogress", "submitted", "improvement", "completed", "rejected").required().messages({
        "any.only": "Invalid status value",
        "any.required": "Status is required",
    }),
    myExchange: Joi.string().valid("verify", "pending").optional().messages({
        "any.only": "myExchange must be either 'verify' or 'pending'",
        "string.base": "myExchange must be a string",
    }),
    isActive: Joi.boolean().default(true),
});

export const idValidation = Joi.object({
    taskId: Joi.string().required().messages({
        "string.base": "taskId must be a string",
        "string.empty": "taskId is required",
        "any.required": "taskId is required",
    }),
    id: Joi.string().required().messages({
        "string.base": "_id must be a string",
        "string.empty": "_id is required",
        "any.required": "_id is required",
    }),
});

export const idUpdateStatusValidation = Joi.object({
    id: Joi.string().required().messages({
        "string.base": "taskId must be a string",
        "string.empty": "taskId is required",
        "any.required": "taskId is required",
    }),
});


export const seenExchangeIdValidation = Joi.object({
    ids: Joi.array().min(1).required().messages({
        "array.base": "ID must be an array",
        "array.min": "ID array cannot be empty",
        "any.required": "ID array is required",
    }),
});

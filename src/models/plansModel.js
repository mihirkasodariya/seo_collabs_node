import Joi from "joi";
import mongoose, { model } from "mongoose";
const { Schema } = mongoose;
import { dbTableName } from "../utils/constants.js";

const featureSchema = new Schema(
    {
        text: { type: String, required: true },
        icon: { type: String, required: true },
    }
);

const planSchema = new Schema(
    {
        name: { type: String, required: true },
        subtitle: { type: String, required: true },
        price: { type: String, required: true },
        planTime: { type: String, required: true },
        oneTime: { type: Boolean, default: false },
        recommended: { type: Boolean, default: false },
        color: { type: String },
        borderColor: { type: String },
        isActive: { type: Boolean, default: true },
        isDelete: { type: Boolean, default: false },
        maxWebsites: { type: String },
        viewWebsitesLimit: { type: String },
        noFilterView: { type: String },
        connectPeopleLimit: { type: String },
        dailyMessageLimit: { type: String },
        individualProfilesOnly: { type: String },
        cantInteractPremium: { type: String },
        emailSupportOnly: { type: String },
        noLiveChatPrioritySupport: { type: String },
        basicLinkTrackingReport: { type: String },
        backlinkTrackingReportMonth: { type: String },
        maySeeAdvertisements: { type: String },
        features: [featureSchema],
    },
    { timestamps: true }
);
export const planModel = model(dbTableName.PLANS, planSchema);

export const featureValidation = Joi.object({
    text: Joi.string().required().messages({
        "string.base": "Feature text must be a string.",
        "string.empty": "Feature text is required.",
        "any.required": "Feature text is required."
    }),
    icon: Joi.string().required().messages({
        "string.base": "Feature icon must be a string.",
        "string.empty": "Feature icon is required.",
        "any.required": "Feature icon is required."
    })
});

export const planValidation = Joi.object({
    name: Joi.string().required().messages({
        "string.base": "Plan name must be a string.",
        "string.empty": "Plan name is required.",
        "any.required": "Plan name is required."
    }),
    subtitle: Joi.string().required().messages({
        "string.base": "Subtitle must be a string.",
        "string.empty": "Subtitle is required.",
        "any.required": "Subtitle is required."
    }),
    price: Joi.string().required().messages({
        "string.base": "Price must be a string.",
        "string.empty": "Price is required.",
        "any.required": "Price is required."
    }),
    oneTime: Joi.boolean().optional().messages({
        "boolean.base": "oneTime must be true or false."
    }),
    features: Joi.array().items(featureValidation).required().min(1).messages({
        "array.base": "Features must be an array.",
        "array.min": "At least one feature is required.",
        "any.required": "Features list is required."
    }),
    recommended: Joi.boolean().optional().messages({
        "boolean.base": "Recommended must be true or false."
    }),
    color: Joi.string().optional().messages({
        "string.base": "Color must be a string."
    }),
    borderColor: Joi.string().optional().messages({
        "string.base": "Border color must be a string."
    })
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
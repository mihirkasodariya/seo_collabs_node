import {
    idValidation,
    planModel,
    planValidation
} from "../models/plansModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";

export async function addPlan(req, res) {
    try {
        let features = [];

        if (Array.isArray(req.body.features)) {
            features = req.body.features.map((item) =>
                typeof item === "string" ? JSON.parse(item) : item
            );
        } else if (req.body.features) {
            features = [req.body.features];
        };

        if (req.uploadedImages?.length > 0) {
            req.uploadedImages.forEach((fileObj) => {
                const match = fileObj.field.match(/features\[(\d+)\]\.icon/);
                if (match) {
                    const index = Number(match[1]);
                    if (features[index]) {
                        features[index].icon = fileObj.url;
                    };
                };
            });
        };

        const planData = {
            name: req.body.name,
            subtitle: req.body.subtitle,
            price: req.body.price,
            planTime: req.body.planTime,
            oneTime: req.body.oneTime === "true" || req.body.oneTime === true,
            recommended: req.body.recommended === "true" || req.body.recommended === true,
            color: req.body.color,
            borderColor: req.body.borderColor,
            isActive: req.body.isActive === "true" || req.body.isActive === true,
            maxWebsites: req.body.maxWebsites,
            viewWebsitesLimit: req.body.viewWebsitesLimit,
            noFilterView: req.body.noFilterView,
            connectPeopleLimit: req.body.connectPeopleLimit,
            dailyMessageLimit: req.body.dailyMessageLimit,
            individualProfilesOnly: req.body.individualProfilesOnly,
            cantInteractPremium: req.body.cantInteractPremium,
            emailSupportOnly: req.body.emailSupportOnly,
            noLiveChatPrioritySupport: req.body.noLiveChatPrioritySupport,
            basicLinkTrackingReport: req.body.basicLinkTrackingReport,
            backlinkTrackingReportMonth: req.body.backlinkTrackingReportMonth,
            maySeeAdvertisements: req.body.maySeeAdvertisements,
            features,
        };
        const createdPlan = await planModel.create(planData);
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.PLAN_ADD, createdPlan);
    } catch (error) {
        console.error("Error in addPlan:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export async function getAllPlan(req, res) {
    try {
        let { page = 1, limit = 10 } = req.query;
        page = Number(page);
        limit = Number(limit);

        // const filter = { isActive: true };
        const totalPlans = await planModel.countDocuments();

        const plans = await planModel.find().skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 });
        console.log('plans', plans)
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.PLAN_GET, {
            records: plans,
            total: totalPlans,
            page,
            limit,
            totalPages: Math.ceil(totalPlans / limit),
        });
    } catch (error) {
        console.error("getAllPlan Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

    export async function getPlanById(req, res) {
    const { id: _id } = req.params;

    const { error } = idValidation.validate(req.params);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const getPlanById = await planModel.findOne({ _id });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.PLAN_GET, getPlanById);
    } catch (error) {
        console.error("getPlanById Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export const updatePlanById = async (req, res) => {
    const { id: _id } = req.params;

    const { error } = idValidation.validate(req.params);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };

    try {
        let features = [];

        if (Array.isArray(req.body.features)) {
            features = req.body.features.map((f) =>
                typeof f === "string" ? JSON.parse(f) : f
            );
        } else if (req.body.features) {
            features = [req.body.features];
        };

        if (req.uploadedImages?.length > 0) {
            req.uploadedImages.forEach((fileObj) => {
                const match = fileObj.field.match(/features\[(\d+)\]\.icon/);
                if (match) {
                    const index = Number(match[1]);
                    if (features[index]) {
                        features[index].icon = fileObj.url;
                    };
                };
            });
        };

        const updateData = {
            name: req.body.name,
            subtitle: req.body.subtitle,
            price: req.body.price,
            oneTime: req.body.oneTime === "true" || req.body.oneTime === true,
            recommended: req.body.recommended === "true" || req.body.recommended === true,
            color: req.body.color,
            borderColor: req.body.borderColor,
            isActive: req.body.isActive === "true" || req.body.isActive === true,
            maxWebsites: req.body.maxWebsites,
            viewWebsitesLimit: req.body.viewWebsitesLimit,
            noFilterView: req.body.noFilterView,
            connectPeopleLimit: req.body.connectPeopleLimit,
            dailyMessageLimit: req.body.dailyMessageLimit,
            individualProfilesOnly: req.body.individualProfilesOnly,
            cantInteractPremium: req.body.cantInteractPremium,
            emailSupportOnly: req.body.emailSupportOnly,
            noLiveChatPrioritySupport: req.body.noLiveChatPrioritySupport,
            basicLinkTrackingReport: req.body.basicLinkTrackingReport,
            backlinkTrackingReportMonth: req.body.backlinkTrackingReportMonth,
            maySeeAdvertisements: req.body.maySeeAdvertisements,
            features,
        };

        const updatedPlan = await planModel.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true, runValidators: true }
        );
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.PLAN_UPDATED, updatedPlan);
    } catch (error) {
        console.log("updatePlanById Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

export const deletePlanById = async (req, res) => {
    const { id: _id } = req.params;

    const { error } = idValidation.validate(req.params);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };

    try {
        const deletePlan = await planModel.findByIdAndUpdate(
            _id,
            { $set: { isDelete: true } },
            { new: true, runValidators: true }
        );
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.PLAN_UPDATED, deletePlan);
    } catch (error) {
        console.log("updatePlanById Error:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};
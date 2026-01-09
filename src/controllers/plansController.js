import {
    idValidation,
    planModel,
    planValidation
} from "../models/plansModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";
import { subscriptionModel } from "../models/subscriptionModel.js";
import { paymentModel } from "../models/paymentModel.js";

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
        console.log('req', req.body)
        const planData = {
            name: req.body.name,
            subtitle: req.body.subtitle,
            price: req.body.price,
            planTime: req.body.planTime,
            isActive: req.body.isActive === "true" || req.body.isActive === true,
            maxWebsites: req.body.maxWebsites,
            viewWebsitesLimit: req.body.viewWebsitesLimit,
            noFilterView: req.body.noFilterView,
            connectPeopleLimit: req.body.connectPeopleLimit,
            dailyMessageLimit: req.body.dailyMessageLimit,
            individualProfilesOnly: req.body.individualProfilesOnly,
            cantInteractPremium: req.body.cantInteractPremium,
            emailSupportOnly: req.body.emailSupportOnly,
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

export async function getAllUserPlan(req, res) {
    try {
        const plans = await planModel
            .find({ isActive: true, isDelete: false })
            .sort({ createdAt: -1 })
            .lean();

        const planDurationMap = {
            1: "Month",
            2: "Two Month",
            3: "Three Month",
            4: "Four Month",
            5: "Five Month",
            6: "Six Month",
            7: "Seven Month",
            8: "Eight Month",
            9: "Nine Month",
            10: "Ten Month",
            11: "Eleven Month",
            12: "One Year",
        };

        const updatedPlans = plans.map(plan => ({
            ...plan,
            planTime: planDurationMap[plan.planTime] || "custom plan",
        }));

        return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            resMessage.PLAN_GET,
            updatedPlans
        );
    } catch (error) {
        console.error("getAllUserPlan Error:", error);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            {}
        );
    }
}

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
            isActive: req.body.isActive === "true" || req.body.isActive === true,
            maxWebsites: req.body.maxWebsites,
            viewWebsitesLimit: req.body.viewWebsitesLimit,
            noFilterView: req.body.noFilterView,
            connectPeopleLimit: req.body.connectPeopleLimit,
            dailyMessageLimit: req.body.dailyMessageLimit,
            individualProfilesOnly: req.body.individualProfilesOnly,
            cantInteractPremium: req.body.cantInteractPremium,
            emailSupportOnly: req.body.emailSupportOnly,
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


export async function getUserCurrentPlan(req, res) {
    try {
        const userId = req.user._id;
        const now = new Date();

        const subscription = await subscriptionModel
            .findOne({
                userId,
                status: "ACTIVE",
                expiresAt: { $gte: now },
            })
            .sort({ expiresAt: 1 })
            .populate("planId");

        if (subscription) {
            return response.success(res, resStatusCode.ACTION_COMPLETE, "Active plan fetched successfully", {
                hasPlan: true,
                isFreePlan: false,
                plan: {
                    planId: subscription.planId?._id || subscription.planId,
                    name: subscription.planId?.name,
                    price: subscription.planId?.price,
                    startedAt: subscription.startedAt,
                    expiresAt: subscription.expiresAt,
                    daysLeft: Math.ceil(
                        (subscription.expiresAt - now) / (1000 * 60 * 60 * 24)
                    ),
                },
            }
            );
        }

        const freePlan = await planModel.findOne({ price: "0.00", isActive: true, isDelete: false, });

        if (!freePlan) {
            return response.success(res, resStatusCode.ACTION_COMPLETE, "No plan found", {
                hasPlan: false,
                plan: null,
            }
            );
        }

        return response.success(res, resStatusCode.ACTION_COMPLETE, "Default free plan applied", {
            hasPlan: true,
            isFreePlan: true,
            plan: {
                planId: freePlan._id,
                name: freePlan.name,
                price: freePlan.price,
                startedAt: null,
                expiresAt: null,
                daysLeft: null,
            },
        }
        );
    } catch (err) {
        console.error("Get Current Plan Error:", err);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, err);
    }
}


export async function getUserPlanHistory(req, res) {
    try {
        const userId = req.user._id;
        const now = new Date();

        const subscriptions = await subscriptionModel
            .find({ userId })
            .populate("planId")
            .sort({ startedAt: 1 });

        const payments = await paymentModel
            .find({ userId })
            .sort({ createdAt: -1 });

        const paymentMap = new Map();
        payments.forEach((p) => {
            paymentMap.set(p.razorpayOrderId, p);
        });

        let activeFound = false;

        const history = subscriptions.map((sub) => {
            const payment = paymentMap.get(sub.razorpayOrderId);

            const isActive =
                !activeFound &&
                sub.status === "ACTIVE" &&
                sub.expiresAt >= now;

            if (isActive) activeFound = true;

            return {
                id: sub._id,
                planName: sub.planId?.name,
                startDate: sub.startedAt,
                endDate: sub.expiresAt,
                paymentId: payment?.razorpayPaymentId || sub.razorpayOrderId,
                status:
                    payment?.status === "SUCCESS"
                        ? "paid"
                        : payment?.status === "FAILED"
                            ? "failed"
                            : "pending",
                amount: payment?.usdAmount || Number(sub.planId?.price || 0),
                isCurrent: isActive,
            };
        });

       if (!activeFound) {
            const freePlan = await planModel.findOne({
                price: "0.00",
                isActive: true,
                isDelete: false,
            });

            if (freePlan) {
                history.unshift({
                    id: "FREE_PLAN",
                    planName: freePlan.name,
                    startDate: null,
                    endDate: null,
                    paymentId: null,
                    status: "paid",
                    amount: 0,
                    isCurrent: true,
                });
            }
        }

       return response.success(
            res,
            resStatusCode.ACTION_COMPLETE,
            "User plan history fetched successfully",
            {
                total: history.length,
                plans: history,
            }
        );
    } catch (err) {
        console.error("Get User Plan History Error:", err);
        return response.error(
            res,
            resStatusCode.INTERNAL_SERVER_ERROR,
            resMessage.INTERNAL_SERVER_ERROR,
            err
        );
    }
}

import {
    faqModel,
    createFaqValidation,
    idValidation,
} from "../models/faqModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";

export async function addfaq(req, res) {
    const { tab, question, answer, order } = req.body;
    const { error } = createFaqValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const newFAQ = await faqModel.create({ tab, question, answer, order });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.WEBSITE_ADD, newFAQ);
    } catch (error) {
        console.error("Error in addWebsite:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};


export async function getAllFAQ(req, res) {
    try {
        const faqs = await faqModel.find({ isActive: true }).sort({ order: 1 }).lean();

        const groupedFAQs = {};

        faqs.forEach((faq) => {
            if (!groupedFAQs[faq.tab]) {
                groupedFAQs[faq.tab] = [];
            }

            groupedFAQs[faq.tab].push({
                _id : faq._id,
                q: faq.question,
                a: faq.answer,
            });
        });

        return response.success(res, resStatusCode.ACTION_COMPLETE, "FAQ list fetched successfully", groupedFAQs);

    } catch (error) {
        console.error("Error in getAllFAQ:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
}


export const deleteFaq = async (req, res) => {
    const { id } = req.params;

    const { error } = idValidation.validate({ id });
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    }

    try {
        const result = await faqModel.findByIdAndDelete(id);

        if (!result) {
            return response.error(res, resStatusCode.CLIENT_ERROR, "FAQ not found");
        }

        return response.success(res, resStatusCode.ACTION_COMPLETE, "FAQ deleted successfully", {});

    } catch (error) {
        console.error("Error in deleteFaq:", error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    }
};

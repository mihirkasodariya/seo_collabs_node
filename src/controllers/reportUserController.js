import {
    reportUserModel,
    reportUserValidation,
    idValidation
} from "../models/reportUserModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";

export async function addReportUser(req, res) {
    const { reportedBy, reportedUser, reason, message } = req.body;
    const { error } = reportUserValidation.validate(req.body);
    if (error) {
        return response.error(res, resStatusCode.CLIENT_ERROR, error.details[0].message);
    };
    try {
        const addReportUser = await reportUserModel.create({ reportedBy, reportedUser, reason, message });
        return response.success(res, resStatusCode.ACTION_COMPLETE, resMessage.ADD_REPORT_USER, addReportUser)
    } catch (error) {
        console.error('Error in addReportUser:', error);
        return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
    };
};

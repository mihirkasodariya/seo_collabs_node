import { Router } from "express";
const router = Router();
import {
    addPlan,
    deletePlanById,
    getAllPlan,
    getPlanById,
    updatePlanById,
} from "../controllers/plansController.js";
import { validateAccessToken, authorizeRoles, otpBlockMiddleware } from "../middleware/auth.js";
import { planIconsImage } from "../utils/imageHelper.js";


router.post("/addPlan", planIconsImage, validateAccessToken, authorizeRoles(0), addPlan);
router.get("/getAllPlan", validateAccessToken, authorizeRoles(0), getAllPlan);
router.get("/getPlanById/:id", validateAccessToken, authorizeRoles(0), getPlanById);
router.put("/updatePlanById/:id", planIconsImage, validateAccessToken, authorizeRoles(0), updatePlanById);
router.delete("/deletePlanById/:id", validateAccessToken, authorizeRoles(0), deletePlanById);


export default router;
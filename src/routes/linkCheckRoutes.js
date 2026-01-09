import { Router } from "express";
const router = Router();
import { getLinkCheck } from "../controllers/linkCheckController.js";
import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

router.post("/getLinkCheck", validateAccessToken, getLinkCheck);


export default router;
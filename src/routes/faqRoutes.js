import { Router } from "express";
const router = Router();
import { addfaq, deleteFaq, getAllFAQ } from "../controllers/faqController.js";
import { authorizeRoles, validateAccessToken } from "../middleware/auth.js";


router.post("/addFAQ", validateAccessToken, authorizeRoles(0), addfaq);
router.get("/getAllFAQ", getAllFAQ);
router.delete("/deleteFaq/:id", deleteFaq);

export default router;
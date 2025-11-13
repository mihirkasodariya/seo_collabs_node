import { Router } from "express";
const router = Router();
import {
    addWebsite,
    getWebsiteList,
    getWebsite,
    updateWebsite,
    deleteWebsite
} from "../controllers/websiteController.js";
import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

router.post("/addWebsite", validateAccessToken, addWebsite);
router.get("/getWebsiteList", validateAccessToken, getWebsiteList);
router.get("/getWebsite/:id", validateAccessToken, getWebsite);
router.put("/updateWebsite/:id", validateAccessToken, updateWebsite);
router.delete("/deleteWebsite/:id", validateAccessToken, deleteWebsite);

export default router;
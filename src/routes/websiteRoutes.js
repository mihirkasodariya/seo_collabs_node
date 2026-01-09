import { Router } from "express";
const router = Router();
import {
    addWebsite,
    getWebsiteList,
    getWebsite,
    updateWebsite,
    verifyWebsite,
    deleteWebsites
} from "../controllers/websiteController.js";
import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

router.post("/addWebsite", validateAccessToken, addWebsite);
router.get("/getWebsiteList", validateAccessToken, getWebsiteList);
router.get("/getWebsite/:id", validateAccessToken, getWebsite);
router.put("/updateWebsite/:id", validateAccessToken, updateWebsite);
router.post("/deleteWebsites", validateAccessToken, deleteWebsites);
router.post("/verifyWebsite", validateAccessToken, verifyWebsite);

export default router;
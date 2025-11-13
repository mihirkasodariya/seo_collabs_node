import { Router } from "express";
const router = Router();
import {
   getLinkExchangeList
} from "../controllers/exchangeController.js";
import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

// router.post("/addWebsite", validateAccessToken, addWebsite);
router.get("/getLinkExchangeList", validateAccessToken, getLinkExchangeList);
// router.get("/getWebsite/:id", validateAccessToken, getWebsite);
// router.put("/updateWebsite/:id", validateAccessToken, updateWebsite);
// router.delete("/deleteWebsite/:id", validateAccessToken, deleteWebsite);

export default router;
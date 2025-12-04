import { Router } from "express";
const router = Router();
import {
   getLinkExchangeList
} from "../controllers/exchangeController.js";
import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

router.get("/getLinkExchangeList", validateAccessToken, getLinkExchangeList);

export default router;
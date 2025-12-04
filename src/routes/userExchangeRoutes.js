import { Router } from "express";
const router = Router();
import {
   addRequestExchange,
   getAllMyExchangePendingVerify,
   getAllRequestExchange,
   getRequestExchangeById,
   updateExchangeStatusById,
   updateSeenStatusRequestExchange
} from "../controllers/userExchangeController.js";
import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

router.post("/addRequestExchange", validateAccessToken, addRequestExchange);
router.get("/getRequestExchangeById/:taskId/:id", validateAccessToken, getRequestExchangeById);
router.get("/getAllRequestExchange", validateAccessToken, getAllRequestExchange);
router.get("/getAllMyExchangePendingVerify", validateAccessToken, getAllMyExchangePendingVerify);
router.patch("/updateExchangeStatusById/:id", validateAccessToken, updateExchangeStatusById);
router.patch("/updateSeenStatusRequestExchange", validateAccessToken, updateSeenStatusRequestExchange);

export default router;
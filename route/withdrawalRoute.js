import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getWithdrawalsController,
  requestWithdrawalController,
} from "../controller/withdrawalController";

const router = express.Router();

router.post("/withdrawal", authMiddleware, requestWithdrawalController);
router.get("/withdrawal", authMiddleware, getWithdrawalsController);

export default router;

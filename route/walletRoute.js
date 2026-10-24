import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createWalletController,
  getTransactionsController,
  getWalletController,
  getTransactionController,
} from "../controller/walletController.js";
import {
  fundValidator,
  verifyFundValidator,
} from "../validation/fundingValidator.js";
import {
  startFundingController,
  verifyFundingController,
} from "../controller/fundingController.js";
import { validate } from "../middleware/validation.js";
const router = express.Router();

router.post("/create-wallet", authMiddleware, createWalletController);
router.get("/wallet", authMiddleware, getWalletController);
router.post(
  "/wallet/fund",
  authMiddleware,
  fundValidator,
  validate,
  startFundingController,
);
router.get(
  "/wallet/fund/verify/:reference",
  authMiddleware,
  verifyFundValidator,
  validate,
  verifyFundingController,
);
router.get("/wallet/history", authMiddleware, getTransactionsController);
router.get("wallet/history/:id", authMiddleware, getTransactionController);
export default router;

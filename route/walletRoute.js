import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createWallletController,
  getTransactionsController,
  getWalletController,
  getTransactionController,
} from "../controller/walletController.js";

const router = express.Router();

router.post("/create-wallet", authMiddleware, createWallletController);
router.get("/wallet", authMiddleware, getWalletController);
router.get("/wallet/history", authMiddleware, getTransactionsController);
router.get("wallet/history/:id", authMiddleware, getTransactionController);
export default router;

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createWallletController,
  getTransactionsController,
  getWalletController,
} from "../controller/walletController.js";

const router = express.Router();

router.post("/create-wallet", authMiddleware, createWallletController);
router.get("/wallet", authMiddleware, getWalletController);
router.get("/wallet/history", authMiddleware, getTransactionsController);

export default router;

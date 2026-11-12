import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { customerAmountInEscrowController } from "../controller/escrowController.js";

const router = express.Router();

router.get("/balance/customers", authMiddleware, customerAmountInEscrowController);

export default router;

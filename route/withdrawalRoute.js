import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getWithdrawalsController,
  requestWithdrawalController,
} from "../controller/withdrawalController.js";

import { body } from "express-validator";
import { validate } from "../middleware/validation.js";

export const withdrawalValidator = [
  body("amount")
    .isInt({ min: 100000 })
    .withMessage("Amount must be a whole number of kobo, at least 100000"),
];
const router = express.Router();

router.post(
  "/withdraw",
  authMiddleware,
  withdrawalValidator,
  validate,
  requestWithdrawalController,
);
router.get("/withdrawal", authMiddleware, getWithdrawalsController);

export default router;

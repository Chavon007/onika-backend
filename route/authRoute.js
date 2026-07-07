import express from "express";
import { createAccountValidator } from "../validation/authvalidation.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validation.js";
import createAccount from "../controller/authController.js";
const router = express.Router();

router.post(
  "/create-account",
  authMiddleware,
  createAccountValidator,
  validate,
  createAccount,
);

export default router;

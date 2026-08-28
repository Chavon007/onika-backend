import express from "express";
import {
  createAccountValidator,
  loginValidator,
  OTPValidator,
} from "../validation/authvalidation.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validation.js";
import createAccount from "../controller/authController.js";
import { login, verifyOtp } from "../controller/authController.js";
const router = express.Router();

router.post("/signup", createAccountValidator, validate, createAccount);

router.post("/login", loginValidator, validate, login);
router.post("/verify-otp", OTPValidator, validate, verifyOtp);

export default router;

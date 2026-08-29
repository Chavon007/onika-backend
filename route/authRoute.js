import express from "express";
import {
  createAccountValidator,
  loginValidator,
  OTPValidator,
} from "../validation/authvalidation.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validation.js";
import createAccount from "../controller/authController.js";
import {
  login,
  verifyOtp,
  logout,
  getMe,
} from "../controller/authController.js";
import { authLimiter } from "../utliz/rateLimiter.js";
const router = express.Router();

router.post(
  "/signup",
  authLimiter,
  createAccountValidator,
  validate,
  createAccount,
);
router.post("/login", authLimiter, loginValidator, validate, login);
router.post("/verify-otp", authLimiter, OTPValidator, validate, verifyOtp);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getMe);
export default router;

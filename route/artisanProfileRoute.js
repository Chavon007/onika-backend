import express from "express";
import { artisanProfileValidator } from "../validation/artisanProfileValidation.js";
import { createArtisan } from "../controller/artisanProfileController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validation.js";
import { verificationLimiter } from "../utliz/rateLimiter.js";
const router = express.Router();

router.post(
  "/create-profile",
  authMiddleware,
  verificationLimiter,
  artisanProfileValidator,
  validate,
  createArtisan,
);

export default router;

import express from "express";
import { artisanProfileValidator } from "../validation/artisanProfileValidation.js";
import {
  createArtisan,
  getAllAristanController,
} from "../controller/artisanProfileController.js";
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
router.get("/artisan", authMiddleware, getAllAristanController);

export default router;

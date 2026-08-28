import express from "express";
import { artisanProfileValidator } from "../validation/artisanProfileValidation.js";
import { createArtisan } from "../controller/artisanProfileController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validation.js";
const router = express.Router();

router.post(
  "/create-profile",
  authMiddleware,
  artisanProfileValidator,
  validate,
  createArtisan,
);

export default router;

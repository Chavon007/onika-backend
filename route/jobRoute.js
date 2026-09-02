import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createJobValidator } from "../validation/jobValidation.js";
import { validate } from "../middleware/validation.js";
import { createNewJob } from "../controller/jobController.js";
const router = express.Router();

router.post(
  "/post-job",
  authMiddleware,
  createJobValidator,
  validate,
  createNewJob,
);

export default router;

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createJobValidator } from "../validation/jobValidation.js";
import { validate } from "../middleware/validation.js";
import {
  createNewJob,
  matchJob,
  matchJobDetails,
} from "../controller/jobController.js";
const router = express.Router();

router.post(
  "/post-job",
  authMiddleware,
  createJobValidator,
  validate,
  createNewJob,
);
   router.get("/jobs/pending", authMiddleware, matchJob);
   router.get("/jobs/:jobId", authMiddleware, matchJobDetails);

export default router;

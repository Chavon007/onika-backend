import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createJobValidator } from "../validation/jobValidation.js";
import { validate } from "../middleware/validation.js";
import {
  createNewJob,
  matchJob,
  matchJobDetails,
  acceptJobController,
  rejectJobController,
  artisanActiveJobController,
  artisanMarkJobCompletedController,
  artisanStartJobController,
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
router.patch("/jobs/:jobId/accept", authMiddleware, acceptJobController);
router.patch("/jobs/:jobId/reject", authMiddleware, rejectJobController);
router.get("/jobs/active", authMiddleware, artisanActiveJobController);
router.post(
  "/jobs/:jobId/complete",
  authMiddleware,
  artisanMarkJobCompletedController,
);
router.post(
  "/jobs/:jobId/in-progress",
  authMiddleware,
  artisanStartJobController,
);
export default router;

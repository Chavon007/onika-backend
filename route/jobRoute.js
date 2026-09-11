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

router.get("/jobs/pending", authMiddleware, matchJob);
router.get("/jobs/active", authMiddleware, artisanActiveJobController); // moved up
router.get("/jobs/:jobId", authMiddleware, matchJobDetails);
router.patch("/jobs/:jobId/accept", authMiddleware, acceptJobController);
router.patch("/jobs/:jobId/reject", authMiddleware, rejectJobController);
router.patch(
  "/jobs/:jobId/complete",
  authMiddleware,
  artisanMarkJobCompletedController,
);
router.patch(
  "/jobs/:jobId/in-progress",
  authMiddleware,
  artisanStartJobController,
);
export default router;

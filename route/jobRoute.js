import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createJobValidator,
  disputeValidator,
} from "../validation/jobValidation.js";
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
  customerActiveJobController,
  customerRaiseDisputeController,
  customerCancelJobController,
  customerJobHistoryController,
 
} from "../controller/jobController.js";
const router = express.Router();

router.post(
  "/post-job",
  authMiddleware,
  createJobValidator,
  validate,
  createNewJob,
);
router.get("/jobs/history", authMiddleware, customerJobHistoryController);
router.get("/jobs/pending", authMiddleware, matchJob);
router.get(
  "/jobs/customer-active",
  authMiddleware,
  customerActiveJobController,
);

router.get("/jobs/artisan-active", authMiddleware, artisanActiveJobController);
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
router.patch(
  "/jobs/:jobId/dispute",
  authMiddleware,
  disputeValidator,
  validate,
  customerRaiseDisputeController,
);
router.patch(
  "/jobs/:jobId/cancel",
  authMiddleware,
  customerCancelJobController,
);

export default router;

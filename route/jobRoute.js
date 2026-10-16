import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createJobValidator,
  disputeValidator,
  createPrivateJob,
} from "../validation/jobValidation.js";
import { validate } from "../middleware/validation.js";
import {
  createNewJob,
  PrivateJobBookingController,
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
  fetchArtisanPrivateBookingsController,
  privateJobBookingDetailsController,
  rejectPrivateJobBookingController,
  acceptPrivateJobBookingController,
} from "../controller/jobController.js";
const router = express.Router();

router.post(
  "/post-job",
  authMiddleware,
  createJobValidator,
  validate,
  createNewJob,
);
router.post(
  "/private-job",
  authMiddleware,
  createPrivateJob,
  validate,
  PrivateJobBookingController,
);
router.get(
  "/jobs/private-bookings",
  authMiddleware,
  fetchArtisanPrivateBookingsController,
);
router.get(
  "/jobs/private-booking/:jobId",
  authMiddleware,
  privateJobBookingDetailsController,
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
  "/jobs/private-booking/:jobId/accept",
  authMiddleware,
  acceptPrivateJobBookingController,
);
router.patch(
  "/jobs/private-booking/:jobId/reject",
  authMiddleware,
  rejectPrivateJobBookingController,
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

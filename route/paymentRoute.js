import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { customerReleasePaymentContoller } from "../controller/paymentController.js";

const router = express.Router();

router.post(
  "/jobs/:jobId/release-payment",
  authMiddleware,
  customerReleasePaymentContoller,
);

export default router;

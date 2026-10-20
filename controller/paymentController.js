import mongoose from "mongoose";
import User from "../model/auth.js";
import { customerReleasePayment } from "../service/paymentService.js";
import { releaseEscrow } from "../service/escrowService.js";

// Customer confirms the job is done. The job is marked completed and the money
// is released to the artisan and the platform in the same transaction.
export const customerReleasePaymentContoller = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: "Invalid job ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.role !== "customer") {
      return res.status(403).json({ success: false, message: "Only customers can make this request" });
    }

    let result;
    await session.withTransaction(async () => {
      result = await customerReleasePayment(jobId, userId, session);
      if (!result.job) return;

      const escrowResult = await releaseEscrow(jobId, session);
      if (escrowResult.notFound || escrowResult.notCompleted || escrowResult.notHeld) {
        throw new Error("RELEASE_FAILED");
      }
    });

    if (result.notFound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (result.forbidden) {
      return res.status(403).json({ success: false, message: "You can't make this request" });
    }
    if (result.invalidState) {
      return res.status(409).json({ success: false, message: "Job is no longer awaiting confirmation" });
    }

    return res.status(200).json({ success: true, message: "Payment released to the artisan", data: result.job });
  } catch (err) {
    if (err.message === "RELEASE_FAILED") {
      return res.status(409).json({ success: false, message: "Payment can't be released for this job" });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};
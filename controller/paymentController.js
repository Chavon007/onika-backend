import jobModel from "../model/jobModel.js";
import User from "../model/auth.js";
import mongoose from "mongoose";
import { customerReleasePayment } from "../service/paymentService.js";

export const customerReleasePaymentContoller = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid job ID" });
    }
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can make this request",
      });
    }

    const { job, forbidden, notFound, invalidState } =
      await customerReleasePayment(jobId, userId);

    if (notFound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (forbidden) {
      return res
        .status(403)
        .json({ success: false, message: "You can't make this request" });
    }

    if (invalidState) {
      return res.status(409).json({
        success: false,
        message: "Job is no longer awaiting confirmation",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Payment now pending release", job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

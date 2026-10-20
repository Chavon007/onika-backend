import {
  createJob,
  findJobsForArtisan,
  findJobsForArtisanDetails,
  ArtisanAcceptJob,
  ArtisanRejectJob,
  ArtisanActiveJob,
  ArtisanMarkJobCompleted,
  ArtisanStartJob,
  CustomerActiveJob,
  CustomerRaiseDispute,
  CustomerCancelJob,
  CustomerJobHistory,
  PrivateJobBooking,
  fetchArtisanPrivateBookings,
  privateJobBookingDetails,
  rejectPrivateJobBooking,
  acceptPrivateJobBooking,
} from "../service/jobService.js";
import {
  holdEscrow,
  assignArtisan,
  refundEscrow,
  freezeEscrow,
} from "../service/escrowService.js";
import mongoose from "mongoose";
import User from "../model/auth.js";
import artisanProfileModel from "../model/artisanProfileModel.js";

// Creates a job for the logged-in customer and takes the job price from their
// wallet into escrow in the same transaction. If the balance is too low, nothing
// is saved and the customer is told to fund their wallet.
export const createNewJob = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "customer") {
      return res
        .status(403)
        .json({ success: false, message: "Only customers can post jobs" });
    }
    let job;
    await session.withTransaction(async () => {
      job = await createJob({ ...req.body, customerId: userId, session });
      await holdEscrow(job._id, session);
    });

    res.status(201).json({ success: true, message: "Job created", data: job });
  } catch (err) {
    if (
      ["Insufficient balance", "Wallet not found", "Wallet is frozen"].includes(
        err.message,
      )
    ) {
      return res.status(402).json({
        success: false,
        message:
          "Insufficient wallet balance. Fund your wallet to post this job.",
      });
    }
    console.error(err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

// Returns the list of pending jobs available to the logged-in artisan,
// filtered by their skills, location, and excluding jobs they've rejected.
export const matchJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "artisan") {
      return res
        .status(403)
        .json({ success: false, message: "Only artisan can fetch jobs" });
    }
    const artisanProfile = await artisanProfileModel.findOne({ User: userId });
    if (!artisanProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Artisan profile not found" });
    }
    const jobs = await findJobsForArtisan({
      skills: artisanProfile.skills,
      lga: user.lga,
      artisanId: userId,
    });

    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Returns full details for a single job, for an artisan viewing it directly.
// Blocks the view if the artisan already rejected it or lacks the required skill.
export const matchJobDetails = async (req, res) => {
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
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only Artisans can make this request",
      });
    }
    const artisanProfile = await artisanProfileModel.findOne({ User: userId });

    if (!artisanProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Artisan profile not found" });
    }
    const { job, forbidden } = await findJobsForArtisanDetails(
      jobId,
      artisanProfile.skills,
      userId,
    );

    if (forbidden) {
      return res.status(403).json({
        success: false,
        message: "This job is outside your registered skills",
      });
    }
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.status(200).json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lets an artisan accept a pending job that matches their skills.
// The job update and the escrow assignment happen in one transaction, so a job
// is never accepted without its escrow being attached to the artisan.
export const acceptJobController = async (req, res) => {
  const session = await mongoose.startSession();
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
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "artisan") {
      return res
        .status(403)
        .json({ success: false, message: "Only artisans can accept jobs" });
    }
    const artisanProfile = await artisanProfileModel.findOne({ User: userId });
    if (!artisanProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Artisan profile not found" });
    }

    let result;
    await session.withTransaction(async () => {
      result = await ArtisanAcceptJob(
        jobId,
        userId,
        artisanProfile.skills,
        session,
      );

      if (!result.job) return;

      const escrowResult = await assignArtisan(jobId, session, userId);
      if (
        escrowResult.notFound ||
        escrowResult.alreadyAssigned ||
        escrowResult.notHeld
      ) {
        throw new Error("JOB_UNAVAILABLE");
      }
    });

    if (result.notFound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    if (result.forbidden) {
      return res.status(403).json({
        success: false,
        message: "You are not qualified for this job category",
      });
    }
    if (result.alreadyTaken) {
      return res.status(409).json({
        success: false,
        message: "Job has already been accepted by another artisan",
      });
    }

    res.status(200).json({ success: true, message: "Job accepted", job });
  } catch (err) {
    if (err.message === "JOB_UNAVAILABLE") {
      return res.status(409).json({
        success: false,
        message: "This job is no longer available",
      });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

// Lets an artisan decline a pending job before ever accepting it. The job
// stays pending and visible to everyone else; only this artisan stops
// seeing it, via rejectedBy in ArtisanRejectJob.
export const rejectJobController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Job ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "artisan") {
      return res
        .status(403)
        .json({ success: false, message: "Only artisans can accept jobs" });
    }
    const artisanProfile = await artisanProfileModel.findOne({ User: userId });
    if (!artisanProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Artisan profile not found" });
    }

    const { job, forbidden, notFound } = await ArtisanRejectJob(
      jobId,
      userId,
      artisanProfile.skills,
    );
    if (notFound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (forbidden) {
      return res.status(403).json({
        success: false,
        message: "You are not qualified for this job category",
      });
    }

    res.status(200).json({ success: true, message: "Job rejected", job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Returns all jobs currently accepted by the logged-in artisan (their active work).
export const artisanActiveJobController = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exit" });
    }

    if (user.role !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only artisans can view active jobs",
      });
    }

    const { jobs } = await ArtisanActiveJob(userId);
    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lets an artisan move a job from "accepted" to "in_progress" once they've
// actually started the work. Only the artisan who accepted the job can do
// this, and only from the "accepted" state — enforced atomically inside
// ArtisanStartJob.
export const artisanStartJobController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid job ID" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "artisan") {
      return res
        .status(403)
        .json({ success: false, message: "Only artisan can mark job as done" });
    }

    const { job, forbidden, notFound } = await ArtisanStartJob(jobId, userId);

    if (notFound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (forbidden) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot change this job to in progress — it's either not yours or not accepted",
      });
    }

    res
      .status(200)
      .json({ success: true, message: " Job is now in progress", data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Lets an artisan mark a job as completed once they're done working on it.
// Only allowed from the "in_progress" state and only by the artisan
// assigned to the job — enforced atomically inside ArtisanMarkJobCompleted.
export const artisanMarkJobCompletedController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid job ID" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "artisan") {
      return res
        .status(403)
        .json({ success: false, message: "Only artisan can mark job as done" });
    }

    const { job, forbidden, notFound } = await ArtisanMarkJobCompleted(
      jobId,
      userId,
    );
    if (notFound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (forbidden) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot complete this job — it's either not yours or not in progress",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "job marked as completed", data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Returns all active jobs of a customer(their active work).
export const customerActiveJobController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customers can make this request",
      });
    }

    const { jobs } = await CustomerActiveJob(userId);

    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// Raises a dispute and freezes the escrow in one transaction.
export const customerRaiseDisputeController = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user.id;
    const { disputeReason } = req.body;
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
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only a customer can make this request",
      });
    }
    if (!disputeReason) {
      return res
        .status(400)
        .json({ success: false, message: "Please add what happened" });
    }

    let result;
    await session.withTransaction(async () => {
      result = await CustomerRaiseDispute(
        jobId,
        userId,
        disputeReason,
        session,
      );
      if (!result.job) return;

      const escrowResult = await freezeEscrow(jobId, session);
      if (escrowResult.notFound || escrowResult.notHeld) {
        throw new Error("DISPUTE_NOT_ALLOWED");
      }
    });

    if (result.notFound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (result.forbidden) {
      return res
        .status(403)
        .json({ success: false, message: "You can't make this request" });
    }
    if (result.invalidState) {
      return res.status(409).json({
        success: false,
        message: "This job is no longer eligible for a dispute",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dispute raised successfully",
      data: result.job,
    });
  } catch (err) {
    if (err.message === "DISPUTE_NOT_ALLOWED") {
      return res.status(409).json({
        success: false,
        message: "Dispute can't be raised for this job",
      });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

// Cancels a job and refunds the customer in one transaction.
export const customerCancelJobController = async (req, res) => {
  const session = await mongoose.startSession();
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
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only a customer can make this request",
      });
    }

    let result;
    await session.withTransaction(async () => {
      result = await CustomerCancelJob(jobId, userId, session);
      if (!result.job) return;

      const escrowResult = await refundEscrow(jobId, session);
      if (
        escrowResult.notFound ||
        escrowResult.notAllowed ||
        escrowResult.notHeld
      ) {
        throw new Error("REFUND_FAILED");
      }
    });

    if (result.notFound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (result.forbidden) {
      return res
        .status(403)
        .json({ success: false, message: "You can't make this request" });
    }
    if (result.invalidState) {
      return res.status(409).json({
        success: false,
        message: "This job can no longer be cancelled",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job has been cancelled",
      data: result.job,
    });
  } catch (err) {
    if (err.message === "REFUND_FAILED") {
      return res.status(409).json({
        success: false,
        message: "This job can't be cancelled right now",
      });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

export const customerJobHistoryController = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 6, 30);
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only a customer can make this request",
      });
    }

    const { jobs, total, totalPages } = await CustomerJobHistory(
      userId,
      page,
      limit,
    );

    res.set("Cache-Control", "no-store");
    res.status(200).json({
      success: true,
      data: jobs,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Posts a private job to an artisan and holds the money in one transaction.
export const PrivateJobBookingController = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "customer") {
      return res
        .status(403)
        .json({ success: false, message: "Only customers can post jobs" });
    }

    let result;
    await session.withTransaction(async () => {
      result = await PrivateJobBooking({
        ...req.body,
        customerId: userId,
        session,
      });
      if (!result.job) return;
      await holdEscrow(result.job._id, session);
    });

    if (result.notFound) {
      return res
        .status(404)
        .json({ success: false, message: "Artisan does not exist" });
    }

    return res
      .status(201)
      .json({
        success: true,
        message: "Job sent to the artisan",
        data: result.job,
      });
  } catch (err) {
    if (
      ["Insufficient balance", "Wallet not found", "Wallet is frozen"].includes(
        err.message,
      )
    ) {
      return res.status(402).json({
        success: false,
        message:
          "Insufficient wallet balance. Fund your wallet to post this job.",
      });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

export const fetchArtisanPrivateBookingsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only Artisan can make this request",
      });
    }

    const { jobs } = await fetchArtisanPrivateBookings(user._id);
    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const privateJobBookingDetailsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only artisan can make this request",
      });
    }
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid job id" });
    }
    const { job, notFound, forbidden } = await privateJobBookingDetails(
      jobId,
      user._id,
    );

    if (notFound) {
      return res
        .status(404)
        .json({ success: false, message: "Job does not exist" });
    }

    if (forbidden) {
      return res
        .status(403)
        .json({ success: false, message: "You are not assigned for this job" });
    }

    res.status(200).json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Accepts a private job and attaches the artisan to the escrow.
export const acceptPrivateJobBookingController = async (req, res) => {
  const session = await mongoose.startSession();
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
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only artisan can make this request",
      });
    }

    let result;
    await session.withTransaction(async () => {
      result = await acceptPrivateJobBooking(jobId, userId, session);
      if (!result.job) return;

      const escrowResult = await assignArtisan(jobId, session, userId);
      if (
        escrowResult.notFound ||
        escrowResult.alreadyAssigned ||
        escrowResult.notHeld
      ) {
        throw new Error("JOB_UNAVAILABLE");
      }
    });

    if (result.notFound) {
      return res
        .status(404)
        .json({ success: false, message: "Job does not exist" });
    }
    if (result.forbidden) {
      return res
        .status(403)
        .json({ success: false, message: "You are not assigned for this job" });
    }
    if (result.invalidState) {
      return res
        .status(409)
        .json({ success: false, message: "You can't accept this job" });
    }

    return res.status(200).json({ success: true, data: result.job });
  } catch (err) {
    if (err.message === "JOB_UNAVAILABLE") {
      return res
        .status(409)
        .json({ success: false, message: "This job is no longer available" });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

// Rejects a private job and refunds the customer in full.
export const rejectPrivateJobBookingController = async (req, res) => {
  const session = await mongoose.startSession();
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
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only artisan can make this request",
      });
    }

    let result;
    await session.withTransaction(async () => {
      result = await rejectPrivateJobBooking(jobId, userId, session);
      if (!result.job) return;

      const escrowResult = await refundEscrow(jobId, session);
      if (
        escrowResult.notFound ||
        escrowResult.notAllowed ||
        escrowResult.notHeld
      ) {
        throw new Error("REFUND_FAILED");
      }
    });

    if (result.notFound) {
      return res
        .status(404)
        .json({ success: false, message: "Job does not exist" });
    }
    if (result.forbidden) {
      return res
        .status(403)
        .json({ success: false, message: "You are not assigned for this job" });
    }
    if (result.invalidState) {
      return res
        .status(409)
        .json({ success: false, message: "Only pending jobs can be rejected" });
    }

    return res.status(200).json({ success: true, data: result.job });
  } catch (err) {
    if (err.message === "REFUND_FAILED") {
      return res.status(409).json({
        success: false,
        message: "This job can't be rejected right now",
      });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

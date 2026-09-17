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
} from "../service/jobService.js";
import mongoose from "mongoose";
import User from "../model/auth.js";
import artisanProfileModel from "../model/artisanProfileModel.js";
import jobModel from "../model/jobModel.js";

// Creates a new job posting. Only customers are allowed to post jobs.
export const createNewJob = async (req, res) => {
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
    const job = await createJob({ customerId: userId, ...req.body });

    res.status(201).json({ success: true, message: "Job created", data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

// Lets an artisan accept a pending job. Race-condition safe — see
// ArtisanAcceptJob in jobService.js for the atomic update that prevents
// two artisans from accepting the same job at once.
export const acceptJobController = async (req, res) => {
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
    const { job, forbidden, alreadyTaken, notFound } = await ArtisanAcceptJob(
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
    if (alreadyTaken) {
      return res.status(409).json({
        success: false,
        message: "Job has already been accepted by another artisan",
      });
    }

    res.status(200).json({ success: true, message: "Job accepted", job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
      return req
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

export const customerRaiseDisputeController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { disputeReason } = req.body;
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

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only a customer can make  this request",
      });
    }

    if (!disputeReason) {
      return res
        .status(400)
        .json({ success: false, message: "Please add what happend" });
    }
    const { job, forbidden, notFound, invalidState } =
      await CustomerRaiseDispute(jobId, userId, disputeReason);

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
        message: "This job is no longer eligible for a dispute",
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Dispute raised successfully", job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const customerCancelJobController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(404).json({ success: "Invalid job ID" });
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

    const { job, forbidden, notfound, invalidState } = await CustomerCancelJob(
      jobId,
      userId,
    );

    if (notfound) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    if (forbidden) {
      return res
        .status(403)
        .json({ succcesS: false, message: "You can't make this request" });
    }
    if (invalidState) {
      return res.status(409).josn({
        success: false,
        message: "This job can no longer be cancelled",
      });
    }

    res
      .status(200)
      .json({ success: true, message: "Job has beeen cancelled", job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const customerJobHistoryController = async (req, res) => {
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
        message: "Only a customer can make this request",
      });
    }

    const { jobs, notFound } = await CustomerJobHistory(userId);
    if (notFound) {
      return res
        .status(404)
        .json({ success: false, message: "No job history yet" });
    }

    res.set("Cache-Control", "no-store");
    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

import {
  createJob,
  findJobsForArtisan,
  findJobsForArtisanDetails,
} from "../service/jobService.js";
import mongoose from "mongoose";
import User from "../model/auth.js";
import artisanProfileModel from "../model/artisanProfileModel.js";
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
    });

    res.status(200).json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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

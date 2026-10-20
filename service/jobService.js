import jobModel from "../model/jobModel.js";
import ArtisanProfileSchema from "../model/artisanProfileModel.js";
import User from "../model/auth.js";

const AUTO_RELEASE_MS = 48 * 60 * 60 * 1000;
// Creates a new job posting on behalf of a customer.
// Takes the raw job fields from the request and saves them to the database.
export const createJob = async ({
  customerId,
  category,
  description,
  price,
  lga,
  address,
  state,
  landmark,
  images,
  priority,
  city,
  session = null,
}) => {
  const [newjob] = await jobModel.create(
    [
      {
        customerId,
        category,
        description,
        price,
        state,
        address,
        city,
        landmark,
        lga,
        images,
        priority,
      },
    ],
    { session },
  );

  return newjob;
};

// Returns the list of jobs an artisan can currently see and act on.
// Only pending jobs matching the artisan's skills and location are shown,
// and jobs the artisan has already rejected are excluded via rejectedBy.
export const findJobsForArtisan = async ({ skills, lga, artisanId }) => {
  const jobs = await jobModel
    .find({
      typ: "public",
      category: { $in: skills },
      lga,
      status: "pending",
      rejectedBy: { $ne: artisanId },
    })
    .populate("customerId", "fullName phoneNumber")
    .select("customerId category description city lga priority price createdAt")
    .sort({ createdAt: -1 });

  return jobs;
};

// Fetches full details for a single job, for an artisan viewing it directly.
// Blocks access if the artisan already rejected this job, or if the job's
// category is outside the artisan's registered skills.
export const findJobsForArtisanDetails = async (jobId, skills, artisanId) => {
  const job = await jobModel
    .findById(jobId)
    .populate("customerId", "fullName phoneNumber");

  if (!job) {
    return { job: null, forbidden: false };
  }
  if (job.rejectedBy.includes(artisanId)) {
    return { job: null, forbidden: true };
  }

  const isAllowed = skills.includes(job.category);
  if (!isAllowed) {
    return { job: null, forbidden: true };
  }
  return { job, forbidden: false };
};

// Marks a pending job as accepted by the artisan, if their skills match the
// job category. The update only matches a job that is still pending and has no
// artisan, so two artisans accepting at once can't both get it.
export const ArtisanAcceptJob = async (jobId, artisanId, skills, session) => {
  const job = await jobModel.findById(jobId).session(session);

  if (!job) {
    return { job: null, forbidden: false, notFound: true, alreadyTaken: false };
  }
  const isAllowed = skills.includes(job.category);
  if (!isAllowed) {
    return { job: null, forbidden: true, notFound: false, alreadyTaken: false };
  }

  const updatedJob = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      status: "pending",
      artisanId: null,
    },
    { status: "accepted", artisanId },
    { returnDocument: "after", session },
  );

  if (!updatedJob) {
    return { job: null, forbidden: false, notFound: false, alreadyTaken: true };
  }
  return {
    job: updatedJob,
    forbidden: false,
    notFound: false,
    alreadyTaken: false,
  };
};

// Lets an artisan decline a pending job (before ever accepting it).
// Doesn't change the job's status or touch artisanId — the job stays
// pending and visible to every other artisan. It just records this
// artisan's id in rejectedBy so the job is filtered out of their own
// future job list and detail views.
export const ArtisanRejectJob = async (jobId, artisanId, skills) => {
  const job = await jobModel.findById(jobId);
  if (!job) {
    return { job: null, forbidden: false, notFound: true };
  }
  const isAllowed = skills.includes(job.category);
  if (!isAllowed) {
    return { job: null, forbidden: true, notFound: false };
  }

  const updatedJob = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      status: "pending",
    },
    { $addToSet: { rejectedBy: artisanId } },
    { returnDocument: "after" },
  );

  if (!updatedJob) {
    return { job: null, forbidden: false, notFound: true };
  }
  return { job: updatedJob, forbidden: false, notFound: false };
};

// Returns all jobs currently accepted by a given artisan (their active work).
export const ArtisanActiveJob = async (artisanId) => {
  const activeJobs = await jobModel
    .find({ artisanId, status: { $in: ["accepted", "in_progress"] } })
    .populate("customerId", "fullName phoneNumber")
    .sort({ createdAt: -1 });

  return { jobs: activeJobs };
};

// Lets an artisan mark a job as completed once they're done working on it.
// The atomic findOneAndUpdate filter (status: "in_progress" + artisanId)
// ensures only the assigned artisan can complete it, and only once the
// job has actually been started — you can't skip straight from
// "in_progress" to "completed".
// Marks the job done and starts the 48-hour auto-release timer.
export const ArtisanMarkJobCompleted = async (jobId, artisanId) => {
  const job = await jobModel.findById(jobId);
  if (!job) {
    return { job: null, notFound: true, forbidden: false };
  }
  const updatedJob = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      status: "in_progress",
      artisanId,
    },
    {
      status: "awaiting_confirmation",
      completedAt: new Date(),
      autoReleaseAt: new Date(Date.now() + AUTO_RELEASE_MS),
    },
    { returnDocument: "after" },
  );

  if (!updatedJob) {
    return { job: null, forbidden: true, notFound: false };
  }
  return { job: updatedJob, forbidden: false, notFound: false };
};

// Lets an artisan move a job from "accepted" to "in_progress" once they've
// started the work. The atomic findOneAndUpdate filter (status: "accepted"
// + artisanId) ensures only the artisan who accepted the job can start it,
// and only from that exact prior state.
export const ArtisanStartJob = async (jobId, artisanId) => {
  const job = await jobModel.findById(jobId);

  if (!job) {
    return { job: null, forbidden: false, notFound: true };
  }
  const updatedJob = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      status: "accepted",
      artisanId,
    },
    { status: "in_progress" },
    { returnDocument: "after" },
  );

  if (!updatedJob) {
    return { job: null, forbidden: true, notFound: false };
  }

  return { job: updatedJob, forbidden: false, notFound: false };
};

// let's customer get live update on a job they post

export const CustomerActiveJob = async (customerId) => {
  const activeJobs = await jobModel
    .find({
      customerId,
      status: {
        $in: [
          "pending",
          "in_progress",
          "accepted",
          "awaiting_confirmation",
          "completed",
        ],
      },
    })
    .populate("artisanId", "fullName phoneNumber")
    .sort({ createdAt: -1 });

  return { jobs: activeJobs };
};

export const CustomerRaiseDispute = async (
  jobId,
  customerId,
  disputeReason,
  session,
) => {
  const job = await jobModel.findById(jobId).session(session);
  if (!job) {
    return { job: null, forbidden: false, notFound: true, invalidState: false };
  }

  if (job.customerId.toString() !== customerId) {
    return { job: null, forbidden: true, notFound: false, invalidState: false };
  }

  const dispute = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      $or: [
        { status: "accepted" },
        { status: "in_progress" },
        { status: "awaiting_confirmation" },
        {
          status: "completed",
          escrowStatus: "pending_release",
          autoReleaseAt: { $gt: new Date() },
        },
      ],
    },
    {
      $set: {
        previousStatus: job.status,
        status: "disputed",
        escrowStatus: "frozen",
        disputeReason,
        disputeRaisedAt: new Date(),
        autoReleaseAt: null,
      },
    },
    { returnDocument: "after", session },
  );
  if (!dispute) {
    return { job: null, forbidden: false, notFound: false, invalidState: true };
  }

  return {
    job: dispute,
    forbidden: false,
    notFound: false,
    invalidState: false,
  };
};

export const CustomerCancelJob = async (jobId, customerId, session) => {
  const job = await jobModel.findById(jobId).session(session);

  if (!job) {
    return { job: null, forbidden: false, notFound: true, invalidState: false };
  }

  if (job.customerId.toString() !== customerId) {
    return { job: null, forbidden: true, notFound: false, invalidState: false };
  }

  const updatedJob = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      status: { $in: ["pending", "accepted"] },
    },
    {
      $set: {
        previousStatus: job.status,
        status: "cancelled",
        cancelledAt: new Date(),
      },
    },
    { returnDocument: "after", session },
  );

  if (!updatedJob) {
    return { job: null, forbidden: false, notFound: false, invalidState: true };
  }

  return {
    job: updatedJob,
    forbidden: false,
    notFound: false,
    invalidState: false,
  };
};

export const CustomerJobHistory = async (customerId, page = 1, limit = 6) => {
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    jobModel
      .find({ customerId })
      .populate("artisanId", "fullName phoneNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    jobModel.countDocuments({ customerId }),
  ]);
  return { jobs, total, totalPages: Math.ceil(total / limit) };
};

export const PrivateJobBooking = async ({
  customerId,
  address,
  price,
  images,
  description,
  date,
  artisanId,
  session = null,
}) => {
  const artisan = await User.findOne({
    _id: artisanId,
    role: "artisan",
  }).session(session);

  if (!artisan) {
    return { job: null, notFound: true };
  }
  const job = await jobModel.create(
    [
      {
        type: "private",
        customerId,
        description,
        price,
        address,
        date,
        images,
        artisanId,
      },
    ],
    { session },
  );

  return { job, notFound: false };
};

export const fetchArtisanPrivateBookings = async (artisanId) => {
  const bookings = await jobModel
    .find({ artisanId, type: "private", status: "pending" })
    .populate("customerId", "fullName phoneNumber")
    .sort({ createdAt: -1 });

  return { jobs: bookings };
};

export const privateJobBookingDetails = async (jobId, artisanId) => {
  const job = await jobModel
    .findById(jobId)
    .populate("customerId", "fullName phoneNumber");

  if (!job) {
    return { job: null, forbidden: false, notFound: true };
  }

  if (
    job.type !== "private" ||
    !job.artisanId ||
    job.artisanId.toString() !== artisanId.toString()
  ) {
    return { job: null, notFound: false, forbidden: true };
  }

  return { job, notFound: false, forbidden: false };
};

export const rejectPrivateJobBooking = async (jobId, artisanId, session) => {
  const job = await jobModel.findById(jobId).session(session);

  if (!job) {
    return { job: null, forbidden: false, notFound: true, invalidState: false };
  }

  if (
    job.type !== "private" ||
    !job.artisanId ||
    job.artisanId.toString() !== artisanId.toString()
  ) {
    return { job: null, forbidden: true, notFound: false, invalidState: false };
  }

  const updateJob = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      status: "pending",
    },
    {
      status: "rejected",
    },
    { returnDocument: "after", session },
  );

  if (!updateJob) {
    return { job: null, notFound: false, forbidden: false, invalidState: true };
  }

  return {
    job: updateJob,
    notFound: false,
    forbidden: false,
    invalidState: false,
  };
};

export const acceptPrivateJobBooking = async (jobId, artisanId, session) => {
  const job = await jobModel.findById(jobId).session(session);

  if (!job) {
    return { job: null, notFound: true, forbidden: false, invalidState: false };
  }
  if (
    job.type !== "private" ||
    !job.artisanId ||
    job.artisanId.toString() !== artisanId.toString()
  ) {
    return { job: null, notFound: false, forbidden: true, invalidState: false };
  }

  const updateJob = await jobModel.findOneAndUpdate(
    {
      _id: jobId,
      status: "pending",
    },
    {
      status: "accepted",
    },
    { returnDocument: "after", session },
  );

  if (!updateJob) {
    return { job: null, notFound: false, forbidden: false, invalidState: true };
  }

  return {
    job: updateJob,
    forbidden: false,
    notFound: false,
    invalidState: false,
  };
};

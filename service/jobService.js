import jobModel from "../model/jobModel.js";

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
}) => {
  const newjob = await jobModel.create({
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
  });

  return newjob;
};

// Returns the list of jobs an artisan can currently see and act on.
// Only pending jobs matching the artisan's skills and location are shown,
// and jobs the artisan has already rejected are excluded via rejectedBy.
export const findJobsForArtisan = async ({ skills, lga, artisanId }) => {
  const jobs = await jobModel
    .find({
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

// Lets an artisan accept a pending job.
// Uses an atomic findOneAndUpdate (status: "pending", artisanId: null as the
// filter) so that if two artisans accept at the same time, only one write
// succeeds — the loser gets alreadyTaken: true instead of silently
// overwriting the winner. This is the race-condition fix.
export const ArtisanAcceptJob = async (jobId, artisanId, skills) => {
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
      artisanId: null,
    },
    { status: "accepted", artisanId },
    { returnDocument: "after" },
  );

  if (!updatedJob) {
    return { job: null, forbidden: false, notFound: false, alreadyTaken: true };
  }
  return { job: updatedJob, forbidden: false, notFound: false };
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
    { status: "completed", completedAt: new Date() },
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

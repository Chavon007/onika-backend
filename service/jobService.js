import jobModel from "../model/jobModel.js";
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
    { new: true },
  );

  if (!updatedJob) {
    return { job: null, forbidden: false, notFound: false, alreadyTaken: true };
  }
  return { job: updatedJob, forbidden: false, notFound: false };
};

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
    { new: true },
  );

  if (!updatedJob) {
    return { job: null, forbidden: false, notFound: true };
  }
  return { job: updatedJob, forbidden: false, notFound: false };
};

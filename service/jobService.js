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

export const findJobsForArtisan = async ({ skills, lga }) => {
  const jobs = await jobModel
    .find({
      category: { $in: skills },
      lga,
      status: "pending",
    })
    .populate("customerId", "fullName phoneNumber")
    .select("customerId category description city lga priority price createdAt")
    .sort({ createdAt: -1 });

  return jobs;
};

export const findJobsForArtisanDetails = async (jobId, skills) => {
  const job = await jobModel
    .findById(jobId)
    .populate("customerId", "fullName phoneNumber");

  if (!job) {
    return { job: null, forbidden: false };
  }

  const isAllowed = skills.includes(job.category);
  if (!isAllowed) {
    return { job: null, forbidden: true };
  }
  return { job, forbidden: false };
};

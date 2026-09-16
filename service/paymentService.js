import jobModel from "../model/jobModel.js";

export const customerReleasePayment = async (jobId, customerId) => {
  const now = new Date();
  const job = await jobModel.findById(jobId);

  if (!job) {
    return { job: null, forbidden: false, notFound: true };
  }

  if (job.customerId.toString() !== customerId) {
    return {
      job: null,
      forbidden: true,
      notFound: false,
    };
  }
  if (job.status !== "awaiting_confirmation" || job.escrowStatus !== "held") {
    return { job: null, forbidden: false, notFound: false };
  }
  const releasePayment = await jobModel.findOneAndUpdate(
    { _id: jobId, status: "awaiting_confirmation", escrowStatus: "held" },
    {
      $set: {
        status: "completed",
        escrowStatus: "pending_release",
        confirmedAt: now,
        autoReleaseAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      },
    },
    { returnDocument: "after" },
  );

  if (!releasePayment) {
    return { job: null, forbidden: false, notFound: true };
  }

  return { job: releasePayment, forbidden: false, notFound: false };
};

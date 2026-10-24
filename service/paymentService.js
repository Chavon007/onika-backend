import jobModel from "../model/jobModel.js";
// Marks the job completed when the customer confirms the work.
// The money is released by the controller in the same transaction.
export const customerReleasePayment = async (jobId, customerId, session) => {
  const job = await jobModel.findById(jobId).session(session);
  if (!job) {
    return { job: null, forbidden: false, notFound: true, invalidState: false };
  }
  if (job.customerId.toString() !== customerId.toString()) {
    return { job: null, forbidden: true, notFound: false, invalidState: false };
  }

  const confirmed = await jobModel.findOneAndUpdate(
    { _id: jobId, status: "awaiting_confirmation", escrowStatus: "held" },
    { $set: { status: "completed", confirmedAt: new Date(), autoReleaseAt: null } },
    { returnDocument: "after", session },
  );
  if (!confirmed) {
    return { job: null, forbidden: false, notFound: false, invalidState: true };
  }
  return { job: confirmed, forbidden: false, notFound: false, invalidState: false };
};
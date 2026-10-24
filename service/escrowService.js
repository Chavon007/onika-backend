import escrowModel from "../model/escrowModel.js";
import jobModel from "../model/jobModel.js";
import { debitWallet } from "./walletService.js";
import { creditWallet } from "./walletService.js";

import { COMMISSION_RATE, PLATFORM_USER_ID } from "../config/platform.js";

// Takes the job price from the customer's wallet and holds it in escrow.
// Runs when a job is posted, inside the caller's session, so the wallet debit,
// the escrow record and the job update all save together or not at all.
// Throws if the customer's balance is too low.
export const holdEscrow = async (jobId, session) => {
  if (!session) throw new Error("A database session is required");
  const job = await jobModel.findById(jobId).session(session);
  if (!job) {
    return { escrow: null, notFound: true, alreadyHeld: false };
  }

  const existing = await escrowModel.findOne({ jobId }).session(session);
  if (existing) {
    return { escrow: null, notFound: false, alreadyHeld: true };
  }
  await debitWallet(
    job.customerId,
    job.price,
    "escrow_hold",
    `escrow_hold_${job._id}`,
    job._id,
    "Funds held in escrow for the job",
    session,
  );

  const [escrow] = await escrowModel.create(
    [
      {
        jobId: job._id,
        customerId: job.customerId,
        amount: job.price,
        status: "held",
      },
    ],
    { session },
  );

  await jobModel.updateOne(
    { _id: job._id },
    { escrowStatus: "held" },
    { session },
  );

  return { escrow, notFound: false, alreadyHeld: false };
};

// Attaches the accepting artisan to the job's escrow.
// Only works while the escrow is held and has no artisan yet, so two artisans
// accepting at the same moment can't both be assigned. No money moves.
export const assignArtisan = async (jobId, session, artisanId) => {
  if (!session) throw new Error("Adatabase session is required");

  const escrow = await escrowModel.findOneAndUpdate(
    {
      jobId,
      status: "held",
      artisanId: null,
    },
    { $set: { artisanId } },
    { returnDocument: "after", session },
  );

  if (escrow) {
    return { escrow, notFound: false, alreadyAssigned: false, notHeld: false };
  }

  const found = await escrowModel.findOne({ jobId }).session(session);
  if (!found) {
    return {
      escrow: null,
      notFound: true,
      alreadyAssigned: false,
      notHeld: false,
    };
  }
  if (found.status !== "held") {
    return {
      escrow: found,
      notFound: false,
      alreadyAssigned: false,
      notHeld: true,
    };
  }

  return {
    escrow: found,
    notFound: false,
    alreadyAssigned: true,
    notHeld: false,
  };
};

// Pays the artisan 90% and the platform 10% from the held escrow.
// Only works once the customer has marked the job completed, and only while
// the escrow is still held, so it can never be released twice or while frozen.
// Runs inside the caller's session so the credits, the escrow update and the
// job update all save together or not at all.
export const releaseEscrow = async (jobId, session) => {
  if (!session) throw new Error("A database session is required");

  const job = await jobModel.findById(jobId).session(session);
  if (!job) {
    return {
      escrow: null,
      notFound: true,
      notCompleted: false,
      notHeld: false,
    };
  }

  if (job.status !== "completed") {
    return {
      escrow: null,
      notFound: false,
      notCompleted: true,
      notHeld: false,
    };
  }

  const current = await escrowModel.findOne({ jobId }).session(session);
  if (!current) {
    return {
      escrow: null,
      notFound: true,
      notCompleted: false,
      notHeld: false,
    };
  }

  if (current.status !== "held" || !current.artisanId) {
    return {
      escrow: current,
      notFound: false,
      notCompleted: false,
      notHeld: true,
    };
  }

  const commissionAmount = Math.round(current.amount * COMMISSION_RATE);
  const artisanAmount = current.amount - commissionAmount;

  const escrow = await escrowModel.findOneAndUpdate(
    { jobId, status: "held" },
    {
      $set: {
        status: "released",
        commissionAmount,
        artisanAmount,
        releasedAt: new Date(),
      },
    },
    { returnDocument: "after", session },
  );

  if (!escrow) {
    return {
      escrow: null,
      notFound: false,
      notCompleted: false,
      notHeld: true,
    };
  }

  await creditWallet(
    escrow.artisanId,
    artisanAmount,
    "escrow_release",
    `escrow_release_${jobId}`,
    jobId,
    "Payment released for completed job",
    session,
  );

  if (commissionAmount > 0) {
    await creditWallet(
      PLATFORM_USER_ID,
      commissionAmount,
      "commission",
      `escrow_commission_${jobId}`,
      jobId,
      "Platform commission",
      session,
    );
  }

  await jobModel.updateOne(
    { _id: jobId },
    { $set: { escrowStatus: "released", releasedAt: new Date() } },
    { session },
  );

  return { escrow, notFound: false, notCompleted: false, notHeld: false };
};

// Returns the full held amount to the customer, with no commission.
// Works while the escrow is held or frozen, and only for a cancelled,
// rejected or disputed job, so it can never run twice or after a release.
// Runs inside the caller's session so the credit, the escrow update and the
// job update all save together or not at all.
export const refundEscrow = async (jobId, session) => {
  if (!session) throw new Error("A database session is required");

  const job = await jobModel.findById(jobId).session(session);

  if (!job) {
    return { escrow: null, notFound: true, notAllowed: false, notHeld: false };
  }
  if (!["cancelled", "rejected", "disputed"].includes(job.status)) {
    return { escrow: null, notFound: false, notAllowed: true, notHeld: false };
  }
  const current = await escrowModel.findOne({ jobId }).session(session);

  if (!current) {
    return { escrow: null, notFound: true, notCompleted: false, notHeld: true };
  }

  if (!["held", "frozen"].includes(current.status)) {
    return {
      escrow: current,
      notFound: false,
      notAllowed: false,
      notHeld: true,
    };
  }

  const escrow = await escrowModel.findOneAndUpdate(
    {
      jobId,
      status: { $in: ["held", "frozen"] },
    },
    {
      $set: {
        status: "refunded",
        refundedAt: new Date(),
      },
    },
    { returnDocument: "after", session },
  );
  if (!escrow) {
    return {
      escrow: null,
      notFound: false,
      notCompleted: false,
      notHeld: true,
    };
  }

  await creditWallet(
    escrow.customerId,
    escrow.amount,
    "refund",
    `refund_${jobId}`,
    jobId,
    "Escrow refunded to customer",
    session,
  );

  await jobModel.updateOne(
    { _id: jobId },
    { $set: { escrowStatus: "refunded" } },
    { session },
  );
  return { escrow, notFound: false, notCompleted: false, notHeld: false };
};

// Pauses a held escrow when a dispute is raised. No money moves.
// The job-level dispute function already checks the job state.
export const freezeEscrow = async (jobId, session) => {
  if (!session) throw new Error("A database session is required");

  const escrow = await escrowModel.findOneAndUpdate(
    { jobId, status: "held" },
    { $set: { status: "frozen" } },
    { returnDocument: "after", session },
  );

  if (!escrow) {
    const found = await escrowModel.findOne({ jobId }).session(session);
    if (!found) return { escrow: null, notFound: true, notHeld: false };
    return { escrow: found, notFound: false, notHeld: true };
  }

  await jobModel.updateOne(
    { _id: jobId },
    { $set: { escrowStatus: "frozen" } },
    { session },
  );

  return { escrow, notFound: false, notHeld: false };
};

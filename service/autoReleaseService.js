import mongoose from "mongoose";
import jobModel from "../model/jobModel.js";
import { releaseEscrow } from "./escrowService.js";

const BATCH_SIZE = 50;

// Runs one job's release inside its own transaction.
// `claim` is a small function that re-checks the job inside the transaction
// (and updates it if needed). If it returns false, the job is skipped.
// One failing job never blocks the others.
const processJob = async (_id, claim) => {
  const session = await mongoose.startSession();

  try {
    let didRelease = false;

    await session.withTransaction(async () => {
      didRelease = false;

      const ok = await claim(session);
      if (!ok) return;

      const result = await releaseEscrow(_id, session);
      if (result.notFound || result.notCompleted || result.notHeld) {
        throw new Error("Release was refused for this job");
      }

      didRelease = true;
    });

    return didRelease ? "released" : "skipped";
  } catch (err) {
    console.error(`Auto-release failed for job ${_id}:`, err.message);
    return "failed";
  } finally {
    session.endSession();
  }
};

// PASS 1: the customer never confirmed.
// The job is still "awaiting_confirmation" and its autoReleaseAt time has passed.
// We mark it completed and pay out.
const releaseUnconfirmedJobs = async () => {
  const dueJobs = await jobModel
    .find({
      status: "awaiting_confirmation",
      escrowStatus: "held",
      autoReleaseAt: { $ne: null, $lte: new Date() },
    })
    .select("_id")
    .limit(BATCH_SIZE)
    .lean();

  const counts = { released: 0, skipped: 0, failed: 0 };

  for (const { _id } of dueJobs) {
    const outcome = await processJob(_id, async (session) => {
      const job = await jobModel.findOneAndUpdate(
        {
          _id,
          status: "awaiting_confirmation",
          escrowStatus: "held",
          autoReleaseAt: { $lte: new Date() },
        },
        {
          $set: {
            status: "completed",
            previousStatus: "awaiting_confirmation",
            confirmedAt: new Date(),
          },
        },
        { new: true, session },
      );
      return !!job;
    });
    counts[outcome]++;
  }

  return counts;
};

// PASS 2: the customer confirmed, and the dispute window (4 hours) is over.
// The job is "completed" with escrowStatus "pending_release".
// If a dispute was raised, the job is no longer in this state, so it is skipped.
const releaseConfirmedJobs = async () => {
  const dueJobs = await jobModel
    .find({
      status: "completed",
      escrowStatus: "pending_release",
      autoReleaseAt: { $ne: null, $lte: new Date() },
    })
    .select("_id")
    .limit(BATCH_SIZE)
    .lean();

  const counts = { released: 0, skipped: 0, failed: 0 };

  for (const { _id } of dueJobs) {
    const outcome = await processJob(_id, async (session) => {
      const job = await jobModel
        .findOne({
          _id,
          status: "completed",
          escrowStatus: "pending_release",
          autoReleaseAt: { $lte: new Date() },
        })
        .session(session);
      return !!job;
    });
    counts[outcome]++;
  }

  return counts;
};

// Runs both passes and returns the combined totals.
export const autoReleaseEscrows = async () => {
  const a = await releaseUnconfirmedJobs();
  const b = await releaseConfirmedJobs();

  return {
    released: a.released + b.released,
    skipped: a.skipped + b.skipped,
    failed: a.failed + b.failed,
  };
};
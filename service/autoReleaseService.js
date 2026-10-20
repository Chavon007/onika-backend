import mongoose from "mongoose";
import jobModel from "../model/jobModel.js";
import { releaseEscrow } from "./escrowService.js";

const BATCH_SIZE = 50;

// Releases escrow for jobs the customer never confirmed.
// Finds jobs awaiting confirmation whose autoReleaseAt time has passed and whose
// escrow is still held, then marks each one completed and releases its money.
// Every job runs in its own transaction, so one failure never blocks the others
// and a job is never left completed without being paid.
// Returns how many jobs were released, skipped and failed.
export const autoReleaseEscrows = async () => {
  const dueJobs = await jobModel
    .find({
      status: "awaiting_confirmation",
      escrowStatus: "held",
      autoReleaseAt: { $ne: null, $lte: new Date() },
    })
    .select("_id")
    .limit(BATCH_SIZE)
    .lean();

  let released = 0;
  let skipped = 0;
  let failed = 0;

  for (const { _id } of dueJobs) {
    const session = await mongoose.startSession();

    try {
      let didRelease = false;

      await session.withTransaction(async () => {
        didRelease = false;

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

        if (!job) return;

        const result = await releaseEscrow(_id, session);
        if (result.notFound || result.notCompleted || result.notHeld) {
          throw new Error("Release was refused for this job");
        }

        didRelease = true;
      });

      if (didRelease) released++;
      else skipped++;
    } catch (err) {
      failed++;
      console.error(`Auto-release failed for job ${_id}:`, err.message);
    } finally {
      session.endSession();
    }
  }

  return { released, skipped, failed };
};
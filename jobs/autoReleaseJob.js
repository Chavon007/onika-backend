import cron from "node-cron";
import { autoReleaseEscrows } from "../service/autoReleaseService.js";

let isRunning = false;

// Starts the scheduled task that auto-releases overdue escrows every 5 minutes.
// The isRunning flag stops a new run from starting while the last one is
// still working.
export const startAutoReleaseJob = () => {
  cron.schedule("*/5 * * * *", async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const { released, skipped, failed } = await autoReleaseEscrows();
      if (released || failed) {
        console.log(
          `Auto-release: ${released} released, ${skipped} skipped, ${failed} failed`,
        );
      }
    } catch (err) {
      console.error("Auto-release run failed:", err.message);
    } finally {
      isRunning = false;
    }
  });
};
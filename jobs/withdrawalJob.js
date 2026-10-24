import cron from "node-cron";
import { reconcileWithdrawals } from "../service/withdrawalService.js";

let isRunning = false;

// Runs the withdrawal safety net every 5 minutes

export const startWithdrawalJob = () => {
  cron.schedule("*/5 * * * *", async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await reconcileWithdrawals();
    } catch (err) {
      console.error("Withdrawal reconcile failed:", err.message);
    } finally {
      isRunning = false;
    }
  });
};

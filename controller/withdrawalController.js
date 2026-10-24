import mongoose from "mongoose";
import User from "../model/auth.js";
import {
  requestWithdrawal,
  getWithdrawals,
} from "../service/withdrawalService.js";
import { processWithdrawal } from "../service/withdrawalService.js";

// Starts a withdrawal for the logged-in user. The amount comes in kobo and is
// taken from the wallet straight away. Returns a clear message for a low
// balance, a missing bank account, or a withdrawal already in progress.
export const requestWithdrawalController = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user.id;
    const amount = Number(req.body.amount);

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    let result;
    await session.withTransaction(async () => {
      result = await requestWithdrawal(userId, amount, session);
    });

    if (result.belowMinimum) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal amount is below the minimum",
      });
    }
    if (result.noBankAccount) {
      return res.status(400).json({
        success: false,
        message: "Please add a bank account before withdrawing",
      });
    }
    if (result.hasOpenWithdrawal) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending or processing withdrawal",
      });
    }

    processWithdrawal(result.withdrawal._id).catch((err) =>
      console.error("processWithdrawal failed:", err.message),
    );
    return res.status(201).json({
      success: true,
      message: "Withdrawal requested successfully",
      data: result.withdrawal,
    });
  } catch (err) {
    if (err.message === "Insufficient balance") {
      return res
        .status(402)
        .json({ success: false, message: "Insufficient wallet balance" });
    }
    if (err.message === "Wallet is frozen") {
      return res
        .status(403)
        .json({ success: false, message: "Your wallet is frozen" });
    }
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending or processing withdrawal",
      });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

// Returns the logged-in user's withdrawal history with pagination.
// Page and limit are cleaned first, and the limit is capped at 30.
export const getWithdrawalsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 6, 1), 30);

    const { withdrawals, total, totalPages } = await getWithdrawals(
      userId,
      page,
      limit,
    );

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      data: withdrawals,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

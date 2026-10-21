import mongoose from "mongoose";
import User from "../model/auth";
import {
  requestWithdrawal,
  getWithdrawals,
} from "../service/withdrawalService";

export const requestWithdrawalController = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    const { amount } = req.body;

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

    return res.status(201).json({
      success: true,
      message: "Withdrawal requested successfully",
      data: result.withdrawal,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  } finally {
    session.endSession();
  }
};

export const getWithdrawalsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.ceil(parseInt(req.query.page) || 1, 1);
    const limit = Math.ceil(parseInt(req.query.limit) || 6, 30);
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    const { withdrawal, total, totalPages } = await getWithdrawals(
      userId,
      page,
      limit,
    );

    res.set("Cache-Control", "no-store");
    res
      .status(200)
      .json({
        success: true,
        data: withdrawal,
        pagination: { page, limiit, total, totalPages },
      });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

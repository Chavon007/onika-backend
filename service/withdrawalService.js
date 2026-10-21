import withdrawalModel from "../model/withdrawalModel";
import bankAccountModel from "../model/bankAccountModel";
import { debitWallet, creditWallet } from "./walletService";
import mongoose from "mongoose";

const MIN_WITHDRAWAL = 100000; // 1,000 naira in kobo

// Starts a withdrawal for the logged-in user.
// Takes the amount out of the wallet straight away and records the withdrawal
// as pending with a copy of the bank details. Runs inside the caller's session,
// so the debit and the record save together or not at all.
// Throws if the balance is too low.
export const requestWithdrawal = async (userId, amount, session) => {
  if (!session) throw new Error("A database session is required");
  if (!Number.isInteger(amount) || amount < MIN_WITHDRAWAL) {
    return {
      withdrawal: null,
      belowMinimum: true,
      noBankAccount: false,
      hasOpenWithdrawal: false,
    };
  }

  const account = await withdrawalModel
    .findOne({ User: userId })
    .session(session);
  if (!account) {
    return {
      withdrawal: null,
      belowMinimum: false,
      noBankAccount: true,
      hasOpenWithdrawal: false,
    };
  }
  const open = await withdrawalModel
    .findOne({ User: userId, status: { $in: ["pending", "processing"] } })
    .session(session);

  if (open) {
    return {
      withdrawal: null,
      belowMinimum: false,
      noBankAccount: false,
      hasOpenWithdrawal: true,
    };
  }

  const withdrawalId = new mongoose.Types.ObjectId();

  const { wallet } = await debitWallet(
    userId,
    amount,
    "withdrawal",
    `withdrawal_${withdrawalId}`,
    null,
    "withdrawal to bank account",
    session,
  );

  const [withdrawal] = await withdrawalModel.create(
    [
      {
        _id: withdrawalId,
        User: userId,
        walletId: wallet._id,
        amount,
        bankAccount: {
          bankCode: account.bankCode,
          bankName: account.bankName,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
        },
        status: "pending",
        reference: `withdrawal_${withdrawalId}`,
      },
    ],
    { session },
  );

  return {
    withdrawal,
    belowMinimum: false,
    noBankAccount: false,
    hasOpenWithdrawal: false,
  };
};

// Marks a withdrawal as successful once the provider confirms the transfer.
// Matches by our own reference, so the provider's webhook doesn't need a user ID.
// Safe to call twice: a repeated confirmation returns alreadySuccessful instead
// of an error, and a withdrawal that already failed can never become successful.
export const markWithdrawalSuccessful = async (
  reference,
  providerReference = null,
  session,
) => {
  if (!session) {
    throw new Error("A database session is required");
  }

  const withdrawal = await withdrawalModel.findOneAndUpdate(
    { reference, status: { $in: ["pending", "processing"] } },
    {
      $set: {
        status: "successful",
        ...(providerReference && { providerReference }),
      },
    },
    { new: true, session },
  );
  if (withdrawal) {
    return {
      withdrawal,
      notFound: false,
      alreadySuccessful: false,
      alreadyFailed: false,
    };
  }

  const found = await withdrawalModel.findOne({ reference }).sessin(session);

  if (!found) {
    return {
      withdrawal: null,
      notFound: true,
      alreadySuccessful: false,
      alreadyFailed: false,
    };
  }
  if (found.status === "successful") {
    return {
      withdrawal: null,
      notFound: false,
      alreadySuccessful: true,
      alreadyFailed: false,
    };
  }
  return {
    withdrawal: found,
    notFound: false,
    alreadySuccessful: false,
    alreadyFailed: true,
  };
};

export const markWithdrawalFailed = async (
  reference,
  reason,
  session,
  providerReference = null,
) => {
  if (!session) {
    throw new Error("A database session is required");
  }

  const withdrawal = await withdrawalModel.findOneAndUpdate(
    {
      reference,
      status: { $in: ["pending", "processing"] },
    },
    {
      $set: {
        status: "failed",
        failureReason: reason,
        ...(providerReference && { providerReference }),
      },
    },
    { new: true, session },
  );

  // Prevent refunding if the withdrawal was not updated.
  if (!withdrawal) {
    return null;
  }

  await creditWallet(
    withdrawal.User,
    withdrawal.amount,
    "refund",
    `refund_${withdrawal._id}`,
    null,
    "Withdrawal failed — refunded to wallet",
    session,
  );

  return withdrawal;
};

export const getWithdrawals = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  const [withdrawal, total] = await Promise.all([
    withdrawalModel
      .find({ User: userId })
      .populate("bankName, ")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    withdrawalModel.countDocuments({ User: userId }),
  ]);

  return { withdrawal, total, totalPages: Math.ceil(total / limit) };
};

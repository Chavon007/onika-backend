import withdrawalModel from "../model/withdrawalModel.js";
import bankAccountModel from "../model/bankAccountModel.js";
import { debitWallet, creditWallet } from "./walletService.js";
import { getTransferFee } from "../config/platform.js";
import mongoose from "mongoose";
import { runInTransaction } from "../utliz/runInTransaction.js";
import {
  createTransferRecipient,
  initializeTransaction,
  initiateTransfer,
  verifyTransfer,
} from "./paystackService.js";

const MIN_WITHDRAWAL = 100000; // 1,000 naira in kobo
const FAILED_TRANSFER_STATUSES = [
  "failed",
  "reversed",
  "abandoned",
  "rejected",
  "blocked",
  "cancelled",
];

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

  const fee = getTransferFee(amount);
  const netAmount = amount - fee;

  const account = await bankAccountModel
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
        fee,
        netAmount,
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

  const found = await withdrawalModel.findOne({ reference }).session(session);

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

// Marks a withdrawal as failed and returns the money to the user's wallet.
// The status change and the refund happen in the caller's session. The status
// filter means it can only run once, so a repeated provider webhook can't
// refund twice, and a withdrawal that already succeeded is never refunded.
export const markWithdrawalFailed = async (
  reference,
  reason,
  session,
  providerReference = null,
) => {
  if (!session) throw new Error("A database session is required");

  const withdrawal = await withdrawalModel.findOneAndUpdate(
    { reference, status: { $in: ["pending", "processing"] } },
    {
      $set: {
        status: "failed",
        failureReason: reason,
        ...(providerReference && { providerReference }),
      },
    },
    { new: true, session },
  );

  if (!withdrawal) {
    const found = await withdrawalModel.findOne({ reference }).session(session);
    if (!found) {
      return {
        withdrawal: found,
        notFound: true,
        alreadyFailed: false,
        alreadySuccessful: false,
      };
    }
    if (found.status === "failed") {
      return {
        withdrawal: found,
        notFound: false,
        alreadyFailed: true,
        alreadySuccessful: false,
      };
    }
    return {
      withdrawal: found,
      notFound: false,
      alreadyFailed: false,
      alreadySuccessful: true,
    };
  }

  await creditWallet(
    withdrawal.User,
    withdrawal.amount,
    "refund",
    `withdrawal_refund_${withdrawal._id}`,
    null,
    "Withdrawal failed, refunded to wallet",
    session,
  );

  return {
    withdrawal,
    notFound: false,
    alreadyFailed: false,
    alreadySuccessful: false,
  };
};

// Returns a user's withdrawal history, newest first, one page at a time.
export const getWithdrawals = async (userId, page = 1, limit = 6) => {
  const skip = (page - 1) * limit;

  const [withdrawals, total] = await Promise.all([
    withdrawalModel
      .find({ User: userId })
      .select(
        "amount fee netAmount status bankAccount reference failureReason createdAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    withdrawalModel.countDocuments({ User: userId }),
  ]);

  return { withdrawals, total, totalPages: Math.ceil(total / limit) };
};

// Applies a Paystack transfer status to our withdrawal record.
// Success pays out, a failure refunds the wallet, anything else keeps waiting.

const applyTransferStatus = async (withdrawal, transfer) => {
  if (transfer.status === "success") {
    await runInTransaction((s) =>
      markWithdrawalSuccessful(withdrawal.reference, transfer.transfer_code, s),
    );
    return "successful";
  }

  if (FAILED_TRANSFER_STATUSES.includes(transfer.status)) {
    await runInTransaction((s) =>
      markWithdrawalFailed(
        withdrawal.reference,
        `transfer ${transfer.status}`,
        s,
        transfer.transfer_code,
      ),
    );

    return "failed";
  }

  return "processing";
};

// Sends a pending withdrawal to Paystack. Runs after the request transaction
// has committed. Only one caller can claim a withdrawal (pending to processing),
// so it can never be sent twice. If Paystack rejects the request outright, the
// wallet is refunded. If the result is unknown (timeout, server error), it stays
// "processing" and reconcileWithdrawals settles it later.

export const processWithdrawal = async (withdrawalId) => {
  const withdrawal = await withdrawalModel.findOneAndUpdate(
    {
      _id: withdrawalId,
      status: "pending",
    },
    { $set: { status: "processing" } },
    { new: true },
  );

  if (!withdrawal) return { skipped: true };

  try {
    const recipient = await createTransferRecipient(withdrawal.bankAccount);
    const transfer = await initiateTransfer({
      amount: withdrawal.netAmount,
      recipient: recipient.recipient_code,
      reference: withdrawal.reference,
      reason: "Onika wallet withdrawal",
    });

    await withdrawalModel.updateOne(
      { _id: withdrawal._id },
      { $set: { providerReference: transfer.transfer_code } },
    );

    const status = await applyTransferStatus(withdrawal, transfer);
    return { skipped: false, status };
  } catch (err) {
    const rejected =
      err.statusCode >= 400 && err.statusCode < 500 && err.statusCode !== 429;

    if (rejected) {
      console.error(`Paystack rejected ${withdrawal.reference}:`, err.message);
      await runInTransaction((s) =>
        markWithdrawalFailed(withdrawal.reference, err.message, s),
      );
      return { skipped: false, status: "failed" };
    }

    console.error(
      `Withdrawal ${withdrawal.reference} is unconfirmed:`,
      err.message,
    );
    return { skipped: false, status: "processing" };
  }
};

// Safety net for withdrawals that got stuck.
// Sends pending ones that were never processed (for example the server restarted),
// and asks Paystack about processing ones that never got a result.
// A transfer Paystack has no record of is refunded.

export const reconcileWithdrawals = async () => {
  const now = Date.now();

  const stalePending = await withdrawalModel
    .find({
      status: "pending",
      updatedAt: { $lt: new Date(now - 2 * 60 * 1000) },
    })
    .select("_id")
    .limit(50)
    .lean();

  for (const { _id } of stalePending) {
    await processWithdrawal(_id);
  }

  const stuck = await withdrawalModel
    .find({
      status: "processing",
      updatedAt: { $lt: new Date(now - 10 * 60 * 1000) },
    })
    .select("reference")
    .limit(50)
    .lean();

  for (const withdrawal of stuck) {
    try {
      let transfer = null;
      try {
        transfer = await verifyTransfer(withdrawal.reference);
      } catch (err) {
        if (err.statusCode !== 404) throw err;
      }
      if (transfer) {
        await applyTransferStatus(withdrawal, transfer);
      } else {
        await runInTransaction((s) =>
          markWithdrawalFailed(
            withdrawal.reference,
            "Transfer was never created",
            s,
          ),
        );
      }
    } catch (err) {
      console.error(
        `Reconcile failed for ${withdrawal.reference}:`,
        err.message,
      );
    }
  }
};

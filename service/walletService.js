import walletModel from "../model/walletModel.js";
import transactionModel from "../model/transactionModel.js";
import mongoose from "mongoose";

// Creates a wallet for a user with a zero balance.
// If the user already has a wallet, it returns the existing one instead,
// and the created flag tells the caller which case happened.
export const createWallet = async (userId, session = null) => {
  const existing = await walletModel.findOne({ User: userId }).session(session);
  if (existing) {
    return { wallet: existing, created: false };
  }

  const [wallet] = await walletModel.create([{ User: userId }], { session });
  return { wallet, created: true };
};

// Finds a user's wallet by their user ID.
// Returns notFound: true when the user has no wallet yet.
export const getWallet = async (userId, session = null) => {
  const wallet = await walletModel.findOne({ User: userId }).session(session);
  if (!wallet) {
    return { wallet: null, notFound: true };
  }

  return { wallet, notFound: false };
};

// Adds money to a user's wallet and records it in the ledger.
// A reference that was already processed returns the original transaction
// without crediting again. Internal use only, never expose as an endpoint.
export const creditWallet = async (
  userId,
  amount,
  type,
  reference,
  jobId = null,
  description = "",
  session,
) => {
  if (!session) throw new Error("A database session is required");
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error("Amount must be a whole number of at least 1 kobo");
  }

  const existing = await transactionModel
    .findOne({ reference })
    .session(session);

  if (existing) {
    return { wallet: null, transaction: existing, duplicate: true };
  }

  const wallet = await walletModel.findOneAndUpdate(
    {
      User: userId,
      status: "active",
    },
    { $inc: { balance: amount } },
    { new: true, session },
  );
  if (!wallet) {
    throw new Error("Wallet not found or frozen");
  }

  const [transaction] = await transactionModel.create(
    [
      {
        walletId: wallet._id,
        User: userId,
        reference,
        type,
        direction: "credit",
        amount,
        balanceBefore: wallet.balance - amount,
        balanceAfter: wallet.balance,
        status: "successful",
        jobId,
        description,
      },
    ],
    { session },
  );

  return { wallet, transaction, duplicate: false };
};

// Removes money from a user's wallet and records it in the ledger.
// The deduction only happens if the wallet is active and has enough balance,
// and a repeated reference returns the original transaction without debiting again.
// Internal use only, never expose as an endpoint.
export const debitWallet = async (
  userId,
  amount,
  type,
  reference,
  jobId = null,
  description = "",
  session,
) => {
  if (!session) throw new Error("A database session is required");
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error("Amount must be a whole number of at least 1 kobo");
  }

  const existing = await transactionModel
    .findOne({ reference })
    .session(session);

  if (existing) {
    return { wallet: null, transaction: existing, duplicate: true };
  }

  const wallet = await walletModel.findOneAndUpdate(
    {
      User: userId,
      status: "active",
      balance: { $gte: amount },
    },
    { $inc: { balance: -amount } },
    {
      new: true,
      session,
    },
  );
  if (!wallet) {
    const found = await walletModel.findOne({ User: userId }).session(session);
    if (!found) throw new Error("Wallet not found");
    if (found.status !== "active") throw new Error("Wallet is frozen");
    throw new Error("Insufficient balance");
  }

  const [transaction] = await transactionModel.create(
    [
      {
        walletId: wallet._id,
        User: userId,
        reference,
        type,
        direction: "debit",
        amount,
        balanceBefore: wallet.balance + amount,
        balanceAfter: wallet.balance,
        status: "successful",
        jobId,
        description,
      },
    ],
    { session },
  );

  return { wallet, transaction, duplicate: false };
};

// Returns a user's transaction history, newest first, one page at a time.
// Provider metadata is left out so users only see their own safe fields.
export const getTransactions = async (userId, page = 1, limit = 6) => {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    transactionModel
      .find({ User: userId })
      .select("-metadata -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    transactionModel.countDocuments({ User: userId }),
  ]);

  return { transactions, total, totalpage: Math.ceil(total / limit) };
};

// Returns a single transaction by ID, but only if it belongs to the given user.
// A malformed ID or someone else's transaction both come back as notFound.
export const getTransaction = async (userId, transactionId) => {
  if (!mongoose.isValidObjectId(transactionId)) {
    return { transaction: null, notFound: true };
  }

  const transaction = await transactionModel
    .findOne({ _id: transactionId, User: userId })
    .select("-metadata -__v")
    .lean();

  if (!transaction) {
    return { transaction: null, notFound: true };
  }

  return { transaction, notFound: false };
};
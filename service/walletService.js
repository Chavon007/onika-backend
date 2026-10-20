import walletModel from "../model/walletModel.js";
import transactionModel from "../model/transactionModel.js";
export const createWallet = async (userId, session = null) => {
  const existing = await walletModel.findOne({ User: userId }).session(session);
  if (existing) {
    return { wallet: existing, created: false };
  }

  const [wallet] = await walletModel.create([{ User: userId }], { session });
  return { wallet, created: true };
};

export const getWallet = async (userId, session) => {
  const wallet = await walletModel.findOne({ User: userId }).session(session);
  if (!wallet) {
    return { wallet: null, notFound: true };
  }

  return { wallet, notFound: false };
};

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

  // Already processed? Return it instead of crediting twice
  const existing = await transactionModel
    .findOne({ reference })
    .session(session);

  if (existing) {
    return { wallet: null, transaction: existing, duplicate: true };
  }

  // Atomic update: no read-then-save
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

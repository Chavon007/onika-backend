import walletModel from "../model/walletModel";
import transactionModel from "../model/transactionModel";
export const createWallet = async (userId, session = null) => {
  const existing = await walletModel.findOne({ User: userId }).session(session);
  if (existing) {
    return { wallet: existing, forbidden: false };
  }

  const [wallet] = await walletModel.create([{ User: userId }], { session });
  return { wallet, forbidden: false };
};

export const getWallet = async (userId, session) => {
  const wallet = await walletModel.findById({ User: userId }).session(session);
  if (!wallet) {
    return { wallet: null, forbidden: false, notFound: true };
  }

  return { wallet, forbidden: false, notFound: false };
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
    { returnDocument: true, session },
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

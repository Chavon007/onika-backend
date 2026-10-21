import mongoose from "mongoose";
import bankAccountModel from "../model/bankAccountModel.js";

const MAX_ACCOUNTS = 3;

// Saves a bank account for the logged-in user.
// Refuses once the user has reached the account limit, and a repeated
// bank and account number combination is caught by the unique index.
export const addBankAccount = async (
  userId,
  { bankCode, bankName, accountName, accountNumber },
) => {
  const count = await bankAccountModel.countDocuments({ User: userId });

  if (count > MAX_ACCOUNTS) {
    return { bank: null, limitReached: true, duplicate: false };
  }
  try {
    const bank = await bankAccountModel.create({
      User: userId,
      bankName,
      bankCode,
      accountNumber,
      accountName,
    });

    return { bank, limitReached: false, duplicate: false };
  } catch (err) {
    if (err.code === 11000) {
      return { bank: null, limitReached: false, duplicate: true };
    }
    throw err;
  }
};

export const getBankAccounts = async (userId) => {
  const banks = await bankAccountModel
    .find({ User: userId })
    .select("bankCode bankName accountName accountNumber createdAt")
    .sort({ createdAt: -1 })
    .lean();
  if (!banks) {
    return { banks: null, notFound: true };
  }

  return { banks, notFound: false };
};

export const deleteBankAccount = async (userId, accountId) => {
  if (!mongoose.isValidObjectId(accountId)) {
    return { bank: null, notFound: true };
  }
  const bank = await bankAccountModel.findByIdAndDelete({
    User: userId,
    _id: accountId,
  });

  if (!bank) {
    return { bank: null, notFound: true };
  }
  return { bank, notFound: false };
};

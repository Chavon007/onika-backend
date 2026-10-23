import mongoose from "mongoose";
import bankAccountModel from "../model/bankAccountModel.js";
import { listBanks } from "./paystackService.js";
const MAX_ACCOUNTS = 3;

let bankCache = { banks: null, loadedAt: 0 };

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
// Returns Paystack's bank list as { name, code }, cached for 24 hours.
export const getBankList = async () => {
  const isFresh = Date.now() - bankCache.loadedAt < 24 * 60 * 60 * 1000;
  if (bankCache.banks && isFresh) return bankCache.banks;

  const banks = await listBanks();
  bankCache = {
    banks: banks.map((b) => ({ name: b.name, code: b.code })),
    loadedAt: Date.now(),
  };
  return bankCache.banks;
};

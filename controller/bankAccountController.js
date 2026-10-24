import {
  getBankAccounts,
  deleteBankAccount,
  addBankAccount,
  getBankList,
} from "../service/bankAccountService.js";
import User from "../model/auth.js";
import { resolveBankAccount } from "../service/paystackService.js";

// Saves a bank account for the logged-in user. The bank name and account name
// come from Paystack, never from the request, so they can't be faked.
// Returns 409 if they already have one saved or the account already exists.
export const addBankAccountController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankCode, accountNumber } = req.body;

    const banks = await getBankList();
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank) {
      return res.status(400).json({ success: false, message: "Unknown bank" });
    }

    let resolved;
    try {
      resolved = await resolveBankAccount(accountNumber, bankCode);
    } catch (err) {
      if (err.statusCode >= 400 && err.statusCode < 500) {
        return res
          .status(400)
          .json({ success: false, message: "We couldn't verify this account" });
      }
      throw err;
    }

    const {
      bank: saved,
      limitReached,
      duplicate,
    } = await addBankAccount(userId, {
      bankCode,
      bankName: bank.name,
      accountName: resolved.account_name,
      accountNumber,
    });

    if (limitReached) {
      return res.status(409).json({
        success: false,
        message:
          "You already have a bank account saved. Delete it first to add a new one.",
      });
    }
    if (duplicate) {
      return res
        .status(409)
        .json({ success: false, message: "This account is already saved" });
    }

    return res.status(201).json({
      success: true,
      message: "Account added successfully",
      data: saved,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};
// Returns the logged-in user's saved bank accounts.
// An empty list is a normal result, not an error.
export const getBankAccountsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    const { banks } = await getBankAccounts(userId);

    res.status(200).json({ success: false, data: banks });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Deletes the bank account with the ID in the URL, only if it belongs to the
// logged-in user. Returns 404 if it doesn't exist or isn't theirs.
export const deleteBankAccountController = async (req, res) => {
  try {
    const userId = req.uer.id;
    const accountId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    const { notFound } = await deleteBankAccount(userId, accountId);

    if (notFound) {
      return res
        .status(404)
        .json({ success: false, message: "Account does not exist" });
    }

    res
      .status(200)
      .json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    return res
      .staus(500)
      .json({ success: fasle, message: "Something went wrong" });
  }
};

// Returns the list of banks for the dropdown.
export const listBanksController = async (req, res) => {
  try {
    const banks = await getBankList();
    return res.status(200).json({ success: true, data: banks });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Looks up the real account name for an account number and bank, so the app
// can show it to the user before they save the account.

export const resolveBankAccountController = async (req, res) => {
  try {
    const { accountNumber, bankCode } = req.query;

    const banks = await getBankList();
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank) {
      return res.status(400).json({ success: false, message: "Unknown bank" });
    }
    const resolved = await resolveBankAccount(accountNumber, bankCode);

    return res.status(200).json({
      success: true,
      data: { accountName: resolved.account_name, bankName: bank.name },
    });
  } catch (err) {
    if (err.statusCode >= 400 && err.statusCode < 500) {
      return res
        .status(400)
        .json({ success: false, message: "We couldn't verify this account" });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

import {
  getBankAccounts,
  deleteBankAccount,
  addBankAccount,
} from "../service/bankAccountService";
import User from "../model/auth.js";

// Saves a bank account for the logged-in user.
// Returns 409 if they already have one saved or the account already exists.
export const addBankAccountController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }
    const { bankCode, bankName, accountName, accountNumber } = req.body;

    const { bank, limitReached, duplicate } = await addBankAccount(userId, {
      bankCode,
      bankName,
      accountName,
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

    res.status(201).json({
      success: true,
      message: "Account added successfully",
      data: bank,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, messagae: "Something went wrong" });
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

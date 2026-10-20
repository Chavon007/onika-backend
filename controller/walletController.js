import User from "../model/auth.js";
import {
  createWallet,
  getWallet,
  getTransactions,
  getTransaction,
} from "../service/walletService.js";

// Creates a wallet for the logged-in user.
// Returns 409 if the user already has one.
export const createWalletController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    const { wallet, created } = await createWallet(userId);

    if (!created) {
      return res
        .status(409)
        .json({ success: false, message: "You already have a wallet" });
    }

    return res.status(201).json({
      success: true,
      message: "Wallet created successfully",
      data: wallet,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Returns the logged-in user's balance (in kobo), currency and status.
// If the user has no wallet yet, one is created automatically.
export const getWalletController = async (req, res) => {
  try {
    const userId = req.user.id;

    let { wallet, notFound } = await getWallet(userId);

    if (notFound) {
      const result = await createWallet(userId);
      wallet = result.wallet;
    }

    return res.status(200).json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        status: wallet.status,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Returns the logged-in user's transaction history with pagination.
// Page and limit are cleaned first, and the limit is capped at 30.
export const getTransactionsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 6, 1), 30);

    const { transactions, total, totalpage } = await getTransactions(
      userId,
      page,
      limit,
    );

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, totalpage },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Returns one transaction by ID from the URL.
// Responds 404 if it doesn't exist or belongs to another user.
export const getTransactionController = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    const { transaction, notFound } = await getTransaction(
      userId,
      transactionId,
    );

    if (notFound) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ success: true, data: transaction });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};
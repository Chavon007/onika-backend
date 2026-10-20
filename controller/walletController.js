import User from "../model/auth.js";
import {
  createWallet,
  getWallet,
  getTransactions,
} from "../service/walletService.js";

export const createWallletController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exit" });
    }

    const { wallet, created } = await createWallet(userId);

    if (!created) {
      return res
        .status(409)
        .json({ success: false, message: "You already have a wallet" });
    }

    res.status(201).json({
      success: true,
      message: "Wallet created successfully",
      data: wallet,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWalletController = async (req, res) => {
  try {
    const userId = req.user.id;

    let { wallet, notFound } = await getWallet(userId, balance, status);

    if (notFound) {
      const wallet = await createWallet(userId);
      wallet = result.wallet;
    }
    res.status(200).json({
      success: true,
      data: {
        wallet: wallet.balance,
        currency: wallet.currency,
        status: wallet.status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTransactionsController = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 6, 30);
    const { transactions, total, totalpage } = await getTransactions(
      userId,
      page,
      limit,
    );
    res.set("Cache-Control", "no-store");
    res.status(200).json({success:true, data:transactions, pagination:{page, limit, total, totalpage} })
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

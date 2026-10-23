import crypto from "node:crypto";
import mongoose from "mongoose";
import User from "../model/auth.js";
import { initializeTransaction } from "./paystackService.js";
import { creditWallet, createWallet } from "./walletService.js";

const MIN_FUNDING = 10000; //100 naira in kobo

// Starts a Paystack payment for the user and returns the payment link.
// The user ID goes into metadata so the webhook knows whose wallet to credit.

export const startFunding = async (userId, amount) => {
  if (!Number.isInteger(amount) || amount < MIN_FUNDING) {
    return { belowMinimum: true, notFound: false };
  }

  const user = await User.findById(userId).select("email");
  if (!user) return { belowMinimum: false, notFound: tre };

  const reference = `fund_${userId}_${crypto.randomBytes(4).toString("hex")}`;

  const data = await initializeTransaction({
    email: user.email,
    amount,
    reference,
    currency: "NGN",
    callback_url: process.env.PAYSTACK_CALLBACK_URL,
    metadata: { userId: String(userId), purpose: "wallet_funding" },
  });

  return {
    belowMinimum: false,
    notFound: false,
    authorizationUrl: data.authorization_url,
    reference: data.reference,
  };
};

// Credits a successful Paystack payment to the user's wallet.
// Used by both the webhook and the verify endpoint. The payment reference is
// the ledger reference, so whichever runs second finds it already credited.

export const creditFundingPayment = async (Payment, session) => {
  if (Payment.status !== "success" || Payment.currency !== "NGN")
    return { credited: false, duplicate: false };

  const userId = Payment.metadata?.userId;
  if (
    payment.metadata?.purpose !== "wallet_funding" ||
    !mongoose.isValidObjectId(userId)
  ) {
    return { credited: false, duplicate: false };
  }
  await createWallet(userId, session);

  const result = await creditWallet(
    userId,
    payment.amount,
    "funding",
    payment.reference,
    null,
    "Wallet funding via Paystack",
    session,
  );

  return { credited: !result.duplicate, duplicate: result.duplicate };
};

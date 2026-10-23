import crypto from "node:crypto";

const BASE_URL = process.env.PAYSTACK_BASE_URL || "https://api.paystack.co";

const paystackRequest = async (
  path,
  { method = "GET", body, query, withMeta = false } = {},
) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const url = new URL(`${BASE_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.status) {
    const error = new Error(
      result?.message || `Paystack request failed: ${response.status}`,
    );

    error.statusCode = response.status;
    throw error;
  }

  return withMeta ? { data: result.data, meta: result.meta } : result.data;
};

// Wallet funding
export const initializeTransaction = (payload) =>
  paystackRequest("/transaction/initialize", {
    method: "POST",
    body: payload,
  });

export const verifyTransaction = (reference) =>
  paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);

// Banks
export const listBanks = async () => {
  const banks = [];
  let next = null;

  for (let page = 0; page < 10; page++) {
    const { data, meta } = await paystackRequest("/bank", {
      query: { country: "nigeria", perPage: 100, use_cursor: true, next },
      withMeta: true,
    });
    banks.push(...data);
    next = meta?.next || null;
    if (!next) break;
  }
  return banks;
};

export const resolveBankAccount = (accountNumber, bankCode) =>
  paystackRequest("/bank/resolve", {
    query: {
      account_number: accountNumber,
      bank_code: bankCode,
    },
  });

// Transfers
export const createTransferRecipient = (bankAccount) =>
  paystackRequest("/transferrecipient", {
    method: "POST",
    body: {
      type: "nuban",
      name: bankAccount.accountName,
      account_number: bankAccount.accountNumber,
      bank_code: bankAccount.bankCode,
      currency: "NGN",
      description: "Onika marketplace withdrawal",
    },
  });

export const initiateTransfer = ({ amount, recipient, reference, reason }) =>
  paystackRequest("/transfer", {
    method: "POST",
    body: {
      source: "balance",
      amount,
      recipient,
      reference,
      reason,
      currency: "NGN",
    },
  });

export const verifyTransfer = (reference) =>
  paystackRequest(`/transfer/verify/${encodeURIComponent(reference)}`);

// Reconciliation
export const getPaystackBalance = () =>
  paystackRequest("/balance", {
    query: { currency: "NGN" },
  });

// Webhook signature verification.
// rawBody must be the original request bytes, not JSON.stringify(req.body).
export const verifyPaystackSignature = (rawBody, signature) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!rawBody || !signature || !secret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const suppliedBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === suppliedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
};

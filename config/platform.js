export const COMMISSION_RATE = 0.1;
export const PLATFORM_USER_ID = process.env.PLATFORM_USER_ID;

const STAMP_DUTY = 5000; // 50 naira in kobo

// Fee the user pays on a withdrawal, in kobo, based on Paystack's NGN transfer
// pricing. It uses the requested amount, so near a tier boundary it can be a
// few naira more than Paystack's charge, never less.

export const getTransferFee = (amount) => {
  let fee = 5000;
  if (amount <= 500000) fee = 1000;
  else if (amount <= 5000000) fee = 2500;
  if (amount >= 1000000) fee += STAMP_DUTY;
  return fee;
};

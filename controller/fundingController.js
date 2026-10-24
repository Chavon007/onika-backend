import { verifyTransaction } from "../service/paystackService.js";
import {
  startFunding,
  creditFundingPayment,
} from "../service/fundingService.js";
import { runInTransaction } from "../utliz/runInTransaction.js";

// Starts a wallet funding payment and returns the Paystack payment link.
export const startFundingController = async (req, res) => {

  try {
    const userId = req.user.id;
    const  amount  = Number(req.body.amount);

    const result = await startFunding(userId, amount);

    if (result.notFound) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }
    if (result.belowMinimum) {
      return res
        .status(400)
        .json({ success: false, message: "Amount is below the minimum" });
    }

    return res.status(200).json({
      success: true,
      data: {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

// Checks a payment with Paystack and credits the wallet if it succeeded.
// The frontend calls this after the user returns from the payment page.
// Safe to call repeatedly, because the payment reference can only credit once.
export const verifyFundingController = async (req, res) => {
  try {
    const userId = req.user.id;

    const payment = await verifyTransaction(req.params.reference);
    if (String(payment.metadata?.userId) !== String(userId)) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    await runInTransaction((s) => creditFundingPayment(payment, s));

    return res.status(200).json({
      success: true,
      data: { status: payment.status, paid: payment.status === "success" },
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

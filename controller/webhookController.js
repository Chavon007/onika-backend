import { verifyPaystackSignature } from "../service/paystackService.js";
import { creditFundingPayment } from "../service/fundingService.js";
import {
  markWithdrawalSuccessful,
  markWithdrawalFailed,
} from "../service/withdrawalService.js";
import { runInTransaction } from "../utliz/runInTransaction.js";

// Receives Paystack events. The signature is checked against the raw body, so
// only Paystack can trigger a credit or a payout result.
// Answers 200 once handled (including repeats) and 500 on a real error,
// so Paystack retries it.

export const paystackWebhookController = async (req, res) => {
  if (!verifyPaystackSignature(req.body, req.headers["x-paystack-signature"])) {
    return res.sendStatus(401);
  }

  let event;

  try {
    event = JSON.parse(re.body.toString("utf8"));
  } catch {
    return res.sendStatus(400);
  }

  try {
    const { event: type, data } = event;

    if (type === "charge.success") {
      await runInTransaction((s) => creditFundingPayment(data, s));
    }

    if (type === "transfer.success") {
      const result = await runInTransaction((s) =>
        markWithdrawalSuccessful(data.reference, data.transfer_code, s),
      );
      if (result.alreadyFailed) {
        console.error(
          `Paystack reports ${data.reference} succeeded but it was refunded. Review manually.`,
        );
      }
    }

    if (type === "transfer.failed" || type === "transfer.reversed") {
      const result = await runInTransaction((s) =>
        markWithdrawalFailed(
          data.reference,
          data.reason || type,
          s,
          data.transfer_code,
        ),
      );
      if (result.alreadySuccessful) {
        console.error(
          `Paystack reports ${data.reference} was ${type} after success. Review manually.`,
        );
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Paystack webhook error:", err);
    return res.sendStatus(500);
  }
};

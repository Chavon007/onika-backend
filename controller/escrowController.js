import User from "../model/auth.js";
import { customerAmountInEscrow } from "../service/escrowService.js";

export const customerAmountInEscrowController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Only customer can make this request",
      });
    }

    const escrowBalance = await customerAmountInEscrow(userId);
    res.status(200).json({ success: true, data: escrowBalance });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

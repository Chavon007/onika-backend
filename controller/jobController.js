import { createJob } from "../service/jobService.js";
import User from "../model/auth.js";
export const createNewJob = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }
    if (user.role !== "customer") {
      return res
        .status(403)
        .json({ success: false, message: "Only customers can post jobs" });
    }
    const job = await createJob({ customerId: userId, ...req.body });

    res.status(201).json({ success: true, message: "Job created", data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

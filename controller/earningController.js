import User from "../model/auth.js";
import {
  getArtisanCurrentMonthEarnings,
  getArtisanAllTimeEarning,
} from "../service/earningService.js";

export const getArtisanCurrentMonthEarningsController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only Artisan can make this request",
      });
    }

    const amount = await getArtisanCurrentMonthEarnings(userId);

    res.status(200).json({ success: true, data: amount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getArtisanAllTimeEarningController = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User does not exist" });
    }

    if (user.role !== "artisan") {
      return res.status(403).json({
        success: false,
        message: "Only Artisan can make this request",
      });
    }

    const allTimeAmount = await getArtisanAllTimeEarning(userId);

    res.status(200).json({ success: false, data: allTimeAmount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

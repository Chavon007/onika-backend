import { createArtisanProfile } from "../service/artisanProfileService.js";
import User from "../model/auth.js";

export const createArtisan = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const artisan = await createArtisanProfile(userId, user, req.body);
    res.status(201).json({
      success: true,
      message: "Artisan profile updated successfully",
      data: artisan,
    });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message });
  }
};

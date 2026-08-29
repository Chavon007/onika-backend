import createAccountService from "../service/authService.js";
import {
  loginService,
  generateOTP,
  OtpService,
  fetchUser,
} from "../service/authService.js";
import redisClient from "../config/redis.js";
import {
  verifyToken,
  verifyRefreshToken,
  generateToken,
} from "../utliz/token.js";
import User from "../model/auth.js";

const createAccount = async (req, res) => {
  try {
    const user = await createAccountService(req.body);
    const otp = await generateOTP({ email: user.email });
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: user,
      otp,
    });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { user, token } = await loginService(req.body);
    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res
      .status(200)
      .json({ success: true, message: "Login successful", data: user });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const email = req.user.email;
    const user = await fetchUser({ email });
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message });
  }
};
export const verifyOtp = async (req, res) => {
  try {
    const { email, OTP } = req.body;
    const { user, token } = await OtpService({ OTP, email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({ success: true, message: "Verification successful" });
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json({ success: false, message: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "No active session found" });
    }

    const decoded = verifyToken(token);
    const now = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = decoded.exp - now;

    if (secondsUntilExpiry > 0) {
      await redisClient.set(`bl:${token}`, "true", {
        EX: secondsUntilExpiry,
      });
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "No refresh token" });
    }

    const isBlackListed = await redisClient.get(`bl:${refreshToken}`);
    if (isBlackListed) {
      return res.status(401).json({
        success: false,
        message: "Session expired, please login again",
      });
    }
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }
    const newAccessToken = generateToken(user);

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ success: true, message: "Token refreshed" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired, please login again",
      });
    }
    res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};
export default createAccount;

import createAccountService from "../service/authService.js";
import {
  loginService,
  generateOTP,
  OtpService,
} from "../service/authService.js";
import redisClient from "../config/redis.js";
import { verifyToken } from "../utliz/token.js";

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
      maxAge: 3600000,
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

export const verifyOtp = async (req, res) => {
  try {
    const { email, OTP } = req.body;
    const { user, token } = await OtpService({ OTP, email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 3600000,
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
export default createAccount;

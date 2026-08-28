import createAccountService from "../service/authService.js";
import {
  loginService,
  generateOTP,
  OtpService,
} from "../service/authService.js";

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
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
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
      .json({ success: true, message: "Login successful", data: user, token });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, OTP } = req.body;
    const {user, token} = await OtpService({OTP, email})
   
    res.cookie("token", token, {
      httpOnly:true,
      secure: false,
      sameSite:"lax",
      maxAge:3600000,
    })
    res.status(200).json({ success: true, message: "Verification successful" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
};
export default createAccount;

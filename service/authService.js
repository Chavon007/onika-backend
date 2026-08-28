import { hashPassword, comparePassword } from "../utliz/hash.js";
import User from "../model/auth.js";
import { generateToken } from "../utliz/token.js";
import sendOtpEmail from "../utliz/sendEmail.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const SALT_OTP = 10;

export const generateOTP = async ({ email }) => {
  const user = await User.findOne({ email });

  if (!user) throw new Error("User not found");

  const otp = crypto
    .randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");
  const hashedOTP = await bcrypt.hash(otp, SALT_OTP);

  user.otp = hashedOTP;
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await user.save();

  await sendOtpEmail(email, otp);
  return { message: "OTP SENT" };
};

const createAccountService = async ({
  email,
  fullName,
  phoneNumber,
  role,
  state,
  password,
  lga,
}) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const err = new Error("Email already exist")
    err.statusCode = 409;
    throw err;
  }
  const hashed = await hashPassword(password);
  const user = await User.create({
    fullName,
    role,
    password: hashed,
    state,
    lga,
    email,
    phoneNumber,
  });

  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
  const err = new Error("Invalid credentials");
   err.statusCode = 401;
   throw err;
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(user);

  const userObject = user.toObject();
  delete userObject.password;
  return {
    user: userObject,
    token,
  };
};

export const OtpService = async ({ OTP, email }) => {
  const existingUser = await User.findOne({ email });

  if (!existingUser) {
    const err = new Error("User does not exist");
    err.statusCode = 404;
    throw err;
   
  }
  if (!existingUser.otp || !existingUser.otpExpiresAt) {
    const err = new Error("User did not request for OTP")
    err.statusCode = 400;
    throw err;
  }

  if (existingUser.otpExpiresAt < new Date()) {
    const err = new Error("OTP has expired");
    err.statusCode = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(String(OTP), existingUser.otp);
  if (!isMatch) {
    const err = new Error("Invalid OTP");
    err.statusCode = 400;
    throw err;
  }

  existingUser.otp = undefined;
  existingUser.otpExpiresAt = undefined;
  existingUser.isVerified = true;

  await existingUser.save();

  const token = generateOTP(existingUser);
  const userObject = existingUser.toObject();
  delete userObject.password;
  return {
    message: "OTP verified successfully",
    user: existingUser,
    token
  };
};
export default createAccountService;

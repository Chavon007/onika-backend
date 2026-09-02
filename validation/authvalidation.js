import { body } from "express-validator";

export const createAccountValidator = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is Required")
    .isLength({ min: 3 })
    .withMessage("Full name must be at least 3 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Use a valid email address"),

  body("role").trim().notEmpty().withMessage("Please select a role"),

  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password can't be less than 6 characters"),
  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isLength({ min: 10 })
    .withMessage("Phone number can not be less than 10"),

  body("state").trim().notEmpty().withMessage("State is required"),
  body("lga").trim().notEmpty().withMessage("Local government areais required"),
];

export const loginValidator = [
  body("email").trim().notEmpty().withMessage("Email is required"),

  body("password").trim().notEmpty().withMessage("Password is required"),
];

export const OTPValidator = [
  body("OTP").trim().notEmpty().withMessage("OTP is required"),
];

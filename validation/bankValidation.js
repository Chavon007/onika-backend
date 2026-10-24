import { body, param, query } from "express-validator";

export const bankValidator = [
  body("bankCode").trim().matches(/^\d{3,6}$/).withMessage("Bank code must be 3 to 6 digits"),
  body("accountNumber").trim().matches(/^\d{10}$/).withMessage("Account number must be exactly 10 digits"),
];

export const resolveValidator = [
  query("bankCode").trim().matches(/^\d{3,6}$/).withMessage("Bank code must be 3 to 6 digits"),
  query("accountNumber").trim().matches(/^\d{10}$/).withMessage("Account number must be exactly 10 digits"),
];

export const bankIdValidator = [
  param("id").isMongoId().withMessage("Invalid bank account ID"),
];
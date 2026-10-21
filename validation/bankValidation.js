import { body, param } from "express-validator";

export const bankValidator = [
  body("bankCode")
    .trim()
    .notEmpty()
    .withMessage("Bank code is required")
    .matches(/^\d{3,6}$/)
    .withMessage("Bank code must be 3 to 6 digits")
    .isNumeric()
    .withMessage("Bank code must contain only digits"),
  body("bankName").trim().notEmpty().withMessage("Bank name can not be empty"),
  body("accountName").trim().notEmpty().withMessage("Account name is required"),
  body("accountNumber")
    .trim()
    .notEmpty()
    .withMessage("Account number can not be empty")
    .matches(/^\d{10}$/)
    .withMessage("Account number must be exactly 10 digits")
    .isNumeric()
    .withMessage("Account numver contain only digits "),
];

export const bankIdValidator = [
  param("id").isMongoId().withMessage("Invalid bank account ID"),
];

import { body, param } from "express-validator";

export const fundValidator = [
  body("amount")
    .isInt({ min: 10000 })
    .withMessage("Amount must be a whole number of kobo, at least 10000"),
];

export const verifyFundValidator = [
  param("reference")
    .matches(/^fund_[a-f0-9]{24}_[a-f0-9]{8}$/)
    .withMessage("Invalid payment reference"),
];

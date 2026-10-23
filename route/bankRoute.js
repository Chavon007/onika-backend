import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  bankIdValidator,
  bankValidator,
  resolveValidator,
} from "../validation/bankValidation.js";
import { validate } from "../middleware/validation.js";
import {
  addBankAccountController,
  getBankAccountsController,
  deleteBankAccountController,
  listBanksController,
  resolveBankAccountController,
} from "../controller/bankAccountController.js";

const router = express.Router();

router.post(
  "/bank",
  authMiddleware,
  bankValidator,
  validate,
  addBankAccountController,
);
router.get("/bank", authMiddleware, getBankAccountsController);
router.get("/bank/list", authMiddleware, listBanksController);
router.get(
  "/bank/resolve",
  authMiddleware,
  resolveValidator,
  validate,
  resolveBankAccountController,
);
router.delete(
  "/bank/:id",
  authMiddleware,
  bankIdValidator,
  validate,
  deleteBankAccountController,
);

export default router;

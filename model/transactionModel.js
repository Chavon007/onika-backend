import mongoose from "mongoose";

const isWholeNumber = {
  validator: Number.isInteger,
  message: "{PATH} must be a whole number(kobo)",
};
const transactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "wallet",

      required: true,
    },
    User: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: isWholeNumber,
    },
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
      validate: isWholeNumber,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
      validate: isWholeNumber,
    },
    status: {
      type: String,
      enum: ["successful", "failed", "pending"],
      default: "pending",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "funding",
        "escrow_hold",
        "escrow_release",
        "refund",
        "withdrawal",
        "commission",
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    reference: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "job",
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ walletId: 1, createdAt: -1 });
transactionSchema.index({ jobId: 1, createdAt: -1 });
transactionSchema.index({ User: 1, createdAt: -1 });
export default mongoose.model("transaction", transactionSchema);

import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    User: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "wallet",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Amount must be in kobo",
      },
    },
    bankAccount: {
      bankCode: { type: String, required: true },
      bankName: { type: String, required: true },
      accountName: { type: String, required: true },
      accountNumber: {
        type: String,
        required: true,
        match: [/^\d{10}$/, "Account number must be exactly 10 digits"],
      },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "successful", "failed"],
      default: "pending",
    },

    reference: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    providerReference: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
withdrawalSchema.index({ User: 1, createdAt: -1 });
withdrawalSchema.index(
  { User: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "processing"] } },
  },
);
export default mongoose.model("withdrawal", withdrawalSchema);

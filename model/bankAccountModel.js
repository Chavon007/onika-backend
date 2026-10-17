import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema(
  {
    User: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
      match: [/^\d{10}$/, "Account number must be exactly 10 digits"],
    },
  },
  {
    timestamps: true,
  },
);

bankAccountSchema.index({ User: 1, createdAt: -1 });
bankAccountSchema.index(
  { User: 1, bankCode: 1, accountNumber: 1 },
  { unique: true },
);
export default mongoose.model("bankAccount", bankAccountSchema);

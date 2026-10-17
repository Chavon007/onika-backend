import mongoose from "mongoose";


const walletSchema = new mongoose.Schema(
  {
    User: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    balance: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Balance must be a whole number (kobo)",
      },
    },
    status: {
      type: String,
      enum: ["active", "frozen"],
      default: "active",
    },
    currency: {
      type: String,
      required: true,
      default: "NGN",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("wallet", walletSchema);

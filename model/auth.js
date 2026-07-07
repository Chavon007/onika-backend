import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["customer", "artisan", "admin"],
      default: "customer",
    },

    state: {
      type: String,
      required: true,
    },

    lga: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    forgotPasswordToken: {
      type: String,
    },

    forgotPasswordExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
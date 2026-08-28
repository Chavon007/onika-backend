import mongoose from "mongoose";

const ArtisanProfileSchema = new mongoose.Schema(
  {
    User: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    bio: {
      type: String,
      required: true,
      maxlength: 500,
    },
    skills: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: "Please enter at least one skill",
      },
    },
    experience: {
      type: String,
      required: true,
    },
    nin: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => !v || /^\d{11}$/.test(v),
        message: "NIN must be exactly 11 digits",
      },
    },
    bvn: {
      type: String,
      unique: true,
      sparse: true,
      validate: {
        validator: (v) => !v || /^\d{11}$/.test(v),
        message: "BVN must be exactly 11 digits",
      },
    },
    governmentId: {
      type: String,
      required: true,
    },
    faceVerification: {
      type: String,
      required: true,
    },
    workImage: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 6,
        message: "You must upload between 1 and 6 work images",
      },
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "verification_error"],
      default: "pending",
    },
    verificationDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("ArtisanProfile", ArtisanProfileSchema);

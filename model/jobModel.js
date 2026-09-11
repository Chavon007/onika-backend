import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    artisanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    category: {
      type: String,
      required: true,
    },
    rejectedBy: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: null,
    },
    agreedPrice: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "disputed",
        "cancelled",
      ],
      default: "pending",
    },
    escrowStatus: {
      type: String,
      enum: ["held", "released", "refunded"],
      default: "held",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    city: {
      type: String,
      required: true,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    autoReleaseAt: {
      type: Date,
      default: null,
    },
    disputeRaisedAt: {
      type: Date,
      default: null,
    },
    disputeResolvedAt: {
      type: Date,
      default: null,
    },
    lga: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    landmark: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) && arr.length >= 3 && arr.length <= 6,
        message: "You must upload between 3 and 6 job images",
      },
    },
    priority: {
      type: String,
      required: true,
      enum: ["ASAP", "Today", "This week", "Flexible"],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("job", JobSchema);

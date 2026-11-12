import escrowModel from "../model/escrowModel.js";
import mongoose from "mongoose";
const now = new Date();

const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

export const getArtisanCurrentMonthEarnings = async (artisanId) => {
  const amount = await escrowModel.aggregate([
    {
      $match: {
        artisanId: new mongoose.Types.ObjectId(artisanId),
        status: "released",
        releasedAt: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$artisanAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        totalAmount: 1,
      },
    },
  ]);

  return amount[0]?.totalAmount ?? 0;
};

export const getArtisanAllTimeEarning = async (artisanId) => {
  const allTimeAmount = await escrowModel.aggregate([
    {
      $match: {
        artisanId: new mongoose.Types.ObjectId(artisanId),
        status: "released",
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: "$artisanAmount" },
      },
    },
    {
      $project: {
        _id: 0,
        totalAmount: 1,
      },
    },
  ]);

  return allTimeAmount[0]?.totalAmount ?? 0;
};

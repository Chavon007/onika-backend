import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getArtisanCurrentMonthEarningsController,
  getArtisanAllTimeEarningController,
} from "../controller/earningController.js";

const route = express.Router();

route.get(
  "/artisan/month",
  authMiddleware,
  getArtisanCurrentMonthEarningsController,
);
route.get("/artisan/total", authMiddleware, getArtisanAllTimeEarningController);

export default route;

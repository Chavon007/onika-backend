import express from "express";
import dotenv from "dotenv";
dotenv.config();
import {
  generalLimiter,
  authLimiter,
  verificationLimiter,
} from "./utliz/rateLimiter.js";
import cookies from "cookie-parser";
import cors from "cors";
import AuthRoutes from "./route/authRoute.js";
import { dbConfig } from "./config/dbConfig.js";
import AristanProfileRoute from "./route/artisanProfileRoute.js";
import auth from "./model/auth.js";
import CloudinaryRouter from "./route/cloudinary.js";
import redisclient from "./config/redis.js";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(cookies());
app.use(generalLimiter);
const PORT = 4000;

app.get("/", (req, res) => {
  res.send("Onika backend is running");
});
app.use("/api/auth", AuthRoutes);
app.use("/api/artisan", AristanProfileRoute);
app.use("/api/cloudinary", CloudinaryRouter);

const startServer = async () => {
  try {
    await dbConfig();
    app.listen(PORT, () => {
      console.log(`Server is runing on port http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
};

startServer();

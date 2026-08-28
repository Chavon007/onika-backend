import express from "express";
import dotenv from "dotenv";
import cookies from "cookie-parser";
import cors from "cors";
import AuthRoutes from "./route/authRoute.js";
import { dbConfig } from "./config/dbConfig.js";
import AristanProfileRoute from "./route/artisanProfileRoute.js";
import auth from "./model/auth.js";
import CloudinaryRouter from "./route/cloudinary.js";
dotenv.config();
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(cookies());
const PORT = 4000;

app.get("/", (req, res) => {
  res.send("Onika backend is running");
});
app.use("/api/auth", AuthRoutes);
app.use("/api/artisan", AristanProfileRoute);
app.use("/cloudinary", CloudinaryRouter);

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

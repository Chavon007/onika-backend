import express from "express";
import dotenv from "dotenv";
import cookies from "cookie-parser";
import cors from "cors";
dotenv.config();
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: "true",
  }),
);
app.use(cookies());
const PORT = 4000;

app.get("/", (req, res) => {
  res.send("Onika backend is running");
});

app.listen(PORT, () => {
  console.log(`Server is runing on port http://localhost:${PORT}`);
});

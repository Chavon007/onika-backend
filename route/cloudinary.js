import express from "express";
import getCloudinarySignature from "../controller/cloudinaryController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/signature", authMiddleware, getCloudinarySignature);

export default router;

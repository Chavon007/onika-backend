import { verifyToken } from "../utliz/token.js";
import redisClient from "../config/redis.js";
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }
    const decoded = verifyToken(token);

    const isBlacklisted = await redisClient.get(`bl:${token}`);

    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Session expired, please login again",
      });
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired, please login again",
      });
    }

    if (err.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token, please login again" });
    }
    res.status(500).json({ err, message: err.message });
  }
};

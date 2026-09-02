import { rateLimit } from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, //10 minutes
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 minutes
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: "Too many attempts. Please try again later.",
});

export const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
});

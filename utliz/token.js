import dotenv from "dotenv";
import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "15m",
    },
  );
};

export const verifyToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  return decoded;
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET_REFRESH,
    {
      expiresIn: "7d",
    },
  );
};

export const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET_REFRESH);
};

import mongoose from "mongoose";

export const dbConfig = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Database connected successfully");
  } catch (err) {
    console.log(err);
  }
};

import mongoose from "mongoose";

// Runs fn inside a database transaction and returns whatever fn returns.
export const runInTransaction = async (fn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });

    return result;
  } finally {
    session.endSession();
  }
};

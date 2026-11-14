import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, {
    dbName: env.mongoDatabase,
    serverSelectionTimeoutMS: 10000,
    autoIndex: true,
  });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

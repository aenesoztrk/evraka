import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, "../../../.env"), quiet: true });

const numberValue = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = Object.freeze({
  port: numberValue(process.env.PORT, 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  mongoDatabase: process.env.MONGODB_DATABASE || "evraqa",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret-change-before-production",
  maxFileSizeMb: numberValue(process.env.MAX_FILE_SIZE_MB, 10),
  loginLockMinutes: numberValue(process.env.LOGIN_LOCK_MINUTES, 15),
  ocrLanguage: process.env.OCR_LANG || "tur+eng",
  adminEmail: process.env.ADMIN_BOOTSTRAP_EMAIL || "",
  adminPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD || "",
});

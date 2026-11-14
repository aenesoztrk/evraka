import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongoose from "mongoose";
import morgan from "morgan";
import { adminRouter } from "./routes/adminRoutes.js";
import { applicationRouter } from "./routes/applicationRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(currentDirectory, "../../frontend");
const sampleDataDirectory = path.resolve(currentDirectory, "../../sample-data");

export const app = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(morgan("dev"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Çok fazla giriş isteği. Lütfen daha sonra tekrar deneyin." },
});

app.get("/api/health", (_request, response) => response.json({
  success: true,
  data: {
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    time: new Date().toISOString(),
  },
}));
app.use("/api", (request, response, next) => {
  if (mongoose.connection.readyState === 1) return next();
  return response.status(503).json({
    success: false,
    message: "Web sitesi çalışıyor ancak veritabanı bağlantısı henüz hazır değil. Sunucu bağlantı ayarlarını kontrol edin.",
  });
});
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/applications", applicationRouter);
app.use("/api/admin", adminRouter);

app.use("/sample-data", express.static(sampleDataDirectory));
app.use(express.static(frontendDirectory, { extensions: ["html"] }));
app.get(/^\/(?!api).*/, (_request, response) => response.sendFile(path.join(frontendDirectory, "index.html")));

app.use(notFoundHandler);
app.use(errorHandler);

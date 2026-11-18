import multer from "multer";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

const documentMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

const datasetMimeTypes = new Set([
  "application/pdf",
  "text/csv",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export const maxDatasetFiles = 20;

// Multer dosya adını latin1 olarak çözer; Türkçe karakterler "BasÌ§vuru" gibi bozulur.
export function decodeFileName(name) {
  const value = String(name ?? "");
  const decoded = Buffer.from(value, "latin1").toString("utf8");
  return (decoded.includes("�") ? value : decoded).normalize("NFC");
}

function createUpload(mimeTypes, maxMb, maxFiles = 1) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: maxFiles },
    fileFilter(_request, file, callback) {
      file.originalname = decodeFileName(file.originalname);
      if (!mimeTypes.has(file.mimetype)) return callback(new AppError("Desteklenmeyen dosya türü.", 400));
      callback(null, true);
    },
  });
}

export const uploadDocument = createUpload(documentMimeTypes, env.maxFileSizeMb).single("document");
export const uploadDataset = createUpload(datasetMimeTypes, env.maxFileSizeMb, maxDatasetFiles).array("dataset", maxDatasetFiles);

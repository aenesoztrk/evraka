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
  "text/csv",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

function createUpload(mimeTypes, maxMb) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter(_request, file, callback) {
      if (!mimeTypes.has(file.mimetype)) return callback(new AppError("Desteklenmeyen dosya türü.", 400));
      callback(null, true);
    },
  });
}

export const uploadDocument = createUpload(documentMimeTypes, env.maxFileSizeMb).single("document");
export const uploadDataset = createUpload(datasetMimeTypes, 5).single("dataset");

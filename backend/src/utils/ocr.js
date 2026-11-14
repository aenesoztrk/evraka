import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createWorker } from "tesseract.js";
import { env } from "../config/env.js";
import { AppError } from "./AppError.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const cachePath = path.resolve(currentDirectory, "../../../.cache/tesseract");

export async function createOcrWorker() {
  await mkdir(cachePath, { recursive: true });
  try {
    return await createWorker(env.ocrLanguage, undefined, { cachePath });
  } catch (error) {
    throw new AppError(`OCR dil verileri yüklenemedi: ${error.message || error}. Sunucuda npm --prefix backend run prepare:ocr komutunu çalıştırın.`, 503);
  }
}

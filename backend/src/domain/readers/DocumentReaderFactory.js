import { DocxReader } from "./DocxReader.js";
import { ImageOcrReader } from "./ImageOcrReader.js";
import { LegacyDocReader } from "./LegacyDocReader.js";
import { PdfReader } from "./PdfReader.js";
import { AppError } from "../../utils/AppError.js";

export class DocumentReaderFactory {
  static create(mimeType) {
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return new DocxReader();
    if (mimeType === "application/pdf") return new PdfReader();
    if (mimeType === "image/jpeg" || mimeType === "image/png") return new ImageOcrReader();
    if (mimeType === "application/msword") return new LegacyDocReader();
    throw new AppError("Bu dosya türü için belge okuyucu bulunamadı.", 400);
  }
}

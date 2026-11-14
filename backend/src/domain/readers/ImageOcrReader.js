import { createWorker } from "tesseract.js";
import sharp from "sharp";
import { env } from "../../config/env.js";
import { BaseDocumentReader } from "./BaseDocumentReader.js";
import { parsePlainText } from "./fieldParser.js";

async function calculateInkRatio(buffer, leftRatio, topRatio, widthRatio, heightRatio) {
  const image = sharp(buffer).greyscale();
  const metadata = await image.metadata();
  const left = Math.max(0, Math.floor(metadata.width * leftRatio));
  const top = Math.max(0, Math.floor(metadata.height * topRatio));
  const width = Math.max(1, Math.min(metadata.width - left, Math.floor(metadata.width * widthRatio)));
  const height = Math.max(1, Math.min(metadata.height - top, Math.floor(metadata.height * heightRatio)));
  const { data, info } = await image.extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let index = 0; index < data.length; index += info.channels) if (data[index] < 165) dark += 1;
  return dark / (info.width * info.height);
}

export async function analyzeApprovalRegions(buffer) {
  const [studentInk, advisorInk, employerInk] = await Promise.all([
    calculateInkRatio(buffer, 0.02, 0.72, 0.30, 0.20),
    calculateInkRatio(buffer, 0.35, 0.72, 0.28, 0.20),
    calculateInkRatio(buffer, 0.66, 0.62, 0.32, 0.30),
  ]);
  return {
    approvalRegions: { studentInk, advisorInk, employerInk },
    studentApprovalSignal: studentInk > 0.085,
    advisorApprovalSignal: advisorInk > 0.085,
    employerSignatureSignal: employerInk > 0.05,
    employerStampSignal: employerInk > 0.075,
  };
}

export class ImageOcrReader extends BaseDocumentReader {
  async read(file) {
    const worker = await createWorker(env.ocrLanguage);
    try {
      const prepared = await sharp(file.buffer).greyscale().normalize().sharpen().toBuffer();
      await worker.setParameters({ tessedit_pageseg_mode: "6", preserve_interword_spaces: "1" });
      const result = await worker.recognize(prepared);
      const approvalMeta = await analyzeApprovalRegions(prepared);
      return {
        data: parsePlainText(result.data.text),
        text: result.data.text,
        meta: {
          method: "tesseract-ocr",
          confidence: result.data.confidence,
          ...approvalMeta,
        },
      };
    } finally {
      await worker.terminate();
    }
  }
}

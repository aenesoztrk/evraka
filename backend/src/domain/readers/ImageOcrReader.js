import sharp from "sharp";
import { BaseDocumentReader } from "./BaseDocumentReader.js";
import { parsePlainText } from "./fieldParser.js";
import { createOcrWorker } from "../../utils/ocr.js";

async function calculateInkRatio(buffer, leftRatio, topRatio, widthRatio, heightRatio) {
  const image = sharp(buffer).flatten({ background: "#ffffff" }).greyscale();
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

export async function analyzeApprovalRegions(buffer, { continuationPage = false } = {}) {
  const studentRegion = continuationPage
    ? [0.24, 0.01, 0.26, 0.11]
    : [0.27, 0.88, 0.23, 0.10];
  const [studentInk, advisorInk, employerInk] = await Promise.all([
    calculateInkRatio(buffer, ...studentRegion),
    calculateInkRatio(buffer, 0.54, 0.88, 0.27, 0.10),
    calculateInkRatio(buffer, 0.52, 0.72, 0.36, 0.12),
  ]);
  return {
    approvalAnalysisAvailable: true,
    approvalRegions: { studentInk, advisorInk, employerInk },
    studentApprovalSignal: studentInk > 0.026,
    advisorApprovalSignal: advisorInk > 0.026,
    employerSignatureSignal: employerInk > 0.024,
    // Printed table borders and labels can create roughly 8% dark pixels in this
    // region. A stamp is substantially denser, so keep its threshold separate
    // from the signature threshold to avoid treating printed text as a stamp.
    employerStampSignal: employerInk > 0.12,
  };
}

export function mergeApprovalMeta(items) {
  const available = items.filter((item) => item?.approvalAnalysisAvailable);
  if (!available.length) return { approvalAnalysisAvailable: false };
  return {
    approvalAnalysisAvailable: true,
    approvalRegions: {
      studentInk: Math.max(...available.map((item) => item.approvalRegions.studentInk)),
      advisorInk: Math.max(...available.map((item) => item.approvalRegions.advisorInk)),
      employerInk: Math.max(...available.map((item) => item.approvalRegions.employerInk)),
    },
    studentApprovalSignal: available.some((item) => item.studentApprovalSignal),
    advisorApprovalSignal: available.some((item) => item.advisorApprovalSignal),
    employerSignatureSignal: available.some((item) => item.employerSignatureSignal),
    employerStampSignal: available.some((item) => item.employerStampSignal),
  };
}

export class ImageOcrReader extends BaseDocumentReader {
  async read(file) {
    const worker = await createOcrWorker();
    try {
      const source = sharp(file.buffer).flatten({ background: "#ffffff" });
      const metadata = await source.metadata();
      const preparedSource = metadata.width < 1600 ? source.resize({ width: 1600, withoutEnlargement: false }) : source;
      const prepared = await preparedSource
        .greyscale()
        .normalize()
        .sharpen()
        .toBuffer();
      await worker.setParameters({ tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" });
      const result = await worker.recognize(prepared);
      const approvalMeta = await analyzeApprovalRegions(prepared);
      return {
        data: parsePlainText(result.data.text),
        text: result.data.text,
        meta: {
          method: "tesseract-ocr",
          confidence: result.data.confidence,
          processedPages: 1,
          ...approvalMeta,
        },
      };
    } finally {
      await worker.terminate();
    }
  }
}

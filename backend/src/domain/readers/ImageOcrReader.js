import sharp from "sharp";
import { BaseDocumentReader } from "./BaseDocumentReader.js";
import { parsePlainText } from "./fieldParser.js";
import { createOcrWorker } from "../../utils/ocr.js";
import { stampTextDetected } from "./approvalLayout.js";

async function calculateInkRatio(buffer, leftRatio, topRatio, widthRatio, heightRatio, { masks = [], ignoreRuleLines = false } = {}) {
  const image = sharp(buffer).flatten({ background: "#ffffff" }).greyscale();
  const metadata = await image.metadata();
  const left = Math.max(0, Math.floor(metadata.width * leftRatio));
  const top = Math.max(0, Math.floor(metadata.height * topRatio));
  const width = Math.max(1, Math.min(metadata.width - left, Math.floor(metadata.width * widthRatio)));
  const height = Math.max(1, Math.min(metadata.height - top, Math.floor(metadata.height * heightRatio)));
  const { data, info } = await image.extract({ left, top, width, height }).raw().toBuffer({ resolveWithObject: true });
  // Maskelenen alanlar (ör. kaşe yazısı) imza mürekkebi sayılmaz.
  const masked = (x, y) => masks.some((box) => {
    const pixelX = (left + x) / metadata.width;
    const pixelY = (top + y) / metadata.height;
    return pixelX >= box.left && pixelX <= box.right && pixelY >= box.top && pixelY <= box.bottom;
  });
  const dark = new Uint8Array(info.width * info.height);
  const columnTotals = new Uint32Array(info.width);
  const rowTotals = new Uint32Array(info.height);
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels] < 165 && (!masks.length || !masked(x, y))) {
        dark[y * info.width + x] = 1;
        columnTotals[x] += 1;
        rowTotals[y] += 1;
      }
    }
  }
  // Bölge boyunca uzanan düz çizgiler tablo kenarlarıdır; imza veya kaşe mürekkebi sayılmaz.
  const ruleColumn = (x) => ignoreRuleLines && columnTotals[x] > info.height * 0.6;
  const ruleRow = (y) => ignoreRuleLines && rowTotals[y] > info.width * 0.6;
  let count = 0;
  for (let y = 0; y < info.height; y += 1) {
    if (ruleRow(y)) continue;
    for (let x = 0; x < info.width; x += 1) if (dark[y * info.width + x] && !ruleColumn(x)) count += 1;
  }
  return count / (info.width * info.height);
}

const regionArgs = (region) => [region.left, region.top, region.right - region.left, region.bottom - region.top];

async function analyzeLocatedRegions(buffer, layout) {
  const ink = (region, masks = []) => (region ? calculateInkRatio(buffer, ...regionArgs(region), { masks, ignoreRuleLines: true }) : Promise.resolve(0));
  // Harf uzantıları ve kenar yumuşatması maskenin dışına taşmasın diye kaşe yazısı kutuları biraz genişletilir.
  const stampBoxes = (layout.employerTextBoxes || [])
    .filter((box) => !layout.employerSignatureText?.includes(box.text))
    .map((box) => ({ left: box.left - 0.004, right: box.right + 0.004, top: box.top - 0.004, bottom: box.bottom + 0.005 }));
  const [studentInk, advisorInk, employerInk, employerSignatureInk] = await Promise.all([
    ink(layout.student), ink(layout.advisor), ink(layout.employer), ink(layout.employer, stampBoxes),
  ]);
  const stampText = stampTextDetected(layout.employerStampText);
  return {
    approvalAnalysisAvailable: true,
    approvalLayout: "pdf-text-positions",
    approvalRegions: { studentInk, advisorInk, employerInk, employerSignatureInk },
    // Konumu bilinen kutularda tablo çizgileri ayıklandığı için eşikler sabit bölgelere göre düşüktür.
    studentApprovalSignal: Boolean(layout.student) && studentInk > 0.01,
    advisorApprovalSignal: Boolean(layout.advisor) && advisorInk > 0.01,
    employerSignatureSignal: Boolean(layout.employerSignatureText?.length) || employerSignatureInk > 0.004,
    employerStampSignal: stampText || employerInk > 0.12,
    employerStampText: layout.employerStampText,
  };
}

export async function analyzeApprovalRegions(buffer, { continuationPage = false, layout = null } = {}) {
  if (layout?.employer || layout?.student || layout?.advisor) return analyzeLocatedRegions(buffer, layout);
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
    approvalLayout: "fixed-regions",
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
  const regionKeys = [...new Set(available.flatMap((item) => Object.keys(item.approvalRegions || {})))];
  return {
    approvalAnalysisAvailable: true,
    approvalLayout: available.some((item) => item.approvalLayout === "pdf-text-positions") ? "pdf-text-positions" : "fixed-regions",
    approvalRegions: Object.fromEntries(regionKeys.map((key) => [key, Math.max(...available.map((item) => item.approvalRegions?.[key] ?? 0))])),
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

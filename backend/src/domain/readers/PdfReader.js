import pdfParse from "pdf-parse";
import { pdf } from "pdf-to-img";
import sharp from "sharp";
import { BaseDocumentReader } from "./BaseDocumentReader.js";
import { parsePlainText } from "./fieldParser.js";
import { analyzeApprovalRegions, mergeApprovalMeta } from "./ImageOcrReader.js";
import { createOcrWorker } from "../../utils/ocr.js";

export class PdfReader extends BaseDocumentReader {
  async read(file, { allowOcr = true, analyzeApprovals = true } = {}) {
    const parsed = await pdfParse(file.buffer);
    const needsOcr = parsed.text.trim().length < 80;
    if (needsOcr && !allowOcr) {
      return {
        data: {},
        text: parsed.text,
        meta: { method: "pdf-ocr-deferred", pages: parsed.numpages, processedPages: 0, requiresOcr: true, approvalAnalysisAvailable: false },
      };
    }

    if (!needsOcr && !analyzeApprovals) return {
      data: parsePlainText(parsed.text),
      text: parsed.text,
      meta: { method: "pdf-text", pages: parsed.numpages, processedPages: parsed.numpages, info: parsed.info, approvalAnalysisAvailable: false },
    };

    const document = await pdf(`data:application/pdf;base64,${file.buffer.toString("base64")}`, { scale: 2 });
    const worker = needsOcr ? await createOcrWorker() : null;
    const texts = [];
    const confidences = [];
    const approvalItems = [];
    let processedPages = 0;
    try {
      if (worker) await worker.setParameters({ tessedit_pageseg_mode: "11", preserve_interword_spaces: "1" });
      for await (const image of document) {
        if (processedPages >= 5) break;
        processedPages += 1;
        let analysisImage = image;
        if (worker) {
          const source = sharp(image).flatten({ background: "#ffffff" });
          const metadata = await source.metadata();
          const preparedSource = metadata.width < 1600 ? source.resize({ width: 1600, withoutEnlargement: false }) : source;
          analysisImage = await preparedSource.greyscale().normalize().sharpen().toBuffer();
          const result = await worker.recognize(analysisImage);
          texts.push(result.data.text);
          confidences.push(result.data.confidence);
        }
        if (analyzeApprovals) approvalItems.push(await analyzeApprovalRegions(analysisImage, { continuationPage: processedPages > 1 }));
      }
    } finally {
      if (worker) await worker.terminate();
      await document.destroy();
    }

    const text = needsOcr ? texts.join("\n") : parsed.text;
    const approvalMeta = mergeApprovalMeta(approvalItems);
    return {
      data: parsePlainText(text),
      text,
      meta: {
        method: needsOcr ? "pdf-tesseract-ocr" : "pdf-text-visual-approval",
        pages: parsed.numpages,
        processedPages,
        confidence: confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : undefined,
        info: parsed.info,
        ...approvalMeta,
      },
    };
  }
}

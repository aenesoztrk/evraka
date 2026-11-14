import pdfParse from "pdf-parse";
import { pdf } from "pdf-to-img";
import { createWorker } from "tesseract.js";
import { env } from "../../config/env.js";
import { BaseDocumentReader } from "./BaseDocumentReader.js";
import { parsePlainText } from "./fieldParser.js";
import { analyzeApprovalRegions } from "./ImageOcrReader.js";

export class PdfReader extends BaseDocumentReader {
  async read(file) {
    const parsed = await pdfParse(file.buffer);
    if (parsed.text.trim().length < 80) {
      const document = await pdf(`data:application/pdf;base64,${file.buffer.toString("base64")}`, { scale: 2 });
      const worker = await createWorker(env.ocrLanguage);
      const texts = [];
      const confidences = [];
      let approvalMeta = {};
      try {
        let pageNumber = 0;
        for await (const image of document) {
          pageNumber += 1;
          if (pageNumber > 5) break;
          const result = await worker.recognize(image);
          texts.push(result.data.text);
          confidences.push(result.data.confidence);
          if (pageNumber === 1) approvalMeta = await analyzeApprovalRegions(image);
        }
      } finally {
        await worker.terminate();
        await document.destroy();
      }
      const text = texts.join("\n");
      return {
        data: parsePlainText(text),
        text,
        meta: { method: "pdf-tesseract-ocr", pages: parsed.numpages, processedPages: texts.length, confidence: confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : 0, ...approvalMeta },
      };
    }
    return {
      data: parsePlainText(parsed.text),
      text: parsed.text,
      meta: { method: "pdf-text", pages: parsed.numpages, info: parsed.info },
    };
  }
}

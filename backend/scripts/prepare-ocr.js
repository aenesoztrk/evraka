import { createOcrWorker } from "../src/utils/ocr.js";

const worker = await createOcrWorker();
await worker.terminate();
console.log("OCR Türkçe/İngilizce dil verileri hazır.");

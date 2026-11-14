import { BaseDocumentReader } from "./BaseDocumentReader.js";
import WordExtractor from "word-extractor";
import { parsePlainText } from "./fieldParser.js";

export class LegacyDocReader extends BaseDocumentReader {
  async read(file) {
    const extractor = new WordExtractor();
    const document = await extractor.extract(file.buffer);
    const text = document.getBody();
    return { data: parsePlainText(text), text, meta: { method: "legacy-doc-parser" } };
  }
}

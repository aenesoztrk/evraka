import mammoth from "mammoth";
import * as cheerio from "cheerio";
import { BaseDocumentReader } from "./BaseDocumentReader.js";
import { parsePlainText, parseTableRows } from "./fieldParser.js";

export class DocxReader extends BaseDocumentReader {
  async read(file) {
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ buffer: file.buffer }),
      mammoth.extractRawText({ buffer: file.buffer }),
    ]);
    const $ = cheerio.load(htmlResult.value);
    const rows = [];
    $("table tr").each((_rowIndex, row) => {
      rows.push($(row).find("td,th").map((_cellIndex, cell) => $(cell).text().trim()).get());
    });
    const merge = (target, source) => Object.entries(source || {}).reduce((result, [key, value]) => {
      result[key] = value && typeof value === "object" && !Array.isArray(value) ? merge(result[key] || {}, value) : value;
      return result;
    }, { ...(target || {}) });
    return {
      data: merge(parsePlainText(textResult.value), parseTableRows(rows)),
      text: textResult.value,
      meta: { method: "docx-table-parser", messages: htmlResult.messages, rowCount: rows.length },
    };
  }
}

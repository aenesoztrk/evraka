import crypto from "node:crypto";
import readXlsxFile from "read-excel-file/node";
import { DatasetRecord } from "../models/DatasetRecord.js";
import { AppError } from "../utils/AppError.js";
import { normalizeText } from "../utils/normalization.js";

const headerMap = new Map([
  ["ogrenci ad soyad", "name"], ["ad soyad", "name"], ["adsoyad", "name"],
  ["tc kimlik no", "identityNo"], ["kimlik no", "identityNo"],
  ["uyruk", "nationality"], ["ogrenci no", "studentNo"], ["ogrenci numarasi", "studentNo"],
  ["dogum tarihi", "birthDate"], ["ikametgah adresi", "address"], ["adres", "address"],
  ["bolum", "department"], ["teslim yili", "academicYear"], ["ogretim yili", "academicYear"],
  ["daha once yapilan staj gun sayisi", "previousInternshipDays"], ["onceki staj gunu", "previousInternshipDays"],
  ["e-posta", "email"], ["email", "email"], ["telefon no", "phone"], ["telefon", "phone"],
  ["saglik yardimi statusu", "healthStatus"], ["saglik statusu", "healthStatus"],
]);

function normalizeRow(row) {
  const record = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const key = headerMap.get(normalizeText(rawKey));
    if (key) record[key] = value;
  }
  if (record.birthDate && !(record.birthDate instanceof Date)) record.birthDate = new Date(record.birthDate);
  record.studentNo = String(record.studentNo ?? "").trim();
  record.identityNo = String(record.identityNo ?? "").replace(/\D/g, "");
  record.previousInternshipDays = Number(record.previousInternshipDays || 0);
  record.healthStatus = Number(record.healthStatus || 0) || undefined;
  return record;
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(field); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); if (row.some((cell) => cell !== "")) rows.push(row); row = []; field = "";
    } else field += character;
  }
  row.push(field); if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

export async function importDataset(buffer, importedBy, fileName = "dataset.xlsx") {
  const table = fileName.toLowerCase().endsWith(".csv")
    ? parseCsv(buffer.toString("utf8").replace(/^\uFEFF/, ""))
    : await readXlsxFile(buffer);
  if (table.length < 2) throw new AppError("Veri setinde başlık ve öğrenci satırı bulunamadı.", 422);
  const headers = table[0].map((header) => String(header ?? ""));
  const rows = table.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))).map(normalizeRow);
  const validRows = rows.filter((row) => row.studentNo && row.name);
  if (!validRows.length) throw new AppError("Geçerli öğrenci satırı bulunamadı. Sütun başlıklarını örnek şablonla karşılaştırın.", 422);
  const importBatch = crypto.randomUUID();
  const operations = validRows.map((row) => ({
    updateOne: {
      filter: { studentNo: row.studentNo, importBatch },
      update: { $set: { ...row, importBatch, importedBy } },
      upsert: true,
    },
  }));
  const result = await DatasetRecord.bulkWrite(operations, { ordered: false });
  return { importBatch, rowCount: validRows.length, insertedCount: result.upsertedCount };
}

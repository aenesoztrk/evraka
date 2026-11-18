import crypto from "node:crypto";
import readXlsxFile from "read-excel-file/node";
import { DocumentReaderFactory } from "../domain/readers/DocumentReaderFactory.js";
import { DatasetRecord } from "../models/DatasetRecord.js";
import { AppError } from "../utils/AppError.js";
import { canonicalizePhone, normalizeDate, normalizeText } from "../utils/normalization.js";

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

// PDF'ten okunan alanların hangilerinin eksik kaldığını raporlamak için.
const pdfFieldLabels = [
  ["identityNo", "Kimlik no"], ["nationality", "Uyruk"], ["birthDate", "Doğum tarihi"],
  ["address", "Adres"], ["department", "Bölüm"], ["academicYear", "Öğretim yılı"],
  ["email", "E-posta"], ["phone", "Telefon"], ["healthStatus", "Sağlık statüsü"],
];

const studentFields = ["name", "identityNo", "nationality", "studentNo", "birthDate", "address", "department", "academicYear", "previousInternshipDays", "email", "phone", "healthStatus"];

function toDate(value) {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  const date = new Date(normalizeDate(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function normalizeRecord(input) {
  const record = { ...input };
  record.name = String(record.name ?? "").trim();
  record.birthDate = toDate(record.birthDate);
  if (record.address && typeof record.address === "object") record.address = record.address.fullText || "";
  record.studentNo = String(record.studentNo ?? "").trim();
  record.identityNo = String(record.identityNo ?? "").replace(/\D/g, "");
  record.previousInternshipDays = Number(record.previousInternshipDays || 0) || 0;
  record.healthStatus = Number(record.healthStatus || 0) || undefined;
  if (record.phone) record.phone = canonicalizePhone(record.phone, "90");
  return record;
}

function recordFromRow(row) {
  const record = {};
  for (const [rawKey, value] of Object.entries(row)) {
    const key = headerMap.get(normalizeText(rawKey));
    if (key) record[key] = value;
  }
  return normalizeRecord(record);
}

/** Belge okuyucusunun çıkardığı EK-16 verisinden (data.student) veri seti kaydı üretir. */
export function recordFromExtraction(data) {
  const student = data?.student || {};
  return normalizeRecord(Object.fromEntries(studentFields.map((field) => [field, student[field]])));
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

function fileKind(file) {
  const name = String(file.originalname || "").toLowerCase();
  if (file.mimetype === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".xlsx")) return "xlsx";
  return "unknown";
}

async function readSpreadsheet(file, kind) {
  let table;
  try {
    table = kind === "csv"
      ? parseCsv(file.buffer.toString("utf8").replace(/^﻿/, ""))
      : await readXlsxFile(file.buffer);
  } catch {
    throw new AppError("Excel dosyası okunamadı. Dosyanın bozuk olmadığını ve .xlsx biçiminde olduğunu kontrol edin.", 422);
  }
  if (table.length < 2) throw new AppError("Dosyada başlık ve öğrenci satırı bulunamadı.", 422);
  const headers = table[0].map((header) => String(header ?? ""));
  return table.slice(1).map((values) => recordFromRow(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))));
}

async function readPdf(file) {
  // Öğrenci belge yüklemesinde kullanılan okuyucu zinciri: Factory -> PdfReader -> fieldParser.
  // Onay/imza analizi veri seti için gereksiz olduğundan kapatılır; metni olmayan taranmış PDF'lerde OCR çalışır.
  const extraction = await DocumentReaderFactory.create("application/pdf").read(file, { allowOcr: true, analyzeApprovals: false });
  return { record: recordFromExtraction(extraction.data), meta: extraction.meta || {} };
}

function isFilled(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

/** Bir veya daha fazla dosyayı (XLSX, CSV, PDF) okuyup tek bir aktarım partisi olarak kaydeder. */
export async function importDataset(files, importedBy) {
  if (!files?.length) throw new AppError("Veri seti dosyası zorunludur.", 400);
  const records = new Map();
  const reports = [];

  // OCR yoğun bellek ve işlemci kullandığı için dosyalar sırayla işlenir.
  for (const file of files) {
    const kind = fileKind(file);
    const report = { fileName: file.originalname, type: kind };
    try {
      if (kind === "pdf") {
        const { record, meta } = await readPdf(file);
        Object.assign(report, {
          method: meta.method,
          pages: meta.pages,
          confidence: Number.isFinite(meta.confidence) ? Math.round(meta.confidence) : undefined,
          studentNo: record.studentNo || undefined,
          name: record.name || undefined,
          missingFields: pdfFieldLabels.filter(([key]) => !isFilled(record[key])).map(([, label]) => label),
        });
        if (!record.studentNo || !record.name) {
          report.status = "skipped";
          report.message = "Öğrenci numarası veya ad soyad okunamadı.";
        } else if (records.has(record.studentNo)) {
          report.status = "skipped";
          report.message = `${record.studentNo} numaralı öğrenci bu yüklemede başka bir dosyadan zaten alındı.`;
        } else {
          record.sourceFile = {
            originalName: file.originalname,
            mimeType: "application/pdf",
            size: file.size ?? file.buffer.length,
            sha256: crypto.createHash("sha256").update(file.buffer).digest("hex"),
            stored: true,
            data: file.buffer,
          };
          records.set(record.studentNo, record);
          report.status = report.missingFields.length ? "partial" : "imported";
          report.message = report.missingFields.length ? `Eksik alanlar: ${report.missingFields.join(", ")}.` : "Tüm öğrenci alanları okundu.";
        }
      } else if (kind === "csv" || kind === "xlsx") {
        const rows = await readSpreadsheet(file, kind);
        let imported = 0, invalid = 0, duplicate = 0;
        for (const row of rows) {
          if (!row.studentNo || !row.name) invalid += 1;
          else if (records.has(row.studentNo)) duplicate += 1;
          else {
            row.sourceFile = { originalName: file.originalname, mimeType: file.mimetype, size: file.size ?? file.buffer.length, stored: false };
            records.set(row.studentNo, row);
            imported += 1;
          }
        }
        Object.assign(report, { rowCount: imported, invalidRows: invalid, duplicateRows: duplicate });
        report.status = imported ? (invalid || duplicate ? "partial" : "imported") : "skipped";
        report.message = [
          `${imported} öğrenci satırı alındı`,
          invalid && `${invalid} satırda öğrenci no veya ad soyad eksik`,
          duplicate && `${duplicate} satır tekrar eden öğrenci no`,
        ].filter(Boolean).join(", ") + ".";
      } else {
        report.status = "failed";
        report.message = "Desteklenmeyen dosya türü. XLSX, CSV veya PDF yükleyin.";
      }
    } catch (error) {
      report.status = "failed";
      report.message = error instanceof AppError ? error.message : "Dosya okunamadı veya analiz edilemedi.";
      if (!(error instanceof AppError)) console.error(`Veri seti dosyası okunamadı (${file.originalname}):`, error);
    }
    reports.push(report);
  }

  if (!records.size) {
    throw new AppError("Yüklenen dosyalardan geçerli öğrenci kaydı çıkarılamadı. Sütun başlıklarını veya PDF içeriğini kontrol edin.", 422, reports);
  }

  const importBatch = crypto.randomUUID();
  const operations = [...records.values()].map((row) => ({
    updateOne: {
      filter: { studentNo: row.studentNo, importBatch },
      update: { $set: { ...row, importBatch, importedBy } },
      upsert: true,
    },
  }));
  const result = await DatasetRecord.bulkWrite(operations, { ordered: false });
  return { importBatch, rowCount: records.size, insertedCount: result.upsertedCount, files: reports };
}

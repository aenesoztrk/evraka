import crypto from "node:crypto";
import { Application } from "../models/Application.js";
import { DatasetRecord } from "../models/DatasetRecord.js";
import { User } from "../models/User.js";
import { DocumentReaderFactory } from "../domain/readers/DocumentReaderFactory.js";
import { ValidatorEngine } from "../domain/validators/ValidatorEngine.js";
import { compareManualAndExtracted } from "./comparisonService.js";
import { AppError } from "../utils/AppError.js";
import { calculateInternshipDays } from "../utils/date.js";
import { getPath } from "../utils/normalization.js";
import { normalizeText } from "../utils/normalization.js";

const extensionMimeMap = new Map([
  ["pdf", "application/pdf"], ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"],
]);

function assertExtension(file) {
  const extension = String(file.originalname || "").split(".").pop().toLowerCase();
  if (!extensionMimeMap.has(extension) || extensionMimeMap.get(extension) !== file.mimetype) {
    throw new AppError("Dosya uzantısı ile içerik türü uyuşmuyor.", 400);
  }
}

function assertEk16Content(text) {
  const normalized = normalizeText(text);
  const markers = ["staj", "ogrenci", "isveren", "muhendis", "saglik", "uyruk", "ek-16"];
  const score = markers.filter((marker) => normalized.includes(marker)).length;
  if (score < 3) throw new AppError("Yüklenen belge Ek-16 formu olarak doğrulanamadı.", 422);
}

const validatorEngine = new ValidatorEngine();

function midtermReport(extractionMeta = {}) {
  const message = extractionMeta.requiresOcr
    ? "Dosya biçimi, uzantısı, boyutu ve gerçek dosya imzası uygun. OCR final aşamasında çalıştırılacaktır."
    : "Dosya biçimi, uzantısı, boyutu ve gerçek dosya imzası uygun.";
  return [{ code: "MIDTERM_FILE", title: "Dosya kontrolü", status: "success", message }];
}

export function documentProcessingPlan(stage, mimeType) {
  const finalStage = stage === "final";
  const image = ["image/jpeg", "image/png"].includes(mimeType);
  return {
    stage: finalStage ? "final" : "midterm",
    deferEntireReader: !finalStage && image,
    allowOcr: finalStage,
    analyzeApprovals: finalStage,
  };
}

function assertFileSignature(file) {
  const bytes = file.buffer;
  const matches = {
    "application/pdf": bytes.subarray(0, 4).toString() === "%PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": bytes[0] === 0x50 && bytes[1] === 0x4b,
    "application/msword": bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0,
    "image/jpeg": bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    "image/png": bytes.subarray(1, 4).toString() === "PNG",
  };
  if (!matches[file.mimetype]) throw new AppError("Dosya içeriği uzantı ve MIME türüyle uyuşmuyor.", 400);
}

function mergeDeep(target, source) {
  const output = { ...(target || {}) };
  for (const [key, value] of Object.entries(source || {})) {
    output[key] = value && typeof value === "object" && !Array.isArray(value)
      ? mergeDeep(output[key], value)
      : value;
  }
  return output;
}

export async function refreshApplicationValidation(application) {
  application.comparisonReport = compareManualAndExtracted(application.manualData, application.extractedData || {});
  if (application.stage === "final") {
    const currentUser = await User.findById(application.student).select("+identityNo");
    // Manuel form henüz doldurulmadıysa belgeden okunan, o da yoksa hesaptaki öğrenci numarasıyla aranır.
    const studentNo = getPath(application.manualData, "student.studentNo")
      || getPath(application.extractedData, "student.studentNo")
      || currentUser?.studentNo;
    const datasetRecord = studentNo ? await DatasetRecord.findOne({ studentNo: String(studentNo).trim() }).sort({ createdAt: -1 }) : null;
    const contextData = mergeDeep(application.extractedData, application.manualData);
    application.validationReport = validatorEngine.run({ data: contextData, application, extractionMeta: application.extractionMeta || {}, datasetRecord, currentUser });
    const blockingComparison = application.comparisonReport.some((item) => ["mismatch", "missing-document", "missing-manual"].includes(item.status));
    application.readiness = validatorEngine.isReady(application.validationReport) && !blockingComparison;
  } else {
    application.validationReport = midtermReport(application.extractionMeta);
    application.readiness = true;
  }
  application.status = application.readiness ? "approved" : "error";
  return application;
}

export async function processDocumentUpload({ applicationId, studentId, file, stage = "midterm", isAdmin = false }) {
  assertFileSignature(file);
  assertExtension(file);
  const application = await Application.findById(applicationId).select("+document.data");
  if (!application) throw new AppError("Başvuru bulunamadı.", 404);
  if (!isAdmin && String(application.student) !== String(studentId)) throw new AppError("Bu başvuruya erişemezsiniz.", 403);
  if (!isAdmin) application.assertStudentMutable();

  application.status = "reviewing";
  const processingPlan = documentProcessingPlan(stage, file.mimetype);
  application.stage = processingPlan.stage;
  application.document = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    sha256: crypto.createHash("sha256").update(file.buffer).digest("hex"),
    data: file.buffer,
  };
  await application.save();

  try {
    const extraction = processingPlan.deferEntireReader
      ? { data: {}, text: "", meta: { method: "image-ocr-deferred", processedPages: 0, requiresOcr: true, approvalAnalysisAvailable: false } }
      : await DocumentReaderFactory.create(file.mimetype).read(file, {
        allowOcr: processingPlan.allowOcr,
        analyzeApprovals: processingPlan.analyzeApprovals,
      });
    if (application.stage === "final") assertEk16Content(extraction.text);
    application.extractedData = extraction.data;
    application.extractionMeta = extraction.meta;
    await refreshApplicationValidation(application);

    const start = getPath(application.manualData, "company.startDate");
    const end = getPath(application.manualData, "company.endDate");
    if (start && end && application.selectedWeekdays.length) {
      application.calculatedInternshipDays = calculateInternshipDays(start, end, application.selectedWeekdays);
    }
    await application.save();
    return application;
  } catch (error) {
    application.status = "error";
    application.extractionMeta = { ...(application.extractionMeta || {}), error: error.message };
    await application.save();
    throw error;
  }
}

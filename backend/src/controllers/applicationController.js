import { Application } from "../models/Application.js";
import { processDocumentUpload, refreshApplicationValidation } from "../services/documentService.js";
import { inspectGoogleForm, validateGoogleFormUrl } from "../services/googleFormService.js";
import { calculateInternshipDays } from "../utils/date.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "../utils/audit.js";
import { sendStoredFile } from "../utils/sendStoredFile.js";
import { normalizeManualPhones } from "../utils/normalization.js";

async function findOwnedApplication(applicationId, user, includeDocument = false) {
  const query = Application.findById(applicationId);
  if (includeDocument) query.select("+document.data");
  const application = await query;
  if (!application) throw new AppError("Başvuru bulunamadı.", 404);
  if (user.role !== "admin" && String(application.student) !== String(user._id)) throw new AppError("Bu başvuruya erişemezsiniz.", 403);
  return application;
}

export async function createApplication(request, response) {
  const manualData = normalizeManualPhones(request.body.manualData);
  const application = await Application.create({
    student: request.user._id,
    manualData,
    stage: request.body.stage || "midterm",
    selectedWeekdays: request.body.selectedWeekdays || [],
    internshipStart: request.body.internshipStart || manualData?.company?.startDate,
    internshipEnd: request.body.internshipEnd || manualData?.company?.endDate,
  });
  await writeAudit(request, "APPLICATION_CREATED", { entityType: "Application", entityId: application._id });
  response.status(201).json({ success: true, data: application });
}

export async function listMine(request, response) {
  const applications = await Application.find({ student: request.user._id }).sort({ createdAt: -1 });
  response.json({ success: true, data: applications });
}

export async function getApplication(request, response) {
  const application = await findOwnedApplication(request.params.id, request.user);
  response.json({ success: true, data: application });
}

export async function updateManualData(request, response) {
  const application = await findOwnedApplication(request.params.id, request.user);
  if (request.user.role !== "admin") application.assertStudentMutable();
  application.manualData = normalizeManualPhones(request.body.manualData);
  application.internshipStart = application.manualData?.company?.startDate || application.internshipStart;
  application.internshipEnd = application.manualData?.company?.endDate || application.internshipEnd;
  if (application.document?.originalName) await refreshApplicationValidation(application);
  else {
    application.status = "draft";
    application.readiness = false;
  }
  await application.save();
  await writeAudit(request, "MANUAL_DATA_UPDATED", { entityType: "Application", entityId: application._id });
  response.json({ success: true, data: application });
}

export async function uploadEk16(request, response) {
  if (!request.file) throw new AppError("Ek-16 dosyası zorunludur.", 400);
  const application = await processDocumentUpload({
    applicationId: request.params.id,
    studentId: request.user._id,
    file: request.file,
    stage: request.body.stage || "midterm",
    isAdmin: request.user.role === "admin",
  });
  await writeAudit(request, "DOCUMENT_UPLOADED", { entityType: "Application", entityId: application._id, metadata: { stage: application.stage, fileName: request.file.originalname } });
  response.json({ success: true, data: application });
}

export async function updateSchedule(request, response) {
  const application = await findOwnedApplication(request.params.id, request.user);
  if (request.user.role !== "admin") application.assertStudentMutable();
  const { internshipStart, internshipEnd, selectedWeekdays } = request.body;
  const validWeekdays = [...new Set((selectedWeekdays || []).map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
  application.internshipStart = internshipStart;
  application.internshipEnd = internshipEnd;
  application.selectedWeekdays = validWeekdays;
  application.manualData ||= {};
  application.manualData.company ||= {};
  application.manualData.company.startDate = internshipStart;
  application.manualData.company.endDate = internshipEnd;
  application.markModified("manualData");
  application.calculatedInternshipDays = calculateInternshipDays(internshipStart, internshipEnd, application.selectedWeekdays);
  if (application.document?.originalName) await refreshApplicationValidation(application);
  await application.save();
  response.json({ success: true, data: application });
}

export async function saveGoogleForm(request, response) {
  const application = await findOwnedApplication(request.params.id, request.user);
  if (request.user.role !== "admin") application.assertStudentMutable();
  if (!validateGoogleFormUrl(request.body.url)) throw new AppError("Geçerli bir Google Forms URL’si girin.", 422);
  const entryMap = request.body.entryMap || {};
  if (!Object.keys(entryMap).length || Object.values(entryMap).some((entryId) => !/^entry\.\d+$/.test(String(entryId)))) throw new AppError("En az bir geçerli entry.123456 alan eşlemesi girin.", 422);
  const inspection = await inspectGoogleForm(request.body.url);
  application.googleForm = { url: request.body.url, entryMap };
  await application.save();
  const savedForm = typeof application.googleForm?.toObject === "function" ? application.googleForm.toObject() : application.googleForm;
  response.json({ success: true, data: { ...savedForm, inspection } });
}

export async function downloadDocument(request, response) {
  const application = await findOwnedApplication(request.params.id, request.user, true);
  if (!application.document?.data) throw new AppError("Başvuruda belge bulunamadı.", 404);
  if (request.user.role === "admin") {
    await writeAudit(request, "DOCUMENT_VIEWED", { entityType: "Application", entityId: application._id, metadata: { fileName: application.document.originalName } });
  }
  sendStoredFile(request, response, application.document);
}

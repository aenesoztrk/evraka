import { Application } from "../models/Application.js";
import { DatasetRecord } from "../models/DatasetRecord.js";
import { User } from "../models/User.js";
import { importDataset } from "../services/datasetService.js";
import { createEk17Docx } from "../services/ek17Service.js";
import { submitGoogleForm } from "../services/googleFormService.js";
import { AppError } from "../utils/AppError.js";
import { writeAudit } from "../utils/audit.js";
import { normalizeManualPhones } from "../utils/normalization.js";
import { refreshApplicationValidation } from "../services/documentService.js";

export async function dashboardStats(_request, response) {
  const [total, completed, reviewing, error, students, datasets] = await Promise.all([
    Application.countDocuments(), Application.countDocuments({ status: "completed" }),
    Application.countDocuments({ status: "reviewing" }), Application.countDocuments({ status: "error" }),
    User.countDocuments({ role: "student" }), DatasetRecord.countDocuments(),
  ]);
  response.json({ success: true, data: { total, completed, reviewing, error, students, datasets } });
}

export async function listApplications(request, response) {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));
  const filter = {};
  if (request.query.status) filter.status = request.query.status;
  if (request.query.department) filter["manualData.student.department"] = request.query.department;
  if (request.query.from || request.query.to) {
    filter.createdAt = {};
    if (request.query.from) filter.createdAt.$gte = new Date(`${request.query.from}T00:00:00.000Z`);
    if (request.query.to) filter.createdAt.$lte = new Date(`${request.query.to}T23:59:59.999Z`);
  }
  if (request.query.search) {
    const search = new RegExp(String(request.query.search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ "manualData.student.name": search }, { "manualData.student.studentNo": search }];
  }
  const [items, total] = await Promise.all([
    Application.find(filter).populate("student", "name email studentNo department").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Application.countDocuments(filter),
  ]);
  response.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportApplications(request, response) {
  const items = await Application.find().populate("student", "name email studentNo department").sort({ createdAt: -1 }).lean();
  const rows = [["Öğrenci", "Öğrenci No", "Bölüm", "Durum", "Aşama", "Oluşturma Tarihi", "Hazır"]];
  for (const item of items) rows.push([
    item.manualData?.student?.name || item.student?.name,
    item.manualData?.student?.studentNo || item.student?.studentNo,
    item.manualData?.student?.department || item.student?.department,
    item.status, item.stage, item.createdAt?.toISOString(), item.readiness ? "Evet" : "Hayır",
  ]);
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", "attachment; filename=basvurular.csv");
  response.send(`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`);
}

export async function reportStats(_request, response) {
  const applications = await Application.find().select("status readiness validationReport extractionMeta createdAt").lean();
  const rules = new Map();
  let confidenceTotal = 0;
  let confidenceCount = 0;
  for (const application of applications) {
    const confidence = Number(application.extractionMeta?.confidence);
    if (Number.isFinite(confidence)) { confidenceTotal += confidence; confidenceCount += 1; }
    for (const result of application.validationReport || []) {
      const current = rules.get(result.code) || { code: result.code, title: result.title, success: 0, warning: 0, error: 0 };
      current[result.status] = (current[result.status] || 0) + 1;
      rules.set(result.code, current);
    }
  }
  const statusCounts = applications.reduce((output, item) => ({ ...output, [item.status]: (output[item.status] || 0) + 1 }), {});
  const daily = Array.from({ length: 7 }, (_value, offset) => {
    const day = new Date();
    day.setUTCHours(0, 0, 0, 0);
    day.setUTCDate(day.getUTCDate() - (6 - offset));
    const next = new Date(day); next.setUTCDate(next.getUTCDate() + 1);
    const items = applications.filter((item) => new Date(item.createdAt) >= day && new Date(item.createdAt) < next);
    return { date: day.toISOString().slice(0, 10), total: items.length, ready: items.filter((item) => item.readiness).length };
  });
  response.json({ success: true, data: {
    total: applications.length,
    ready: applications.filter((item) => item.readiness).length,
    averageConfidence: confidenceCount ? Math.round(confidenceTotal / confidenceCount) : null,
    statusCounts,
    rules: [...rules.values()].sort((a, b) => (b.error + b.warning) - (a.error + a.warning)),
    daily,
  } });
}

export async function datasetHistory(_request, response) {
  const items = await DatasetRecord.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$importBatch", rowCount: { $sum: 1 }, importedAt: { $first: "$createdAt" }, importedBy: { $first: "$importedBy" } } },
    { $sort: { importedAt: -1 } }, { $limit: 20 },
  ]);
  response.json({ success: true, data: items });
}

export async function deleteDatasetBatch(request, response) {
  const result = await DatasetRecord.deleteMany({ importBatch: request.params.batch });
  if (!result.deletedCount) throw new AppError("Veri seti aktarımı bulunamadı.", 404);
  await writeAudit(request, "DATASET_BATCH_DELETED", { entityType: "DatasetRecord", metadata: { importBatch: request.params.batch, deletedCount: result.deletedCount } });
  response.json({ success: true, data: { deletedCount: result.deletedCount } });
}

export async function uploadTestDataset(request, response) {
  if (!request.file) throw new AppError("Veri seti dosyası zorunludur.", 400);
  const result = await importDataset(request.file.buffer, request.user._id, request.file.originalname);
  await writeAudit(request, "DATASET_IMPORTED", { entityType: "DatasetRecord", metadata: result });
  response.status(201).json({ success: true, data: result });
}

export async function completeApplication(request, response) {
  const application = await Application.findById(request.params.id);
  if (!application) throw new AppError("Başvuru bulunamadı.", 404);
  if (application.stage !== "final" && !request.body?.force) throw new AppError("Başvuru tamamlanmadan önce final OCR ve doğrulama aşamasından geçirilmelidir.", 409);
  if (!application.readiness && !request.body?.force) throw new AppError("Başvuru doğrulama kontrollerini geçmeden tamamlanamaz.", 409);
  if ((!application.googleForm?.url || !application.googleForm?.entryMap?.size) && !request.body?.force) throw new AppError("Başvuru tamamlanmadan önce Google Form bağlantısı ve alan eşlemesi kaydedilmelidir.", 409);
  if (application.googleForm?.url && application.googleForm?.entryMap?.size) {
    try {
      const result = await submitGoogleForm(application.googleForm, application);
      application.googleForm.submittedAt = result.submittedAt;
      application.googleForm.lastError = undefined;
    } catch (error) {
      application.googleForm.lastError = error.message;
      await application.save();
      throw new AppError(`Google Form gönderimi tamamlanamadı: ${error.message}`, 502);
    }
  }
  application.status = "completed";
  application.completedAt = new Date();
  application.completedBy = request.user._id;
  await application.save();
  await writeAudit(request, "APPLICATION_COMPLETED", { entityType: "Application", entityId: application._id });
  response.json({ success: true, data: application });
}

export async function adminUpdateApplication(request, response) {
  const application = await Application.findById(request.params.id);
  if (!application) throw new AppError("Başvuru bulunamadı.", 404);
  if (request.body.manualData) {
    application.manualData = normalizeManualPhones(request.body.manualData);
    application.internshipStart = application.manualData?.company?.startDate || application.internshipStart;
    application.internshipEnd = application.manualData?.company?.endDate || application.internshipEnd;
    if (application.document?.originalName) await refreshApplicationValidation(application);
  }
  if (request.body.status) application.status = request.body.status;
  await application.save();
  await writeAudit(request, "ADMIN_APPLICATION_UPDATED", { entityType: "Application", entityId: application._id });
  response.json({ success: true, data: application });
}

export async function adminDeleteApplication(request, response) {
  const application = await Application.findByIdAndDelete(request.params.id);
  if (!application) throw new AppError("Başvuru bulunamadı.", 404);
  await writeAudit(request, "ADMIN_APPLICATION_DELETED", { entityType: "Application", entityId: application._id });
  response.status(204).end();
}

export async function downloadEk17(request, response) {
  const application = await Application.findById(request.params.id);
  if (!application) throw new AppError("Başvuru bulunamadı.", 404);
  if (application.status !== "completed") throw new AppError("Ek-17 yalnızca tamamlanan başvurudan oluşturulabilir.", 409);
  const buffer = await createEk17Docx(application);
  response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  response.setHeader("Content-Disposition", `attachment; filename="EK-17-${application._id}.docx"`);
  response.send(buffer);
}

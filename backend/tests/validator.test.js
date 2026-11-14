import test from "node:test";
import assert from "node:assert/strict";
import { AcademicDateRule, AddressRule, ContactRule, DatasetMatchRule, EmployerApprovalRule, EngineerCountRule, IdentityRule, UserMatchRule } from "../src/domain/validators/rules.js";

test("T.C. kimlik numarası biçimini kabul eder", () => {
  const result = new IdentityRule().validate({ data: { student: { identityNo: "12345678901", nationality: "T.C." } } });
  assert.equal(result.status, "success");
});

test("yabancı kimlik numarası 99 ile başlamalıdır", () => {
  const result = new IdentityRule().validate({ data: { student: { identityNo: "12345678901", nationality: "Almanya" } } });
  assert.equal(result.status, "error");
});

test("beşten az mühendis için bölüm ister", () => {
  const result = new EngineerCountRule().validate({ data: { company: { engineerCount: 3 } } });
  assert.equal(result.status, "warning");
});

const completeStudent = {
  name: "Deniz Yılmaz", studentNo: "220201045", identityNo: "12345678901", nationality: "T.C.",
  birthDate: "2003-02-14", address: "Yenidoğan Mah. Gül Sok. Bina No 12 Daire No 4 İzmit/Kocaeli",
  department: "Yazılım Mühendisliği", academicYear: "2026-2027 Güz", previousInternshipDays: 0,
  email: "deniz@example.com", phone: "+90 532 412 34 56", healthStatus: 2,
};

test("giriş yapan kullanıcı profilinin tüm dolu alanlarını karşılaştırır", () => {
  const result = new UserMatchRule().validate({ currentUser: { ...completeStudent, address: { fullText: completeStudent.address } }, data: { student: completeStudent } });
  assert.equal(result.status, "success");
});

test("veri setindeki iletişim uyuşmazlığını raporlar", () => {
  const result = new DatasetMatchRule().validate({ datasetRecord: { ...completeStudent, phone: "+90 555 000 00 00" }, data: { student: completeStudent } });
  assert.equal(result.status, "error");
  assert.match(result.message, /Telefon/);
});

test("öğrenci ve kurum iletişim biçimlerini birlikte doğrular", () => {
  const result = new ContactRule().validate({ data: {
    student: { email: "student@example.com", phone: "+90 532 111 22 33" },
    company: { email: "company@example.com", phone: "+90 262 111 22 33" },
    employer: { email: "employer@example.com", phone: "+90 533 111 22 33" },
  } });
  assert.equal(result.status, "success");
});

test("eksik ilçe ve il içeren adresi reddeder", () => {
  const result = new AddressRule().validate({ data: { student: { address: "Mah. Sok. No 1 Daire 2" }, company: { address: "Mah. Cad. No 5" } } });
  assert.equal(result.status, "error");
});

test("aynı takvim günündeki saat farkı 30 günlük teslim kuralını bozmaz", () => {
  const result = new AcademicDateRule().validate({
    data: { student: { academicYear: "2026-2027" }, company: { startDate: "2027-06-21", endDate: "2027-07-16" } },
    application: { createdAt: new Date("2027-05-22T23:30:00+03:00") },
  });
  assert.equal(result.status, "success");
  assert.equal(result.details.leadDays, 30);
});

test("işveren imza ve kaşesini görsel analiz veya manuel bilgiyle kabul eder", () => {
  const result = new EmployerApprovalRule().validate({
    data: { employer: {}, approvals: {} },
    extractionMeta: { approvalAnalysisAvailable: true, employerSignatureSignal: true, employerStampSignal: true },
  });
  assert.equal(result.status, "success");
});

test("öğrenci onayında görsel şüpheyi manuel inceleme uyarısı yapar", () => {
  const result = new EmployerApprovalRule().validate({
    data: { employer: { signaturePresent: true, stampPresent: true }, approvals: {} },
    extractionMeta: { approvalAnalysisAvailable: true, studentApprovalSignal: true },
  });
  assert.equal(result.status, "warning");
  assert.equal(result.details.requiresManualReview, true);
});

test("manuel olarak dolu işaretlenen öğrenci onayını reddeder", () => {
  const result = new EmployerApprovalRule().validate({
    data: { employer: { signaturePresent: true, stampPresent: true }, approvals: { studentSigned: true } },
    extractionMeta: { approvalAnalysisAvailable: true },
  });
  assert.equal(result.status, "error");
});

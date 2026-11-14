import test from "node:test";
import assert from "node:assert/strict";
import { compareManualAndExtracted } from "../src/services/comparisonService.js";

test("manuel ve belgeden okunan alanları eşleştirir", () => {
  const manual = { student: { identityNo: "12345678901", name: "Deniz Yılmaz", phone: "+90 532 412 34 56" } };
  const extracted = { student: { identityNo: "12345678901", name: "Deniz Yılmaz", phone: "05324123456" } };
  const report = compareManualAndExtracted(manual, extracted);
  assert.equal(report.find((item) => item.path === "student.identityNo").status, "match");
  assert.equal(report.find((item) => item.path === "student.phone").status, "match");
});

test("uyuşmayan alanı raporlar", () => {
  const report = compareManualAndExtracted({ student: { studentNo: "100" } }, { student: { studentNo: "200" } });
  assert.equal(report.find((item) => item.path === "student.studentNo").status, "mismatch");
});

test("belgedeki tarih ve birimli sayıları normalize ederek karşılaştırır", () => {
  const report = compareManualAndExtracted(
    { student: { birthDate: "2004-04-15", previousInternshipDays: 0 }, company: { internshipDays: 20 } },
    { student: { birthDate: "15.04.2004", previousInternshipDays: "0 gün" }, company: { internshipDays: "20 iş günü" } },
  );
  assert.equal(report.find((item) => item.path === "student.birthDate").status, "match");
  assert.equal(report.find((item) => item.path === "student.previousInternshipDays").status, "match");
  assert.equal(report.find((item) => item.path === "company.internshipDays").status, "match");
});

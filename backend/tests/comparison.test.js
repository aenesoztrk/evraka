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

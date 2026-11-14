import test from "node:test";
import assert from "node:assert/strict";
import { createEk17Docx } from "../src/services/ek17Service.js";

test("tamamlanan başvurudan geçerli DOCX paketi üretir", async () => {
  const buffer = await createEk17Docx({
    manualData: {
      student: { name: "Deniz Yılmaz", studentNo: "220201045", department: "Yazılım Mühendisliği", academicYear: "2026-2027" },
      company: { name: "Örnek Teknoloji A.Ş.", startDate: "2027-07-06", endDate: "2027-08-24", internshipDays: 30 },
      employer: { name: "Ayşe Kaya", title: "Yazılım Takım Lideri" },
    },
  });
  assert.ok(buffer.length > 1000);
  assert.equal(buffer[0], 0x50);
  assert.equal(buffer[1], 0x4b);
});

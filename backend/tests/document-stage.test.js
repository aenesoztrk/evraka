import test from "node:test";
import assert from "node:assert/strict";
import { documentProcessingPlan } from "../src/services/documentService.js";

test("vize aşamasında görsel OCR işlemini finale erteler", () => {
  assert.deepEqual(documentProcessingPlan("midterm", "image/png"), {
    stage: "midterm", deferEntireReader: true, allowOcr: false, analyzeApprovals: false,
  });
});

test("vizede metin katmanlı belgeleri OCR olmadan okuyabilir", () => {
  assert.deepEqual(documentProcessingPlan("midterm", "application/pdf"), {
    stage: "midterm", deferEntireReader: false, allowOcr: false, analyzeApprovals: false,
  });
});

test("final aşamasında OCR ve görsel onay analizini açar", () => {
  assert.deepEqual(documentProcessingPlan("final", "image/jpeg"), {
    stage: "final", deferEntireReader: false, allowOcr: true, analyzeApprovals: true,
  });
});

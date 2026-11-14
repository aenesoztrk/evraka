import test from "node:test";
import assert from "node:assert/strict";
import { submitGoogleForm, validateGoogleFormUrl } from "../src/services/googleFormService.js";

test("Google Forms URL biçimini doğrular", () => {
  assert.equal(validateGoogleFormUrl("https://docs.google.com/forms/d/e/example/viewform"), true);
  assert.equal(validateGoogleFormUrl("https://example.com/forms/test"), false);
});

test("geçersiz entry kimliğini gönderimden önce reddeder", async () => {
  await assert.rejects(
    submitGoogleForm({ url: "https://docs.google.com/forms/d/e/example/viewform", entryMap: { "student.name": "name" } }, { manualData: {} }),
    /entry\.123456/,
  );
});

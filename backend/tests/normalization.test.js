import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizePhone, normalizeManualPhones } from "../src/utils/normalization.js";

test("Türkiye telefonlarını tek E.164 biçimine dönüştürür", () => {
  const variants = ["0532 123 45 67", "532-123-45-67", "+90 (532) 123 45 67", "+90 (0)532 123 45 67", "0090 532 123 45 67"];
  for (const value of variants) assert.equal(canonicalizePhone(value, "90"), "+905321234567");
});

test("ayrı ülke kodunu yerel numaraya ekler", () => {
  assert.equal(canonicalizePhone("30 123456", "49"), "+4930123456");
  assert.equal(canonicalizePhone("202 555 0147", "1"), "+12025550147");
});

test("manuel formdaki tüm telefonları normalize eder ve geçici ülke kodunu saklamaz", () => {
  const result = normalizeManualPhones({
    student: { phoneCountryCode: "90", phone: "0532 123 45 67" },
    company: { phoneCountryCode: "49", phone: "030 123456" },
    employer: { phoneCountryCode: "44", phone: "020 7946 0958" },
  });
  assert.deepEqual(result, {
    student: { phone: "+905321234567" },
    company: { phone: "+4930123456" },
    employer: { phone: "+442079460958" },
  });
});

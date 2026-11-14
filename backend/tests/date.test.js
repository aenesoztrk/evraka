import test from "node:test";
import assert from "node:assert/strict";
import { calculateInternshipDays, daysBetween } from "../src/utils/date.js";

test("hafta içi staj günlerini hesaplar", () => {
  assert.equal(calculateInternshipDays("2027-07-05", "2027-07-09", [1, 2, 3, 4, 5]), 5);
});

test("seçili günleri ve resmi tatili uygular", () => {
  assert.equal(calculateInternshipDays("2026-10-26", "2026-10-30", [1, 2, 3, 4, 5]), 4);
});

test("iki tarih arasındaki takvim günü farkını verir", () => {
  assert.equal(daysBetween("2027-06-01", "2027-07-06"), 35);
});

test("30 günlük teslim hesabında saat bilgisi günü eksiltmez", () => {
  assert.equal(daysBetween("2027-05-22T18:00:00.000Z", "2027-06-21"), 30);
});

test("başlangıç ve bitiş günlerini dahil, resmi tatili hariç sayar", () => {
  assert.equal(calculateInternshipDays("2027-06-21", "2027-07-16", [1, 2, 3, 4, 5]), 19);
  assert.equal(calculateInternshipDays("2027-07-05", "2027-07-05", [1, 2, 3, 4, 5]), 1);
});

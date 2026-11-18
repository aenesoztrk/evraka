import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRecord, recordFromExtraction } from "../src/services/datasetService.js";
import { parsePlainText } from "../src/domain/readers/fieldParser.js";

const ek16Text = `
ÖĞRENCİNİN
T.C. KİMLİK NO/ UYRUĞU
12345678901
BÖLÜMÜ
Yazılım Mühendisliği
ADI SOYADI
Deniz Yılmaz
DAHA ÖNCE YAPTIĞI STAJ GÜN SAYISI
10 gün
DOĞUM TARİHİ
15.04.2004
ÖĞRETİM YILI
2026-2027
ÖĞRENCİ NUMARASI
202312345
E-POSTA ADRESİ /TELEFON NO
deniz.yilmaz@example.com
/ 0500 000 00 00
İKAMETGÂH ADRESİ
Örnek Mah. Deneme Cad. Bina No: 10 Daire No: 1 İzmit / KOCAELİ
SAĞLIK YARDIM STATÜSÜ (*)
1-☐
2-☒
3-☐
STAJ YAPILAN YERİN
Adı
Örnek Teknoloji Ltd. Şti.
`;

test("PDF'ten çıkarılan EK-16 verisini veri seti kaydına dönüştürür", () => {
  const record = recordFromExtraction(parsePlainText(ek16Text));
  assert.equal(record.studentNo, "202312345");
  assert.equal(record.name, "Deniz Yılmaz");
  assert.equal(record.identityNo, "12345678901");
  assert.equal(record.department, "Yazılım Mühendisliği");
  assert.equal(record.previousInternshipDays, 10);
  assert.equal(record.healthStatus, 2);
  assert.equal(record.email, "deniz.yilmaz@example.com");
  assert.ok(record.birthDate instanceof Date);
  assert.equal(record.birthDate.toISOString().slice(0, 10), "2004-04-15");
  assert.equal(record.company, undefined);
});

test("boş çıkarım sonucunda zorunlu alanlar boş kalır", () => {
  const record = recordFromExtraction({});
  assert.equal(record.studentNo, "");
  assert.equal(record.name, "");
  assert.equal(record.birthDate, undefined);
});

test("geçersiz tarih kaydı bozmaz, yerel tarih biçimi çözülür", () => {
  assert.equal(normalizeRecord({ birthDate: "okunamadı" }).birthDate, undefined);
  assert.equal(normalizeRecord({ birthDate: "14.02.2003" }).birthDate.toISOString().slice(0, 10), "2003-02-14");
});

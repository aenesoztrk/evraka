import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRecord, recordFromExtraction } from "../src/services/datasetService.js";
import { parsePlainText, splitGluedLabels } from "../src/domain/readers/fieldParser.js";
import { decodeFileName } from "../src/middleware/upload.js";

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

test("hücreleri yapışık aktarılan PDF metninden öğrenci kaydı çıkarır", () => {
  const glued = [
    "Bilgisayar Mühendisliği Bölümünde öğrenim gören öğrencimizin",
    "ÖĞRENCİNİN",
    "T.C. KİMLİK NO / UYRUĞU12345678901 / T.C.BÖLÜMÜBilgisayar Mühendisliği",
    "ADI SOYADIAhmet Yılmaz",
    "DAHA ÖNCE YAPTIĞI STAJ", "GÜN SAYISI", "0",
    "DOĞUM TARİHİ12.05.2002ÖĞRETİM YILI2025 - 2026",
    "ÖĞRENCİ NUMARASI210405022",
    "E-POSTA ADRESİ /", "TELEFON NO", "ahmet.yilmaz@ogrenci.edu.tr", "0555 123 45 67",
    "İKAMETGÂH ADRESİKadıköy / İstanbul",
    "SAĞLIK YARDIM STATÜSÜ (*)", "1- ☒    2- ☐",
    "STAJ YAPILAN YERİN",
    "AdıTekno Çözümler A.Ş.Yurtdışı Stajı mı? (E / H)H",
    "E-Posta Adresiik@tekno.com",
    "İŞVEREN VEYA YETKİLİNİN",
    "Adı SoyadıMehmet Demirİmza / Kaşe",
    "Maslak V.D. 1234567890",
    "Telefon No0532 999 88 77",
  ].join("\n");
  const data = parsePlainText(glued);
  const record = recordFromExtraction(data);
  assert.equal(record.name, "Ahmet Yılmaz");
  assert.equal(record.studentNo, "210405022");
  assert.equal(record.identityNo, "12345678901");
  assert.equal(record.department, "Bilgisayar Mühendisliği");
  assert.equal(record.address, "Kadıköy / İstanbul");
  assert.equal(record.academicYear, "2025 - 2026");
  assert.equal(data.company.name, "Tekno Çözümler A.Ş.");
  assert.equal(data.company.abroad, false);
  assert.equal(data.company.email, "ik@tekno.com");
  assert.equal(data.employer.name, "Mehmet Demir");
  assert.equal(data.employer.phone, "0532 999 88 77");
});

test("kelime içindeki etiket benzeri metinleri bölmez", () => {
  assert.equal(splitGluedLabels("Kadıköy Adıyaman Bölümünde"), "Kadıköy Adıyaman Bölümünde");
});

test("multer'ın bozduğu Türkçe dosya adını düzeltir", () => {
  const broken = Buffer.from("EK-16 Staj Başvuru Formu.pdf".normalize("NFD"), "utf8").toString("latin1");
  assert.equal(decodeFileName(broken), "EK-16 Staj Başvuru Formu.pdf");
  assert.equal(decodeFileName("students.csv"), "students.csv");
});

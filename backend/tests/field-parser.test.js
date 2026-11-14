import test from "node:test";
import assert from "node:assert/strict";
import { parsePlainText } from "../src/domain/readers/fieldParser.js";

const sampleText = `
Yazılım Mühendisliği Bölümünde öğrenim gören aşağıda kimlik bilgileri verilen öğrencimizin
mezun olabilmesi için staj yapması gerekmektedir.
ÖĞRENCİNİN
T.C. KİMLİK NO/ UYRUĞU
12345678901
BÖLÜMÜ
Yazılım Mühendisliği
ADI SOYADI
Deniz Yılmaz
DAHA ÖNCE YAPTIĞI STAJ GÜN SAYISI
0 gün
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
Yurtdışı Stajımı? (E / H)
H
Hizmet Alanı
Yazılım geliştirme ve bilişim teknolojileri
Staj Başlama Tarihi
21.06.2027
Telefon No
0262 000 00 00
Staj Bitiş Tarihi
16.07.2027
Staj Gün Sayısı
20 iş günü
E-Posta Adresi
ik@example.com
Mühendis Sayısı
5
Adres Bilgisi
Örnek Mah. Teknoloji Sok. No: 5 İzmit / KOCAELİ
İŞVEREN VEYA YETKİLİNİN
Adı Soyadı
Ahmet Demir
Görev / Unvanı
İnsan Kaynakları Uzmanı
E-Posta adresi
ik@example.com
Telefon No
0262 000 00 01
ÖĞRENCİNİN ONAYI STAJ DANIŞMANI ONAYI
`;

test("Ek-16 bölümlerini birbirine karıştırmadan ayrıştırır", () => {
  const data = parsePlainText(sampleText);
  assert.equal(data.student.department, "Yazılım Mühendisliği");
  assert.equal(data.student.name, "Deniz Yılmaz");
  assert.equal(data.student.birthDate, "15.04.2004");
  assert.equal(data.student.healthStatus, 2);
  assert.equal(data.company.name, "Örnek Teknoloji Ltd. Şti.");
  assert.equal(data.company.startDate, "21.06.2027");
  assert.equal(data.company.internshipDays, "20");
  assert.equal(data.employer.name, "Ahmet Demir");
  assert.equal(data.employer.phone, "0262 000 00 01");
});

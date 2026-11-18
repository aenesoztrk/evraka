import test from "node:test";
import assert from "node:assert/strict";
import { layoutFromTextItems, stampTextDetected } from "../src/domain/readers/approvalLayout.js";
import { AddressRule } from "../src/domain/validators/rules.js";

const viewport = { width: 595, height: 842 };
// pdfjs metin öğesi: transform[4] = x, transform[5] = sayfanın altından taban çizgisi.
const item = (str, x, top, height = 8, width = 60) => ({ str, width, height, transform: [height, 0, 0, height, x, viewport.height - top] });

const formItems = [
  item("İmza / Kaşe", 409, 558),
  item("ANADOLU ENERJİ VE OTOMASYON A.Ş.", 348, 567, 8, 163),
  item("Ostim V.D. 8451920374", 390, 587, 8, 78),
  item("B. Özdemir", 399, 607, 14, 61),
  item("ÖĞRENCİNİN ONAYI", 122, 626, 9, 92),
  item("STAJ DANIŞMANI ONAYI", 371, 626, 9, 110),
  item("İmza:", 202, 690, 8, 21),
  item("İmza:", 472, 675, 8, 21),
];

test("onay kutularını etiket konumlarından bulur", () => {
  const layout = layoutFromTextItems(formItems, viewport);
  assert.ok(layout.employer.top > 558 / 842 && layout.employer.bottom < 626 / 842);
  assert.ok(layout.student.left > 202 / 595 && layout.student.right <= 0.5);
  assert.ok(layout.advisor.left > 472 / 595);
  assert.deepEqual(layout.employerSignatureText, ["B. Özdemir"]);
  assert.ok(stampTextDetected(layout.employerStampText));
});

test("etiketi olmayan (taranmış) sayfada konum döndürmez", () => {
  assert.equal(layoutFromTextItems([item("rastgele metin", 50, 100)], viewport), null);
});

test("kaşe metni şirket unvanı veya vergi dairesinden tanınır", () => {
  assert.equal(stampTextDetected(["Burak Özdemir"]), false);
  assert.equal(stampTextDetected(["Örnek Yazılım Ltd. Şti."]), true);
});

test("bulvar, asfalt ve organize sanayi bölgesi adreslerini kabul eder", () => {
  const student = { address: "Örnek Mah. Gül Sok. No 1 Daire 2 İzmit / Kocaeli" };
  for (const address of [
    "Adalet Mah. Manas Bulvarı No: 38 Bayraklı / İzmir",
    "Kemalpaşa OSB Mah. İzmir-Ankara Asfaltı No: 118 Kemalpaşa / İzmir",
    "Bursa Organize Sanayi Bölgesi Lacivert Cad. No: 18 Nilüfer / Bursa",
  ]) assert.equal(new AddressRule().validate({ data: { student, company: { address } } }).status, "success", address);
  assert.equal(new AddressRule().validate({ data: { student: { address: "Çankaya / Ankara" }, company: { address: "Merkez / Ankara" } } }).status, "error");
});

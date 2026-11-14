import { normalizeText, setPath } from "../../utils/normalization.js";

const aliases = [
  ["student.identityNo", ["t.c. kimlik no", "tc kimlik no", "kimlik no"]],
  ["student.nationality", ["uyrugu", "uyrugu"]],
  ["student.department", ["bolumu", "bolum"]],
  ["student.name", ["adi soyadi", "ad soyad"]],
  ["student.previousInternshipDays", ["daha once yaptigi staj gun sayisi"]],
  ["student.birthDate", ["dogum tarihi"]],
  ["student.academicYear", ["ogretim yili"]],
  ["student.studentNo", ["ogrenci numarasi", "ogrenci no"]],
  ["student.emailPhone", ["e-posta adresi /telefon no", "e-posta adresi/telefon no"]],
  ["student.address", ["ikametgah adresi"]],
  ["student.healthStatus", ["saglik yardim statusu"]],
  ["company.name", ["staj yapilan yerin adi", "firma adi", "kurum adi"]],
  ["company.abroad", ["yurtdisi stajimi"]],
  ["company.serviceArea", ["hizmet alani"]],
  ["company.startDate", ["staj baslama tarihi", "baslama tarihi"]],
  ["company.phone", ["telefon no"]],
  ["company.endDate", ["staj bitis tarihi", "bitis tarihi"]],
  ["company.fax", ["fax no", "faks"]],
  ["company.internshipDays", ["staj gun sayisi"]],
  ["company.email", ["e-posta adresi"]],
  ["company.weekendWork", ["hafta sonu calisiliyor mu"]],
  ["company.website", ["web adresi"]],
  ["company.employeeCount", ["calisan sayisi"]],
  ["company.engineerCount", ["muhendis sayisi"]],
  ["company.paid", ["ucret aliyor mu"]],
  ["company.address", ["adres bilgisi"]],
  ["employer.name", ["isveren adi soyadi", "yetkilinin adi soyadi"]],
  ["employer.title", ["gorev / unvani", "gorev unvani"]],
  ["employer.email", ["isveren e-posta adresi", "yetkili e-posta adresi"]],
  ["employer.phone", ["isveren telefon no", "yetkili telefon no"]],
];

const normalizedAliases = aliases.flatMap(([path, values]) => values.map((value) => ({ path, value: normalizeText(value) }))).sort((a, b) => b.value.length - a.value.length);

function findPath(label) {
  const normalized = normalizeText(label);
  return normalizedAliases.find((entry) => normalized.includes(entry.value))?.path;
}

function cleanValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function assignContactFields(result) {
  const combined = result.student?.emailPhone || "";
  const email = combined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = combined.match(/(?:\+?90|0)?\s*5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/)?.[0];
  if (email) setPath(result, "student.email", email);
  if (phone) setPath(result, "student.phone", phone);
  if (result.student) delete result.student.emailPhone;
}

export function parseTableRows(rows) {
  const result = {};
  let section = "";
  for (const rawCells of rows) {
    const cells = rawCells.map(cleanValue).filter((cell, index, array) => cell || array.length > 1);
    const rowText = normalizeText(cells.join(" "));
    if (rowText.includes("ogrencinin")) section = "student";
    if (rowText.includes("staj yapilan yerin")) section = "company";
    if (rowText.includes("isveren veya yetkilinin")) section = "employer";

    for (let index = 0; index < cells.length; index += 1) {
      let path = findPath(cells[index]);
      if (!path) continue;
      if (path.startsWith("company.phone") && section === "employer") path = "employer.phone";
      if (path.startsWith("company.email") && section === "employer") path = "employer.email";
      if (path === "student.identityNo" && normalizeText(cells[index]).includes("uyrugu") && cells[index + 1]) {
        const parts = cells[index + 1].split(/[\s/|-]+/).filter(Boolean);
        if (parts[0]) setPath(result, "student.identityNo", parts[0]);
        if (parts[1]) setPath(result, "student.nationality", parts.slice(1).join(" "));
        continue;
      }
      const next = cells[index + 1];
      if (next && !findPath(next)) setPath(result, path, cleanValue(next));
      const colonValue = cells[index].split(":").slice(1).join(":").trim();
      if (colonValue) setPath(result, path, colonValue);
    }
  }
  assignContactFields(result);
  return result;
}

export function parsePlainText(text) {
  const result = {};
  const lines = String(text ?? "").split(/\r?\n/).map(cleanValue).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const path = findPath(lines[index]);
    if (!path) continue;
    const inline = lines[index].split(":").slice(1).join(":").trim();
    const candidate = inline || lines[index + 1] || "";
    if (candidate && !findPath(candidate)) setPath(result, path, candidate);
  }
  assignContactFields(result);
  return result;
}

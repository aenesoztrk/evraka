import { normalizeText, setPath } from "../../utils/normalization.js";

const sectionSpecs = {
  student: [
    { path: "student.identityNo", aliases: ["t.c. kimlik no/ uyrugu", "t.c. kimlik no", "tc kimlik no", "kimlik no"], lines: 2, type: "identity" },
    { path: "student.department", aliases: ["bolumu", "bolum"], lines: 1 },
    { path: "student.name", aliases: ["adi soyadi", "ad soyad"], lines: 1 },
    { path: "student.previousInternshipDays", aliases: ["daha once yaptigi staj gun sayisi"], lines: 1, type: "number" },
    { path: "student.birthDate", aliases: ["dogum tarihi"], lines: 1, type: "date" },
    { path: "student.academicYear", aliases: ["ogretim yili"], lines: 1, type: "academicYear" },
    { path: "student.studentNo", aliases: ["ogrenci numarasi", "ogrenci no"], lines: 1, type: "studentNo" },
    { path: "student.emailPhone", aliases: ["e-posta adresi /telefon no", "e-posta adresi/telefon no"], lines: 2 },
    { path: "student.address", aliases: ["ikametgah adresi"], lines: 5 },
    { path: "student.healthStatus", aliases: ["saglik yardim statusu"], lines: 16, type: "health" },
  ],
  company: [
    { path: "company.name", aliases: ["adi", "firma adi", "kurum adi"], lines: 2 },
    { path: "company.abroad", aliases: ["yurtdisi stajimi", "yurtdisi staji mi"], lines: 1, type: "boolean" },
    { path: "company.serviceArea", aliases: ["hizmet alani"], lines: 3 },
    { path: "company.startDate", aliases: ["staj baslama tarihi", "baslama tarihi"], lines: 1, type: "date" },
    { path: "company.phone", aliases: ["telefon no"], lines: 1, type: "phone" },
    { path: "company.endDate", aliases: ["staj bitis tarihi", "bitis tarihi"], lines: 1, type: "date" },
    { path: "company.fax", aliases: ["fax no", "faks"], lines: 1 },
    { path: "company.internshipDays", aliases: ["staj gun sayisi"], lines: 1, type: "number" },
    { path: "company.email", aliases: ["e-posta adresi", "e posta adresi"], lines: 1, type: "email" },
    { path: "company.weekendWork", aliases: ["hafta sonu calisiliyor mu"], lines: 1, type: "boolean" },
    { path: "company.website", aliases: ["web adresi"], lines: 1 },
    { path: "company.employeeCount", aliases: ["calisan sayisi"], lines: 1, type: "number" },
    { path: "company.engineerCount", aliases: ["muhendis sayisi"], lines: 1, type: "number" },
    { path: "company.paid", aliases: ["ucret aliyor mu"], lines: 1, type: "boolean" },
    { path: "company.address", aliases: ["adres bilgisi"], lines: 3 },
  ],
  employer: [
    { path: "employer.name", aliases: ["adi soyadi", "ad soyad"], lines: 1 },
    { path: "employer.title", aliases: ["gorev / unvani", "gorev unvani", "unvani"], lines: 2 },
    { path: "employer.email", aliases: ["e-posta adresi", "e posta adresi"], lines: 1, type: "email" },
    { path: "employer.phone", aliases: ["telefon no"], lines: 1, type: "phone" },
  ],
};

const allSpecs = Object.values(sectionSpecs).flat();
const extraBoundaries = ["imza / kase", "imza kase", "ogrencinin onayi", "staj danismani onayi", "onemli not"];

function cleanValue(value) {
  return String(value ?? "").replace(/\s+/g, " ").replace(/^\|+|\|+$/g, "").trim();
}

function levenshtein(first, second) {
  const previous = Array.from({ length: second.length + 1 }, (_value, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= second.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (first[row - 1] === second[column - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[second.length];
}

function fuzzyIncludes(value, expected) {
  if (value.includes(expected)) return true;
  const expectedWords = expected.split(" ").filter(Boolean);
  const words = value.split(" ").filter(Boolean);
  if (!expectedWords.length || words.length > 18) return false;
  const windowSize = expectedWords.length;
  for (let index = 0; index <= Math.max(0, words.length - windowSize); index += 1) {
    const candidate = words.slice(index, index + windowSize).join(" ");
    const score = 1 - levenshtein(candidate, expected) / Math.max(candidate.length, expected.length, 1);
    if (score >= 0.72) return true;
  }
  return false;
}

function lineMatchesAlias(line, alias) {
  return fuzzyIncludes(normalizeText(line), normalizeText(alias));
}

function headingMatches(line, heading) {
  const value = normalizeText(line);
  const expected = normalizeText(heading);
  if (value === expected) return true;
  if (value.split(" ").length > expected.split(" ").length + 2 || value.length > expected.length + 8) return false;
  const score = 1 - levenshtein(value, expected) / Math.max(value.length, expected.length, 1);
  return score >= 0.68;
}

function matchingSpec(line, specs) {
  return specs.find((spec) => spec.aliases.some((alias) => lineMatchesAlias(line, alias)));
}

function isBoundary(line, specs = allSpecs) {
  const normalized = normalizeText(line);
  return Boolean(matchingSpec(line, specs)) || extraBoundaries.some((boundary) => normalized.includes(boundary));
}

function transformValue(value, type) {
  const cleaned = cleanValue(value);
  if (!cleaned) return "";
  if (type === "identity") return cleaned.match(/\b\d{11}\b/)?.[0] || "";
  if (type === "studentNo") return cleaned.match(/\b\d{6,15}\b/)?.[0] || cleaned.replace(/\D/g, "");
  if (type === "number") return cleaned.replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0] || "";
  if (type === "date") return cleaned.match(/\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/)?.[0] || "";
  if (type === "academicYear") return cleaned.match(/20\d{2}\s*[-/]\s*20\d{2}(?:\s+(?:guz|bahar))?/i)?.[0] || "";
  if (type === "email") return cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  if (type === "phone") return cleaned.match(/(?:\+?\d{1,3}|0)?[\s().-]*\d{3}[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/)?.[0] || "";
  if (type === "boolean") {
    const normalized = normalizeText(cleaned);
    if (/^(e|evet)\b/.test(normalized)) return true;
    if (/^(h|hayir)\b/.test(normalized)) return false;
    return "";
  }
  if (type === "health") {
    const marked = cleaned.match(/([1-6])\s*-?\s*[☒☑■xX]/)?.[1];
    if (marked) return Number(marked);
    return "";
  }
  return cleaned;
}

function inlinePipeValue(line, spec) {
  const cells = String(line).split("|").map(cleanValue).filter(Boolean);
  const labelIndex = cells.findIndex((cell) => spec.aliases.some((alias) => lineMatchesAlias(cell, alias)));
  if (labelIndex >= 0 && cells[labelIndex + 1]) return cells[labelIndex + 1];
  const colonIndex = String(line).indexOf(":");
  return colonIndex >= 0 ? String(line).slice(colonIndex + 1).trim() : "";
}

function extractSpec(lines, spec, specs) {
  const labelIndex = lines.findIndex((line) => spec.aliases.some((alias) => lineMatchesAlias(line, alias)));
  if (labelIndex < 0) return "";
  const inline = inlinePipeValue(lines[labelIndex], spec);
  if (inline) return transformValue(inline, spec.type);
  const values = [];
  for (let index = labelIndex + 1; index < lines.length && values.length < spec.lines; index += 1) {
    if (isBoundary(lines[index], specs)) break;
    values.push(lines[index]);
  }
  return transformValue(values.join(" "), spec.type);
}

function splitSections(text) {
  const sections = { student: [], company: [], employer: [], approvals: [] };
  let activeSection = null;
  for (const rawLine of String(text ?? "").split(/\r?\n/).map(cleanValue).filter(Boolean)) {
    const line = normalizeText(rawLine);
    if (fuzzyIncludes(line, "ogrencinin onayi") || fuzzyIncludes(line, "staj danismani onayi")) activeSection = "approvals";
    else if (headingMatches(line, "isveren veya yetkilinin")) activeSection = "employer";
    else if (headingMatches(line, "staj yapilan yerin")) activeSection = "company";
    else if (headingMatches(line, "ogrencinin")) activeSection = "student";
    else if (line.includes("onemli not")) activeSection = null;
    if (activeSection) sections[activeSection].push(rawLine);
  }
  return sections;
}

function assignSection(result, sectionName, lines) {
  const specs = sectionSpecs[sectionName];
  for (const spec of specs) {
    const value = extractSpec(lines, spec, specs);
    if (value !== "" && value !== undefined) setPath(result, spec.path, value);
  }
  const text = lines.join(" ");
  if (sectionName === "student") {
    const identity = text.match(/\b\d{11}\b/)?.[0];
    const birthDate = text.match(/\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/)?.[0];
    const academicYear = text.match(/20\d{2}\s*[-/]\s*20\d{2}/)?.[0];
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = text.match(/(?:\+?90|0)?\s*5\d{2}[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/)?.[0];
    const checkedStatus = text.match(/([1-6])\s*-?\s*[☒☑■xX]/)?.[1];
    const department = lines.find((line) => /\b(?:yazilim|bilgisayar|elektrik(?:-elektronik)?|elektronik|makine|endustri|insaat|mekatronik|metalurji(?: ve malzeme)?|kimya|cevre|jeoloji|jeofizik|harita)\s+muhendisligi\b/i.test(normalizeText(line)));
    const studentNumbers = lines
      .map((line) => cleanValue(line).match(/^\d{6,15}$/)?.[0])
      .filter((value) => value && value !== identity && !/^20\d{6}$/.test(value));
    const previousDays = normalizeText(text).match(/\b(\d{1,3})\s*(?:is\s*)?gun(?:u|luk)?\b/i)?.[1];
    const addressParts = lines.filter((line) => {
      const normalized = normalizeText(line);
      if (/kimlik|uyrugu|telefon|e-posta/.test(normalized)) return false;
      return /\b(?:mah|cad|sok)\b|\bno\s*\d|\bdaire\b|\/\s*[a-z]{3,}/i.test(normalized);
    });
    if (identity) setPath(result, "student.identityNo", identity);
    if (identity && !result.student?.nationality) setPath(result, "student.nationality", identity.startsWith("99") ? "Yabancı" : "T.C.");
    if (birthDate) setPath(result, "student.birthDate", birthDate);
    if (academicYear) setPath(result, "student.academicYear", academicYear);
    if (department) setPath(result, "student.department", cleanValue(department));
    if (studentNumbers[0]) setPath(result, "student.studentNo", studentNumbers[0]);
    if (previousDays && !result.student?.previousInternshipDays) setPath(result, "student.previousInternshipDays", previousDays);
    if (addressParts.length >= 2) setPath(result, "student.address", cleanValue(addressParts.join(" ")));
    if (email) setPath(result, "student.email", email);
    if (phone) setPath(result, "student.phone", phone);
    if (checkedStatus) setPath(result, "student.healthStatus", Number(checkedStatus));
    if (result.student) delete result.student.emailPhone;
  }
  if (sectionName === "company" || sectionName === "employer") {
    const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const phone = text.match(/(?:\+?\d{1,3}|0)?[\s().-]*\d{3}[\s().-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/)?.[0];
    if (email) setPath(result, `${sectionName}.email`, email);
    if (phone) setPath(result, `${sectionName}.phone`, phone);
  }
  if (sectionName === "company") {
    const dates = text.match(/\b(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/g) || [];
    const findLabelIndex = (aliases) => lines.findIndex((line) => aliases.some((alias) => lineMatchesAlias(line, alias)));
    const nearbyBoolean = (aliases) => {
      const index = findLabelIndex(aliases);
      if (index < 0) return "";
      for (let distance = 1; distance <= 3; distance += 1) {
        for (const candidateIndex of [index + distance, index - distance]) {
          const value = transformValue(lines[candidateIndex], "boolean");
          if (value === true || value === false) return value;
        }
      }
      return "";
    };
    const nearbyNumber = (aliases) => {
      const index = findLabelIndex(aliases);
      if (index < 0) return "";
      for (let distance = 1; distance <= 3; distance += 1) {
        for (const candidateIndex of [index + distance, index - distance]) {
          if (candidateIndex < 0 || candidateIndex >= lines.length || isBoundary(lines[candidateIndex], sectionSpecs.company)) continue;
          const match = cleanValue(lines[candidateIndex]).match(/^\d{1,5}$/)?.[0];
          if (match) return match;
        }
      }
      return "";
    };
    const legalNameIndex = lines.findIndex((line) => /\b(?:ltd|limited|a\.?\s*s\.?|anonim|sti|sirketi)\b/i.test(normalizeText(line)));
    const firstDateIndex = lines.findIndex((line) => /\d{1,2}[./-]\d{1,2}[./-]\d{4}/.test(line));
    if (!result.company?.name || /\d{1,2}[./-]\d{1,2}/.test(result.company.name)) {
      const nameCandidates = lines.slice(1, firstDateIndex > 0 ? firstDateIndex : 12).filter((line) => {
        const normalized = normalizeText(line);
        return !isBoundary(line, sectionSpecs.company) && !/^(e|h|evet|hayir)$/.test(normalized) && /[a-z]{2}/i.test(normalized);
      });
      const legalLine = legalNameIndex >= 0 ? lines[legalNameIndex] : "";
      const descriptiveLine = nameCandidates.find((line) => line !== legalLine && !/yazilim gelistirme|bilisim teknolojileri/i.test(normalizeText(line)));
      const companyName = cleanValue([descriptiveLine, legalLine].filter(Boolean).join(" "));
      if (companyName) setPath(result, "company.name", companyName);
    }
    if (!result.company?.serviceArea || result.company.serviceArea.length < 20) {
      const serviceIndex = findLabelIndex(["hizmet alani"]);
      const serviceArea = lines.slice(Math.max(0, serviceIndex - 2), serviceIndex + 5).filter((line) => {
        const normalized = normalizeText(line);
        return line && !isBoundary(line, sectionSpecs.company) && !/\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{3}\s*\d{3}\s*\d{2}\s*\d{2}/.test(line) && !/^(e|h|evet|hayir)$/.test(normalized);
      }).join(" ");
      if (serviceArea) setPath(result, "company.serviceArea", cleanValue(serviceArea));
    }
    if (dates[0]) setPath(result, "company.startDate", dates[0]);
    if (dates[1]) setPath(result, "company.endDate", dates[1]);
    for (const [path, aliases] of [
      ["company.abroad", ["yurtdisi stajimi", "yurtdisi staji mi"]],
      ["company.weekendWork", ["hafta sonu calisiliyor mu"]],
      ["company.paid", ["ucret aliyor mu"]],
    ]) {
      const value = nearbyBoolean(aliases);
      if (value === true || value === false) setPath(result, path, value);
    }
    for (const [path, aliases] of [
      ["company.employeeCount", ["calisan sayisi"]],
      ["company.engineerCount", ["muhendis sayisi"]],
    ]) {
      const value = nearbyNumber(aliases);
      if (value) setPath(result, path, value);
    }
  }
}

export function parseTableRows(rows) {
  const result = {};
  let sectionName = "student";
  for (const rawCells of rows) {
    const cells = rawCells.map(cleanValue);
    const rowText = normalizeText(cells.join(" "));
    if (rowText.includes("ogrencinin onayi")) break;
    if (rowText.includes("isveren veya yetkilinin")) { sectionName = "employer"; continue; }
    if (rowText.includes("staj yapilan yerin")) { sectionName = "company"; continue; }
    if (/^ogrencinin\b/.test(rowText)) { sectionName = "student"; continue; }
    const specs = sectionSpecs[sectionName];
    for (let index = 0; index < cells.length; index += 1) {
      const spec = matchingSpec(cells[index], specs);
      if (!spec) continue;
      const candidate = cells[index + 1] && !matchingSpec(cells[index + 1], specs) ? cells[index + 1] : inlinePipeValue(cells[index], spec);
      const value = transformValue(candidate, spec.type);
      if (value !== "" && value !== undefined) setPath(result, spec.path, value);
    }
  }
  return result;
}

export function parsePlainText(text) {
  const result = {};
  const sections = splitSections(text);
  assignSection(result, "student", sections.student);
  assignSection(result, "company", sections.company);
  assignSection(result, "employer", sections.employer);
  return result;
}

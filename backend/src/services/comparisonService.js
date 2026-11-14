import { getPath, toComparable } from "../utils/normalization.js";

const comparisonFields = [
  ["student.identityNo", "T.C. / yabancı kimlik numarası"],
  ["student.nationality", "Uyruk"],
  ["student.department", "Bölüm"],
  ["student.name", "Ad soyad"],
  ["student.previousInternshipDays", "Önceki staj gün sayısı"],
  ["student.birthDate", "Doğum tarihi"],
  ["student.academicYear", "Öğretim yılı"],
  ["student.studentNo", "Öğrenci numarası"],
  ["student.email", "E-posta"],
  ["student.phone", "Telefon"],
  ["student.address", "İkametgâh adresi"],
  ["student.healthStatus", "Sağlık yardım statüsü"],
  ["company.name", "Staj yeri adı"],
  ["company.startDate", "Staj başlangıç tarihi"],
  ["company.endDate", "Staj bitiş tarihi"],
  ["company.internshipDays", "Staj gün sayısı"],
  ["company.engineerCount", "Mühendis sayısı"],
  ["employer.name", "İşveren / yetkili adı"],
];

export function compareManualAndExtracted(manualData, extractedData) {
  return comparisonFields.map(([path, label]) => {
    const manual = getPath(manualData, path);
    const extracted = getPath(extractedData, path);
    const manualComparable = toComparable(manual, path);
    const extractedComparable = toComparable(extracted, path);
    let status = "match";
    if (!manualComparable && !extractedComparable) status = "missing-both";
    else if (!manualComparable) status = "missing-manual";
    else if (!extractedComparable) status = "missing-document";
    else if (manualComparable !== extractedComparable) status = "mismatch";
    return { path, label, manual: manual ?? "", extracted: extracted ?? "", status };
  });
}

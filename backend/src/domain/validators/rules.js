import { ValidationRule } from "./ValidationRule.js";
import { calculateInternshipDays, daysBetween } from "../../utils/date.js";
import { getPath, normalizeDate, normalizePhone, normalizeText, toComparable } from "../../utils/normalization.js";

function fullAddress(value) {
  if (!value || typeof value !== "object") return value;
  return value.fullText || [value.neighborhood, value.street, value.buildingNo, value.apartmentNo, value.district, value.city].filter(Boolean).join(" ");
}

function compareProfile(expected, data, fields) {
  return fields.flatMap(([expectedPath, actualPath, label]) => {
    let expectedValue = getPath(expected, expectedPath);
    let actualValue = getPath(data, actualPath);
    if (expectedPath === "address" || actualPath.endsWith("address")) {
      expectedValue = fullAddress(expectedValue);
      actualValue = fullAddress(actualValue);
    }
    if (actualPath.endsWith("academicYear")) {
      expectedValue = String(expectedValue).match(/20\d{2}\s*[-/]\s*20\d{2}/)?.[0] || expectedValue;
      actualValue = String(actualValue).match(/20\d{2}\s*[-/]\s*20\d{2}/)?.[0] || actualValue;
    }
    if (expectedValue === undefined || expectedValue === null || expectedValue === "") return [];
    return toComparable(expectedValue, actualPath) === toComparable(actualValue, actualPath) ? [] : [label];
  });
}

export class RequiredFieldsRule extends ValidationRule {
  constructor() { super("REQUIRED_FIELDS", "Zorunlu alanlar"); }
  validate({ data }) {
    const fields = [
      ["student.identityNo", "Kimlik numarası"], ["student.nationality", "Uyruk"], ["student.department", "Bölüm"],
      ["student.name", "Ad soyad"], ["student.birthDate", "Doğum tarihi"], ["student.academicYear", "Öğretim yılı"],
      ["student.studentNo", "Öğrenci numarası"], ["student.email", "E-posta"], ["student.phone", "Telefon"],
      ["student.address", "İkametgâh adresi"], ["student.healthStatus", "Sağlık yardım statüsü"],
      ["company.name", "Staj yapılan yer"], ["company.startDate", "Staj başlangıç tarihi"], ["company.endDate", "Staj bitiş tarihi"],
      ["company.internshipDays", "Staj gün sayısı"], ["company.email", "Firma e-postası"], ["company.phone", "Firma telefonu"],
      ["company.address", "Firma adresi"], ["company.engineerCount", "Mühendis sayısı"],
      ["employer.name", "İşveren adı"], ["employer.title", "İşveren görevi"], ["employer.email", "İşveren e-postası"], ["employer.phone", "İşveren telefonu"],
    ];
    const missing = fields.filter(([path]) => !String(getPath(data, path) ?? "").trim()).map(([, label]) => label);
    return missing.length ? this.result("error", `${missing.length} zorunlu alan boş.`, undefined, missing) : this.result("success", "Tüm zorunlu alanlar doldurulmuş.");
  }
}

export class IdentityRule extends ValidationRule {
  constructor() { super("IDENTITY", "Kimlik numarası"); }
  validate({ data }) {
    const identity = String(getPath(data, "student.identityNo") ?? "").replace(/\D/g, "");
    const nationality = normalizeText(getPath(data, "student.nationality"));
    if (identity.length !== 11) return this.result("error", "Kimlik numarası 11 haneli olmalıdır.", "student.identityNo");
    if (nationality.includes("t.c") || nationality === "tc" || nationality.includes("turk")) {
      if (identity.startsWith("0")) return this.result("error", "T.C. kimlik numarasının ilk hanesi 0 olamaz.", "student.identityNo");
    } else if (!identity.startsWith("99")) return this.result("error", "Yabancı kimlik numarası 99 ile başlamalıdır.", "student.identityNo");
    return this.result("success", "Kimlik numarası biçimi uygun.", "student.identityNo");
  }
}

export class ContactRule extends ValidationRule {
  constructor() { super("CONTACT", "İletişim bilgileri"); }
  validate({ data }) {
    const contacts = [
      ["student", "Öğrenci"], ["company", "Kurum"], ["employer", "İşveren"],
    ];
    const errors = [];
    for (const [path, label] of contacts) {
      const email = String(getPath(data, `${path}.email`) ?? "");
      const phone = normalizePhone(getPath(data, `${path}.phone`));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`${label} e-posta biçimi geçersiz.`);
      if (!/^\d{8,15}$/.test(phone)) errors.push(`${label} telefonu ülke koduyla birlikte geçerli biçimde olmalıdır.`);
    }
    return errors.length ? this.result("error", errors.join(" "), "student.emailPhone") : this.result("success", "E-posta ve telefon biçimleri uygun.");
  }
}

export class AddressRule extends ValidationRule {
  constructor() { super("ADDRESS", "Adres alanları"); }
  validate({ data }) {
    const errors = [];
    for (const [path, label, apartmentRequired] of [["student.address", "İkametgâh", true], ["company.address", "Kurum", false]]) {
      const address = normalizeText(fullAddress(getPath(data, path)));
      const hasStreet = address.includes("sok") || address.includes("cad");
      const hasBuilding = /(?:bina\s*)?no\s*\d+/i.test(address);
      const hasApartment = /daire\s*(?:no\s*)?\d+/i.test(address);
      const hasLocation = /[a-z]{3,}\s*\/\s*[a-z]{3,}/i.test(address) || address.split(" ").length >= 8;
      if (!(address.includes("mah") && hasStreet && hasBuilding && (!apartmentRequired || hasApartment) && hasLocation)) errors.push(`${label} adresi Mahalle, Cadde/Sokak, Bina No${apartmentRequired ? ", Daire No" : ""}, İlçe/İl bilgilerini tam içermelidir.`);
    }
    return errors.length ? this.result("error", errors.join(" "), "student.address") : this.result("success", "Öğrenci ve kurum adresleri gerekli bileşenleri içeriyor.");
  }
}

export class AcademicDateRule extends ValidationRule {
  constructor() { super("ACADEMIC_DATE", "Öğretim yılı ve teslim tarihi"); }
  validate({ data, application }) {
    const academicYear = String(getPath(data, "student.academicYear") ?? "");
    const match = academicYear.match(/(20\d{2})\s*[-/]\s*(20\d{2})/);
    const issues = [];
    if (!match || Number(match[2]) !== Number(match[1]) + 1) issues.push("Öğretim yılı ardışık iki yıl olmalıdır.");
    const start = getPath(data, "company.startDate") || application.internshipStart;
    const end = getPath(data, "company.endDate") || application.internshipEnd;
    const leadDays = daysBetween(application.createdAt, start);
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) issues.push("Staj başlangıç ve bitiş tarihleri geçerli ve sıralı olmalıdır.");
    if (match && !Number.isNaN(startDate.getTime())) {
      const firstYear = Number(match[1]);
      const lastYear = Number(match[2]);
      if (startDate.getUTCFullYear() < firstYear || startDate.getUTCFullYear() > lastYear || endDate.getUTCFullYear() < firstYear || endDate.getUTCFullYear() > lastYear) issues.push("Staj tarihleri öğretim yılıyla uyumlu değildir.");
    }
    const suggestedSubmissionDate = !Number.isNaN(startDate.getTime()) ? new Date(startDate.getTime() - 30 * 86_400_000).toISOString().slice(0, 10) : undefined;
    if (leadDays !== null && leadDays < 30) issues.push(`Belge başlangıçtan en az 30 gün önce teslim edilmelidir. Önerilen son teslim: ${suggestedSubmissionDate}.`);
    return issues.length ? this.result("error", issues.join(" "), "company.startDate", { suggestedSubmissionDate, leadDays }) : this.result("success", "Öğretim yılı, tarih sırası ve 30 gün teslim kuralı uygun.", undefined, { suggestedSubmissionDate, leadDays });
  }
}

export class InternshipDaysRule extends ValidationRule {
  constructor() { super("INTERNSHIP_DAYS", "Staj gün sayısı"); }
  validate({ data, application }) {
    const start = getPath(data, "company.startDate") || application.internshipStart;
    const end = getPath(data, "company.endDate") || application.internshipEnd;
    const weekdays = application.selectedWeekdays?.length ? application.selectedWeekdays : [1, 2, 3, 4, 5];
    const calculated = calculateInternshipDays(start, end, weekdays);
    const declared = Number(getPath(data, "company.internshipDays"));
    if (!calculated || !declared) return this.result("warning", "Staj günü hesabı için tarih ve gün bilgileri tamamlanmalıdır.");
    return calculated === declared
      ? this.result("success", `Staj gün sayısı tutarlı: ${calculated} gün.`, "company.internshipDays", { calculated })
      : this.result("error", `Belgede ${declared}, takvim hesabında ${calculated} gün bulundu.`, "company.internshipDays", { calculated, declared });
  }
}

export class EmployerApprovalRule extends ValidationRule {
  constructor() { super("APPROVALS", "İmza ve onay alanları"); }
  validate({ data, extractionMeta }) {
    const studentSigned = Boolean(extractionMeta.studentApprovalSignal) || Boolean(getPath(data, "approvals.studentSigned"));
    const advisorSigned = Boolean(extractionMeta.advisorApprovalSignal) || Boolean(getPath(data, "approvals.advisorSigned"));
    const employerSigned = Boolean(extractionMeta.employerSignatureSignal) || Boolean(getPath(data, "employer.signaturePresent"));
    const employerStamped = Boolean(extractionMeta.employerStampSignal) || Boolean(getPath(data, "employer.stampPresent"));
    const issues = [];
    if (studentSigned) issues.push("Öğrenci onay kısmı boş olmalıdır.");
    if (advisorSigned) issues.push("Staj danışmanı onay kısmı boş olmalıdır.");
    if (!employerSigned || !employerStamped) issues.push("İşveren alanında imza ve kaşe bulunmalıdır.");
    return issues.length ? this.result("error", issues.join(" "), "approvals") : this.result("success", "Onay alanları beklenen durumda.");
  }
}

export class EngineerCountRule extends ValidationRule {
  constructor() { super("ENGINEER_COUNT", "Mühendis sayısı"); }
  validate({ data }) {
    const count = Number(getPath(data, "company.engineerCount"));
    if (!Number.isFinite(count) || count < 1) return this.result("error", "Mühendis sayısı en az 1 olmalıdır.", "company.engineerCount");
    if (count < 5 && !getPath(data, "company.engineerDepartment")) return this.result("warning", "Mühendis sayısı 5’in altında; mezun olunan bölüm girilmelidir.", "company.engineerDepartment");
    return this.result("success", "Mühendis sayısı kuralı uygun.");
  }
}

export class DatasetMatchRule extends ValidationRule {
  constructor() { super("DATASET_MATCH", "Test veri seti karşılaştırması"); }
  validate({ datasetRecord, data }) {
    if (!datasetRecord) return this.result("error", "Öğrenci numarası için test veri seti kaydı bulunamadı.");
    const mismatches = compareProfile(datasetRecord, data, [
      ["name", "student.name", "Ad soyad"], ["studentNo", "student.studentNo", "Öğrenci no"],
      ["identityNo", "student.identityNo", "Kimlik no"], ["nationality", "student.nationality", "Uyruk"],
      ["birthDate", "student.birthDate", "Doğum tarihi"], ["address", "student.address", "Adres"],
      ["department", "student.department", "Bölüm"], ["academicYear", "student.academicYear", "Öğretim yılı"],
      ["previousInternshipDays", "student.previousInternshipDays", "Önceki staj günü"], ["email", "student.email", "E-posta"],
      ["phone", "student.phone", "Telefon"], ["healthStatus", "student.healthStatus", "Sağlık statüsü"],
    ]);
    return mismatches.length ? this.result("error", `Veri setiyle uyuşmayan alanlar: ${mismatches.join(", ")}.`, undefined, mismatches) : this.result("success", "Öğrenci bilgileri test veri setiyle eşleşiyor.");
  }
}

export class UserMatchRule extends ValidationRule {
  constructor() { super("USER_MATCH", "Kullanıcı profili karşılaştırması"); }
  validate({ currentUser, data }) {
    if (!currentUser) return this.result("error", "Giriş yapan öğrenci profili bulunamadı.");
    const mismatches = compareProfile(currentUser, data, [
      ["name", "student.name", "Ad soyad"], ["studentNo", "student.studentNo", "Öğrenci no"],
      ["identityNo", "student.identityNo", "Kimlik no"], ["nationality", "student.nationality", "Uyruk"],
      ["birthDate", "student.birthDate", "Doğum tarihi"], ["address", "student.address", "Adres"],
      ["department", "student.department", "Bölüm"], ["academicYear", "student.academicYear", "Öğretim yılı"],
      ["previousInternshipDays", "student.previousInternshipDays", "Önceki staj günü"], ["email", "student.email", "E-posta"],
      ["phone", "student.phone", "Telefon"], ["healthStatus", "student.healthStatus", "Sağlık statüsü"],
    ]);
    return mismatches.length ? this.result("error", `Kullanıcı profiliyle uyuşmayan alanlar: ${mismatches.join(", ")}.`, undefined, mismatches) : this.result("success", "Belgedeki öğrenci bilgileri giriş yapan kullanıcıyla eşleşiyor.");
  }
}

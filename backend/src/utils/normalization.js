const trMap = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };

export function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (character) => trMap[character] || character)
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9@+./ -]/g, "");
}

export function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `9${digits}`;
  return digits;
}

export function canonicalizePhone(value, countryCode = "90") {
  const rawValue = String(value ?? "").trim();
  const code = String(countryCode ?? "90").replace(/\D/g, "") || "90";
  if (!rawValue) return "";

  const explicitlyInternational = rawValue.startsWith("+") || rawValue.startsWith("00");
  let digits = rawValue.replace(/\D/g, "");
  if (rawValue.startsWith("00")) digits = digits.slice(2);

  if (explicitlyInternational && digits.startsWith(code)) {
    digits = `${code}${digits.slice(code.length).replace(/^0+/, "")}`;
  } else if (!explicitlyInternational) {
    digits = digits.replace(/^0+/, "");
    if (!digits.startsWith(code) || digits.length < code.length + 7) digits = `${code}${digits}`;
  }

  return digits ? `+${digits}` : "";
}

export function normalizeManualPhones(manualData = {}) {
  const normalized = structuredClone(manualData || {});
  for (const sectionName of ["student", "company", "employer"]) {
    const section = normalized[sectionName];
    if (!section || typeof section !== "object") continue;
    if (section.phone) section.phone = canonicalizePhone(section.phone, section.phoneCountryCode || "90");
    delete section.phoneCountryCode;
  }
  return normalized;
}

export function normalizeDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return normalizeText(value);
}

export function getPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

export function setPath(object, path, value) {
  const keys = path.split(".");
  const finalKey = keys.pop();
  const parent = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== "object") current[key] = {};
    return current[key];
  }, object);
  parent[finalKey] = value;
  return object;
}

export function toComparable(value, path = "") {
  if (path.toLowerCase().includes("phone")) return normalizePhone(value);
  if (path.toLowerCase().includes("date")) return normalizeDate(value);
  return normalizeText(value);
}

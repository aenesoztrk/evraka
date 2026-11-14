import { AppError } from "../utils/AppError.js";
import { getPath } from "../utils/normalization.js";

export function validateGoogleFormUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "docs.google.com" && url.pathname.includes("/forms/");
  } catch {
    return false;
  }
}

export async function inspectGoogleForm(value) {
  if (!validateGoogleFormUrl(value)) throw new AppError("Google Form URL’si geçersiz.", 422);
  let response;
  try {
    response = await fetch(value, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    throw new AppError(`Google Form bağlantısına erişilemedi: ${error.message}`, 422);
  }
  if (!response.ok) throw new AppError(`Google Form erişim kontrolü başarısız (${response.status}).`, 422);
  const html = await response.text();
  const entryIds = [...new Set(html.match(/entry\.\d+/g) || [])];
  if (!html.toLowerCase().includes("google") || !html.toLowerCase().includes("form")) throw new AppError("Bağlantı erişilebilir bir Google Form sayfası döndürmedi.", 422);
  return { reachable: true, entryIds };
}

function validateEntryMap(entryMap) {
  const entries = entryMap instanceof Map ? [...entryMap.entries()] : Object.entries(entryMap || {});
  if (!entries.length) throw new AppError("Google Form entry eşlemesi tanımlanmamış.", 422);
  const invalid = entries.filter(([, entryId]) => !/^entry\.\d+$/.test(String(entryId)));
  if (invalid.length) throw new AppError("Google Form alan kimlikleri entry.123456 biçiminde olmalıdır.", 422);
  return entries;
}

export async function submitGoogleForm(config, application) {
  if (!validateGoogleFormUrl(config.url)) throw new AppError("Google Form URL’si geçersiz.", 422);
  const entryMap = Object.fromEntries(validateEntryMap(config.entryMap));
  const formResponseUrl = config.url.replace(/\/viewform.*$/i, "/formResponse").replace(/\/edit.*$/i, "/formResponse");
  const body = new URLSearchParams();
  for (const [dataPath, entryId] of Object.entries(entryMap)) {
    const value = getPath(application.manualData, dataPath);
    if (value !== undefined && value !== null) body.set(entryId, String(value));
  }
  const response = await fetch(formResponseUrl, { method: "POST", body, redirect: "manual" });
  if (![200, 302, 303].includes(response.status)) throw new AppError(`Google Form gönderimi başarısız (${response.status}).`, 502);
  return { submittedAt: new Date(), status: response.status };
}

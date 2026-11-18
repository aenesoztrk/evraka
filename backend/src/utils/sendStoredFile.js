// Tarayıcıda güvenle önizlenebilen türler; diğerleri (ör. DOCX) her zaman indirilir.
const previewableTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

/** Veritabanında saklanan bir dosyayı indirme ya da tarayıcıda önizleme olarak gönderir. */
export function sendStoredFile(request, response, file) {
  const mimeType = file.mimeType || "application/octet-stream";
  const inline = request.query.inline === "1" && previewableTypes.has(mimeType);
  response.setHeader("Content-Type", mimeType);
  response.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.originalName || "belge")}`);
  response.setHeader("Cache-Control", "private, no-store");
  response.send(file.data);
}

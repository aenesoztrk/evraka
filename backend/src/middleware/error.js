import multer from "multer";

export function notFoundHandler(request, response) {
  response.status(404).json({ success: false, message: `${request.method} ${request.originalUrl} bulunamadı.` });
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: "Dosya boyutu sınırı aşıldı.",
      LIMIT_FILE_COUNT: "Tek seferde yüklenebilecek dosya sayısı aşıldı.",
      LIMIT_UNEXPECTED_FILE: "Tek seferde yüklenebilecek dosya sayısı aşıldı veya beklenmeyen dosya alanı gönderildi.",
    };
    const message = messages[error.code] || error.message;
    return response.status(400).json({ success: false, message });
  }
  if (error.name === "ValidationError") {
    const details = Object.values(error.errors).map((item) => item.message);
    return response.status(422).json({ success: false, message: "Gönderilen veriler geçersiz.", details });
  }
  if (error.code === 11000) {
    return response.status(409).json({ success: false, message: "Bu kayıt zaten mevcut.", details: error.keyValue });
  }
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) console.error(error);
  return response.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? "Beklenmeyen bir sunucu hatası oluştu." : error.message,
    details: error.details,
  });
}

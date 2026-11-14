# REST API

Kök adres `/api` olup korunan endpointlerde `Authorization: Bearer TOKEN` başlığı kullanılır.

## Kimlik doğrulama

| Metot | Endpoint | Açıklama |
|---|---|---|
| POST | `/auth/register` | Öğrenci hesabı oluşturur |
| POST | `/auth/login` | Giriş yapar ve JWT döndürür |
| GET | `/auth/me` | Geçerli kullanıcıyı döndürür |
| POST | `/auth/logout` | Token sürümünü geçersiz kılar |

## Öğrenci başvurusu

| Metot | Endpoint | Açıklama |
|---|---|---|
| POST | `/applications` | Manuel Ek-16 kaydı oluşturur |
| GET | `/applications/mine` | Öğrencinin başvurularını listeler |
| GET | `/applications/:id` | Başvuru ve raporu getirir |
| PATCH | `/applications/:id/manual` | Manuel alanları günceller |
| POST | `/applications/:id/document` | Multipart `document` dosyasını okur ve karşılaştırır |
| PATCH | `/applications/:id/schedule` | Tarih ve haftalık günleri hesaplar |
| PUT | `/applications/:id/google-form` | Form URL ve entry eşlemesini kaydeder |
| GET | `/applications/:id/document` | Orijinal belgeyi indirir |

Belge yüklerken `stage=midterm` vize kapsamını, `stage=final` tüm doğrulamaları çalıştırır.

## Admin

| Metot | Endpoint | Açıklama |
|---|---|---|
| GET | `/admin/stats` | Panel sayaçları |
| GET | `/admin/reports` | Gerçek doğrulama ve OCR rapor istatistikleri |
| GET | `/admin/applications` | Filtreli liste |
| GET | `/admin/applications/export.csv` | Başvuru listesini CSV olarak indirir |
| POST | `/admin/dataset` | XLSX/CSV test veri seti |
| GET | `/admin/datasets` | Veri seti aktarım geçmişi |
| DELETE | `/admin/datasets/:batch` | Bir veri seti aktarımını siler |
| PATCH | `/admin/applications/:id` | Başvuruyu günceller |
| DELETE | `/admin/applications/:id` | Başvuruyu siler |
| POST | `/admin/applications/:id/complete` | Tamamlar ve Google Form gönderimini dener |
| GET | `/admin/applications/:id/ek17` | Ek-17 DOCX üretir |

Başvuru listesi `status`, `department`, `search`, `from` ve `to` sorgu parametrelerini destekler. Google Form URL’si kaydedilirken bağlantıya erişim kontrolü yapılır ve sayfada algılanan `entry.*` kimlikleri döndürülür. Form gönderimi başarısız olursa başvuru `completed` durumuna geçirilmez.

## Google Form eşlemesi

```json
{
  "url": "https://docs.google.com/forms/d/e/FORM_ID/viewform",
  "entryMap": {
    "student.name": "entry.123456789",
    "student.studentNo": "entry.987654321",
    "company.name": "entry.456789123"
  }
}
```

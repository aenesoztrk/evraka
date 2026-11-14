# Sistem Mimarisi

## Bileşenler

```mermaid
flowchart LR
  UI[Vanilla JS Frontend] -->|JWT REST API| API[Express API]
  API --> AUTH[Kimlik ve Rol Katmanı]
  API --> APP[Başvuru Servisi]
  APP --> READERS[Belge Okuyucu Fabrikası]
  READERS --> DOCX[DOC DOCX Okuyucu]
  READERS --> PDF[PDF Metin Okuyucu]
  READERS --> OCR[Tesseract OCR]
  APP --> RULES[Doğrulama Kural Motoru]
  API --> DB[(MongoDB)]
  API --> FORM[Google Forms]
  API --> EK17[Ek 17 DOCX Üretimi]
```

## Sınıf diyagramı ve NYP prensipleri

```mermaid
classDiagram
  class BaseDocumentReader {
    <<abstract>>
    +read(file)
  }
  BaseDocumentReader <|-- DocxReader
  BaseDocumentReader <|-- PdfReader
  BaseDocumentReader <|-- ImageOcrReader
  BaseDocumentReader <|-- LegacyDocReader
  class ValidationRule {
    <<abstract>>
    +validate(context)
  }
  ValidationRule <|-- IdentityRule
  ValidationRule <|-- ContactRule
  ValidationRule <|-- InternshipDaysRule
  ValidationRule <|-- EmployerApprovalRule
  ValidationRule <|-- UserMatchRule
  ValidationRule <|-- DatasetMatchRule
  ValidatorEngine o-- ValidationRule
```

- Kapsülleme: `ValidatorEngine` kural listesini özel `#rules` alanında saklar.
- Soyutlama: `BaseDocumentReader` ve `ValidationRule` doğrudan örneklenemez.
- Kalıtım: Dosya okuyucuları ve doğrulama kuralları temel sınıflardan türetilir.
- Çok biçimlilik: Servis her okuyucunun `read`, motor her kuralın `validate` metodunu aynı sözleşmeyle çağırır.

Final analizinde aynı öğrenci verisi dört kaynakta denetlenir: manuel form, belgeden çıkarılan alanlar, giriş yapan kullanıcı profili ve admin test veri seti.

## Veri modeli

```mermaid
erDiagram
  USER ||--o{ APPLICATION : creates
  USER ||--o{ AUDIT_LOG : performs
  USER ||--o{ DATASET_RECORD : imports
  APPLICATION {
    ObjectId student
    string status
    string stage
    object manualData
    object extractedData
    array comparisonReport
    array validationReport
    boolean readiness
    binary document
  }
```

## Güvenlik

Şifreler bcrypt ile hashlenir. JWT rol ve token sürümü taşır; çıkış token sürümünü artırır. Token için zaman aşımı uygulanmaz. Beş başarısız giriş hesabı kilitler. Frontend ve API aynı origin üzerinden sunulur; Helmet, oran sınırlama, dosya boyutu, MIME ve dosya imzası kontrolleri uygulanır. Öğrenci yalnızca kendi başvurusuna erişebilir.

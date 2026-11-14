# IEEE Raporu İçin Öğrenci Çalışma Taslağı

Bu dosya teslim edilecek rapor değildir. Proje dokümanındaki uyarı gereğince rapor metni grup üyeleri tarafından yazılmalıdır. Aşağıdaki başlıklar, geliştirilen kodu kendi cümlelerinizle açıklamanız için kontrol listesidir.

## Özet

- Problemi ve hedefi 150–250 kelimeyle açıklayın.
- Manuel Ek-16 verisi ile belge okuma sonucunun karşılaştırıldığını belirtin.
- Vize ve final kapsamındaki temel çıktıları özetleyin.

## Giriş

- Mevcut staj evrak sürecindeki hata ve gecikme riskini açıklayın.
- Öğrenci ve admin rollerinin sorumluluklarını tanımlayın.
- Sistemin yalnızca Ek-16 belgesini işlediğini belirtin.

## Yöntem ve Algoritmalar

- Kimlik doğrulama: `backend/src/services/authService.js`
- Dosya türü ve gerçek dosya imzası kontrolü: `backend/src/middleware/upload.js` ve `backend/src/services/documentService.js`
- DOC/DOCX/PDF/OCR okuyucuları: `backend/src/domain/readers/`
- Manuel ve okunan veri karşılaştırması: `backend/src/services/comparisonService.js`
- Kural motoru: `backend/src/domain/validators/`
- Staj günü ve resmî tatil hesabı: `backend/src/utils/date.js`
- Google Form ve Ek-17: `backend/src/services/googleFormService.js` ve `backend/src/services/ek17Service.js`

## Akış Diyagramı

`docs/architecture.md` içindeki sistem akışını kendi çizim aracınızla rapora aktarın. Giriş, manuel form, dosya yükleme, belge okuma, karşılaştırma, doğrulama ve durum geçişlerini gösterin.

## UML ve Class Diyagramı

`docs/architecture.md` içindeki sınıf diyagramını temel alın. Kapsülleme, soyutlama, kalıtım ve çok biçimlilik için koddan birer örnek açıklayın.

## Veri Tabanı Tasarımı

- User, Application, DatasetRecord ve AuditLog koleksiyonlarını açıklayın.
- İlişkileri, indeksleri ve tamamlanan başvurunun kilitlenme kuralını belirtin.

## Kaba Kod

Belge analiz akışını kendi cümlelerinizle pseudocode olarak yazın:

1. Dosya biçimini ve imzasını doğrula.
2. MIME türüne göre okuyucu oluştur.
3. Belgeden alanları çıkar.
4. Manuel alanlarla karşılaştır.
5. Final aşamasında doğrulama kurallarını çalıştır.
6. Hata varsa raporla; yoksa onayla.
7. Admin tamamladığında Google Form gönderimini ve Ek-17 üretimini hazırla.

## Testler ve Bulgular

- `npm test` çıktısındaki testleri tablo hâline getirin.
- Örnek Ek-16 yüklemesinin ekran görüntülerini ekleyin.
- En az bir başarılı ve bir hatalı başvuru senaryosunu açıklayın.

## Sonuç

- Gerçekleştirilen vize ve final özelliklerini özetleyin.
- Taranmış belge kalitesi, OCR güven skoru ve Google Form entry eşlemesi gibi sınırlamaları tartışın.
- GridFS veya nesne depolama, e-posta bildirimi ve gelişmiş imza/kaşe modeli gibi olası geliştirmeleri belirtin.

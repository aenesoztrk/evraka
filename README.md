# Evraqa Staj Evrak Doğrulama ve Yönetim Sistemi

Ek-16 belgesini manuel form verileriyle karşılaştıran, vize ve final kapsamlarını birlikte içeren tam yığın PROLAB III projesidir. Frontend bağımlılıksız HTML/CSS/JavaScript, backend Node.js ve Express, veri tabanı MongoDB/Mongoose ile hazırlanmıştır.

## Proje yapısı

```text
lab3-proje/
├── frontend/          # Tanıtım, öğrenci ve admin arayüzleri
├── backend/           # REST API, iş kuralları, OCR ve MongoDB modelleri
├── docs/              # Mimari, API ve vize/final kapsamı
├── sample-data/       # Admin veri seti örneği
├── .env               # MongoDB, JWT ve çalışma ayarları
└── docker-compose.yml # İsteğe bağlı yerel MongoDB
```

## Kurulum

```bash
npm run install:all
npm --prefix backend run prepare:ocr
npm run dev
```

Kökteki `.env` dosyasında `MONGODB_URI` değerini kendi uzak MongoDB sunucu adresinizle, `MONGODB_DATABASE` değerini kullanmak istediğiniz veritabanı adıyla değiştirin. URI içindeki `/` sonrasına collection yazılmaz; MongoDB bağlantısında burası veritabanıdır. Koleksiyonlar Mongoose tarafından `users`, `applications`, `datasetrecords` ve `auditlogs` olarak oluşturulur. `JWT_SECRET` için uzun ve rastgele bir anahtar belirleyin. Tarayıcıda `http://localhost:4000` adresini açın.

Node.js 22.13 veya daha yeni bir sürüm gereklidir.

## İlk yönetici hesabı

Backend ilk açılışta `ADMIN_BOOTSTRAP_EMAIL` ve `ADMIN_BOOTSTRAP_PASSWORD` tanımlıysa yönetici hesabı oluşturur. Üretimde başlangıç şifresini mutlaka değiştirin. Öğrenciler arayüzden kendi hesaplarını ve şifrelerini oluşturur.

## Vize kapsamı

- Kayıt, giriş, JWT oturumu, rol kontrolü ve beş hatalı girişte hesap kilidi
- Öğrenci ve admin panelleri ile admin test veri seti yükleme
- Manuel Ek-16 bilgi formu ve MongoDB kaydı
- DOC, DOCX, PDF, JPEG ve PNG yükleme
- Dosya boyutu, MIME ve gerçek dosya imzası kontrolü
- Metin katmanlı DOC/DOCX/PDF içeriğinin okunması ve manuel verilerle bilgi amaçlı karşılaştırılması
- Görsel ve taranmış PDF OCR işlemlerinin final aşamasına ertelenmesi
- NYP prensiplerine göre okuyucu ve doğrulama sınıf hiyerarşisi

## Final kapsamı

- JPEG/PNG için Tesseract OCR, DOC/DOCX/PDF için belge metni çıkarma
- Kimlik, telefon, e-posta, adres, öğretim yılı, 30 gün, staj günü, imza/kaşe ve mühendis sayısı kontrolleri
- Veri seti ile öğrenci bilgisi karşılaştırması
- Google Form URL ve `entry.*` alan eşlemesiyle otomatik gönderim
- Google Form erişim kontrolü ve başarısız gönderimde tamamlanmayı engelleme
- Tamamlanan başvurudan Ek-17 DOCX üretimi
- Admin tarih/durum/bölüm/arama filtreleri, gerçek rapor istatistikleri, CSV dışa aktarma, güncelleme, silme ve tamamlama işlemleri
- Öğrenci için tamamlanan başvurunun değiştirilemez olması
- Kullanıcı profili, belge ve test veri setinin tüm dolu öğrenci alanlarında karşılaştırılması

## Testler

```bash
npm test
```

Mimari ve endpoint ayrıntıları için [docs/architecture.md](docs/architecture.md), [docs/api.md](docs/api.md) ve [docs/requirements.md](docs/requirements.md) dosyalarına bakın. IEEE raporunu kendi cümlelerinizle hazırlarken [docs/report-outline.md](docs/report-outline.md) kontrol listesini kullanabilirsiniz. Teknik içerik ve biçimlendirme başlangıcı için [docs/Evraqa_Teknik_Rapor_Taslagi.docx](docs/Evraqa_Teknik_Rapor_Taslagi.docx) hazırlanmıştır; grup üyeleri metni kendi anlatımları ve ekran görüntüleriyle son hâle getirmelidir.

## Teknik notlar

- Belgeler proje kolaylığı için MongoDB `Buffer` alanında tutulur. Büyük ölçekli üretimde GridFS veya nesne depolama önerilir.
- Görsel OCR dil dosyaları `npm --prefix backend run prepare:ocr` komutuyla proje içindeki `.cache/tesseract` klasörüne hazırlanır. Sunucuda bu komutu kurulumdan sonra bir kez çalıştırın.
- Metin katmanı olmayan taranmış PDF’lerin ilk beş sayfası görsele çevrilerek Tesseract OCR ile okunur.
- Google Form gönderimi için formun `entry.123456` benzeri alan kimliklerinin `entryMap` içinde eşlenmesi gerekir.

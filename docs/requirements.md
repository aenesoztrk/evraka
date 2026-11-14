# Vize ve Final Gereksinim Eşlemesi

## Paylaşılan ek açıklamaların uygulanması

1. Öğrenci Ek-16 alanlarını arayüzde manuel olarak girer ve sistem MongoDB’de saklar.
2. Yüklenen belgeden okunan alanlar manuel verilerle karşılaştırılır.
3. Vize aşamasında yükleme doğrulaması yalnızca dosya biçimi, MIME, imza ve boyut kontrollerini zorunlu tutar. Alan karşılaştırması ayrıca raporlanır.
4. Final aşamasında tüm iş kuralları ve OCR çalıştırılır.
5. Tamamlanan belge öğrenci tarafından değiştirilemez. Admin güncelleyebilir veya silebilir.
6. Öğrenci hesabını ve şifresini kendisi oluşturur. Test veri seti hesap açmaz; admin arayüzünü ve karşılaştırmayı test eder.
7. Final doğrulamasında öğrenci alanları manuel form, belge, giriş yapan kullanıcı profili ve test veri seti arasında karşılaştırılır.
8. Google Form gönderimi başarılı olmadan başvuru tamamlanmaz.

## Ek-16 alan modeli

Öğrenci alanları kimlik, uyruk, bölüm, ad soyad, önceki staj günü, doğum tarihi, öğretim yılı, öğrenci no, e-posta, telefon, adres ve sağlık statüsüdür. Staj yeri alanları kurum, hizmet alanı, tarihler, gün sayısı, iletişim, çalışan/mühendis sayısı, hafta sonu ve ücret bilgisidir. İşveren bölümünde yetkili kişi, görev, iletişim, imza ve kaşe saklanır.

## Statü akışı

`draft → uploaded → reviewing → error / approved → completed`

`completed` durumundaki kayıtta öğrenci güncelleme endpointleri 409 döndürür. Admin endpointleri bu kısıtın dışındadır ve kritik işlemler denetim günlüğüne yazılır.

## Yönetim ve raporlama

Admin başvuruları durum, bölüm, tarih ve öğrenci bilgisiyle filtreleyebilir. Rapor ekranındaki OCR güveni, günlük başvuru sayısı ve kural hata dağılımı MongoDB kayıtlarından hesaplanır. Sabit demo istatistiği kullanılmaz. Veri seti aktarım geçmişi listelenebilir ve aktarım grubu silinebilir.

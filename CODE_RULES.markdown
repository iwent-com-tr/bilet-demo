# Kod Kuralları

## Genel Kurallar
- TypeScript ile tip güvenliği sağlayın
- SOLID prensiplerine uyun
- DRY (Kendini Tekrar Etme) prensibine sadık kalın
- Anlamlı ve açıklayıcı isimlendirmeler kullanın
- Kodun kendi kendini açıklamasını hedefleyin

## İsimlendirme Kuralları
- Değişkenler ve fonksiyonlar için `camelCase`
- Sınıflar ve arayüzler için `PascalCase`
- Sabitler için `UPPER_SNAKE_CASE`
- Dosya isimleri için `kebab-case`
- Anlamlı ve açıklayıcı isimler kullanın

## Fonksiyonlar
- Tek sorumluluk prensibi
- Maksimum 30 satır
- Açık parametre isimlendirmesi
- Tüm parametreler ve dönüş tipleri belirtilmeli
- Karmaşık fonksiyonlar için JSDoc

## Sınıflar
- Tek sorumluluk prensibi
- Bağımlılık enjeksiyonu
- Mümkünse değişmez (immutable) yapılar
- Uygun durumlarda private üyeler
- Arayüz implementasyonu

## Hata Yönetimi
- Özel hata sınıfları kullanın
- Hataları uygun şekilde yayın
- Anlamlı hata mesajları
- Merkezi hata yönetimi
- Hata loglama

## Asenkron Kod
- Promise yerine async/await kullanın
- Hata yönetimi
- Yükleme durumları yönetimi
- Gerektiğinde işlemleri iptal etme
- Zaman aşımı yönetimi

## Test
- İş mantığı için birim testleri
- API için entegrasyon testleri
- Test isimlendirme: `should_expectedBehavior_when_condition`
- Harici bağımlılıkları mock'layın
- Kenar durumlarını test edin

## Yorumlar
- Karmaşık mantık için yorum ekleyin
- Açıkça anlaşılan yorumlardan kaçının
- Public API'ler için JSDoc
- Yorumları güncel tutun
- Geçici çözümleri belgeleyin

## Kod Organizasyonu
- Özellik bazlı yapı
- Net modül sınırları
- Bağımlılık yönetimi
- Döngüsel bağımlılık önleme
- Kod bölme

## Versiyon Kontrolü
- Açık commit mesajları
- Özellik dalı akışı
- Düzenli commit'ler
- Pull request incelemeleri
- Versiyon etiketleme
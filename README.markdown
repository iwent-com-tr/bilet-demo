# Iwent - Online Bilet Satış Platformu (Demo)

Iwent, organizatörlerin etkinlik oluşturup bilet satışı yapabileceği, kullanıcıların bilet alabileceği ve etkinliklere özel chat kanallarında iletişim kurabileceği modern bir online bilet satış platformudur. Bu demo sürümü, ödeme altyapısı olmadan bilet alma (sepet) mantığını, QR kodlu bilet gönderimini ve organizatör kontrol panelini içerir.

## Teknolojiler

- **Backend**:
  - Node.js (v22.13.1)
  - Express.js (Hafif ve esnek API framework'ü)
  - PostgreSQL (Veritabanı)
  - Sequelize (ORM)
  - JSON Web Token (JWT) (Kimlik doğrulama)
  - Nodemailer (QR kodlu bilet gönderimi için e-posta)
  - Socket.IO (Gerçek zamanlı chat özelliği)
- **Frontend**:
  - React.js (Modern ve bileşen tabanlı UI)
  - Tailwind CSS (Hızlı ve tutarlı stil oluşturma)
  - Axios (API istekleri)
  - React Router (Sayfa yönlendirme)
- **Diğer**:
  - QRCode.js (QR kod üretimi)
  - Redis (Session yönetimi ve önbellekleme)
  - Winston (Loglama)
  - Jest (Test framework'ü)
  - ESLint & Prettier (Kod düzeni ve kalite)

## Özellikler

### Kullanıcı Özellikleri
- Kayıt ve giriş (JWT tabanlı)
- Etkinlik arama ve filtreleme
- Bilet alma (sepet mantığı, ödeme olmadan)
- QR kodlu biletlerin e-posta ile gönderimi
- Etkinliklere özel chat kanallarına otomatik katılım
- Profil yönetimi (isim, soyisim, e-posta, telefon, şehir, doğum yılı)

### Organizatör Özellikleri
- Etkinlik oluşturma (ücretli/ücretsiz, detaylar: ad, kategori, tarih, yer, adres, il, banner, sosyal medya linkleri)
- Kontrol Paneli:
  - Anlık katılımcı sayısı, toplam kazanç, doluluk oranı, bilet bazlı istatistikler
  - Excel formatında etkinlik raporu (katılımcı bilgileri, bilet detayları, check-in, gişe, temsilciler)
  - Geçmiş etkinlik raporları
- Giriş Kontrolü:
  - Cihaz ekleme/yönetme (telefon numarası ile)
  - Bilet okuma (QR kod tarama, giriş saati ve gişe bilgisi kaydı)
- Hesap Yönetimi:
  - Yetkili bilgileri, ödeme bilgileri, fatura bilgileri (bireysel/kurumsal)
  - Şifre değiştirme, sözleşme yönetimi
- Guest List ve özel QR kod oluşturma
- Chat kanalı moderasyonu
- Gişe ve temsilci sistemi (bilet tanımlama, referans linki ile satış)

## Proje Yapısı

```
src/
├── backend/
│   ├── config/           # Yapılandırma dosyaları
│   │   ├── database.js   # PostgreSQL bağlantısı
│   │   ├── redis.js      # Redis bağlantısı
│   │   └── email.js      # Nodemailer yapılandırması
│   ├── middleware/       # Middleware'ler
│   │   ├── auth.js       # JWT kimlik doğrulama
│   │   └── rateLimiter.js # Rate limiting
│   ├── models/           # Veritabanı modelleri
│   │   ├── user.js       # Kullanıcı modeli
│   │   ├── organizer.js  # Organizatör modeli
│   │   ├── event.js      # Etkinlik modeli
│   │   ├── ticket.js     # Bilet modeli
│   │   └── chat.js       # Chat modeli
│   ├── routes/           # API rotaları
│   │   ├── auth.js       # Kayıt/giriş
│   │   ├── event.js      # Etkinlik işlemleri
│   │   ├── ticket.js     # Bilet işlemleri
│   │   ├── chat.js       # Chat işlemleri
│   │   └── organizer.js  # Organizatör işlemleri
│   ├── sockets/          # Socket.IO işlemleri
│   │   └── chat.js       # Chat kanalları
│   ├── util/             # Yardımcı fonksiyonlar
│   │   ├── qrCode.js     # QR kod üretimi
│   │   └── report.js     # Rapor oluşturma
│   └── app.js            # Ana backend uygulaması
├── frontend/
│   ├── src/
│   │   ├── components/   # Yeniden kullanılabilir React bileşenleri
│   │   ├── pages/        # Sayfalar (anasayfa, etkinlik, profil, vs.)
│   │   ├── hooks/        # Özel React hook'ları
│   │   ├── styles/       # Tailwind CSS yapılandırması
│   │   └── App.js        # Ana React uygulaması
├── public/               # Statik dosyalar
└── tests/                # Test dosyaları
```

## Kurulum

1. **Gereksinimleri Yükleyin**:
```bash
# Node.js ve npm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Redis
sudo apt-get install redis-server
```

2. **Projeyi Klonlayın**:
```bash
git clone [repo-url]
cd iwent
```

3. **Bağımlılıkları Yükleyin**:
```bash
# Backend bağımlılıkları
cd src/backend
npm install

# Frontend bağımlılıkları
cd ../frontend
npm install
```

4. **Çevre Değişkenlerini Ayarlayın**:
```bash
# Backend için
cd src/backend
cp .env.example .env
# .env dosyasını düzenleyin (DB_URL, JWT_SECRET, EMAIL_CONFIG vb.)

# Frontend için
cd src/frontend
cp .env.example .env
# .env dosyasını düzenleyin (API_URL vb.)
```

5. **Veritabanını Oluşturun**:
```bash
createdb iwent
psql iwent < init.sql
```

6. **Uygulamayı Başlatın**:
```bash
# Backend (geliştirme)
cd src/backend
npm run dev

# Frontend (geliştirme)
cd src/frontend
npm start
```

## Güvenlik Kontrolleri

- [x] JWT Kimlik Doğrulama
- [x] Rate Limiting
- [x] XSS ve CSRF Koruması
- [x] Input Validation
- [x] SQL Injection Koruması
- [x] Güvenli Session Yönetimi
- [x] E-posta Güvenliği (Nodemailer için yapılandırma)

## Bilinen Sorunlar

- Chat kanalı ölçeklendirme (demo için sınırlı kullanıcı)
- QR kod tarama cihazlarının test edilmesi gerekiyor

## Yapılacaklar

- [ ] Ödeme altyapısı ekleme
- [ ] WebSocket performans optimizasyonu
- [ ] Test coverage artırımı
- [ ] Çoklu dil desteği
- [ ] Mobil uygulama entegrasyonu

## Lisans

Bu proje demo amaçlıdır ve özel lisans altındadır. Tüm hakları saklıdır.
# Iwent - Online Bilet Satış Platformu (Demo)

Iwent, organizatörlerin etkinlik oluşturup bilet satışı yapabileceği, kullanıcıların bilet alabileceği ve etkinliklere özel chat kanallarında iletişim kurabileceği modern bir online bilet satış platformudur. Bu demo sürümü, ödeme altyapısı olmadan bilet alma (sepet) mantığını, QR kodlu bilet gönderimini ve organizatör kontrol panelini içerir.

## Teknolojiler

### Backend (Node.js + TypeScript)
- **Framework**: Express.js 5.x
- **Veritabanı**: PostgreSQL + Prisma ORM
- **Kimlik Doğrulama**: JWT (Access + Refresh Token)
- **Gerçek Zamanlı**: Socket.IO
- **Arama Motoru**: MeiliSearch
- **E-posta**: SendGrid
- **SMS/Telefon**: Twilio Verify API
- **Güvenlik**: 
  - Helmet (HTTP header güvenliği)
  - CORS
  - Rate Limiting
  - Zod (Input validation)
- **Dosya Yönetimi**: Multer
- **Raporlama**: ExcelJS

### Frontend (React + TypeScript)
- **Framework**: React 18.x
- **Stil**: Tailwind CSS
- **Routing**: React Router v6
- **Form Yönetimi**: Formik + Yup
- **HTTP İstekleri**: Axios
- **Gerçek Zamanlı**: Socket.IO Client
- **UI Bileşenleri**: 
  - Heroicons
  - React Toastify
- **Tarih İşlemleri**: date-fns
- **QR Kod**: qrcode.react

### DevOps & Araçlar
- **Konteynerizasyon**: Docker + Docker Compose
- **Veritabanı Yönetimi**: pgAdmin
- **API Dokümantasyonu**: Postman Collections
- **Kod Kalitesi**: ESLint + TypeScript
- **Paket Yönetimi**: npm

## Özellikler

### Kullanıcı Özellikleri
- ✅ JWT tabanlı kimlik doğrulama
- ✅ Telefon numarası doğrulama (Twilio)
- ✅ Etkinlik arama ve filtreleme (MeiliSearch)
- ✅ Takvim görünümü ile etkinlik keşfi
- ✅ Bilet satın alma (demo)
- ✅ QR kodlu biletler
- ✅ Etkinlik sohbet odaları
- ✅ Profil yönetimi
- ✅ Arkadaşlık sistemi
- ✅ Özel mesajlaşma
- ✅ Favori etkinlikler

### Organizatör Özellikleri
- ✅ Etkinlik yönetimi (CRUD)
- ✅ 8 farklı etkinlik kategorisi:
  - Konser
  - Festival
  - Üniversite
  - Atölye
  - Konferans
  - Spor
  - Performans
  - Eğitim
- ✅ Kategori bazlı özel alanlar
- ✅ İstatistik paneli
- ✅ Excel raporları
- ✅ QR kod okuyucu entegrasyonu
- ✅ Cihaz yönetimi
- ✅ Chat moderasyonu

## Proje Yapısı

\`\`\`
src/
├── backendN/                # Node.js + TypeScript Backend
│   ├── prisma/             # Veritabanı şeması ve migrations
│   ├── src/
│   │   ├── chat/          # Socket.IO entegrasyonu
│   │   ├── lib/           # Yardımcı kütüphaneler
│   │   │   ├── crypto.ts  # Şifreleme
│   │   │   ├── jwt.ts     # Token yönetimi
│   │   │   ├── meili.ts   # Arama motoru
│   │   │   ├── email.ts   # E-posta gönderimi
│   │   │   ├── twilio.ts  # SMS doğrulama
│   │   │   └── qr.ts      # QR kod üretimi
│   │   ├── middlewares/   # Express middlewares
│   │   └── modules/       # Özellik modülleri
│   │       ├── auth/      # Kimlik doğrulama
│   │       ├── event/     # Etkinlik yönetimi
│   │       ├── tickets/   # Bilet işlemleri
│   │       └── users/     # Kullanıcı yönetimi
│   └── uploads/           # Yüklenen dosyalar
│
└── frontend/              # React + TypeScript Frontend
    ├── public/           # Statik dosyalar
    └── src/
        ├── components/   # Yeniden kullanılabilir bileşenler
        ├── context/     # React context'leri
        ├── pages/       # Sayfa bileşenleri
        ├── styles/      # CSS stilleri
        └── types/       # TypeScript tipleri
\`\`\`

## Veritabanı Şeması

### Ana Tablolar
- **User**: Kullanıcı bilgileri + puan sistemi
- **Organizer**: Organizatör hesapları
- **Event**: Etkinlik ana bilgileri
- **Ticket**: Bilet kayıtları + QR kodlar
- **ChatMessage**: Etkinlik chat mesajları
- **Friendship**: Arkadaşlık sistemi
- **PrivateMessage**: Özel mesajlaşma
- **Block**: Kullanıcı engelleme
- **Favorite**: Favori etkinlikler

### Etkinlik Alt Tabloları
Her etkinlik kategorisi için özel detay tabloları:
- ConcertDetails
- FestivalDetails
- UniversityDetails
- WorkshopDetails
- ConferenceDetails
- SportDetails
- PerformanceDetails
- EducationDetails

## Kurulum

1. **Docker ile Kurulum**:
\`\`\`bash
# PostgreSQL ve pgAdmin başlatma
cd src/backendN
docker-compose up -d

# MeiliSearch başlatma
docker run -d -p 7700:7700 getmeili/meilisearch:latest
\`\`\`

2. **Backend Kurulumu**:
\`\`\`bash
cd src/backendN
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
\`\`\`

3. **Frontend Kurulumu**:
\`\`\`bash
cd src/frontend
npm install
npm start
\`\`\`

## Güvenlik Özellikleri

- ✅ JWT (Access + Refresh token)
- ✅ Telefon doğrulama
- ✅ Rate limiting
- ✅ Input validation (Zod)
- ✅ SQL injection koruması (Prisma)
- ✅ XSS koruması (Helmet)
- ✅ CORS yapılandırması

## Mobil Uyumluluk

- ✅ Responsive tasarım
- ✅ Touch-optimized arayüz
- ✅ PWA desteği
- ✅ Mobil navigasyon

## Yapılacaklar

- [ ] Ödeme altyapısı entegrasyonu
- [ ] WebSocket performans optimizasyonu
- [ ] Test coverage artırımı
- [ ] Çoklu dil desteği
- [ ] Mobil uygulama geliştirme
- [ ] Bildirim sistemi
- [ ] Sosyal medya entegrasyonu

## Lisans

Bu proje demo amaçlıdır ve özel lisans altındadır. Tüm hakları saklıdır.

## Quick Start (Pre-Flight Passed)

Önkoşullar
- Node.js 18+ (öneri 20+), npm
- Lokal Postgres çalışır durumda

Kurulum
- Bağımlılıklar: `npm run install:all`
- Backend env: `src/backendN/.env.example` dosyasını `src/backendN/.env` olarak kopyalayın ve gizli anahtarları doldurun (Google, JWT, DB)
- Frontend env: `src/frontend/.env.example` dosyasını `src/frontend/.env` olarak kopyalayın; `REACT_APP_API_URL` değerini doğrulayın

Çalıştırma
- Geliştirme: kökten `npm run start` (BE: 3000, FE: 5173)
- HTTPS (opsiyonel): `npm run start:https` ve `server.key`/`server.crt`

Build
- `npm run build:all`

Notlar
- Prisma CLI backend devDependencies'e eklendi; şema değişimlerinde `npm run prisma:generate`
- Alt dizinlerdeki `.env` dosyaları Git tarafından yok sayılıyor (gizli anahtar sızıntısını engeller)

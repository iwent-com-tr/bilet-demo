# Iwent API Dokümantasyonu

Bu dokümantasyon, Iwent platformunun API endpoint'lerini ve kullanımlarını detaylı bir şekilde açıklamaktadır.

## Genel Bilgiler

- Tüm istekler JSON formatında olmalıdır.
- Kimlik doğrulaması için JWT kullanılır (başlıkta `Authorization: Bearer <token>`).
- Hata yanıtları standart formatta döner:
```json
{
  "durum": 0,
  "message": "Hata mesajı"
}
```

## Endpoints

### 1. Kullanıcı Kaydı

Kullanıcıların platforma kaydolmasını sağlar.

**Endpoint:** `POST /api/auth/register`

**Parametreler:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|----------|-----------|
| isim | string | Evet | Kullanıcı adı |
| soyisim | string | Evet | Kullanıcı soyadı |
| email | string | Evet | E-posta adresi |
| sifre | string | Evet | Şifre |
| dogum_yili | number | Evet | Doğum yılı |
| telefon | string | Evet | Telefon numarası |
| sehir | string | Evet | Şehir |

**Örnek İstek:**
```json
{
  "isim": "Ali",
  "soyisim": "Yılmaz",
  "email": "ali@example.com",
  "sifre": "gizli123",
  "dogum_yili": 1990,
  "telefon": "+905551234567",
  "sehir": "İstanbul"
}
```

**Başarılı Yanıt:**
```json
{
  "durum": 1,
  "message": "Kayıt başarılı",
  "user_id": "123",
  "token": "jwt_token"
}
```

### 2. Organizatör Kaydı

Organizatörlerin platforma kaydolmasını sağlar.

**Endpoint:** `POST /api/auth/register/organizer`

**Parametreler:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|----------|-----------|
| isim | string | Evet | Yetkili adı |
| soyisim | string | Evet | Yetkili soyadı |
| sirket | string | Evet | Şirket adı |
| telefon | string | Evet | Telefon numarası |
| email | string | Evet | E-posta adresi |
| sifre | string | Evet | Şifre |

**Örnek İstek:**
```json
{
  "isim": "Ayşe",
  "soyisim": "Demir",
  "sirket": "EventCo",
  "telefon": "+905551234567",
  "email": "ayse@eventco.com",
  "sifre": "gizli123"
}
```

**Başarılı Yanıt:**
```json
{
  "durum": 1,
  "message": "Organizatör kaydı başarılı",
  "organizer_id": "456",
  "token": "jwt_token"
}
```

### 3. Etkinlik Oluşturma (Organizatör)

Yeni bir etkinlik oluşturur.

**Endpoint:** `POST /api/event/create` (Koruma: JWT)

**Parametreler:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|----------|-----------|
| ad | string | Evet | Etkinlik adı |
| kategori | string | Evet | Etkinlik kategorisi |
| baslangic_tarih | string | Evet | Başlangıç tarihi (ISO 8601) |
| bitis_tarih | string | Evet | Bitiş tarihi (ISO 8601) |
| yer | string | Evet | Etkinlik yeri |
| adres | string | Evet | Açık adres |
| il | string | Evet | Şehir |
| banner | string | Hayır | Banner URL'si |
| sosyal_medya | object | Hayır | Sosyal medya linkleri (örn. Instagram) |

**Örnek İstek:**
```json
{
  "ad": "Yaz Konseri",
  "kategori": "Müzik",
  "baslangic_tarih": "2025-08-01T20:00:00Z",
  "bitis_tarih": "2025-08-01T23:00:00Z",
  "yer": "Açık Hava Tiyatrosu",
  "adres": "Örnek Mahallesi, Örnek Cd. No:1",
  "il": "İstanbul",
  "banner": "https://example.com/banner.jpg",
  "sosyal_medya": { "instagram": "https://instagram.com/yazkonseri" }
}
```

**Başarılı Yanıt:**
```json
{
  "durum": 1,
  "message": "Etkinlik oluşturuldu",
  "event_id": "789"
}
```

### 4. Bilet Alma (Sepet)

Kullanıcıların bilet almasını sağlar (demo için ödeme olmadan).

**Endpoint:** `POST /api/ticket/purchase` (Koruma: JWT)

**Parametreler:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|----------|-----------|
| event_id | string | Evet | Etkinlik ID |
| bilet_tipi | string | Evet | Bilet tipi (örn. VIP, Genel) |
| adet | number | Evet | Bilet adedi |

**Örnek İstek:**
```json
{
  "event_id": "789",
  "bilet_tipi": "VIP",
  "adet": 2
}
```

**Başarılı Yanıt:**
```json
{
  "durum": 1,
  "message": "Bilet alındı, QR kod e-postanıza gönderildi",
  "ticket_id": "TICKET123",
  "qr_code": "https://example.com/qr/TICKET123"
}
```

### 5. Chat Kanalına Mesaj Gönderme

Etkinlik chat kanalına mesaj gönderir.

**Endpoint:** `POST /api/chat/message` (Koruma: JWT)

**Parametreler:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|----------|-----------|
| event_id | string | Evet | Etkinlik ID |
| mesaj | string | Evet | Mesaj içeriği |

**Örnek İstek:**
```json
{
  "event_id": "789",
  "mesaj": "Merhaba, etkinlik saatinde değişiklik var mı?"
}
```

**Başarılı Yanıt:**
```json
{
  "durum": 1,
  "message": "Mesaj gönderildi"
}
```

### 6. Bilet Okuma (Giriş Kontrolü)

Biletin QR kodunu tarar ve giriş bilgilerini kaydeder.

**Endpoint:** `POST /api/ticket/check-in` (Koruma: JWT, cihaz doğrulaması)

**Parametreler:**

| Parametre | Tip | Zorunlu | Açıklama |
|-----------|-----|----------|-----------|
| ticket_id | string | Evet | Bilet ID |
| device_id | string | Evet | Taranan cihaz ID |
| gise | string | Evet | Gişe bilgisi |

**Örnek İstek:**
```json
{
  "ticket_id": "TICKET123",
  "device_id": "DEVICE456",
  "gise": "Gişe 1"
}
```

**Başarılı Yanıt:**
```json
{
  "durum": 1,
  "message": "Giriş başarılı",
  "check_in_time": "2025-08-01T19:45:00Z"
}
```

### 7. Etkinlik Raporu İndirme (Organizatör)

Excel formatında etkinlik raporu indirir.

**Endpoint:** `GET /api/event/report/:event_id` (Koruma: JWT)

**Başarılı Yanıt:**
- Excel dosyası (katılımcı bilgileri, bilet detayları, check-in, gişe, temsilciler vb.)
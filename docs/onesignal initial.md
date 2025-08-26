# GEMINI.md — OneSignal Web Push (Development)

Amaç: Development ortamında OneSignal v16 ile web push aboneliği, gönderimi ve webhook ölçümü. Prod anahtarlarını kullanma. iOS yalnız PWA.

---

## 0) Varsayımlar
- Domain: `dev.iwent.com.tr` (HTTPS, HSTS).  
- SDK: Web v16.  
- CMP mevcut; marketing rızası olmadan init yok.

---

## 1) OneSignal Konsol Ayarları
**Advanced Push Settings → Webhooks**
- Enable webhooks: **ON**  
- Displayed webhook URL: `https://iwent.com.tr/api/v1/onesignal/display`  
- Clicked webhook URL: `https://iwent.com.tr/api/v1/onesignal/clicked`  
- Dismissed webhook URL: `https://iwent.com.tr/api/v1/onesignal/dismissed`  
- Enable CORS request headers: **ON**

**Service Workers**
- Customize service worker paths and filenames: **ON**  
- Path to service worker files: `/`  
- Main service worker filename: `OneSignalSDKWorker.js`  
- Updater service worker filename: `OneSignalSDKUpdaterWorker.js`  
- Service worker registration scope: `/`

> Not: Her iki SW dosyası **site kökünde** (origin root) barınmalı.

---

## 2) Uygulama Entegrasyon Parçası
Aşağıdaki snippet **sadece development domain’inde** yüklenir (feature flag veya ortam denetimi kullan):

```html
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "6fb68b33-a968-4288-b0dd-5003baec3ce7",
    });
  });
</script>
```

Ek kurallar (dev):
- `requiresUserPrivacyConsent=true` tercih ediyorsan init öncesi consent kontrolü ve `provideUserConsent(true)` uygula.  
- Login’li kullanıcıda: `OneSignal.login(<externalIdHash>)`; tag: `env=dev`, `os`, `browser`, `pwa`.

---

## 3) Backend Görevleri (Dev)
- **OSD-API-001** Webhook doğrulama  
  - `POST /api/v1/onesignal/{display|clicked|dismissed}`  
  - `OneSignal-Signature` HMAC (varsa) doğrula; body’yi logla (PII yok).  
  - 200 hızlı yanıt; kuyruğa yaz (Redis).  
- **OSD-API-002** Test gönderim endpoint’i  
  - `POST /admin/dev/push/test {external_id, title, body, url}`  
  - OneSignal REST çağrısı: `include_aliases.external_id=[…]`  
  - Yanıt/hatayı döndür, audit’e yaz.  
- **OSD-API-003** Health  
  - `/admin/dev/push/health` OneSignal status ping + son 10 webhook olayı.

---

## 4) Frontend Görevleri (Dev)
- **OSD-FE-001** SW dosyalarını köke yerleştir (`/OneSignalSDKWorker.js`, `/OneSignalSDKUpdaterWorker.js`).  
- **OSD-FE-002** Init feature-flag: yalnız `dev.*` hostlarda script yükle.  
- **OSD-FE-003** Rıza akışı: CMP marketing=on ise `provideUserConsent(true)` ve **kullanıcı etkileşimi** sonrası `Slidedown.promptPush()` tetikle.  
- **OSD-FE-004** Login entegrasyonu: `OneSignal.login(externalIdHash)` + cihaz tag’leri.  
- **OSD-FE-005** iOS PWA: A2HS bannerı; PWA içinde push CTA.

---

## 5) Test Planı (Matrix)
Tarayıcı/OS | Abonelik | Bildirim alımı | Webhook
---|---|---|---
Chrome macOS | ✓ | ✓ | display/click/dismiss kayıtlı
Chrome Windows | ✓ | ✓ | ✓
Android Chrome | ✓ | ✓ | ✓
iOS Safari (PWA) | PWA’da ✓ | ✓ | ✓

Senaryolar:
1. İlk ziyaret → CMP deny → init **yapılmamalı**.  
2. CMP grant → prompt → izin ver → test push gelir.  
3. Login sonrası `externalId` ile **aynı kullanıcı** farklı cihazlarda login; her cihaz ayrı abone.  
4. iOS: PWA kur → push izni PWA içinde istenir → test push gelir.  
5. Bildirimi görüntüle/klik/dismiss → 3 webhook olayı DB’de.

Başarı ölçütleri:
- İlk test push’ta teslim ≥ %95, p95 *display* < 2 sn.  
- Webhook event’leri 60 sn içinde DB’de.  
- `env=dev` tag’i tüm abonelerde.

---

## 6) Güvenlik ve Uyum (Dev)
- Prod appId/REST key dev’e koyma.  
- Webhook body’de PII yazma; IP’yi /24’e yuvarla.  
- CORS sadece gerekli origin’lere.  
- Rate limit: `/admin/dev/push/test` kullanıcı başına 10/dk.

---

## 7) Runbook (Dev)
- **Gönderemiyorum**: SW kökte mi? Konsolda `OneSignal.isPushNotificationsEnabled()` durumu.  
- **Webhook gelmiyor**: 4xx/5xx loglarını kontrol et; imza doğrulaması kapalıysa 200 döndür, sonra sertleştir.  
- **iOS alamıyor**: PWA mı? `display-mode: standalone` kontrolü, izinler → Ayarlar > Bildirimler.

---

## 8) Done Checklist (MVP Dev)
- [ ] SW dosyaları kökte ve scope `/`.  
- [ ] Dev domain’de init flag’li.  
- [ ] CMP rıza sonrası prompt.  
- [ ] Login + tag’ler (env/os/browser/pwa).  
- [ ] Webhook endpoint’leri 200 ve olay yazıyor.  
- [ ] Admin’den **en az 3 cihaz**a test push başarılı.


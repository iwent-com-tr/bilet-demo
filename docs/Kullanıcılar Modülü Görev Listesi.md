# Admin Panel v1 – Kullanıcılar Modülü Görev Listesi

## 0. Amaç ve Kapsam
- Amaç: Basit, hızlı, güvenli bir admin panelde **kayıtlı kullanıcıları görüntüleme**. İlk sürüm salt-okunur.
- Kapsam v1: Listeleme, detay görüntüleme, arama, filtre, sıralama, sayfalama, CSV export, temel audit.
- Kapsam dışı v1: Kullanıcı üzerinde mutasyonlar (ban, rol değişimi, reset vb.), notlar, manuel segment atama.

Not: “Önce gör, sonra dokun” prensibi. Görmeden müdahale eden tek şey kedidir.

---

## 1. Varsayılan Veri Şeması (varsayım)
**PostgreSQL** ve **Prisma** kullandığımızı varsay.

### 1.1 user
- id: cuid
- external_id: string unique
- email: string unique nullable
- phone: string unique nullable
- email_verified: boolean
- phone_verified: boolean
- role: enum [admin, support, organizer, user]
- status: enum [active, suspended, deleted]
- marketing_consent: boolean
- locale: string
- country: string
- city: string
- created_at: timestamp
- last_login_at: timestamp null
- last_seen_at: timestamp null

### 1.2 push_subscription
- id: cuid
- user_id: fk → user.id
- channel: enum [web_push]
- onesignal_user_id: string
- onesignal_sub_id: string
- token_hash: string
- browser: enum [chrome, safari, firefox, edge, other]
- os: enum [ios, android, macos, windows, linux, other]
- device_type: enum [desktop, mobile, tablet]
- pwa: boolean
- subscribed: boolean
- created_at, updated_at

### 1.3 user_segment_tag
- id: cuid
- user_id: fk → user.id
- key: string
- value: string
- source: enum [internal, onesignal]

### 1.4 login_event
- id: cuid
- user_id: fk → user.id
- ts: timestamp
- ip: inet
- ua: text
- method: enum [password, oauth, magic_link]

### 1.5 audit_log
- id: cuid
- actor_id: fk → admin user
- entity: string e.g. "user"
- entity_id: string
- action: string e.g. "export_users"
- meta: jsonb
- ts: timestamp

**Index önerileri**
- user(email), user(phone), user(created_at), user(last_login_at), user(role, status)
- push_subscription(user_id, browser, os, device_type, pwa)
- user_segment_tag(user_id, key, value)
- login_event(user_id, ts)

---

## 2. RBAC ve Erişim Matrisi
Roller: admin, support, readonly.

| Özellik | admin | support | readonly |
|---|---|---|---|
| Kullanıcı listesi | ✓ | ✓ | ✓ |
| Kullanıcı detay | ✓ | ✓ | ✓ |
| CSV export | ✓ | ✓ | ✗ |
| Audit log görüntüleme | ✓ | ✓ | ✗ |
| Saved views yönetimi | ✓ | ✓ | ✗ |

Güvenlik notu: Tüm endpoint’ler için session + CSRF; IP allowlist opsiyonel.

---

## 3. API Sözleşmesi
Tüm admin endpoint’leri `/admin/api/v1` altında. Yanıtlar `application/json`.

### 3.1 GET /admin/api/v1/users
Parametreler:
- q: string. email, phone, external_id üzerinde arar.
- role: admin|support|organizer|user
- status: active|suspended|deleted
- verified: email|phone|both|none
- consent: marketing_true|marketing_false
- os: ios|android|macos|windows|linux
- browser: chrome|safari|firefox|edge|other
- pwa: 0|1
- created_from, created_to: ISO date
- last_login_from, last_login_to: ISO date
- sort: `created_at`, `last_login_at`, `email`, `role`; `-` ile desc. Örnek: `sort=-created_at`
- limit: int 10..100; default 25
- cursor: string veya offset: int

Yanıt örneği alanları:
- items[]: { id, external_id, email, email_verified, phone_masked, phone_verified, role, status, marketing_consent, locale, country, city, created_at, last_login_at, last_seen_at, subscriptions_count, devices: {desktop, mobile, tablet}, channels: {web_push_subscribed} }
- page: { next_cursor or offset/total }
- aggregates: { total, active, verified_email, web_push }

PİI notu: phone_masked formatı `+90••• •• ••` tarzı. Tam numara yalnız admin için ayrı endpoint ve “click-to-reveal” olay kayıtlı.

### 3.2 GET /admin/api/v1/users/:id
- user temel alanları
- segments: key:value[]
- subscriptions: liste
- last_logins: son 10 giriş
- audit_excerpt: son 5 audit kaydı

### 3.3 POST /admin/api/v1/users/export
- body: aynı filtre yapısı
- behavior: async job. response: {job_id}
- GET /admin/api/jobs/:job_id → status, download_url hazır olduğunda presigned link
- Audit kaydı: action=export_users, meta=filters

Hata sözlüğü: 400 bad_filter, 413 too_wide_export, 429 rate_limited, 403 forbidden.

---

## 4. UI Gereksinimleri
### 4.1 Liste sayfası
- Tablo sütunları: Email, Phone masked, Role, Status, Verified badges, Locale, City, Created, Last login, Subscriptions count, Devices chips, Consent badge.
- Hızlı filtre çubukları: role, status, consent, verified, device type, pwa, os, browser.
- Serbest arama: q alanı.
- Sıralama: sütun başlıkları üzerinden.
- Sayfalama: cursor-based, 25 satır default.
- Saved views: “Support view”, “Risk view” gibi kaydedilebilir filtre setleri.
- Satır-expand: mini detay preview; cihazlar ve son girişler.
- Boş durum: “Kullanıcı bulunamadı. Filtreyi gevşet.” CTA: filtreleri sıfırla.
- Hata durumları: 403, 429, 5xx için toast + retry.

### 4.2 Detay çekme
- Drawer veya full-page tablı layout: Profile, Devices, Segments, Activity.
- Profile: maskeli PII, click-to-reveal yalnız admin; her reveal audit’e düşer.
- Devices: subscription kartları. OS, browser, pwa, subscribed, created_at, last_seen.
- Segments: key:value listesi, source rozetleri.
- Activity: login_event ve audit_excerpt.

### 4.3 CSV Export
- Export tuşu yalnız admin/support. Büyük dataset’te async job formu. “Email when ready” checkbox.
- Format: UTF-8 CSV; tarih ISO 8601; ayırıcı virgül; ilk satır başlık.

### 4.4 Kullanılabilirlik
- Klavye navigasyonu; sütun görünürlüğü yönetimi; koyu-açık tema; TR-EN i18n.

---

## 5. Güvenlik ve Gizlilik
- PII masking varsayılan. Unmask işlemi role=admin ve tek-tek, süreli görünür, audit’e yazılır.
- Tüm admin çağrılarında CSRF, SameSite=Lax cookies, HTTPS zorunlu.
- Rate limit: 60 req/min/user. Export özel limiti ve kuyruk.
- Audit kapsamı: login, logout, filter değişimi, export başlatma, PII unmask, detay görüntüleme.
- Log: PII yok. Kimlik yerine user_id hash; IP’yi /24’e yuvarla.

---

## 6. Gözlenebilirlik ve Performans
- Metrikler: list fetch latency p95, error rate, export job time, DB query time p95, cache hit ratio.
- Dashboard: Grafana paneli; alarm: p95>800ms 5 dk üst üste.
- N+1 önleme: subscriptions_count ve devices toplamlara için precomputed view veya materialized view; saatlik refresh.
- Index sağlığı: explain analyze ile sorgu planı raporu; büyük filtre birleşimlerinde partial index.

---

## 7. Test Planı
- Unit: filter parser, masking, RBAC guard.
- Integration: GET /users farklı kombinasyonlar; boş sonuç, edge date ranges.
- E2E: Liste yüklenir, filtrelenir, sayfalanır, detay drawer açılır, export job başlar.
- Güvenlik testleri: CSRF, yetkisiz erişim, rate limit, IDOR.
- Veri doğruluğu: subscriptions_count = push_subscription WHERE subscribed=true sayısı.

---

## 8. Definition of Done
- Tüm API’ler OpenAPI ile tanımlı.
- RBAC kuralları testlerle kanıtlı.
- p95 < 800 ms, 25 satır filtreli liste için.
- CSV export 100k satıra kadar 2 dk içinde tamamlanır.
- Audit log’lar Kibana’da aranabilir.
- Accessibility: tab-order, aria-label’lar, kontrast ≥ 4.5:1.

---

## 9. Sprint Görevleri

### Sprint 0 – Altyapı
1. Admin SSO entegrasyonu ve session koruması
2. RBAC middleware ve erişim matrisi
3. Audit log şeması ve interceptor
4. OpenAPI başlangıç şeması ve repo sözleşmesi

### Sprint 1 – Kullanıcı Listesi MVP
1. GET /admin/api/v1 users – filter parser, sıralama, cursor sayfalama
2. Aggregates alanları ve hızlı sayaçlar
3. Index’ler ve explain analyze raporu
4. UI Liste tablosu + hızlı filtreler + boş ve hata durumları

### Sprint 2 – Detay Drawer ve Devices
1. GET /admin/api/v1/users/:id – profile, devices, segments, activity
2. Subscriptions_count doğruluğu ve materialized view
3. PII masking + click-to-reveal + audit event

### Sprint 3 – CSV Export ve Job Sistemi
1. POST /admin/api/v1/users/export – async job
2. Job status endpoint, presigned link, cleanup policy
3. Rate limiting ve eposta bildirimi entegrasyonu

### Sprint 4 – Gözlenebilirlik ve Sertleştirme
1. P95 latency alarmları, dashboard
2. Pen-test checklist: IDOR, CSRF, brute-force, SQLi
3. Load test: 100 eşzamanlı admin kullanıcısı

---

## 10. Kabul Kriterleri (örnek)
- Arama `q` ile email/phone/external_id üzerinde case-insensitive çalışır.
- Filtreler birleştirilebilir. Örn: role=organizer + os=ios + pwa=1.
- 25 satırlık sayfa 800 ms altında yüklenir.
- Detay drawer içinde cihaz listesi OS, browser, pwa rozetleri ile görünür.
- CSV export 100k satıra kadar doğru kolonlarla iner.
- Her PII reveal olayı audit log’da actor, entity_id, reason ile kayıtlıdır.

---

## 11. Riskler ve Önlemler
- Büyük veri setinde ağır sorgular → materialized view, partial index.
- GDPR/KVKK ihlali riski → masking, role bazlı unmask, audit, DPA’lar.
- Export veri sızıntısı → presigned URL kısa TTL, tek indirme, IP kısıtı.

---

## 12. Teslimatlar
- OpenAPI spec v1
- ER diyagramı ve index listesi
- Admin UI wireframe’leri (liste, detay, export)
- Observability dashboard linkleri
- Test raporları ve pen-test checklist çıktısı


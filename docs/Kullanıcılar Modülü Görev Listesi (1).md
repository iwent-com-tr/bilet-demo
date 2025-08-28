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
1. GET /admin/api/v1/users – filter parser, sıralama, cursor sayfalama
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


---

# 13. Backlog – Task Breakdown (Jira tarzı)

> Kural: "Önce gör, sonra dokun". v1 salt-okunur.

## Epic: AP-0 – Admin Panel v1 (Kullanıcılar)

### Sprint 0 – Altyapı
- **AP-001 – Admin SSO ve session koruması**  
  P: High, Est: 3d  
  Bağımlılık: yok  
  Kabul: Admin login olur, session cookie HttpOnly+SameSite=Lax, idle timeout 30 dk.
- **AP-002 – RBAC middleware ve erişim matrisi**  
  P: High, Est: 2d  
  Kabul: admin/support/readonly kuralları testle kanıtlı; 403’ler doğru dönüyor.
- **AP-003 – Audit interceptor**  
  P: High, Est: 2d  
  Kabul: her admin çağrısı audit’e düşer; PII reveal ayrı event.
- **AP-004 – OpenAPI başlangıç şeması**  
  P: High, Est: 1d  
  Kabul: /admin/api/v1/users ve /:id taslakları mevcut, CI’da şema doğrulanır.
- **AP-005 – Rate limit (admin gateway)**  
  P: Med, Est: 1d  
  Kabul: 60 req/min/user; 429 mesajı standart.
- **AP-006 – CSRF koruması**  
  P: Med, Est: 0.5d  
  Kabul: state-changing endpoint’lerde CSRF token kontrolü aktif.
- **AP-007 – Seed & fixtures**  
  P: Low, Est: 0.5d  
  Kabul: 1k dummy kullanıcı, 2-3 subscription/kişi, segmentler yüklü.

### Sprint 1 – Kullanıcı Listesi MVP
- **AP-101 – GET /admin/api/v1/users: filtre & arama & sıralama**  
  P: High, Est: 3d  
  Kapsam: q, role, status, verified, consent, os, browser, device, pwa, created/last_login tarihleri; sort=field| -field.  
  Kabul: Karma filtrelerde doğru sonuç ve explain analyze makul plan.
- **AP-102 – Cursor sayfalama**  
  P: High, Est: 1d  
  Kabul: 25’lik sayfa, next_cursor; offset modu devre dışı.
- **AP-103 – Aggregates**  
  P: Med, Est: 1d  
  Kabul: total, active, verified_email, web_push sayacı tek sorguda döner.
- **AP-104 – UI Liste tablosu**  
  P: High, Est: 3d  
  Kabul: sütunlar, hızlı filtre çubuğu, boş/hata durumları, sıralama; p95<800ms.
- **AP-105 – Saved Views**  
  P: Med, Est: 2d  
  Kabul: filtre seti kaydet/yükle/sil; user-based storage.
- **AP-106 – E2E: Liste**  
  P: Med, Est: 1d  
  Kabul: yüklenir→filtrelenir→sayfalanır→hata/boş durumları geçer.

### Sprint 2 – Detay & Cihazlar
- **AP-201 – GET /admin/api/v1/users/:id**  
  P: High, Est: 2d  
  Kapsam: profile, devices(subscriptions), segments, last_logins(10), audit_excerpt(5).  
  Kabul: IDOR yok; 404/403 doğru.
- **AP-202 – PII masking + click-to-reveal + audit**  
  P: High, Est: 2d  
  Kabul: maskeler default; reveal 60 sn görünür; audit event kaydı zorunlu.
- **AP-203 – UI Detay Drawer/Tabs**  
  P: High, Est: 2d  
  Kabul: Profile/Devices/Segments/Activity sekmeleri; cihaz rozetleri (os, browser, pwa).
- **AP-204 – OneSignal Users API entegrasyonu**  
  P: Med, Est: 2d  
  Kabul: externalId→onesignalUserId/subId eşleşir; token hash güncellenir.
- **AP-205 – subscriptions_count performansı**  
  P: Med, Est: 1d  
  Kabul: materialized view veya precompute; t90 refresh ≤ 5 dk.

### Sprint 3 – CSV Export & Job
- **AP-301 – POST /admin/api/v1/users/export (async)**  
  P: High, Est: 3d  
  Kabul: job_id döner; hazır olunca presigned link; TTL 15 dk; tek indirme.
- **AP-302 – Export rate limit + e-posta bildirimi**  
  P: Med, Est: 2d  
  Kabul: kullanıcı başına 3 job/sa; tamamlanınca mail; ip allowlist opsiyonel.
- **AP-303 – Export güvenlik incelemesi**  
  P: Med, Est: 1d  
  Kabul: PII kolonları maskeli; denetim listesi imzalı.

### Sprint 4 – Gözlenebilirlik & Sertleştirme
- **AP-401 – Metrikler & dashboard**  
  P: Med, Est: 2d  
  Kabul: p95 latency, error rate, query time; alarm: p95>800ms (5 dk).
- **AP-402 – Pen-test checklist**  
  P: Med, Est: 2d  
  Kabul: IDOR, CSRF, brute force, SQLi testleri geçti; bulgular kapandı.
- **AP-403 – Load test raporu**  
  P: Low, Est: 1d  
  Kabul: 100 eşzamanlı admin; 95. persentil ve throughput grafikleri.

### Çapraz Kesit Görevleri
- **AP-901 – OpenAPI → UI tip üretimi**  
  P: Med, Est: 0.5d  
  Kabul: şemadan tipler otomatik; CI’da drift kontrolü.
- **AP-902 – Log/trace scrubber**  
  P: Low, Est: 0.5d  
  Kabul: loglarda PII yok; IP /24’e yuvarlı.

---

# 14. GEMINI.MD (root) – Gemini CLI için talimatlar

Aşağıdaki içeriği depo köküne `GEMINI.md` olarak kaydet.

```md
# GEMINI.md – Admin Panel v1 (Users Module)

## Purpose
Provide project-wide instructions for the Gemini CLI. Scope covers the **read-only Users module** of the Admin Panel (list, detail, export). Non-goal: mutating user data.

## High-level Context
- Backend: Node/Express (assumed), PostgreSQL, Prisma.  
- Admin API base: `/admin/api/v1` returning JSON.  
- Privacy: PII masked by default; reveal requires admin role and is audited.  
- Performance: p95 < 800 ms for 25-row filtered list.

## Ground Rules for Gemini
1. **Do not write or run code unless explicitly requested.** Prefer tasks, specs, and test plans.  
2. Follow the **OpenAPI** spec as the single source of truth; if missing, propose diffs, not code.  
3. Enforce **RBAC**: admin, support, readonly. Never expose unmasked PII to non-admin.  
4. Respect **GDPR/KVKK**: no profiling/segments unless consent=true; mask by default; log audits.  
5. Optimize for **observability**: suggest metrics, alerts, and query plans when performance risks exist.

## Repository Signals (assumptions)
- `openapi/v1/admin.yaml`: Admin endpoints.  
- `packages/admin-ui/`: UI (list, detail, export).  
- `services/admin-api/v1/`: Express controllers, RBAC, audit.  
- `db/prisma/`: schema, views, seeds.  

## Task Intake
Gemini should operate over the backlog below (IDs are authoritative):
- Sprint 0: AP-001..AP-007  
- Sprint 1: AP-101..AP-106  
- Sprint 2: AP-201..AP-205  
- Sprint 3: AP-301..AP-303  
- Sprint 4: AP-401..AP-403  
- Cross-cutting: AP-901..AP-902

For each task, produce:
- **Deliverables** (specs, diagrams, test cases).  
- **Edge cases** and **risk notes**.  
- **Acceptance criteria** aligned with the DoD in the root plan.

## API Contract Expectations
- `GET /admin/api/v1/users` params: `q, role, status, verified, consent, os, browser, device, pwa, created_from, created_to, last_login_from, last_login_to, sort, limit, cursor`.  
- Response: `items[], page{}, aggregates{ total, active, verified_email, web_push }`.  
- `GET /admin/api/v1/users/:id` includes `profile, devices(subscriptions), segments, last_logins(10), audit_excerpt(5)`.  
- `POST /admin/api/v1/users/export` is **async job**; returns `{ job_id }`; later provide `download_url`.

## Security & Privacy Guardrails
- Mask email/phone by default; reveal = admin-only + audited.  
- Rate limit: 60 req/min/user; export stricter.  
- No PII in logs; IP rounded to /24.

## Performance Guardrails
- Avoid N+1 for `subscriptions_count`. Use materialized view or precompute.  
- Cursor-based pagination only; disable offset for large data.

## Testing Expectations
- Unit: filter parser, RBAC, masking.  
- Integration: list queries matrix, error handling.  
- E2E: list→filter→paginate→detail drawer→export flow.  
- Load: 100 concurrent admins; assert p95 targets.

## Output Style
- Be concise. Provide tables and checklists. Avoid boilerplate.  
- If ambiguity exists, suggest **clarifying questions** plus a default assumption.

## Module-level Overrides (for child GEMINI.md files)
Place additional GEMINI.md files in module directories to extend or override:
- Add detailed UI states, column visibility matrix.  
- Add SQL index proposals with `EXPLAIN ANALYZE` samples.  
- Add export CSV column map and masking rules.

## Nice-to-have (optional prompts)
- “Propose Saved Views for support workflows.”  
- “Suggest Grafana queries and alert thresholds for p95 and error rate.”

```


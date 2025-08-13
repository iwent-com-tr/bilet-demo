# Event Platform API — Node.js + TypeScript (Express/Nest) + Prisma

Base URL: `/api/v1`
Auth: Bearer JWT in `Authorization` header. Refresh via HTTP-only cookie or `refreshToken` in body. Content-Type: `application/json` unless stated.

## Stack & Conventions
- Runtime: Node.js 18+
- Language: TypeScript strict
- Framework: Express or Nest (controllers map 1:1 to routes below)
- ORM: Prisma (PostgreSQL)
- Validation: Zod or class-validator
- Auth: JWT (15m access, 30d refresh, rotation + reuse-detection)
- IDs: `uuid` strings
- Timestamps: ISO 8601, UTC
- Soft delete: `deletedAt` nullable timestamp; exclude by default
- Pagination: `page` (1-based), `limit` (default 20, max 100)
- Sorting: `sort` comma fields; `-` prefix for desc (e.g., `?sort=-createdAt,title`)
- Filtering: `filter[field]`, or `filter[field][op]=value` where `op ∈ {eq,ne,gt,gte,lt,lte,in,like}`
- Idempotency: `Idempotency-Key` header for POST/PATCH

---

## 0) Service & Ops
| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Liveness | Public |
| GET | `/ready` | Readiness (DB/cache) | Public |
| GET | `/version` | Build info | Public |
| GET | `/metrics` | Prometheus | Internal |

---

## 1) Authentication
| Method | Path | Purpose | Body |
|---|---|---|---|
| POST | `/auth/register` | Create user | `{ email, password, firstName?, lastName? }`
| POST | `/auth/login` | Password login | `{ email, password }`
| POST | `/auth/refresh` | Rotate refresh | `{ refreshToken? }`
| POST | `/auth/logout` | Invalidate refresh | `—`
| GET | `/auth/me` | Current user | `—`
| POST | `/auth/forgot-password` | Start reset | `{ email }`
| POST | `/auth/reset-password` | Complete reset | `{ token, newPassword }`
| POST | `/auth/verify-email` | Verify email | `{ token }`

Token response
```json
{"accessToken":"<jwt>","expiresIn":900,"tokenType":"Bearer","refreshToken":"<jwt>"}
```

---

## 2) Users
Represents end users who buy tickets, befriend, DM, etc.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/users` | List users | Admin; supports `q`, filters, pagination |
| POST | `/users` | Admin create | Admin only |
| GET | `/users/:id` | Get by id | Admin or Self |
| PATCH | `/users/:id` | Update | Admin or Self; restricted fields |
| DELETE | `/users/:id` | Soft delete | Admin |
| GET | `/users/me` | Shortcut | Same as `/auth/me` |
| PATCH | `/users/me` | Update profile | Name, avatar, locale, marketing prefs |

User DTO (read)
```json
{
  "id":"usr_...","email":"a@b.com","firstName":"Ali","lastName":"Vezir",
  "avatarUrl":null,"bio":null,"points":0,
  "createdAt":"2025-08-12T10:00:00Z","updatedAt":"2025-08-12T10:00:00Z"
}
```

---

## 3) Organizers
Event creators/managers.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/organizers` | List organizers | Admin/Manager; search by `company,email` |
| POST | `/organizers` | Create organizer | Admin; approval flow |
| GET | `/organizers/:id` | Get | — |
| PATCH | `/organizers/:id` | Update | Approvals, KYC fields |
| DELETE | `/organizers/:id` | Soft delete | — |
| POST | `/organizers/:id/approve` | Approve | Admin toggle `{ approved: true }` |

Organizer DTO (create)
```json
{"firstName":"Ali","lastName":"Yılmaz","company":"Wezirim Events","phone":"+90...","email":"org@ex.com","password":"...","taxNumber":"..."}
```

---

## 4) Events (polymorphic details)
`Event` holds common fields; detail tables store category-specific payload: `CONCERT, FESTIVAL, UNIVERSITY, WORKSHOP, CONFERENCE, SPORT, PERFORMANCE, EDUCATION`.

### 4.1 Event CRUD
| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/events` | List events | Filters: `category[], city, dateFrom, dateTo, priceMin, priceMax, organizerId` |
| POST | `/events` | Create | Organizer/Admin |
| GET | `/events/:id` | Get | Includes detail object based on `category` |
| PATCH | `/events/:id` | Update | Owner organizer or Admin |
| DELETE | `/events/:id` | Soft delete | Cascade-safe |
| POST | `/events/:id/publish` | Publish | State machine: `DRAFT -> PUBLISHED` |
| POST | `/events/:id/unpublish` | Unpublish | `PUBLISHED -> DRAFT` |

Event DTO (create)
```json
{
  "title":"Rock Night","description":"...","category":"CONCERT",
  "startAt":"2025-09-01T19:00:00Z","endAt":"2025-09-01T22:00:00Z",
  "venue":"IF Performance Hall","city":"Ankara","address":"...",
  "coverImage":"https://...","minAge":18,
  "organizerId":"org_...",
  "pricingTiers":[{"name":"Early Bird","price":350,"currency":"TRY","quota":200}]
}
```

### 4.2 Event Details endpoints
Each category has 1:1 detail. Only create/update the matching detail for the event’s `category`. All support GET/PUT.

| Category | Path |
|---|---|
| CONCERT | `/events/:id/details/concert` |
| FESTIVAL | `/events/:id/details/festival` |
| UNIVERSITY | `/events/:id/details/university` |
| WORKSHOP | `/events/:id/details/workshop` |
| CONFERENCE | `/events/:id/details/conference` |
| SPORT | `/events/:id/details/sport` |
| PERFORMANCE | `/events/:id/details/performance` |
| EDUCATION | `/events/:id/details/education` |

Example: set concert details
`PUT /events/evt_123/details/concert`
```json
{"artistList":[{"name":"Artist A"}],"setlist":["Intro","Hit"],"genre":"Rock"}
```

Response for `GET /events/:id` includes
```json
{"id":"evt_123","category":"CONCERT","details":{"genre":"Rock","artistList":[...]}}
```

---

## 5) Tickets
Tickets belong to users and events; support QR/code and status.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/tickets` | List tickets | Admin; filters: `userId,eventId,status` |
| POST | `/tickets` | Create ticket | On purchase flow (see Orders) |
| GET | `/tickets/:id` | Get | Owner or Admin |
| PATCH | `/tickets/:id` | Update status | `ACTIVE, USED, REFUNDED, CANCELLED` |
| POST | `/tickets/:id/verify` | Verify/scan | Staff/Organizer; body `{ code }` |

Ticket DTO (read)
```json
{"id":"tkt_...","userId":"usr_...","eventId":"evt_...","status":"ACTIVE","qrCode":"data:..."}
```

---

## 6) Social — Friendships
Friend request and acceptance between users.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/friendships` | List | Self scope; `status=PENDING/ACCEPTED/BLOCKED` |
| POST | `/friendships` | Send request | `{ toUserId }` |
| POST | `/friendships/:id/accept` | Accept | Only recipient |
| POST | `/friendships/:id/reject` | Reject | Only recipient |
| DELETE | `/friendships/:id` | Cancel/remove | Requester or either if accepted |

---

## 7) Social — Private Messages
Direct messages between users.

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/messages` | List threads/messages | Filters: `withUserId`, `sinceId` |
| POST | `/messages` | Send DM | `{ toUserId, content }` |
| GET | `/messages/:id` | Get message | Actor must be sender/recipient |
| DELETE | `/messages/:id` | Delete (soft) | Sender only (visibility) |

Message DTO
```json
{"id":"msg_...","fromId":"usr_a","toId":"usr_b","content":"hi","createdAt":"..."}
```

---

## 8) Safety — Blocks
Block relationship to prevent interactions.

| Method | Path | Purpose |
|---|---|---|
| GET | `/blocks` | List my blocks |
| POST | `/blocks` | Block someone `{ blockedId }` |
| DELETE | `/blocks/:id` | Unblock |

Enforcement: block hides profiles, prevents DMs, friendship requests, and visibility in lists.

---

## 9) Search & Discovery
| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/search` | Global search | `q` across events, organizers; returns mixed `type` union |
| GET | `/events/trending` | Trending events | 7-day velocity; cached |
| GET | `/events/recommendations` | For current user | Collaborative + content-based; requires auth |

---

## 10) Files
| Method | Path |
|---|---|
| POST | `/files` (multipart `file`) |
| GET | `/files/:id` |
| DELETE | `/files/:id` |

---

## 11) Admin & Audit
| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/stats` | KPIs (new users, sales, DAU) |
| GET | `/admin/audit` | Audit trail with filters |

---

## 12) Common Schemas
### Error
```json
{"error":{"code":"VALIDATION_ERROR","message":"title is required","details":[{"path":"title","msg":"Required"}]}}
```

### Pagination wrapper
```json
{"data":[...],"page":1,"limit":20,"total":123}
```

---

## 13) Security
- HTTPS + HSTS
- JWT guard on protected routes; RBAC roles: `user, organizer, admin`
- Input validation + output serialization
- Rate limit: `60 req/min` public; stricter on `/auth/*`
- CORS: allowlisted origins; credentials optional

---

## 14) Minimal Folder Structure
```
src/
  modules/
    auth/
    users/
    organizers/
    events/
      details/
    tickets/
    friendships/
    messages/
    blocks/
    files/
  middlewares/
  config/
  index.ts
```

---

## 15) Migration Notes
- Ensure Prisma models for detail tables: `ConcertDetails, FestivalDetails, UniversityDetails, WorkshopDetails, ConferenceDetails, SportDetails, PerformanceDetails, EducationDetails` with `eventId` unique FK and cascade delete.
- Add composite unique as needed for friendships (e.g., `(fromId,toId)` unique with symmetrical normalization).
- Messages indexed on `(fromId,toId,createdAt)`.
- Tickets indexed on `(eventId,status)`.

# Event Platform API — Node.js + TypeScript (Express/Nest) + Prisma

Base URL: `/api/v1`
Auth: Bearer JWT in `Authorization` header. Refresh via HTTP-only cookie or `refreshToken` in body. Content-Type: `application/json` unless stated.

## Stack & Conventions
- Runtime: Node.js 18+
- Language: TypeScript strict
- Framework: Express or Nest (controllers map 1:1 to routes below)
- ORM: Prisma (PostgreSQL)
- Validation: Zod or class-validator
- Auth: JWT (15m access, 30d refresh, rotation + reuse-detection)
- IDs: `uuid` strings
- Timestamps: ISO 8601, UTC
- Soft delete: `deletedAt` nullable timestamp; exclude by default
- Pagination: `page` (1-based), `limit` (default 20, max 100)
- Sorting: `sort` comma fields; `-` prefix for desc (e.g., `?sort=-createdAt,title`)
- Filtering: `filter[field]`, or `filter[field][op]=value` where `op ∈ {eq,ne,gt,gte,lt,lte,in,like}`
- Idempotency: `Idempotency-Key` header for POST/PATCH

---

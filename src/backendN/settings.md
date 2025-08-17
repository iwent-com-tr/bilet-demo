# Settings Module – Backend Technical Spec (services/controllers/routes)

This document defines the **Settings** module for the current Node/TypeScript + Prisma stack (`src/modules/*`). It covers services, controllers, and routes to manage user general settings, privacy, notification preferences, and social media connections.

---

## 0. Scope & Dependencies

* DB schema (already migrated): `SettingSection`, `SettingItem`, `UserSetting`, `UserNotificationPreference`, `UserSocialAccount`.
* Shared utils: `src/lib/prisma.ts`, `src/middlewares/authGuard.ts`, `src/middlewares/rbac.ts`.
* Validation: `zod` (or project’s validator). Examples below use zod.
* RBAC: roles `USER`, `ADMIN`. Organizers are not authorized to update other users’ settings.

---

## 1. Module Layout

```
src/modules/settings/
  ├── settings.controller.ts
  ├── settings.dto.ts
  ├── settings.routes.ts
  ├── settings.service.ts
  └── settings.types.ts
```

> Notification preferences and social accounts live in the same module for now. Can be split later if needed.

---

## 2. Route Design

**Base path:** `/settings`

### 2.1 Definition Endpoints (for UI)

* `GET   /settings/definitions` – All sections + items with localized titles
* `GET   /settings/definitions/sections/:sectionKey` – Single section with items

### 2.2 User Settings (general + privacy + messaging)

* `GET   /settings/me` – Authenticated user’s resolved settings (defaults merged with overrides)
* `PATCH /settings/me` – Bulk update (array) via idempotent upserts
* `GET   /settings/users/:userId/settings` – ADMIN view of a user’s resolved settings
* `PATCH /settings/users/:userId/settings` – ADMIN bulk update for a user

### 2.3 Notification Preferences

* `GET   /settings/me/notifications` – All categories for current user
* `PUT   /settings/me/notifications/:category` – Upsert a single category (enabled + channels)
* `GET   /settings/users/:userId/notifications` – ADMIN
* `PUT   /settings/users/:userId/notifications/:category` – ADMIN

### 2.4 Social Media Integrations

* `GET    /settings/me/social` – List connected accounts
* `POST   /settings/me/social/:provider/connect` – Connect/refresh (handle/tokens)
* `DELETE /settings/me/social/:provider/disconnect` – Disconnect

> Security: `/me/*` requires `authGuard`. `/settings/users/:userId/*` requires `ADMIN` via `rbac`.

---

## 3. DTOs & Types (`settings.dto.ts`)

```ts
import { z } from 'zod';

export const SettingValueSchema = z.union([
  z.boolean(),
  z.string(),
  z.array(z.string()),
  z.null(),
]);

export const PatchMeSettingsSchema = z.object({
  updates: z.array(z.object({
    itemId: z.string().uuid().optional(), // option 1: direct itemId
    itemKey: z.string().optional(),       // option 2: by itemKey
    value: SettingValueSchema,
  })).min(1),
});
export type PatchMeSettingsDTO = z.infer<typeof PatchMeSettingsSchema>;

export const PutNotificationPrefSchema = z.object({
  enabled: z.boolean().optional(),
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
});
export type PutNotificationPrefDTO = z.infer<typeof PutNotificationPrefSchema>;

export const SocialConnectSchema = z.object({
  handle: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(), // ISO string
  scopes: z.string().optional(),
});
export type SocialConnectDTO = z.infer<typeof SocialConnectSchema>;

export const SectionParamSchema = z.object({ sectionKey: z.string() });
export const CategoryParamSchema = z.object({ category: z.string() });
export const ProviderParamSchema = z.object({ provider: z.enum(["instagram","spotify","youtube"]) });
```

`settings.types.ts` (optional response types):

```ts
export type ResolvedSetting = {
  sectionKey: string;
  itemId: string;
  itemKey: string;
  titleTR: string;
  titleEN: string;
  inputType: string;  // TOGGLE | SELECT | MULTISELECT
  options: unknown;   // JSON
  value: unknown;     // User override or default
};
```

---

## 4. Service Layer (`settings.service.ts`)

Error messages are explicit and stable. Throw **typed errors** (below) so the error middleware can map them to correct HTTP codes.

```ts
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';

export class NotFoundError extends Error { code = 'NOT_FOUND'; constructor(message: string){ super(message); } }
export class ValidationError extends Error { code = 'VALIDATION_ERROR'; constructor(message: string){ super(message); } }
export class ConflictError extends Error { code = 'CONFLICT'; constructor(message: string){ super(message); } }

export class SettingsService {
  // 4.1 Definitions
  async getDefinitions() {
    const sections = await prisma.settingSection.findMany({
      orderBy: { order: 'asc' },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    return sections;
  }

  async getSectionByKey(sectionKey: string) {
    const section = await prisma.settingSection.findFirst({
      where: { key: sectionKey },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!section) throw new NotFoundError(`Section not found: ${sectionKey}`);
    return section;
  }

  // 4.2 Resolved user settings (defaults + overrides)
  async getResolvedForUser(userId: string) {
    const [items, overrides] = await Promise.all([
      prisma.settingItem.findMany({ include: { section: true } }),
      prisma.userSetting.findMany({ where: { userId } }),
    ]);
    const oMap = new Map(overrides.map(o => [o.itemId, o.value as unknown]));
    return items.map(i => ({
      sectionKey: i.section.key,
      itemId: i.id,
      itemKey: i.key,
      titleTR: i.titleTR,
      titleEN: i.titleEN,
      inputType: i.inputType,
      options: i.options,
      value: oMap.has(i.id) ? oMap.get(i.id) : i.defaultValue,
    }));
  }

  // 4.3 Bulk upsert for current user
  async patchMeSettings(userId: string, updates: { itemId?: string; itemKey?: string; value: unknown; }[]) {
    const keys = updates.filter(u => !u.itemId && u.itemKey).map(u => u.itemKey!);
    const keyMap = new Map<string,string>();
    if (keys.length) {
      const found = await prisma.settingItem.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } });
      found.forEach(f => keyMap.set(f.key, f.id));
    }

    const tx = updates.map(u => {
      const itemId = u.itemId ?? keyMap.get(u.itemKey!);
      if (!itemId) throw new NotFoundError(`Setting item not found for key: ${u.itemKey}`);
      return prisma.userSetting.upsert({
        where: { userId_itemId: { userId, itemId } },
        update: { value: u.value as Prisma.JsonValue },
        create: { userId, itemId, value: u.value as Prisma.JsonValue },
      });
    });
    await prisma.$transaction(tx);
  }

  // 4.4 Notification preferences
  async getNotificationPrefs(userId: string) {
    return prisma.userNotificationPreference.findMany({ where: { userId } });
  }

  async putNotificationPref(userId: string, category: string, dto: { enabled?: boolean; inApp?: boolean; email?: boolean; sms?: boolean; }) {
    // Optional: validate category exists in enum – rely on Prisma enum cast to throw otherwise.
    return prisma.userNotificationPreference.upsert({
      where: { userId_category: { userId, category: category as any } },
      update: { ...dto },
      create: {
        userId,
        category: category as any,
        enabled: dto.enabled ?? true,
        inApp: dto.inApp ?? true,
        email: dto.email ?? false,
        sms: dto.sms ?? false,
      },
    });
  }

  // 4.5 Social accounts
  async listSocialAccounts(userId: string) {
    return prisma.userSocialAccount.findMany({ where: { userId } });
  }

  async connectSocial(userId: string, provider: string, payload: { handle?: string; accessToken?: string; refreshToken?: string; expiresAt?: string; scopes?: string; }) {
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
    return prisma.userSocialAccount.upsert({
      where: { userId_provider: { userId, provider } },
      update: { connected: true, handle: payload.handle, accessToken: payload.accessToken, refreshToken: payload.refreshToken, expiresAt: expiresAt ?? undefined, scopes: payload.scopes },
      create: { userId, provider, connected: true, handle: payload.handle, accessToken: payload.accessToken, refreshToken: payload.refreshToken, expiresAt: expiresAt ?? undefined, scopes: payload.scopes },
    });
  }

  async disconnectSocial(userId: string, provider: string) {
    return prisma.userSocialAccount.update({
      where: { userId_provider: { userId, provider } },
      data: { connected: false, accessToken: null, refreshToken: null, expiresAt: null },
    });
  }
}

export default new SettingsService();
```

---

## 5. Controller Layer (`settings.controller.ts`)

Use the global error middleware to translate thrown errors into HTTP codes. If you don’t have one, add minimal try/catch in each handler and map errors using `error.code`.

```ts
import { Request, Response, NextFunction } from 'express';
import SettingsService, { NotFoundError, ValidationError, ConflictError } from './settings.service';
import { PatchMeSettingsSchema, PutNotificationPrefSchema, SectionParamSchema, CategoryParamSchema, SocialConnectSchema, ProviderParamSchema } from './settings.dto';

export class SettingsController {
  // 5.1 Definitions
  async getDefinitions(req: Request, res: Response) {
    const data = await SettingsService.getDefinitions();
    res.json({ ok: true, data });
  }

  async getSection(req: Request, res: Response) {
    const { sectionKey } = SectionParamSchema.parse(req.params);
    const data = await SettingsService.getSectionByKey(sectionKey);
    res.json({ ok: true, data });
  }

  // 5.2 Me settings
  async getMe(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const data = await SettingsService.getResolvedForUser(userId);
    res.json({ ok: true, data });
  }

  async patchMe(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const body = PatchMeSettingsSchema.parse(req.body);
    await SettingsService.patchMeSettings(userId, body.updates);
    res.json({ ok: true, message: 'Settings updated.' });
  }

  // 5.3 Admin user settings
  async getUserSettings(req: Request, res: Response) {
    const { userId } = req.params;
    const data = await SettingsService.getResolvedForUser(userId);
    res.json({ ok: true, data });
  }

  async patchUserSettings(req: Request, res: Response) {
    const { userId } = req.params;
    const body = PatchMeSettingsSchema.parse(req.body);
    await SettingsService.patchMeSettings(userId, body.updates);
    res.json({ ok: true, message: 'User settings updated.' });
  }

  // 5.4 Notifications
  async getMyNotificationPrefs(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const data = await SettingsService.getNotificationPrefs(userId);
    res.json({ ok: true, data });
  }

  async putMyNotificationPref(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { category } = CategoryParamSchema.parse(req.params);
    const body = PutNotificationPrefSchema.parse(req.body);
    const data = await SettingsService.putNotificationPref(userId, category, body);
    res.json({ ok: true, message: 'Notification preference saved.', data });
  }

  async getUserNotificationPrefs(req: Request, res: Response) {
    const { userId } = req.params;
    const data = await SettingsService.getNotificationPrefs(userId);
    res.json({ ok: true, data });
  }

  async putUserNotificationPref(req: Request, res: Response) {
    const { userId } = req.params;
    const { category } = CategoryParamSchema.parse(req.params);
    const body = PutNotificationPrefSchema.parse(req.body);
    const data = await SettingsService.putNotificationPref(userId, category, body);
    res.json({ ok: true, message: 'Notification preference saved for user.', data });
  }

  // 5.5 Social accounts
  async listMySocial(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const data = await SettingsService.listSocialAccounts(userId);
    res.json({ ok: true, data });
  }

  async connectMySocial(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { provider } = ProviderParamSchema.parse(req.params);
    const body = SocialConnectSchema.parse(req.body);
    const data = await SettingsService.connectSocial(userId, provider, body);
    res.json({ ok: true, message: `${provider} connected.`, data });
  }

  async disconnectMySocial(req: Request, res: Response) {
    const userId = (req as any).user.id;
    const { provider } = ProviderParamSchema.parse(req.params);
    const data = await SettingsService.disconnectSocial(userId, provider);
    res.json({ ok: true, message: `${provider} disconnected.` });
  }
}

export default new SettingsController();
```

---

## 6. Routes (`settings.routes.ts`)

```ts
import { Router } from 'express';
import controller from './settings.controller';
import authGuard from '../../middlewares/authGuard';
import { requireRoles } from '../../middlewares/rbac';

const router = Router();

// Definitions (public – add auth if desired)
router.get('/definitions', controller.getDefinitions.bind(controller));
router.get('/definitions/sections/:sectionKey', controller.getSection.bind(controller));

// Me – requires auth
router.get('/me', authGuard, controller.getMe.bind(controller));
router.patch('/me', authGuard, controller.patchMe.bind(controller));

router.get('/me/notifications', authGuard, controller.getMyNotificationPrefs.bind(controller));
router.put('/me/notifications/:category', authGuard, controller.putMyNotificationPref.bind(controller));

router.get('/me/social', authGuard, controller.listMySocial.bind(controller));
router.post('/me/social/:provider/connect', authGuard, controller.connectMySocial.bind(controller));
router.delete('/me/social/:provider/disconnect', authGuard, controller.disconnectMySocial.bind(controller));

// Admin – per-user operations
router.get('/users/:userId/settings', authGuard, requireRoles(['ADMIN']), controller.getUserSettings.bind(controller));
router.patch('/users/:userId/settings', authGuard, requireRoles(['ADMIN']), controller.patchUserSettings.bind(controller));
router.get('/users/:userId/notifications', authGuard, requireRoles(['ADMIN']), controller.getUserNotificationPrefs.bind(controller));
router.put('/users/:userId/notifications/:category', authGuard, requireRoles(['ADMIN']), controller.putUserNotificationPref.bind(controller));

export default router;
```

Mount in `src/index.ts`:

```ts
import settingsRoutes from './modules/settings/settings.routes';
app.use('/settings', settingsRoutes);
```

---

## 7. Error Handling Strategy

Use a **single global error middleware**. Map known error types to HTTP status and stable JSON shapes.

**Recommended JSON error shape**

```json
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "Section not found: privacy" } }
```

**Suggested mapping**

* `ValidationError` → 400 `VALIDATION_ERROR` – invalid body/params.
* `NotFoundError` → 404 `NOT_FOUND` – missing section/item/user-setting.
* `ConflictError` → 409 `CONFLICT` – provider mismatch, duplicate linkage, etc.
* Prisma `P2002` (unique constraint) → 409 `CONFLICT` with field name.
* Generic/unhandled → 500 `INTERNAL_ERROR` – log `err.stack` server-side.

**Meaningful messages examples**

* Section not found → `Section not found: <sectionKey>`
* Setting item not found → `Setting item not found for key: <itemKey>`
* Invalid notification category → `Invalid notification category: <category>`
* Provider not supported → `Unsupported provider: <provider>`

Add a tiny helper if needed:

```ts
// src/modules/constants.ts or a shared util
export const errorResponse = (res: any, code: string, message: string, status = 400) =>
  res.status(status).json({ ok: false, error: { code, message } });
```

---

## 8. Security Notes

* `/me/*` only for the authenticated principal. Do **not** accept `userId` in body for these endpoints.
* `/users/:userId/*` guarded by `ADMIN`. If `userId` does not exist, return 404.
* Encrypt `UserSocialAccount.accessToken`/`refreshToken` at rest (e.g., AES-GCM via `src/lib/crypto.ts`). Decrypt on read.
* Rate-limit social connect endpoints. Audit log connect/disconnect events.

---

## 9. Performance & Indexes

* `@@unique([userId,itemId])` – fast upserts for `UserSetting`.
* `@@unique([userId,category])` – fast upserts for `UserNotificationPreference`.
* `@@unique([userId,provider])` – fast upserts for `UserSocialAccount`.
* `getResolvedForUser`: 2 queries + in-memory merge. If items grow large, consider a SQL view with `LEFT JOIN`.

---

## 10. Test Scenarios (Postman/Insomnia)

1. `GET /settings/definitions` → 200 and non-empty sections/items.
2. `GET /settings/me` (Bearer) → merged defaults + overrides.
3. `PATCH /settings/me` body:

```json
{ "updates": [ { "itemKey": "language", "value": "EN" }, { "itemKey": "search_visibility", "value": false } ] }
```

4. `PUT /settings/me/notifications/TICKET_PURCHASED` body:

```json
{ "enabled": true, "inApp": true, "email": true, "sms": false }
```

5. `POST /settings/me/social/instagram/connect` body:

```json
{ "handle": "@ali", "accessToken": "***", "refreshToken": "***" }
```

6. `DELETE /settings/me/social/instagram/disconnect` → 200.
7. Admin endpoints under `/settings/users/:userId/*` → ensure role enforcement.

---

## 11. Future Enhancements

* Move localized titles/descriptions to JSONB for unlimited locales.
* Add `UserSettingAudit` for change history.
* Feature flags for progressive rollout of new items.
* Webhooks: on email/SMS channel enable, trigger verification flows.

---

## 12. Quick Start

1. Mount routes: `app.use('/settings', settingsRoutes)`.
2. Verify migrations and seed are applied.
3. Import a Postman collection and run the scenarios above.

import { Prisma, UserSetting, SettingItem } from '@prisma/client';
import { prisma } from '../../lib/prisma';

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
    const oMap = new Map(overrides.map((o: UserSetting) => [o.itemId, o.value as unknown]));
    return items.map((i: SettingItem & { section: { key: string }}) => ({
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
      found.forEach((f: {id: string, key: string}) => keyMap.set(f.key, f.id));
    }

    const tx = updates.map(u => {
      const itemId = u.itemId ?? keyMap.get(u.itemKey!);
      if (!itemId) throw new NotFoundError(`Setting item not found for key: ${u.itemKey}`);
      return prisma.userSetting.upsert({
        where: { userId_itemId: { userId, itemId } },
        update: { value: u.value as any },
        create: { userId, itemId, value: u.value as any },
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
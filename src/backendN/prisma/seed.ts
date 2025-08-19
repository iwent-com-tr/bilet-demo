// prisma/seed-settings.ts (özet)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Sections
  const general = await prisma.settingSection.upsert({
    where: { key: 'general' },
    update: {},
    create: {
      key: 'general',
      titleTR: 'Genel',
      titleEN: 'General',
      descriptionTR: 'Dil ve temel tercihler',
      descriptionEN: 'Language and basic preferences',
      order: 1,
    },
  });

  const privacy = await prisma.settingSection.upsert({
    where: { key: 'privacy' },
    update: {},
    create: {
      key: 'privacy',
      titleTR: 'Gizlilik',
      titleEN: 'Privacy',
      descriptionTR: 'Arama ve görünürlük',
      descriptionEN: 'Search and visibility',
      order: 2,
    },
  });

  const notifications = await prisma.settingSection.upsert({
    where: { key: 'notifications' },
    update: {},
    create: {
      key: 'notifications',
      titleTR: 'Bildirimler',
      titleEN: 'Notifications',
      descriptionTR: 'Etkinlik, bilet ve genel bildirimler',
      descriptionEN: 'Event, ticket and general notifications',
      order: 3,
    },
  });

  const messaging = await prisma.settingSection.upsert({
    where: { key: 'messaging' },
    update: {},
    create: {
      key: 'messaging',
      titleTR: 'Mesajlaşma',
      titleEN: 'Messaging',
      descriptionTR: 'Profil görünümü ve gizlilik',
      descriptionEN: 'Profile appearance and privacy',
      order: 4,
    },
  });

  const social = await prisma.settingSection.upsert({
    where: { key: 'social' },
    update: {},
    create: {
      key: 'social',
      titleTR: 'Sosyal Medya Entegrasyonları',
      titleEN: 'Social Media Integrations',
      descriptionTR: 'Instagram, Spotify, YouTube',
      descriptionEN: 'Instagram, Spotify, YouTube',
      order: 5,
    },
  });

  // Items
  await prisma.settingItem.upsert({
    where: { key: 'language' },
    update: {},
    create: {
      sectionId: general.id,
      key: 'language',
      titleTR: 'Dil Seçimi',
      titleEN: 'Language',
      inputType: 'SELECT',
      options: ['TR','EN'],
      defaultValue: 'TR',
      order: 1,
    } as any,
  });

  // Gizlilik
  await prisma.settingItem.upsert({
    where: { key: 'search_visibility' },
    update: {},
    create: {
      sectionId: privacy.id,
      key: 'search_visibility',
      titleTR: 'Arama Sonuçlarında Görünürlük',
      titleEN: 'Search Visibility',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 1,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'event_participation_visibility' },
    update: {},
    create: {
      sectionId: privacy.id,
      key: 'event_participation_visibility',
      titleTR: 'Katılımcı Listesinde Görünme',
      titleEN: 'Show in Participant List',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 2,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'messaging_allowed' },
    update: {},
    create: {
      sectionId: privacy.id,
      key: 'messaging_allowed',
      titleTR: 'Mesaj Almayı Aç',
      titleEN: 'Allow Messaging',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 3,
    } as any,
  });

  // Mesajlaşma – profil görünümü (örnek: "Herkese", "Sadece arkadaşlar", "Kimse")
  await prisma.settingItem.upsert({
    where: { key: 'profile_visibility' },
    update: {},
    create: {
      sectionId: messaging.id,
      key: 'profile_visibility',
      titleTR: 'Profil Görünürlüğü',
      titleEN: 'Profile Visibility',
      inputType: 'SELECT',
      options: ['EVERYONE','FRIENDS','NO_ONE'],
      defaultValue: 'EVERYONE',
      order: 1,
    } as any,
  });

  // Bildirim kategori örnekleri için SettingItem eklemek yerine,
  // UserNotificationPreference ile çalışacağız. Yine de UI için “kanal tercihleri” item’ı:
  await prisma.settingItem.upsert({
    where: { key: 'notification_channel_defaults' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'notification_channel_defaults',
      titleTR: 'Varsayılan Bildirim Kanalları',
      titleEN: 'Default Notification Channels',
      inputType: 'MULTISELECT',
      options: ['IN_APP','EMAIL','SMS'],
      defaultValue: ['IN_APP'],
      order: 1,
    } as any,
  });

  // Sosyal
  for (const p of ['instagram','spotify','youtube']) {
    await prisma.settingItem.upsert({
      where: { key: `social_${p}` },
      update: {},
      create: {
        sectionId: social.id,
        key: `social_${p}`,
        titleTR: `${p[0].toUpperCase()+p.slice(1)} Bağlantısı`,
        titleEN: `${p[0].toUpperCase()+p.slice(1)} Link`,
        inputType: 'TOGGLE',
        options: [],
        defaultValue: false,
        order: 1,
      } as any,
    });
  }

  // Bildirim kategorileri için tüm kullanıcılar adına varsayılan tercih:
  // (migration sonrası ilk girişte set edebilirsin)
  // örnek: hiçbir şey seed etmiyoruz; uygulama ilk login’de UserNotificationPreference upsert edecek.
}

main().finally(() => prisma.$disconnect());

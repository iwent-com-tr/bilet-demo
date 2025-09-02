// prisma/seed-setting.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Sections
  console.log('DB:', await prisma.$queryRawUnsafe<string>('select current_database()'));

  // Dil seçimi için genel section
  const language = await prisma.settingSection.upsert({
    where: { key: 'language' },
    update: {},
    create: {
      key: 'language',
      titleTR: 'Dil Seçimi',
      titleEN: 'Language Selection',
      descriptionTR: 'Uygulama dili',
      descriptionEN: 'Application language',
      order: 1,
    },
  });

  // İlk konteynır - Kişisel
  const personal = await prisma.settingSection.upsert({
    where: { key: 'personal' },
    update: {},
    create: {
      key: 'personal',
      titleTR: 'Kişisel',
      titleEN: 'Personal',
      descriptionTR: 'Biletler, favoriler ve değerlendirmeler',
      descriptionEN: 'Tickets, favorites and reviews',
      order: 2,
    },
  });

  // İkinci konteynır - Gizlilik
  const privacy = await prisma.settingSection.upsert({
    where: { key: 'privacy' },
    update: {},
    create: {
      key: 'privacy',
      titleTR: 'Gizlilik',
      titleEN: 'Privacy',
      descriptionTR: 'Gizlilik ve güvenlik ayarları',
      descriptionEN: 'Privacy and security settings',
      order: 3,
    },
  });

  // İkinci konteynır - Bildirimler
  const notifications = await prisma.settingSection.upsert({
    where: { key: 'notifications' },
    update: {},
    create: {
      key: 'notifications',
      titleTR: 'Bildirimler',
      titleEN: 'Notifications',
      descriptionTR: 'Bildirim tercihleri',
      descriptionEN: 'Notification preferences',
      order: 4,
    },
  });

  // İkinci konteynır - Mesajlaşma
  const messaging = await prisma.settingSection.upsert({
    where: { key: 'messaging' },
    update: {},
    create: {
      key: 'messaging',
      titleTR: 'Mesajlaşma',
      titleEN: 'Messaging',
      descriptionTR: 'Mesajlaşma ayarları',
      descriptionEN: 'Messaging settings',
      order: 5,
    },
  });

  // İkinci konteynır - Sosyal medya entegrasyonları
  const social = await prisma.settingSection.upsert({
    where: { key: 'social' },
    update: {},
    create: {
      key: 'social',
      titleTR: 'Sosyal Medya',
      titleEN: 'Social Media',
      descriptionTR: 'Sosyal medya entegrasyonları',
      descriptionEN: 'Social media integrations',
      order: 6,
    },
  });

  // Üçüncü konteynır - Yardım
  const help = await prisma.settingSection.upsert({
    where: { key: 'help' },
    update: {},
    create: {
      key: 'help',
      titleTR: 'Yardım',
      titleEN: 'Help',
      descriptionTR: 'Yardım ve destek',
      descriptionEN: 'Help and support',
      order: 7,
    },
  });

  // Son konteynır - Hesap
  const account = await prisma.settingSection.upsert({
    where: { key: 'account' },
    update: {},
    create: {
      key: 'account',
      titleTR: 'Hesap',
      titleEN: 'Account',
      descriptionTR: 'Hesap yönetimi',
      descriptionEN: 'Account management',
      order: 8,
    },
  });

  // Items

  // Dil seçimi
  await prisma.settingItem.upsert({
    where: { key: 'language' },
    update: {},
    create: {
      sectionId: language.id,
      key: 'language',
      titleTR: 'Dil',
      titleEN: 'Language',
      inputType: 'SELECT',
      options: ['TR','EN'],
      defaultValue: 'TR',
      order: 1,
    } as any,
  });

  // Kişisel bölüm
  await prisma.settingItem.upsert({
    where: { key: 'my_tickets' },
    update: {},
    create: {
      sectionId: personal.id,
      key: 'my_tickets',
      titleTR: 'Biletlerim',
      titleEN: 'My Tickets',
      inputType: 'BUTTON',
      options: [],
      defaultValue: '',
      order: 1,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'favorite_events' },
    update: {},
    create: {
      sectionId: personal.id,
      key: 'favorite_events',
      titleTR: 'Favori Etkinliklerim',
      titleEN: 'My Favorite Events',
      inputType: 'BUTTON',
      options: [],
      defaultValue: '',
      order: 2,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'my_reviews' },
    update: {},
    create: {
      sectionId: personal.id,
      key: 'my_reviews',
      titleTR: 'Değerlendirmelerim',
      titleEN: 'My Reviews',
      inputType: 'BUTTON',
      options: [],
      defaultValue: '',
      order: 3,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'blocked_profiles' },
    update: {},
    create: {
      sectionId: personal.id,
      key: 'blocked_profiles',
      titleTR: 'Engelli Profiller',
      titleEN: 'Blocked Profiles',
      inputType: 'BUTTON',
      options: [],
      defaultValue: '',
      order: 4,
    } as any,
  });

  // Gizlilik ayarları
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

  // Bildirim ayarları - Etkinlik bildirimleri
  await prisma.settingItem.upsert({
    where: { key: 'event_time_change' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'event_time_change',
      titleTR: 'Tarih-Saat Değişikliği Bildirimi',
      titleEN: 'Event Time Change Notification',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 1,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'event_venue_change' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'event_venue_change',
      titleTR: 'Mekan Değişikliği Bildirimi',
      titleEN: 'Venue Change Notification',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 2,
    } as any,
  });

  // Bilet işlemleri
  await prisma.settingItem.upsert({
    where: { key: 'ticket_purchase_info' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'ticket_purchase_info',
      titleTR: 'Satın Alım Sonrası Bilet Bilgileri',
      titleEN: 'Post-Purchase Ticket Information',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 3,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'ticket_qr_code' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'ticket_qr_code',
      titleTR: 'Bilet QR Kodu Bildirimi',
      titleEN: 'Ticket QR Code Notification',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 4,
    } as any,
  });

  // Genel bildirimler
  await prisma.settingItem.upsert({
    where: { key: 'friend_event_join' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'friend_event_join',
      titleTR: 'Arkadaş Etkinlik Katılım Bildirimi',
      titleEN: 'Friend Event Join Notification',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 5,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'followed_venue_updates' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'followed_venue_updates',
      titleTR: 'Takip Edilen Mekan Bildirimleri',
      titleEN: 'Followed Venue Notifications',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 6,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'followed_artist_updates' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'followed_artist_updates',
      titleTR: 'Takip Edilen Sanatçı Bildirimleri',
      titleEN: 'Followed Artist Notifications',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 7,
    } as any,
  });

  // Bildirim kanalları
  await prisma.settingItem.upsert({
    where: { key: 'in_app_notifications' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'in_app_notifications',
      titleTR: 'Uygulama İçi Bildirimler',
      titleEN: 'In-App Notifications',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: true,
      order: 8,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'email_notifications' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'email_notifications',
      titleTR: 'E-posta Bildirimleri',
      titleEN: 'Email Notifications',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: false,
      order: 9,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'sms_notifications' },
    update: {},
    create: {
      sectionId: notifications.id,
      key: 'sms_notifications',
      titleTR: 'SMS Bildirimleri',
      titleEN: 'SMS Notifications',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: false,
      order: 10,
    } as any,
  });

  // Mesajlaşma
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

  // Sosyal medya entegrasyonları
  await prisma.settingItem.upsert({
    where: { key: 'social_instagram' },
    update: {},
    create: {
      sectionId: social.id,
      key: 'social_instagram',
      titleTR: 'Instagram Bağlantısı',
      titleEN: 'Instagram Link',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: false,
      order: 1,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'social_spotify' },
    update: {},
    create: {
      sectionId: social.id,
      key: 'social_spotify',
      titleTR: 'Spotify Bağlantısı',
      titleEN: 'Spotify Link',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: false,
      order: 2,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'social_youtube' },
    update: {},
    create: {
      sectionId: social.id,
      key: 'social_youtube',
      titleTR: 'YouTube Bağlantısı',
      titleEN: 'YouTube Link',
      inputType: 'TOGGLE',
      options: [],
      defaultValue: false,
      order: 3,
    } as any,
  });

  // Yardım bölümü
  await prisma.settingItem.upsert({
    where: { key: 'faq' },
    update: {},
    create: {
      sectionId: help.id,
      key: 'faq',
      titleTR: 'Sıkça Sorulan Sorular',
      titleEN: 'Frequently Asked Questions',
      inputType: 'BUTTON',
      options: [],
      defaultValue: '',
      order: 1,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'about_app' },
    update: {},
    create: {
      sectionId: help.id,
      key: 'about_app',
      titleTR: 'Uygulama Hakkında',
      titleEN: 'About App',
      inputType: 'BUTTON',
      options: [],
      defaultValue: '',
      order: 2,
    } as any,
  });

  await prisma.settingItem.upsert({
    where: { key: 'support' },
    update: {},
    create: {
      sectionId: help.id,
      key: 'support',
      titleTR: 'Destek',
      titleEN: 'Support',
      inputType: 'BUTTON',
      options: [],
      defaultValue: '',
      order: 3,
    } as any,
  });

  // Hesap bölümü
  await prisma.settingItem.upsert({
    where: { key: 'logout' },
    update: {},
    create: {
      sectionId: account.id,
      key: 'logout',
      titleTR: 'Çıkış Yap',
      titleEN: 'Logout',
      inputType: 'BUTTON',
      options: [],
      defaultValue: '',
      order: 1,
    } as any,
  });

  // Bildirim kategorileri için tüm kullanıcılar adına varsayılan tercih:
  // (migration sonrası ilk girişte set edebilirsin)
  // örnek: hiçbir şey seed etmiyoruz; uygulama ilk login’de UserNotificationPreference upsert edecek.
}

main().finally(() => prisma.$disconnect());

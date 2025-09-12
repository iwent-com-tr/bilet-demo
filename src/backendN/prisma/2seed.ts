// prisma/seed.ts
import pkg, { Prisma } from '@prisma/client';
const { PrismaClient, UserStatus, AdminRole, PushChannel, Browser, OS, DeviceType, SegmentSource, LoginMethod, EventStatus, EventCategory } = pkg;
import { hashPassword } from '../src/lib/crypto';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';
import { setTimeout as sleep } from 'timers/promises';

const prisma = new PrismaClient();

const PEXELS_KEY = process.env.PEXELS_API_KEY;
if (!PEXELS_KEY) {
  console.error('PEXELS_API_KEY yok. .env içine ekle.');
  process.exit(1);
}

type PexelsPhoto = {
  id: number;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
};

type PexelsSearchResp = {
  photos: PexelsPhoto[];
};

async function pexelsSearch(query: string, perPage = 50): Promise<PexelsPhoto[]> {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(perPage));
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('size', 'large');
  const res = await fetch(url, {
    headers: { Authorization: PEXELS_KEY } as HeadersInit,
  });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = (await res.json()) as PexelsSearchResp;
  await sleep(200);
  return data.photos ?? [];
}

const pexelsCache = new Map<string, PexelsPhoto[]>();

async function pickPexelsLandscape(query: string): Promise<string | null> {
  if (!pexelsCache.has(query)) {
    const photos = await pexelsSearch(query, 80);
    pexelsCache.set(query, photos);
  }
  const photos = pexelsCache.get(query) ?? [];
  if (!photos.length) return null;
  const idx = crypto.randomInt(0, photos.length);
  const chosen = photos[idx];
  return chosen?.src?.landscape || chosen?.src?.large || chosen?.src?.large2x || null;
}

const pexelsQueries: Record<keyof typeof EventCategory, string[]> = {
  CONCERT:      ['live concert', 'music stage lights', 'crowd concert', 'indie concert'],
  FESTIVAL:     ['music festival crowd', 'summer festival', 'outdoor festival'],
  UNIVERSITY:   ['university campus', 'students campus', 'college campus'],
  WORKSHOP:     ['coding workshop', 'hands on workshop', 'design workshop'],
  CONFERENCE:   ['tech conference stage', 'business conference keynote', 'conference audience'],
  SPORT:        ['football stadium', 'basketball arena', 'running race crowd'],
  PERFORMANCE:  ['theatre stage', 'ballet stage', 'drama performance'],
  EDUCATION:    ['education classroom', 'seminar training', 'lecture hall'],
};

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const cities = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Eskişehir','Konya','Adana','Gaziantep','Trabzon'];
const venuesByCity: Record<string, string[]> = {
  'İstanbul': ['Zorlu PSM','Volkswagen Arena','Babylon','IF Beşiktaş','Moda Sahnesi','Maximum Uniq'],
  'Ankara': ['Congresium','MEB Şura Salonu','CerModern','Jolly Joker','Başkent Oda'],
  'İzmir': ['Ahmed Adnan Saygun','Kültürpark Açıkhava','Bornova Aşık Veysel','Hangout PSM'],
  'Bursa': ['Merinos AKKM','Kültürpark Açıkhava','PodyumPark'],
  'Antalya': ['Cam Piramit','AKM Aspendos','Açıkhava Tiyatrosu'],
  'Eskişehir': ['Atatürk Kültür Sanat','Zübeyde Hanım Kültür Merkezi','Vehbi Koç Kongre'],
  'Konya': ['Selçuklu Kongre','Mevlana Kültür Merkezi'],
  'Adana': ['Çukurova Kültür Merkezi','01 Burda Etkinlik'],
  'Gaziantep': ['GAÜN Mavera','Şahinbey Kongre'],
  'Trabzon': ['KTÜ AKM','Hamamizade Kültür Merkezi'],
};

const namesByCategory: Record<keyof typeof EventCategory, string[]> = {
  CONCERT: ['Gece Melodileri','Şehir Senfonisi','Elektrik Akımı','Akustik Akşam'],
  FESTIVAL: ['Yaz Rüzgarı Fest','Renkli Günler','Sahil Ritmi','Gastro Fest'],
  UNIVERSITY: ['Kariyer Zirvesi','Kulüpler Tanışma','Ar-Ge Günü','Teknofikir'],
  WORKSHOP: ['Fullstack Atölye','Veri Bilimi 101','UI/UX Sprint','Fotoğrafçılık Pratik'],
  CONFERENCE: ['Dijital Dönüşüm','Bulut ve Yapay Zeka','Siber Güvenlik Günü','Ürün Yönetimi'],
  SPORT: ['Şehir Kupası','Dostluk Maçı','Koşu Ligi','Salon Turnuvası'],
  PERFORMANCE: ['Kış Masalı','Sahne Işıkları','Modern Dans Gecesi','Klasik Oyunlar'],
  EDUCATION: ['Hızlı Okuma','Sunum Teknikleri','Proje Yönetimi','Finans Okuryazarlığı'],
};

function randFutureWindow() {
  const startShiftDays = randInt(3, 90);
  const durationHours = randInt(2, 8);
  const start = faker.date.soon({ days: startShiftDays });
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return { start, end };
}

function makeTicketTypes(category: keyof typeof EventCategory) {
  const base = [
    { name: 'Genel Giriş', price: faker.number.int({ min: 100, max: 750 }) },
    { name: 'VIP', price: faker.number.int({ min: 500, max: 2000 }) },
  ];
  if (category === 'CONFERENCE' || category === 'EDUCATION' || category === 'WORKSHOP') {
    base.push({ name: 'Öğrenci', price: faker.number.int({ min: 50, max: 300 }) });
  }
  return base;
}

async function bannerForCategory(cat: EventCategory): Promise<string> {
  const queries = pexelsQueries[cat];
  for (let i = 0; i < Math.min(2, queries.length); i++) {
    const q = pick(queries);
    try {
      const url = await pickPexelsLandscape(q);
      if (url) return url;
    } catch {}
  }
  return 'https://loremflickr.com/1200/600/event?lock=42';
}

async function seedUsers() {
  console.log('Seeding users...');
  const password = await hashPassword('Password123!');

  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        firstName: `User`,
        lastName: `${i + 1}`,
        email: `user${i + 1}@example.com`,
        password: password,
        birthYear: 1990 + i,
        phone: `+9055555555${i.toString().padStart(2, '0')}`,
        phoneVerified: true,
        emailVerified: true,
        city: 'Istanbul',
        country: 'TR',
        locale: 'tr-TR',
        status: UserStatus.ACTIVE,
        adminRole: i === 0 ? AdminRole.ADMIN : AdminRole.USER,
        marketingConsent: i % 2 === 0,
        lastLogin: new Date(),
        lastSeenAt: new Date(),
      },
    });

    // Seed related data
    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        channel: PushChannel.WEB_PUSH,
        onesignalUserId: `os-user-${i}`,
        onesignalSubId: `os-sub-${i}`,
        browser: Browser.CHROME,
        os: OS.MACOS,
        deviceType: DeviceType.DESKTOP,
        pwa: false,
        subscribed: true,
      },
    });

    await prisma.userSegmentTag.create({
      data: {
        userId: user.id,
        key: 'test_user',
        value: 'true',
        source: SegmentSource.INTERNAL,
      },
    });

    await prisma.loginEvent.create({
      data: {
        userId: user.id,
        ip: '127.0.0.1',
        ua: 'test-user-agent',
        method: LoginMethod.PASSWORD,
      },
    });
  }
  console.log('Users seeded.');
}

async function seedSettings() {
  console.log('Seeding settings...');
  
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
  // UserNotificationPreference ile çalışacağız. Yine de UI için "kanal tercihleri" item'ı:
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
  
  console.log('Settings seeded.');
}

async function seedEvents() {
  console.log('Seeding events...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  const organizers: string[] = [];
  for (let i = 0; i < 10; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const org = await prisma.organizer.create({
      data: {
        firstName,
        lastName,
        company: faker.company.name(),
        phone: faker.phone.number({ style: 'national' }),
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        password: 'organizator123',
        approved: true,
        devices: [],
      },
      select: { id: true },
    });
    organizers.push(org.id);
  }
  console.log(`Organizers: ${organizers.length}`);

  const categories = Object.values(EventCategory) as EventCategory[];
  let created = 0;

  for (const category of categories) {
    const target = randInt(10, 15);
    for (let i = 0; i < target; i++) {
      const city = pick(cities);
      const venue = pick(venuesByCity[city] ?? ['Kültür Merkezi']);
      const name = `${pick(namesByCategory[category])} ${faker.word.noun()}`;
      const { start, end } = randFutureWindow();
      const organizerId = pick(organizers);
      const banner = await bannerForCategory(category);
      const slug = `${slugify(name)}-${faker.string.alphanumeric({ length: 6, casing: 'lower' })}`;

      await prisma.event.create({
        data: {
          name,
          slug,
          category,
          startDate: start,
          endDate: end,
          venue,
          address: faker.location.streetAddress(),
          city,
          banner,
          socialMedia: {
            instagram: `https://instagram.com/${slug}`,
            website: faker.internet.url(),
          } as Prisma.InputJsonValue,
          description: faker.lorem.paragraphs({ min: 1, max: 3 }),
          capacity: faker.number.int({ min: 100, max: 5000 }),
          ticketTypes: makeTicketTypes(category) as unknown as Prisma.InputJsonValue,
          status: EventStatus.ACTIVE,
          organizerId,
        },
      });
      created++;
    }
    console.log(`${category}: tamam, adet: ${target}, toplam: ${created}`);
  }
  console.log(`Toplam etkinlik: ${created}`);
}

async function main() {
  await seedSettings();
  await seedUsers();
  await seedEvents();
}

main()
  .then(async () => { 
    await prisma.$disconnect();
    console.log('Seeding completed successfully!');
  })
  .catch(async (e) => { 
    console.error(e); 
    await prisma.$disconnect(); 
    process.exit(1);
  });
import { PrismaClient, Prisma, EventStatus, EventCategory } from '@prisma/client'
import { faker } from '@faker-js/faker'
import crypto from 'crypto'
import { setTimeout as sleep } from 'timers/promises'

const prisma = new PrismaClient()

const PEXELS_KEY = process.env.PEXELS_API_KEY
if (!PEXELS_KEY) {
  console.error('PEXELS_API_KEY yok. .env içine ekle.')
  process.exit(1)
}

type PexelsPhoto = {
  id: number
  alt: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
}

type PexelsSearchResp = {
  photos: PexelsPhoto[]
}

async function pexelsSearch(query: string, perPage = 50): Promise<PexelsPhoto[]> {
  const url = new URL('https://api.pexels.com/v1/search')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('size', 'large')
  const res = await fetch(url, {
    headers: { Authorization: PEXELS_KEY } as HeadersInit,
  })
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`)
  const data = (await res.json()) as PexelsSearchResp
  await sleep(200)
  return data.photos ?? []
}

const pexelsCache = new Map<string, PexelsPhoto[]>()

async function pickPexelsLandscape(query: string): Promise<string | null> {
  if (!pexelsCache.has(query)) {
    const photos = await pexelsSearch(query, 80)
    pexelsCache.set(query, photos)
  }
  const photos = pexelsCache.get(query) ?? []
  if (!photos.length) return null
  const idx = crypto.randomInt(0, photos.length)
  const chosen = photos[idx]
  return chosen?.src?.landscape || chosen?.src?.large || chosen?.src?.large2x || null
}

const pexelsQueries: Record<EventCategory, string[]> = {
  CONCERT:      ['live concert', 'music stage lights', 'crowd concert', 'indie concert'],
  FESTIVAL:     ['music festival crowd', 'summer festival', 'outdoor festival'],
  UNIVERSITY:   ['university campus', 'students campus', 'college campus'],
  WORKSHOP:     ['coding workshop', 'hands on workshop', 'design workshop'],
  CONFERENCE:   ['tech conference stage', 'business conference keynote', 'conference audience'],
  SPORT:        ['football stadium', 'basketball arena', 'running race crowd'],
  PERFORMANCE:  ['theatre stage', 'ballet stage', 'drama performance'],
  EDUCATION:    ['education classroom', 'seminar training', 'lecture hall'],
}

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)] }
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const cities = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Eskişehir','Konya','Adana','Gaziantep','Trabzon']
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
}

const namesByCategory: Record<EventCategory, string[]> = {
  CONCERT: ['Gece Melodileri','Şehir Senfonisi','Elektrik Akımı','Akustik Akşam'],
  FESTIVAL: ['Yaz Rüzgarı Fest','Renkli Günler','Sahil Ritmi','Gastro Fest'],
  UNIVERSITY: ['Kariyer Zirvesi','Kulüpler Tanışma','Ar-Ge Günü','Teknofikir'],
  WORKSHOP: ['Fullstack Atölye','Veri Bilimi 101','UI/UX Sprint','Fotoğrafçılık Pratik'],
  CONFERENCE: ['Dijital Dönüşüm','Bulut ve Yapay Zeka','Siber Güvenlik Günü','Ürün Yönetimi'],
  SPORT: ['Şehir Kupası','Dostluk Maçı','Koşu Ligi','Salon Turnuvası'],
  PERFORMANCE: ['Kış Masalı','Sahne Işıkları','Modern Dans Gecesi','Klasik Oyunlar'],
  EDUCATION: ['Hızlı Okuma','Sunum Teknikleri','Proje Yönetimi','Finans Okuryazarlığı'],
}

function randFutureWindow() {
  const startShiftDays = randInt(3, 90)
  const durationHours = randInt(2, 8)
  const start = faker.date.soon({ days: startShiftDays })
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)
  return { start, end }
}

function makeTicketTypes(category: EventCategory) {
  const base = [
    { name: 'Genel Giriş', price: faker.number.int({ min: 100, max: 750 }) },
    { name: 'VIP', price: faker.number.int({ min: 500, max: 2000 }) },
  ]
  if (category === 'CONFERENCE' || category === 'EDUCATION' || category === 'WORKSHOP') {
    base.push({ name: 'Öğrenci', price: faker.number.int({ min: 50, max: 300 }) })
  }
  return base
}

async function bannerForCategory(cat: EventCategory): Promise<string> {
  const queries = pexelsQueries[cat]
  for (let i = 0; i < Math.min(2, queries.length); i++) {
    const q = pick(queries)
    try {
      const url = await pickPexelsLandscape(q)
      if (url) return url
    } catch {}
  }
  return 'https://loremflickr.com/1200/600/event?lock=42'
}

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL)
  const organizers: string[] = []
  for (let i = 0; i < 10; i++) {
    const firstName = faker.person.firstName()
    const lastName = faker.person.lastName()
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
    })
    organizers.push(org.id)
  }
  console.log(`Organizers: ${organizers.length}`)

  const categories = Object.values(EventCategory) as EventCategory[]
  let created = 0

  for (const category of categories) {
    const target = randInt(10, 15)
    for (let i = 0; i < target; i++) {
      const city = pick(cities)
      const venue = pick(venuesByCity[city] ?? ['Kültür Merkezi'])
      const name = `${pick(namesByCategory[category])} ${faker.word.noun()}`
      const { start, end } = randFutureWindow()
      const organizerId = pick(organizers)
      const banner = await bannerForCategory(category)
      const slug = `${slugify(name)}-${faker.string.alphanumeric({ length: 6, casing: 'lower' })}`

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
      })
      created++
    }
    console.log(`${category}: tamam, adet: ${target}, toplam: ${created}`)
  }
  console.log(`Toplam etkinlik: ${created}`)
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
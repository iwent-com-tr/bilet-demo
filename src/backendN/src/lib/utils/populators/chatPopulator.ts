import { prisma } from '../../prisma';
import { faker } from '@faker-js/faker';

export async function populateChatMessages() {
  console.log('🗨️ Populating chat messages...');

  try {
    // Get all active events with tickets
    const eventsWithTickets = await prisma.event.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        tickets: {
          some: {
            status: 'ACTIVE'
          }
        }
      },
      include: {
        tickets: {
          where: { status: 'ACTIVE' },
          include: { user: true }
        },
        organizer: true
      },
      take: 5 // Limit to first 5 events for demo
    });

    for (const event of eventsWithTickets) {
      const participants = event.tickets.map(t => t.user);
      const organizer = event.organizer;

      // Generate 10-20 messages per event
      const messageCount = faker.number.int({ min: 10, max: 20 });

      for (let i = 0; i < messageCount; i++) {
        // 70% chance user message, 30% chance organizer message
        const isOrganizerMessage = faker.number.float() < 0.3;
        
        let senderId: string;
        let senderType: 'USER' | 'ORGANIZER';

        if (isOrganizerMessage) {
          senderId = organizer.id;
          senderType = 'ORGANIZER';
        } else {
          const randomParticipant = faker.helpers.arrayElement(participants);
          senderId = randomParticipant.id;
          senderType = 'USER';
        }

        // Generate realistic event chat messages
        const eventMessages = [
          'Heyecanla bekliyorum! 🎉',
          'Hangi saatte kapılar açılıyor?',
          'Sahne önünde buluşalım mı?',
          'Biletimi aldım, çok heyecanlıyım!',
          'Bu etkinlik harika olacak 🔥',
          'Arkadaşlarımla geliyorum',
          'İlk kez bu tür bir etkinliğe katılacağım',
          'Organizasyon için teşekkürler 🙏',
          'Mekan nasıl ulaşım var mı?',
          'Çok güzel bir program hazırlamışsınız',
          'Bilet fiyatları çok uygun',
          'Sosyal medyada paylaştım',
          'Ailecek geliyoruz 👨‍👩‍👧‍👦',
          'Fotoğraf çekmek serbest mi?',
          'Yemek içecek satışı var mı?',
          'Otopark sorunu var mı?',
          'Hava durumu nasıl olacak acaba?',
          'Erken gelsek daha iyi mi?',
          'Bu etkinliği kaçırmak olmaz!',
          'Arkadaşlarıma da tavsiye ettim'
        ];

        const organizerMessages = [
          'Herkesi etkinliğimizde görmekten mutluluk duyacağız! 🎊',
          'Kapılar 19:00\'da açılacak, erken gelmenizi tavsiye ederiz',
          'Otopark alanımız mevcut, ücretsiz',
          'Etkinlik boyunca fotoğraf çekebilirsiniz 📸',
          'Yemek ve içecek standlarımız hazır',
          'Hava durumu güzel, harika bir gece olacak ☀️',
          'Güvenlik önlemlerimiz alındı, rahat edin',
          'Sosyal medya paylaşımlarınız için #EventHashtag kullanın',
          'İlk 100 kişiye hediye var! 🎁',
          'Ses sistemi test edildi, kaliteli ses deneyimi yaşayacaksınız',
          'Engelli erişimi mevcut',
          'Çocuk oyun alanımız da var',
          'Sağlık ekibi hazır bulunacak',
          'Kayıp eşya büromuz giriş kapısında',
          'Etkinlik sonrası temizlik için yardımcı olursanız seviniriz'
        ];

        const messagePool = isOrganizerMessage ? organizerMessages : eventMessages;
        const message = faker.helpers.arrayElement(messagePool);

        // Create message with realistic timestamp (last 7 days)
        const createdAt = faker.date.recent({ days: 7 });

        await prisma.chatMessage.create({
          data: {
            eventId: event.id,
            userId: senderId,
            senderId,
            senderType,
            message,
            status: 'ACTIVE',
            createdAt
          }
        });
      }

      console.log(`✅ Generated ${messageCount} messages for event: ${event.name}`);
    }

    console.log('🎉 Chat messages population completed!');
  } catch (error) {
    console.error('❌ Error populating chat messages:', error);
    throw error;
  }
}

// Helper function to clear existing chat messages (for development)
export async function clearChatMessages() {
  console.log('🧹 Clearing existing chat messages...');
  
  const deleted = await prisma.chatMessage.deleteMany({});
  console.log(`🗑️ Deleted ${deleted.count} chat messages`);
}

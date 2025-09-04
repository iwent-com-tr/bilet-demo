# Online Status System - Hibrit Yaklaşım

## 🎯 Sistem Özeti

iWent platformunda kullanıcıların çevrimiçi/çevrimdışı durumunu belirlemek için **hibrit yaklaşım** kullanılmaktadır:

1. **Birincil**: Socket.IO bağlantısı kontrolü (gerçek zamanlı)
2. **İkincil**: Son 2 dakikadaki aktif endpoint aktivitesi

## 🔧 Nasıl Çalışır?

### 1. Online Detection Algoritması

```typescript
static isUserOnline(userId: string, lastSeenAt: Date | null): boolean {
  // 1. Önce socket bağlantısını kontrol et
  if (isSocketOnline(userId)) {
    return true; // Aktif socket = Kesinlikle online
  }
  
  // 2. Socket yoksa son 2 dakikadaki aktiviteyi kontrol et
  if (!lastSeenAt) return false;
  
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return lastSeenAt > twoMinutesAgo;
}
```

### 2. Socket.IO Tracking

```typescript
// Kullanıcı bağlandığında
onlineUsers.set(userId, socketIds); // Map<userId, Set<socketId>>

// Kullanıcı ayrıldığında
onlineUsers.delete(userId);

// Real-time bildirimler
socket.emit('user:status-change', { userId, isOnline: true/false });
```

### 3. Activity Tracking

Sadece **aktif kullanım** gösteren endpoint'lerde `lastSeenAt` güncellenir:

```typescript
const ACTIVE_ENDPOINTS = [
  '/chat/',      // Chat kullanımı
  '/messages',   // Mesaj listesi
  '/events',     // Etkinlik görüntüleme
  '/users/me',   // Profil erişimi
  '/users/search', // Kullanıcı arama
  '/friendships', // Arkadaşlık işlemleri
  '/tickets'     // Bilet işlemleri
];
```

**Dahil OLMAYAN endpoint'ler:**
- `/auth/refresh` (otomatik token yenileme)
- `/push/sync` (background push sync)
- `/health` (sistem kontrolleri)
- Admin panel API'leri

## 🎯 Online Status Senaryoları

| Durum | Socket Bağlantısı | Son Aktivite | Sonuç | Açıklama |
|-------|------------------|--------------|-------|----------|
| 1 | ✅ Var | - | 🟢 **Online** | Aktif kullanıcı |
| 2 | ❌ Yok | < 2 dakika | 🟢 **Online** | Yeni kapanmış, muhtemelen aktif |
| 3 | ❌ Yok | > 2 dakika | 🔴 **Offline** | Gerçekten çevrimdışı |
| 4 | ❌ Yok | Hiç yok | 🔴 **Offline** | Hiç giriş yapmamış |

## 📱 Frontend Entegrasyonu

### OnlineIndicator Bileşeni
```tsx
<OnlineIndicator 
  isOnline={isUserOnline(userId)} 
  size="sm" 
  className="mt-1" 
/>
```

### Real-time Updates
```typescript
// Socket.IO dinleyici
socket.on('user:status-change', (data) => {
  setOnlineStatus(prev => ({
    ...prev,
    [data.userId]: data.isOnline
  }));
});
```

## 🔄 Real-time Bildirimler

### Arkadaşlara Bildirim
Kullanıcı online/offline olduğunda sadece **arkadaşlarına** bildirim gönderilir:

```typescript
// Kullanıcı bağlandığında
notifyFriendsOnlineStatus(userId, true);

// Kullanıcı ayrıldığında  
notifyFriendsOnlineStatus(userId, false);
```

### Privacy
- ✅ Sadece arkadaşlar birbirlerinin durumunu görebilir
- ✅ Yabancılar için online status görünmez
- ✅ Friendship tablosu üzerinden kontrol

## 📊 Performance Optimizasyonları

### Batch API Calls
```typescript
// Tek seferde 50 kullanıcıya kadar
POST /users/online-status
{ "userIds": ["user1", "user2", ...] }
```

### Non-blocking Updates
```typescript
// lastSeenAt güncellemeleri asenkron
UserService.updateLastSeen(userId).catch(err => {
  console.error('Failed to update lastSeenAt:', err);
  // Hata durumunda devam et
});
```

### Socket Room Management
```typescript
// Efficient room yönetimi
socket.join(userRoom(userId));          // Private messages
socket.join(eventRoom(eventId));        // Event chats
```

## 🎨 UI/UX Özellikleri

### Visual Indicators
- 🟢 **Yeşil nokta + "çevrimiçi"** = Online
- 🔴 **Gri nokta + "çevrimdışı"** = Offline
- ✨ **Pulse animasyonu** = Online kullanıcılar için

### Görüntüleme Yerleri
- **Messages sayfası**: Private chat'lerde arkadaşların durumu
- **Private Chat sayfası**: Header'da konuşulan kişinin durumu
- **Event Chat**: Katılımcıların durumu (gelecekte)

## 🚀 Avantajlar

### Önceki Sisteme Göre İyileştirmeler
- ❌ **Eski**: 5 dakika içinde herhangi bir API çağrısı = Online
- ✅ **Yeni**: Socket bağlantısı + 2 dakika aktif kullanım

### Faydalar
1. **Daha Hassas**: Gerçek kullanım durumunu yansıtır
2. **Real-time**: Anlık durum değişiklikleri
3. **Performanslı**: Batch calls ve non-blocking updates
4. **Privacy**: Sadece arkadaşlar arası görünürlük
5. **Battery Friendly**: Background aktiviteleri sayılmaz

## 🔮 Gelecek Geliştirmeler

- [ ] "Son görülme" zamanı gösterimi (2 saat önce, dün, vs.)
- [ ] "Yazıyor..." göstergesi (typing indicators)
- [ ] Özel durum mesajları ("Toplantıda", "Meşgul", vs.)
- [ ] Event chat'lerde katılımcı online durumu
- [ ] Mobile push notifications ile online status senkronizasyonu

## 📝 Teknik Notlar

### Database Schema
```sql
-- User tablosunda mevcut
lastSeenAt: DateTime? -- Son aktif kullanım zamanı
lastLogin: DateTime?  -- Son giriş zamanı (farklı amaç)
```

### Environment Variables
```env
# Socket.IO için gerekli
CLIENT_ORIGIN="http://localhost:3001"
```

Bu sistem sayesinde kullanıcılar birbirlerinin gerçek online durumunu görebilir ve daha anlamlı bir mesajlaşma deneyimi yaşarlar! 🎉 
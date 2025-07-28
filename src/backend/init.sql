-- Veritabanı oluşturma
CREATE DATABASE iwent;

-- Kullanıcılar tablosu
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isim VARCHAR(50) NOT NULL,
  soyisim VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  sifre VARCHAR(255) NOT NULL,
  dogum_yili INTEGER NOT NULL,
  telefon VARCHAR(20) NOT NULL,
  sehir VARCHAR(50) NOT NULL,
  son_giris TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Organizatörler tablosu
CREATE TABLE organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isim VARCHAR(50) NOT NULL,
  soyisim VARCHAR(50) NOT NULL,
  sirket VARCHAR(100) NOT NULL,
  telefon VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  sifre VARCHAR(255) NOT NULL,
  vergi_no VARCHAR(11),
  vergi_dairesi VARCHAR(100),
  adres TEXT,
  banka_hesap VARCHAR(255),
  son_giris TIMESTAMP,
  onaylandi BOOLEAN DEFAULT FALSE,
  devices JSONB DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Etkinlikler tablosu
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad VARCHAR(100) NOT NULL,
  kategori VARCHAR(50) NOT NULL,
  baslangic_tarih TIMESTAMP NOT NULL,
  bitis_tarih TIMESTAMP NOT NULL,
  yer VARCHAR(255) NOT NULL,
  adres TEXT NOT NULL,
  il VARCHAR(50) NOT NULL,
  banner VARCHAR(255),
  sosyal_medya JSONB DEFAULT '{}',
  aciklama TEXT,
  kapasite INTEGER,
  bilet_tipleri JSONB NOT NULL DEFAULT '[]',
  durum VARCHAR(20) NOT NULL DEFAULT 'taslak',
  organizer_id UUID NOT NULL REFERENCES organizers(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Biletler tablosu
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES users(id),
  bilet_tipi VARCHAR(50) NOT NULL,
  fiyat DECIMAL(10,2) NOT NULL,
  qr_kod VARCHAR(255) UNIQUE,
  durum VARCHAR(20) NOT NULL DEFAULT 'aktif',
  giris_zamani TIMESTAMP,
  gise VARCHAR(50),
  cihaz_id VARCHAR(50),
  referans_kodu VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Chat mesajları tablosu
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  gonderen_id UUID NOT NULL,
  gonderen_tipi VARCHAR(20) NOT NULL,
  mesaj TEXT NOT NULL,
  durum VARCHAR(20) NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_organizers_email ON organizers(email);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_durum ON events(durum);
CREATE INDEX idx_tickets_event_id ON tickets(event_id);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_qr_kod ON tickets(qr_kod);
CREATE INDEX idx_chat_messages_event_id ON chat_messages(event_id);

-- Güncelleme tetikleyicileri
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizers_updated_at
  BEFORE UPDATE ON organizers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 
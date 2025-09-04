import React from 'react';
import { useAuth } from '../../context/AuthContext';
import greetingEmoji from '../../assets/greeting-emoji.svg';
import './MobileHeader.css';

const messages = [
  "{isim}, anı defterini açalım mı? → Keşfet",
  "Hoş geldin {isim}! Bugün hikâyeni büyütelim mi? → Biletini Al",
  "{isim}, {şehir} seni sahneye çağırıyor. → Etkinlikleri Gör",
  "Planın yok mu {isim}? Sorun değil, bizde fikir çok! → Fikir Yakala",
  "{isim}, cuma gecesi rezerve edildi: senin için. → Takvimi Aç",
  "Merhaba {isim}! Erken kuş indirimleri seni bekliyor. → Kap Fırsatı",
  "{isim}, kalabalığın içinde ekibini bul. → Topluluklara Katıl",
  "Günün nasıl {isim}? Eğlence dozu ayarlamaya hazırım. → Bilet Seç",
  "Tek tıkla sahnen hazır, {isim}. → Sahneye Çık",
  "{isim}, macera seni bekliyor—tırmanış mı, konser mi? → Kategorileri Aç",
  "Anı biriktir {isim}, pişmanlık değil. → Şimdi Başla",
  "{isim}, hafta sonu planına enerji katalım mı? → Hafta Sonu Önerileri",
  "Favori türün hazır {isim}: sahnede boş yer var. → Koltuğunu Seç",
  "Dostlarını etiketle {isim}, toplu indirim kapıda. → Paylaş",
];

function formatMessage(template: string, name: string, city?: string) {
  return template
    .replaceAll("{isim}", name)
    .replaceAll("{şehir}", city ?? "");
}

const MobileHeader: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.isim || 'Misafir';
  const city = 'Ankara';

  const greetingMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) {
      return 'Günaydın';
    } else if (hour >= 12 && hour < 18) {
      return 'İyi Günler';
    } else {
      return 'İyi Akşamlar';
    }
  };

  const randomMessage = formatMessage(
    messages[Math.floor(Math.random() * messages.length)],
    firstName,
    city
  );

  return (
    <div className="mobile-header">
      <h1 className="mobile-header__greeting">
        <img src={greetingEmoji} alt="Greeting" className="mobile-header__greeting-emoji" />
        {greetingMessage()}, {firstName}
      </h1>
      <h2 className="mobile-header__greeting-message">
          {randomMessage}
      </h2>
    </div>
  );
};

export default MobileHeader; 
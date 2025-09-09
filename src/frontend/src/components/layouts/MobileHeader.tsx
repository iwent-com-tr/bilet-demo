import React from 'react';
import { useAuth } from '../../context/AuthContext';
import greetingEmoji from '../../assets/greeting-emoji.svg';
import './MobileHeader.css';
import { number } from 'yup';
import { Link } from 'react-router-dom';

interface StampObject {
  time: number;
  index: number;
}

const GREETING_STAMP = "greeting_message_stamp";
const FIVE_MINUTES = 5 * 60 * 1000;



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

function formatMessage(index: number, name: string, city?: string) {
  // Fill placeholders
  let text = messages[index]
    .replace("{isim}", name)
    .replace("{şehir}", city || "");

  // Split into before / after parts
  const [before, after] = text.split("→").map(s => s.trim());

  // Decide link destinations per index
  let link = "/";
  switch (index) {
    case 0: link = "/search"; break;
    case 1: link = "/search/events"; break;
    case 2: link = "/search/events"; break;
    case 3: link = "/search/events"; break;
    case 4: link = "/calendar"; break;
    case 5: link = "/search/events"; break;
    case 6: link = "/search/organizer"; break;
    case 7: link = "/search/events"; break;
    case 8: link = "/search/events"; break;
    case 9: link = "/search/events"; break;
    case 10: link = "/search/events"; break;
    case 11: link = "/search/events"; break;
    case 12: link = "/search/events"; break;
    case 13: link = "/calendar"; break;
    default: link = "/";
  }

  return (
    <span>
      {before}{" "}
      <Link to={link} className="mobile-header__greeting-link">
        <br />{"->" + after}
      </Link>
    </span>
  );
}



function resetStamp() {
  const stamp: StampObject = {
      time: Date.now(),
      index: Math.floor(Math.random() * messages.length),
    }

    localStorage.setItem(GREETING_STAMP, JSON.stringify(stamp));
    return stamp.index;
}

function getMessageIndex() {
  const currentStamp = localStorage.getItem(GREETING_STAMP);
  
  if (currentStamp) {
    const now = Date.now();
    const currentStampObject: StampObject = JSON.parse(currentStamp);

    if (now - currentStampObject.time < FIVE_MINUTES) {
      localStorage.setItem(GREETING_STAMP, JSON.stringify({...currentStampObject, time: now}));
      return currentStampObject.index;
    }
  }

  return resetStamp(); 
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
    7,
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
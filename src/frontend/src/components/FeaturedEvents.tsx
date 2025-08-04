import React from 'react';
import { Link } from 'react-router-dom';
import './FeaturedEvents.css';

// Import event images
import sonanceFest from '../assets/featured-events/sonance-fest.png';
import picnicGathering from '../assets/featured-events/picnic-gathering.png';
import ankaraSummerFest from '../assets/featured-events/ankara-summer-fest.png';
import heimHor from '../assets/featured-events/heim-hor.png';
import heimHit from '../assets/featured-events/heim-hit.png';

interface Event {
  id: string;
  ad: string;
  banner: string;
  tarih: string;
  mekan: string;
}

const FeaturedEvents: React.FC = () => {
  const events = [
    {
      id: '1',
      ad: 'Sonance Festival 10th Year Anniversary',
      banner: sonanceFest,
      tarih: "6-7 Eylül, 2025",
      mekan: 'Anadolu Hotels Esenboğa Thermal'
    },
    {
      id: '2',
      ad: 'Picnic & Gathering Magical Forest',
      banner: picnicGathering,
      tarih: '31 Mayıs 2025',
      mekan: 'Swissotel The Bosphorus'
    },
    {
      id: '3',
      ad: 'Ankara Summer Festival 2025',
      banner: ankaraSummerFest,
      tarih: '25 Temmuz 2025',
      mekan: 'Wonders Ankara'
    },
    {
      id: '4',
      ad: 'HEIM Presents: HÖR Ankara Tour',
      banner: heimHor,
      tarih: '23 Mayıs 2025',
      mekan: 'Club Mirador'
    },
    {
      id: '5',
      ad: 'Heim Presents: Hit is Calling',
      banner: heimHit,
      tarih: '27 Haziran 2025',
      mekan: 'JW Marriott Ankara'
    }
  ];

  return (
    <section className="featured-events">
      <div className="featured-events__header">
        <div className="featured-events__title-container">
          <h2 className="featured-events__title">→ Ankara'nın Öne Çıkan Etkinlikleri</h2>
        </div>
      </div>
      <div className="featured-events__grid">
        {events.map((event) => (
          <Link 
            to={`/events/${event.id}`} 
            key={event.id}
            className="featured-events__card"
          >
            <div className="featured-events__image-container">
              <img 
                src={event.banner} 
                alt={event.ad} 
                className="featured-events__image"
              />
            </div>
            <div className="featured-events__content">
              <p className="featured-events__date">{event.tarih}</p>
              <h3 className="featured-events__name">{event.ad}</h3>
              <p className="featured-events__venue">{event.mekan}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default FeaturedEvents; 
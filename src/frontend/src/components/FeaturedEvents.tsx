import React from 'react';
import { Link } from 'react-router-dom';
import './FeaturedEvents.css';

// Import images
import ankaraSummerFest from '../assets/featured-events/ankara-summer-fest.png';
import heimHit from '../assets/featured-events/heim-hit.png';
import heimHor from '../assets/featured-events/heim-hor.png';
import picnicGathering from '../assets/featured-events/picnic-gathering.png';
import sonanceFest from '../assets/featured-events/sonance-fest.png';

const events = [
  {
    id: '1',
    image: ankaraSummerFest,
    date: '25 Temmuz 2025',
    name: 'Ankara Summer Festival 2025',
    venue: 'Wonders Ankara'
  },
  {
    id: '2',
    image: heimHit,
    date: '15 Ağustos 2025',
    name: 'HEIM Hit',
    venue: 'Club Mirador'
  },
  {
    id: '3',
    image: heimHor,
    date: '20 Ağustos 2025',
    name: 'HEIM Hor',
    venue: 'Club Mirador'
  },
  {
    id: '4',
    image: picnicGathering,
    date: '1 Eylül 2025',
    name: 'Picnic Gathering',
    venue: 'The Bosphorus'
  },
  {
    id: '5',
    image: sonanceFest,
    date: '15 Eylül 2025',
    name: 'Sonance Fest',
    venue: 'Wonders Ankara'
  }
];

const FeaturedEvents: React.FC = () => {
  return (
    <section className="featured-events">
      <div className="featured-events__header">
        <div className="featured-events__title-container">
          <h2 className="featured-events__title">→ Ankara'nın Öne Çıkan Etkinlikleri</h2>
        </div>
      </div>
      <div className="featured-events__grid-container">
        <div className="featured-events__grid">
          {events.map(event => (
            <Link key={event.id} to={`/events/${event.id}`} className="featured-events__card">
              <div className="featured-events__image-container">
                <img src={event.image} alt={event.name} className="featured-events__image" />
              </div>
              <div className="featured-events__content">
                <p className="featured-events__date">{event.date}</p>
                <h3 className="featured-events__name">{event.name}</h3>
                <p className="featured-events__venue">{event.venue}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents; 
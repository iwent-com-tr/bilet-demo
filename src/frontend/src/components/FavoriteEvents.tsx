import React from 'react';
import { Link } from 'react-router-dom';
import './FavoriteEvents.css';

// Import images - you'll need to replace these with your actual favorite event images
import ankaraSummerFest from '../assets/featured-events/ankara-summer-fest.png';
import heimHit from '../assets/featured-events/heim-hit.png';
import heimHor from '../assets/featured-events/heim-hor.png';
import picnicGathering from '../assets/featured-events/picnic-gathering.png';
import sonanceFest from '../assets/featured-events/sonance-fest.png';

const favoriteEvents = [
  {
    id: '1',
    image: ankaraSummerFest,
    date: '25 Temmuz 2025',
    name: 'Ankara Summer Festival 2025',
    venue: 'Wonders Ankara',
    isFavorite: true
  },
  {
    id: '2',
    image: heimHit,
    date: '15 Ağustos 2025',
    name: 'HEIM Hit',
    venue: 'Club Mirador',
    isFavorite: true
  },
  {
    id: '3',
    image: heimHor,
    date: '20 Ağustos 2025',
    name: 'HEIM Hor',
    venue: 'Club Mirador',
    isFavorite: true
  },
  {
    id: '4',
    image: picnicGathering,
    date: '1 Eylül 2025',
    name: 'Picnic Gathering',
    venue: 'The Bosphorus',
    isFavorite: true
  },
  {
    id: '5',
    image: sonanceFest,
    date: '15 Eylül 2025',
    name: 'Sonance Fest',
    venue: 'Wonders Ankara',
    isFavorite: true
  }
];

const FavoriteEvents: React.FC = () => {
  return (
    <section className="favorite-events">
      <div className="favorite-events__header">
        <div className="favorite-events__title-container">
          <h2 className="favorite-events__title">→ Favori Etkinliklerin</h2>
        </div>
      </div>
      <div className="favorite-events__grid-container">
        <div className="favorite-events__grid">
          {favoriteEvents.map(event => (
            <Link key={event.id} to={`/events/${event.id}`} className="favorite-events__card">
              <div className="favorite-events__image-container">
                <img src={event.image} alt={event.name} className="favorite-events__image" />
              </div>
              <div className="favorite-events__content">
                <p className="favorite-events__date">{event.date}</p>
                <h3 className="favorite-events__name">{event.name}</h3>
                <p className="favorite-events__venue">{event.venue}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FavoriteEvents; 
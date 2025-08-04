import React from 'react';
import { Link } from 'react-router-dom';
import './RecommendedEvents.css';

// Import images
import ankaraSummerFest from '../assets/featured-events/ankara-summer-fest.png';
import heimHit from '../assets/featured-events/heim-hit.png';
import heimHor from '../assets/featured-events/heim-hor.png';
import picnicGathering from '../assets/featured-events/picnic-gathering.png';
import sonanceFest from '../assets/featured-events/sonance-fest.png';

const recommendedEvents = [
  {
    id: '1',
    image: ankaraSummerFest,
    date: '25 Temmuz 2025',
    name: 'Ankara Summer Festival 2025',
    venue: 'Wonders Ankara',
    matchScore: '95%'
  },
  {
    id: '2',
    image: heimHit,
    date: '15 Ağustos 2025',
    name: 'HEIM Hit',
    venue: 'Club Mirador',
    matchScore: '92%'
  },
  {
    id: '3',
    image: heimHor,
    date: '20 Ağustos 2025',
    name: 'HEIM Hor',
    venue: 'Club Mirador',
    matchScore: '89%'
  },
  {
    id: '4',
    image: picnicGathering,
    date: '1 Eylül 2025',
    name: 'Picnic Gathering',
    venue: 'The Bosphorus',
    matchScore: '87%'
  },
  {
    id: '5',
    image: sonanceFest,
    date: '15 Eylül 2025',
    name: 'Sonance Fest',
    venue: 'Wonders Ankara',
    matchScore: '85%'
  }
];

const RecommendedEvents: React.FC = () => {
  return (
    <section className="recommended-events">
      <div className="recommended-events__header">
        <div className="recommended-events__title-container">
          <h2 className="recommended-events__title">→ Seveceğin Etkinlikler</h2>
        </div>
      </div>
      <div className="recommended-events__grid-container">
        <div className="recommended-events__grid">
          {recommendedEvents.map(event => (
            <Link key={event.id} to={`/events/${event.id}`} className="recommended-events__card">
              <div className="recommended-events__image-container">
                <img src={event.image} alt={event.name} className="recommended-events__image" />
                <div className="recommended-events__match-score">
                  {event.matchScore}
                </div>
              </div>
              <div className="recommended-events__content">
                <p className="recommended-events__date">{event.date}</p>
                <h3 className="recommended-events__name">{event.name}</h3>
                <p className="recommended-events__venue">{event.venue}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendedEvents; 
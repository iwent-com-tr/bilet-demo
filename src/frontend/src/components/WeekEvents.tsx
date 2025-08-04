import React from 'react';
import './WeekEvents.css';

// Import event images
import sunsetAfro from '../assets/week-events/sunset-afro.png';
import defraggedSessions from '../assets/week-events/defragged-sessions.png';
import picnicGathering from '../assets/week-events/picnic-gathering.png';
import portalToParadise from '../assets/week-events/portal-to-paradise.png';
import aboveClouds from '../assets/week-events/above-clouds.png';

interface Event {
  id: string;
  title: string;
  image: string;
  date: string;
  venue: string;
}

const WeekEvents: React.FC = () => {
  const events = [
    {
      id: '1',
      title: 'Linda Represents: Sunset Nights Afro Dream',
      image: sunsetAfro,
      date: '18 Temmuz, 2025',
      venue: 'Atakule Green Terrace'
    },
    {
      id: '2',
      title: 'Defragged Sessions',
      image: defraggedSessions,
      date: '26 Nisan,2025',
      venue: 'Pixel Ankara'
    },
    {
      id: '3',
      title: 'Picnic & Gathering',
      image: picnicGathering,
      date: '9-10 Eylül, 2025',
      venue: 'Club Mirador'
    },
    {
      id: '4',
      title: 'Portal to Paradise Series w/Eli&Fur',
      image: portalToParadise,
      date: '25 Nisan, 2025',
      venue: 'Savanna 42 Venue'
    },
    {
      id: '5',
      title: 'Above Clouds: Dylan Linde & Cem Seçkin',
      image: aboveClouds,
      date: '24 Mayıs, 2025',
      venue: 'JW Marriott Ankara'
    }
  ];

  return (
    <section className="week-events">
      <div className="week-events__header">
        <h2 className="week-events__title">→ Bu Haftaki Etkinlikler</h2>
      </div>
      <div className="week-events__grid">
        {events.map((event) => (
          <div key={event.id} className="week-events__card">
            <div className="week-events__image-container">
              <img 
                src={event.image} 
                alt={event.title} 
                className="week-events__image"
              />
            </div>
            <div className="week-events__content">
              <p className="week-events__date">{event.date}</p>
              <h3 className="week-events__title-text">{event.title}</h3>
              <p className="week-events__venue">{event.venue}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WeekEvents; 
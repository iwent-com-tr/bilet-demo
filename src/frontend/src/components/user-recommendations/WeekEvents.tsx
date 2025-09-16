import { Link } from 'react-router-dom';
import './WeekEvents.css';

// Import images
// import aboveClouds from 'assets/week-events/above-clouds.png';
// import defraggedSessions from 'assets/week-events/defragged-sessions.png';
// import picnicGathering from 'assets/week-events/picnic-gathering.png';
// import portalToParadise from 'assets/week-events/portal-to-paradise.png';
// import sunsetAfro from 'assets/week-events/sunset-afro.png';
import { useEffect, useState } from 'react';
import axios from 'axios';

// const events = [
//   {
//     id: '1',
//     image: aboveClouds,
//     date: '10 Haziran 2025',
//     name: 'Above Clouds',
//     venue: 'The Bosphorus'
//   },
//   {
//     id: '2',
//     image: defraggedSessions,
//     date: '15 Haziran 2025',
//     name: 'Defragged Sessions',
//     venue: 'Klein Phönix'
//   },
//   {
//     id: '3',
//     image: picnicGathering,
//     date: '20 Haziran 2025',
//     name: 'Picnic Gathering',
//     venue: 'Zorlu PSM'
//   },
//   {
//     id: '4',
//     image: portalToParadise,
//     date: '25 Haziran 2025',
//     name: 'Portal to Paradise',
//     venue: 'Volkswagen Arena'
//   },
//   {
//     id: '5',
//     image: sunsetAfro,
//     date: '30 Haziran 2025',
//     name: 'Sunset Afro',
//     venue: 'Babylon'
//   }
// ];

interface Event {
  id: string;
  name: string;
  slug: string;
  banner?: string;
  category: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
}

const formatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric"
});

const WeekEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/events/?page=1&limit=10&dateFrom=${today.toISOString().split('T')[0]}&dateTo=${nextWeek.toISOString().split('T')[0]}`);
        setEvents(response.data.data);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    }
    fetchEvents();
  }, []);

  if (events.length === 0) {
    return null;
  }

  return (
    <section className="week-events">
      <div className="week-events__header">
        <h2 className="week-events__title">→ Bu Haftaki Etkinlikler</h2>
      </div>
      <div className="week-events__grid-container">
        <div className="week-events__grid">
          {events.map(event => (
            <Link key={event.id} to={`/events/${event.slug}`} className="week-events__card">
              <div className="week-events__image-container">
                <img src={event.banner} alt={event.name} className="week-events__image" />
              </div>
              <div className="week-events__content">
                <p className="week-events__date">{formatter.format(new Date(event.startDate))}</p>
                <h3 className="week-events__title-text">{event.name}</h3>
                <p className="week-events__venue">{event.venue}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WeekEvents; 
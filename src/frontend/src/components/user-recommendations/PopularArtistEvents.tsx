import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './PopularArtistEvents.css';

// Import images
import acidArab from 'assets/popular-artist-events/acid-arab.png';
import lindaPresents from 'assets/popular-artist-events/linda-presents.png';
import mochakk from 'assets/popular-artist-events/mochakk.png';
import sunsetNights from 'assets/popular-artist-events/sunset-nights.png';
import theBlaze from 'assets/popular-artist-events/the-blaze.png';
import axios from 'axios';

// const events = [
//   {
//     id: '1',
//     image: acidArab,
//     date: '15 Haziran 2025',
//     name: 'Acid Arab Live',
//     venue: 'Zorlu PSM'
//   },
//   {
//     id: '2',
//     image: lindaPresents,
//     date: '20 Haziran 2025',
//     name: 'Linda Presents',
//     venue: 'Klein Phönix'
//   },
//   {
//     id: '3',
//     image: mochakk,
//     date: '25 Haziran 2025',
//     name: 'Mochakk',
//     venue: 'Volkswagen Arena'
//   },
//   {
//     id: '4',
//     image: sunsetNights,
//     date: '30 Haziran 2025',
//     name: 'Sunset Nights',
//     venue: 'Babylon'
//   },
//   {
//     id: '5',
//     image: theBlaze,
//     date: '5 Temmuz 2025',
//     name: 'The Blaze',
//     venue: 'KüçükÇiftlik Park'
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

const PopularArtistEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const today = new Date();
        const nextYear = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: '5',
          q: '',
          dateFrom: today.toISOString(),
          dateTo: nextYear.toISOString(),
        });

        const response = await axios.get(`${process.env.REACT_APP_API_URL}/events/popular?${params}`);

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
    <section className="popular-events">
      <div className="popular-events__header">
        <h2 className="popular-events__title">→ Popüler Sanatçı Etkinlikleri</h2>
      </div>
      <div className="popular-events__grid-container">
        <div className="popular-events__grid">
          {events.map(event => (
            <Link key={event.id} to={`/events/${event.slug}`} className="popular-events__card">
              <div className="popular-events__image-container">
                <img src={event.banner} alt={event.name} className="popular-events__image" />
              </div>
              <div className="popular-events__content">
                <p className="popular-events__date">{formatter.format(new Date(event.startDate))}</p>
                <h3 className="popular-events__title-text">{event.name}</h3>
                <p className="popular-events__venue">{event.venue}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularArtistEvents; 
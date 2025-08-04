import React from 'react';
import './PopularArtistEvents.css';

// Import event images
import acidArab from '../assets/popular-artist-events/acid-arab.png';
import lindaPresents from '../assets/popular-artist-events/linda-presents.png';
import mochakk from '../assets/popular-artist-events/mochakk.png';
import theBlaze from '../assets/popular-artist-events/the-blaze.png';
import sunsetNights from '../assets/popular-artist-events/sunset-nights.png';

interface Event {
  id: string;
  title: string;
  image: string;
  date: string;
  venue: string;
}

const PopularArtistEvents: React.FC = () => {
  const events = [
    {
      id: '1',
      title: 'X100 Music Presents: Acid Arab DJ Set',
      image: acidArab,
      date: '6 Aral. 2025',
      venue: 'Klein Istanbul'
    },
    {
      id: '2',
      title: 'Linda Presents: Ceza & Mercan Dede - M Lite',
      image: lindaPresents,
      date: '14 Eyl. 2025',
      venue: 'Volkswagen Arena'
    },
    {
      id: '3',
      title: 'Linda Presents - Mochakk',
      image: mochakk,
      date: '31 May. 2025',
      venue: 'Babylon The Backdoor'
    },
    {
      id: '4',
      title: 'Linda Presents: The Blaze DJ Set',
      image: theBlaze,
      date: '25 Tem. 2025',
      venue: 'Artikkent Huma Hatun Terrace'
    },
    {
      id: '5',
      title: 'Sunset Nights - Reddd',
      image: sunsetNights,
      date: '5 Tem. 2025',
      venue: 'Artikkent Sport Terrace'
    }
  ];

  return (
    <section className="popular-events">
      <div className="popular-events__header">
        <h2 className="popular-events__title">→ Popüler Sanatçı Etkinlikleri</h2>
      </div>
      <div className="popular-events__grid">
        {events.map((event) => (
          <div key={event.id} className="popular-events__card">
            <div className="popular-events__image-container">
              <img 
                src={event.image} 
                alt={event.title} 
                className="popular-events__image"
              />
            </div>
            <div className="popular-events__content">
              <p className="popular-events__date">{event.date}</p>
              <h3 className="popular-events__title-text">{event.title}</h3>
              <p className="popular-events__venue">{event.venue}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PopularArtistEvents; 
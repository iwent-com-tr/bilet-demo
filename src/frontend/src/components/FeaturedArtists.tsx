import React from 'react';
import './FeaturedArtists.css';

// Import images
import anatolianSessions from '../assets/artists/anatolian-sessions.png';
import argy from '../assets/artists/argy.png';
import fredAgain from '../assets/artists/fred-again.png';
import monolink from '../assets/artists/monolink.png';
import softAnalog from '../assets/artists/soft-analog.png';

const artists = [
  {
    id: '1',
    name: 'Anatolian Sessions',
    image: anatolianSessions
  },
  {
    id: '2',
    name: 'Argy',
    image: argy
  },
  {
    id: '3',
    name: 'Fred Again..',
    image: fredAgain
  },
  {
    id: '4',
    name: 'Monolink',
    image: monolink
  },
  {
    id: '5',
    name: 'Soft Analog',
    image: softAnalog
  }
];

const FeaturedArtists: React.FC = () => {
  return (
    <section className="featured-artists">
      <div className="featured-artists__header">
        <h2 className="featured-artists__title">→ Bu Yıl En Çok Dinlenen Sanatçılar</h2>
      </div>
      <div className="featured-artists__grid-container">
        <div className="featured-artists__grid">
          {artists.map(artist => (
            <div key={artist.id} className="featured-artists__card">
              <div className="featured-artists__image-container">
                <img src={artist.image} alt={artist.name} className="featured-artists__image" />
              </div>
              <h3 className="featured-artists__name">{artist.name}</h3>
              <button className="featured-artists__follow-button">Takip Et</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtists; 
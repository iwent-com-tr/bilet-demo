import React from 'react';
import './FeaturedArtists.css';

// Import artist images
import argy from '../assets/artists/argy.png';
import monolink from '../assets/artists/monolink.png';
import softAnalog from '../assets/artists/soft-analog.png';
import anatolianSessions from '../assets/artists/anatolian-sessions.png';
import fredAgain from '../assets/artists/fred-again.png';

interface Artist {
  id: string;
  name: string;
  image: string;
}

const FeaturedArtists: React.FC = () => {
  const artists = [
    {
      id: '1',
      name: 'ARGY',
      image: argy
    },
    {
      id: '2',
      name: 'Monolink',
      image: monolink
    },
    {
      id: '3',
      name: 'Soft Analog',
      image: softAnalog
    },
    {
      id: '4',
      name: 'Anatolian Sessions',
      image: anatolianSessions
    },
    {
      id: '5',
      name: 'Fred Again',
      image: fredAgain
    }
  ];

  return (
    <section className="featured-artists">
      <div className="featured-artists__header">
        <h2 className="featured-artists__title">→ Bu Yıl En Çok Dinlenen Sanatçılar</h2>
      </div>
      <div className="featured-artists__grid">
        {artists.map((artist) => (
          <div key={artist.id} className="featured-artists__card">
            <div className="featured-artists__image-container">
              <img 
                src={artist.image} 
                alt={artist.name} 
                className="featured-artists__image"
              />
            </div>
            <h3 className="featured-artists__name">{artist.name}</h3>
            <button className="featured-artists__follow-button">
              Takip Et
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedArtists; 
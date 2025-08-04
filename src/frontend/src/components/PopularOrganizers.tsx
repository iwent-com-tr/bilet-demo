import React from 'react';
import './PopularOrganizers.css';

// Import images
import ares from '../assets/popular-organizators/ares.png';
import commonCulture from '../assets/popular-organizators/common-culture.png';
import heim from '../assets/popular-organizators/heim.png';
import peachGang from '../assets/popular-organizators/peach-gang.png';
import wakeUpWorks from '../assets/popular-organizators/wake-up-works.png';

const organizers = [
  {
    id: '1',
    name: 'Ares',
    image: ares,
  },
  {
    id: '2',
    name: 'Common Culture',
    image: commonCulture,
  },
  {
    id: '3',
    name: 'HEIM',
    image: heim,
  },
  {
    id: '4',
    name: 'Peach Gang',
    image: peachGang,
  },
  {
    id: '5',
    name: 'Wake Up Works',
    image: wakeUpWorks,
  }
];

const PopularOrganizers: React.FC = () => {
  return (
    <section className="popular-organizers">
      <div className="popular-organizers__header">
        <h2 className="popular-organizers__title">→ Popüler Organizatörler</h2>
      </div>
      <div className="popular-organizers__grid-container">
        <div className="popular-organizers__grid">
          {organizers.map(organizer => (
            <div key={organizer.id} className="popular-organizers__card">
              <div className="popular-organizers__image-container">
                <img src={organizer.image} alt={organizer.name} className="popular-organizers__image" />
              </div>
              <div className="popular-organizers__content">
                <h3 className="popular-organizers__name">{organizer.name}</h3>
                <button className="popular-organizers__follow-button">Takip Et</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularOrganizers; 
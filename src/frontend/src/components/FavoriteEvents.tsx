import React from 'react';
import { Link } from 'react-router-dom';
import './FavoriteEvents.css';

type BackendEvent = {
  id: string;
  name: string;
  slug: string;
  startDate?: string;
  venue?: string;
  city?: string;
  banner?: string | null;
};

type Props = {
  events?: BackendEvent[];
};

const FavoriteEvents: React.FC<Props> = ({ events }) => {
  const hasBackend = Array.isArray(events) && events.length > 0;
  if (!hasBackend) return null;

  const renderDate = (iso?: string) => {
    try {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return ''; }
  };

  return (
    <section className="favorite-events">
      <div className="favorite-events__header">
        <div className="favorite-events__title-container">
          <h2 className="favorite-events__title">→ Favori Etkinliklerin</h2>
        </div>
      </div>
      <div className="favorite-events__grid-container">
        <div className="favorite-events__grid">
          {events!.map(ev => (
            <Link key={ev.id} to={`/events/${ev.slug}`} className="favorite-events__card">
              <div className="favorite-events__image-container">
                {ev.banner ? (
                  <img src={ev.banner} alt={ev.name} className="favorite-events__image" />
                ) : (
                  <div className="favorite-events__image favorite-events__image--placeholder" />
                )}
              </div>
              <div className="favorite-events__content">
                <p className="favorite-events__date">{renderDate(ev.startDate)}</p>
                <h3 className="favorite-events__name">{ev.name}</h3>
                <p className="favorite-events__venue">{[ev.venue, ev.city ? ev.city.charAt(0).toUpperCase() + ev.city.slice(1) : ''].filter(Boolean).join(', ')}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FavoriteEvents; 
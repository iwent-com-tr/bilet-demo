import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Events.css';

interface Event {
  id: string;
  ad: string;
  baslangic_tarih: string;
  durum: string;
  toplam_bilet: number;
  kullanilan_bilet: number;
  toplam_kazanc: number;
}

const OrganizerEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizer/events`);
      setEvents(response.data.events);
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlikler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  };



  const getStatusText = (status: string) => {
    switch (status) {
      case 'taslak':
        return 'Taslak';
      case 'yayinda':
        return 'Yayında';
      case 'iptal':
        return 'İptal';
      case 'tamamlandi':
        return 'Tamamlandı';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="organizer-events">
        <div className="organizer-events__loading">
          <div className="organizer-events__spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="organizer-events">
      <div className="organizer-events__container">
        <div className="organizer-events__header">
          <h1 className="organizer-events__title">→ Etkinliklerim</h1>
          <Link
            to="/organizer/events/create"
            className="organizer-events__create-button"
          >
            <svg 
              className="organizer-events__create-icon" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Yeni Etkinlik
          </Link>
        </div>

        <div className="organizer-events__content">
          {events.length === 0 ? (
            <div className="organizer-events__empty">
              <h3 className="organizer-events__empty-title">Henüz etkinliğiniz yok</h3>
              <p className="organizer-events__empty-description">
                İlk etkinliğinizi oluşturmak için "Yeni Etkinlik" butonuna tıklayın.
              </p>
            </div>
          ) : (
            <div className="organizer-events__table-container">
              <table className="organizer-events__table">
                <thead className="organizer-events__table-header">
                  <tr>
                    <th>Etkinlik</th>
                    <th>Tarih</th>
                    <th>Durum</th>
                    <th>Bilet</th>
                    <th>Kazanç</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="organizer-events__table-row">
                      <td className="organizer-events__table-cell">
                        <p className="organizer-events__event-name">{event.ad}</p>
                      </td>
                      <td className="organizer-events__table-cell">
                        <p className="organizer-events__event-date">{formatDate(event.baslangic_tarih)}</p>
                      </td>
                      <td className="organizer-events__table-cell">
                        <span className={`organizer-events__status organizer-events__status--${event.durum}`}>
                          {getStatusText(event.durum)}
                        </span>
                      </td>
                      <td className="organizer-events__table-cell">
                        <p className="organizer-events__ticket-stats">
                          <span className="organizer-events__ticket-used">{event.kullanilan_bilet}</span> / {event.toplam_bilet}
                        </p>
                      </td>
                      <td className="organizer-events__table-cell">
                        <p className="organizer-events__revenue">
                          {formatCurrency(event.toplam_kazanc)}
                        </p>
                      </td>
                      <td className="organizer-events__table-cell">
                        <div className="organizer-events__actions">
                          <Link
                            to={`/organizer/events/${event.id}/edit`}
                            className="organizer-events__action-link"
                          >
                            Düzenle
                          </Link>
                          <Link
                            to={`/organizer/event/${event.id}/report`}
                            className="organizer-events__action-link organizer-events__action-link--secondary"
                          >
                            Rapor
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerEvents; 
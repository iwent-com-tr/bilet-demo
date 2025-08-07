import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './EventCreateSuccess.css';

interface EventDetails {
  ad: string;
  kategori: string;
  baslangic_tarih: string;
  bitis_tarih: string;
  yer: string;
  il: string;
  adres: string;
  kapasite: number;
  bilet_tipleri: Array<{
    tip: string;
    fiyat: number;
    kapasite: number;
  }>;
}

const EventCreateSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const eventDetails = location.state?.eventDetails as EventDetails;

  if (!eventDetails) {
    navigate('/organizer/events');
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="event-create-success">
      <div className="event-create-success__container">
        {/* Success Alert */}
        <div className="event-create-success__alert">
          <div className="event-create-success__alert-content">
            <svg className="event-create-success__alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="event-create-success__alert-text">
              <h3 className="event-create-success__alert-title">
                ✨ Etkinlik Başarıyla Oluşturuldu!
              </h3>
              <p className="event-create-success__alert-description">
                Etkinliğiniz başarıyla oluşturuldu ve sistem tarafından onaylandı.
              </p>
            </div>
          </div>
        </div>

        {/* Event Details Card */}
        <div className="event-create-success__card">
          <div className="event-create-success__card-header">
            <h2 className="event-create-success__card-title">→ Etkinlik Özeti</h2>
          </div>

          <div className="event-create-success__card-content">
            {/* Event Header */}
            <div className="event-create-success__event-header">
              <h3 className="event-create-success__event-title">{eventDetails.ad}</h3>
              <span className="event-create-success__category-badge">
                {eventDetails.kategori}
              </span>
            </div>

            {/* Event Details Grid */}
            <div className="event-create-success__details-grid">
              <div className="event-create-success__detail-section">
                <h4 className="event-create-success__detail-label">Tarih ve Saat</h4>
                <div className="event-create-success__detail-content">
                  <p className="event-create-success__detail-text event-create-success__detail-text--primary">
                    {formatDate(eventDetails.baslangic_tarih)}
                  </p>
                  <p className="event-create-success__detail-text event-create-success__detail-text--muted">
                    ile
                  </p>
                  <p className="event-create-success__detail-text event-create-success__detail-text--primary">
                    {formatDate(eventDetails.bitis_tarih)}
                  </p>
                </div>
              </div>

              <div className="event-create-success__detail-section">
                <h4 className="event-create-success__detail-label">Konum</h4>
                <div className="event-create-success__detail-content">
                  <p className="event-create-success__detail-text event-create-success__detail-text--primary">
                    {eventDetails.yer}
                  </p>
                  <p className="event-create-success__detail-text">{eventDetails.il}</p>
                  <p className="event-create-success__detail-text event-create-success__detail-text--secondary">
                    {eventDetails.adres}
                  </p>
                </div>
              </div>
            </div>

            {/* Ticket Types */}
            <div className="event-create-success__tickets">
              <h4 className="event-create-success__detail-label">Bilet Tipleri</h4>
              <div className="event-create-success__tickets-list">
                {eventDetails.bilet_tipleri.map((bilet, index) => (
                  <div key={index} className="event-create-success__ticket-item">
                    <span className="event-create-success__ticket-name">{bilet.tip}</span>
                    <div className="event-create-success__ticket-info">
                      <span className="event-create-success__ticket-price">{bilet.fiyat} TL</span>
                      <div className="event-create-success__ticket-separator"></div>
                      <span className="event-create-success__ticket-capacity">{bilet.kapasite} kişi</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="event-create-success__actions">
              <button
                onClick={() => navigate('/organizer/events')}
                className="event-create-success__back-button"
              >
                <svg className="event-create-success__button-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Etkinlik Listesine Dön
              </button>
              <button
                onClick={() => navigate(`/organizer/events/${location.state?.eventId}/edit#durum`)}
                className="event-create-success__publish-button"
              >
                <svg className="event-create-success__button-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a.5.5 0 000 1h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                Etkinliği Yayına Al!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCreateSuccess; 
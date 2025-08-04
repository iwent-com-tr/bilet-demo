import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layouts/PageHeader';
import './EventDetail.css';
import santiTugce from '../../assets/artists/santi-tugce.png';
import okanGuven from '../../assets/artists/okan-guven.png';
import aliBakir from '../../assets/artists/ali-bakir.png';
import heimLogo from '../../assets/popular-organizators/heim.png';
import wakeLogo from '../../assets/popular-organizators/wake-up-works.png';

interface Event {
  id: string;
  ad: string;
  kategori: string;
  baslangic_tarih: string;
  bitis_tarih: string;
  yer: string;
  adres: string;
  il: string;
  banner: string;
  sosyal_medya: {
    [key: string]: string;
  };
  aciklama: string;
  bilet_tipleri: Array<{
    tip: string;
    fiyat: number;
    kapasite: number;
  }>;
}

interface Artist {
  name: string;
  type: string;
  image: string;
}

interface Organizer {
  name: string;
  type: string;
  image: string;
}

const mockArtists: Artist[] = [
  {
    name: "Santi & Tuğçe",
    type: "LIVE Set",
    image: santiTugce
  },
  {
    name: "Okan Güven",
    type: "LIVE Set",
    image: okanGuven
  },
  {
    name: "Ali Bakır",
    type: "Hybrid Set",
    image: aliBakir
  }
];

const mockOrganizers: Organizer[] = [
  {
    name: "Heim",
    type: "Ana Organizatör",
    image: heimLogo
  },
  {
    name: "Wake Up Works",
    type: "Co-Organizatör",
    image: wakeLogo
  }
];

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  useEffect(() => {
    // Check if we're returning from a successful purchase
    if (location.state?.purchaseSuccess) {
      setShowSuccessPopup(true);
      // Clear the state after showing popup
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/event/${id}`);
      setEvent(response.data.event);
      if (response.data.event.bilet_tipleri.length > 0) {
        setSelectedTicket(response.data.event.bilet_tipleri[0].tip);
      }
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      toast.error('Bilet almak için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    // For mobile view, redirect to ticket categories page
    if (window.innerWidth <= 768) {
      navigate(`/events/${id}/event-ticket-categories`);
      return;
    }

    // Get the selected ticket details
    const selectedTicketDetails = event?.bilet_tipleri.find(ticket => ticket.tip === selectedTicket);

    if (!selectedTicketDetails) {
      toast.error('Lütfen bir bilet tipi seçin');
      return;
    }

    // For desktop view, navigate to purchase page with ticket details
    navigate(`/events/${id}/purchase`, {
      state: {
        selectedTicket: selectedTicketDetails
      }
    });
  };

  const handleClosePopup = () => {
    setShowSuccessPopup(false);
  };

  const handleFavoriteClick = () => {
    if (!isAuthenticated) {
      toast.error('Favorilere eklemek için giriş yapmalısınız');
      return;
    }
    setIsFavorite(!isFavorite);
    // TODO: Add API call to save favorite status
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

  if (loading) {
    return (
      <div className="event-detail">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="event-detail">
        <div className="event-detail__empty">
          <h3>Etkinlik bulunamadı</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="event-detail">
      <PageHeader title="Etkinlik Detayları" />
      
      <div className="event-detail__container">
        <div className="event-detail__mobile-banner">
          <img
            src={event.banner || '/placeholder-event.jpg'}
            alt={event.ad}
            className="event-detail__mobile-banner-image"
          />
          <button
            className={`event-detail__mobile-banner-heart ${isFavorite ? 'active' : ''}`}
            onClick={handleFavoriteClick}
          >
            <svg
              viewBox="0 0 24 24"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <div className="event-detail__mobile-content">
          <h1 className="event-detail__mobile-title">{event.ad}</h1>
          
          <div className="event-detail__info-section">
            <div className="event-detail__mobile-attendees">
              <div className="event-detail__mobile-attendees-avatars">
                <div className="event-detail__mobile-attendee-avatar"></div>
                <div className="event-detail__mobile-attendee-avatar"></div>
                <div className="event-detail__mobile-attendee-avatar"></div>
              </div>
              <span className="event-detail__mobile-attendees-text">
                Akif, Dilsu ve Duhan gidiyor
              </span>
            </div>

            <div className="event-detail__mobile-datetime">
              <span className="event-detail__mobile-datetime">
                {new Date(event.baslangic_tarih).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })} - {new Date(event.baslangic_tarih).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="event-detail__mobile-artists">
              <h2 className="event-detail__mobile-artists-title">Sanatçılar</h2>
              <div className="event-detail__mobile-artists-list">
                {mockArtists.map((artist, index) => (
                  <div key={index} className="event-detail__mobile-artist">
                    <div className="event-detail__mobile-artist-avatar">
                      <img src={artist.image} alt={artist.name} />
                    </div>
                    <div className="event-detail__mobile-artist-info">
                      <span className="event-detail__mobile-artist-name">{artist.name}</span>
                      <span className="event-detail__mobile-artist-type">{artist.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="event-detail__mobile-organizers">
              <h2 className="event-detail__mobile-organizers-title">Organizatörler</h2>
              <div className="event-detail__mobile-organizers-list">
                {mockOrganizers.map((organizer, index) => (
                  <div key={index} className="event-detail__mobile-organizer">
                    <div className="event-detail__mobile-organizer-avatar">
                      <img src={organizer.image} alt={organizer.name} />
                    </div>
                    <div className="event-detail__mobile-organizer-info">
                      <span className="event-detail__mobile-organizer-name">{organizer.name}</span>
                      <span className="event-detail__mobile-organizer-type">{organizer.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop only ticket selection */}
          <div className="event-detail__ticket">
            <h2 className="event-detail__ticket-title">Bilet Seç</h2>
            
            <div className="event-detail__ticket-form">
              <div className="event-detail__form-group">
                <label htmlFor="bilet_tipi" className="event-detail__form-label">
                  Bilet Tipi
                </label>
                <select
                  id="bilet_tipi"
                  value={selectedTicket}
                  onChange={e => setSelectedTicket(e.target.value)}
                  className="event-detail__form-select"
                >
                  {event.bilet_tipleri.map(bilet => (
                    <option key={bilet.tip} value={bilet.tip}>
                      {bilet.tip} - {bilet.fiyat} TL
                    </option>
                  ))}
                </select>
              </div>

              <div className="event-detail__form-group">
                <label htmlFor="adet" className="event-detail__form-label">
                  Adet
                </label>
                <select
                  id="adet"
                  value={ticketCount}
                  onChange={e => setTicketCount(parseInt(e.target.value))}
                  className="event-detail__form-select"
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePurchase}
                disabled={purchaseLoading}
                className="event-detail__ticket-button"
              >
                {purchaseLoading ? 'İşleniyor...' : 'Biletini Seç'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile only purchase button */}
      <div className="event-detail__mobile-purchase-blur" />
      <div className="event-detail__mobile-purchase-container">
        <button
          onClick={handlePurchase}
          disabled={purchaseLoading}
          className="event-detail__mobile-purchase-button"
        >
          Biletini Seç
        </button>
      </div>

      {showSuccessPopup && (
        <>
          <div className="event-detail__success-popup-overlay" onClick={handleClosePopup} />
          <div className="event-detail__success-popup">
            <div className="event-detail__success-icon-container">
              <svg
                className="event-detail__success-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="event-detail__success-title">Tebrikler!</h2>
            <p className="event-detail__success-message">
              Hazırsın {user?.isim}! {event.ad} maceranın bileti cebinde. Sohbet grubuna katıl, anılar şimdi başlasın
            </p>
            <button className="event-detail__success-button" onClick={handleClosePopup}>
              Sohbet Grubuna Git
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EventDetail; 
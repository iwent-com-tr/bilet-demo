import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layouts/PageHeader';
import './EventDetail.css';

interface Event {
  id: string;
  name: string;
  slug: string;
  category: string;
  startDate: string;
  endDate: string;
  venue: string;
  address: string;
  city: string;
  banner?: string;
  socialMedia: {
    [key: string]: string;
  };
  description: string;
  ticketTypes: Array<{
    type: string;
    price: number;
    capacity: number;
  }>;
  status: string;
  organizerId: string;
  details?: {
    artistList?: Array<{
      name: string;
      type?: string;
      image?: string;
    }>;
    stageSetup?: string;
    duration?: string;
  };
  artists: Array<{
    artistId: string;
    time: string;
  }>;
}

interface Organizer {
  id: string;
  company: string;
  approved: boolean;
  avatar?: string;
}

const EventDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [userHasTicket, setUserHasTicket] = useState(false);
  const [checkingTickets, setCheckingTickets] = useState(false);
  const [artists, setArtists] = useState<{ name: string; image: string; time?: string | null }[]>([]);

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  useEffect(() => {
    // Check if we're returning from a successful purchase
    if (location.state?.purchaseSuccess) {
      setShowSuccessPopup(true);
      // Set participants if available
      if (location.state?.participants) {
        setParticipants(location.state.participants);
      }
      // Clear the state after showing popup
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    // Check if this event is in user's favorites when event loads
    if (event && isAuthenticated) {
      checkFavoriteStatus();
      checkUserTickets();
    }
  }, [event, isAuthenticated]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!event) {
        setArtists([]); // clear if no event
        return;
      }
      try {
        const resolved = await getArtists(); // getArtists defined below
        if (mounted) setArtists(resolved);
      } catch (err) {
        console.error('Error loading artists:', err);
        if (mounted) {
          // keep fallback/demo artists in case of failure
          setArtists([
            { name: 'Santi & Tuğçe', image: '/placeholder-artist.jpg' },
            { name: 'Okan Güven', image: '/placeholder-artist.jpg' },
            { name: 'Ali Bakır', image: '/placeholder-artist.jpg' }
          ]);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [event]);

  const fetchEvent = async () => {
    try {
      // Use the new backendN API endpoint with slug for both backend calls and navigation
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/events/slug/${slug}`);
      setEvent(response.data);
      if (response.data.ticketTypes && response.data.ticketTypes.length > 0) {
        setSelectedTicket(response.data.ticketTypes[0].type);
      }
      
      // Fetch organizer information
      if (response.data.organizerId) {
        await fetchOrganizer(response.data.organizerId);
      }
      
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const fetchOrganizer = async (organizerId: string) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizers/public/${organizerId}`);
      setOrganizer(response.data);
    } catch (error) {
      console.error('Error fetching organizer:', error);
      // If organizer fetch fails, we'll just show the event without organizer details
    }
  };

  const checkFavoriteStatus = async () => {
    if (!event || !isAuthenticated) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/users/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const favoriteEvents = response.data.events || [];
      const isEventFavorite = favoriteEvents.some((favEvent: any) => favEvent.id === event.id);
      setIsFavorite(isEventFavorite);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const checkUserTickets = async () => {
    if (!event || !isAuthenticated) return;
    
    setCheckingTickets(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/tickets/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const tickets = response.data.tickets || [];
      const hasTicketForEvent = tickets.some((ticket: any) => ticket.event.id === event.id);
      setUserHasTicket(hasTicketForEvent);
    } catch (error) {
      console.error('Error checking user tickets:', error);
      setUserHasTicket(false);
    } finally {
      setCheckingTickets(false);
    }
  };

  const handlePurchase = () => {
    if (!isAuthenticated) {
      toast.error('Bilet almak için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    // For mobile view, redirect to ticket categories page using slug
    if (window.innerWidth <= 768) {
      navigate(`/events/${slug}/event-ticket-categories`);
      return;
    }

    // Get the selected ticket details
    const selectedTicketDetails = event?.ticketTypes.find(ticket => ticket.type === selectedTicket);

    if (!selectedTicketDetails) {
      toast.error('Lütfen bir bilet tipi seçin');
      return;
    }

    // For desktop view, navigate to purchase page with ticket details using slug
    navigate(`/events/${slug}/purchase`, {
      state: {
        selectedTicket: selectedTicketDetails
      }
    });
  };

  const handleClosePopup = () => {
    setShowSuccessPopup(false);
  };

  const handleGoToChat = () => {
    if (!isAuthenticated) {
      toast.error('Sohbete katılmak için giriş yapmalısınız');
      navigate('/login');
      return;
    }
    
    if (!userHasTicket) {
      toast.error('Sohbete katılmak için etkinlik biletiniz olmalıdır');
      return;
    }

    navigate(`/events/${slug}/chat`);
  };

  const handleFavoriteClick = async () => {
    if (!isAuthenticated) {
      toast.error('Favorilere eklemek için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    if (!event) return;

    setFavoriteLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`${process.env.REACT_APP_API_URL}/users/favorites/${event.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setIsFavorite(false);
        toast.success('Etkinlik favorilerden çıkarıldı');
      } else {
        // Add to favorites
        await axios.post(`${process.env.REACT_APP_API_URL}/users/favorites`, 
          { eventId: event.id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setIsFavorite(true);
        toast.success('Etkinlik favorilere eklendi');
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast.error('Favori işlemi sırasında bir hata oluştu');
    } finally {
      setFavoriteLoading(false);
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

  // Get artists from event details if it's a concert
  const getArtists = async () => {
  if (event?.artists?.length) {
    return await Promise.all(
      event.artists.map(async (a) => {
        try {
          // Fetch artist info based on artistId
          const res = await axios.get(`${process.env.REACT_APP_API_URL}/artists/${a.artistId}`);
          const data = await res.data.json();
          return {
            name: data.name || `Artist ${a.artistId}`,
            image: data.imageUrl || '/placeholder-artist.jpg',
            time: a.time
          };
        } catch {
          return {
            name: `Artist ${a.artistId}`,
            image: '/placeholder-artist.jpg',
            time: a.time
          };
        }
      })
    );
  }

  // --- Fallback to demo artists if no event.artists exist ---
  return [
    { name: 'Santi & Tuğçe', image: '/placeholder-artist.jpg', time: '' },
    { name: 'Okan Güven', image: '/placeholder-artist.jpg', time: '' },
    { name: 'Ali Bakır', image: '/placeholder-artist.jpg', time: '' }
  ];
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
            alt={event.name}
            className="event-detail__mobile-banner-image"
          />
          <button
            className={`event-detail__mobile-banner-heart ${isFavorite ? 'active' : ''} ${favoriteLoading ? 'loading' : ''}`}
            onClick={handleFavoriteClick}
            disabled={favoriteLoading}
            aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          >
            {favoriteLoading ? (
              <div className="event-detail__heart-loading">
                <div className="event-detail__heart-loading-spinner"></div>
              </div>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill={isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="event-detail__heart-icon"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            )}
          </button>
        </div>

        <div className="event-detail__mobile-content">
          <h1 className="event-detail__mobile-title">{event.name}</h1>
          
          <div className="event-detail__info-section">
                          <div className="event-detail__mobile-datetime">
              {new Date(event.startDate).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })} - {new Date(event.startDate).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>

            {/* Show artists section only if there are artists */}
            {artists.length > 0 && (
              <div className="event-detail__mobile-artists">
                <h2 className="event-detail__mobile-artists-title">Sanatçılar</h2>
                <div className="event-detail__mobile-artists-list">
                  {artists.map((artist, index) => (
                    <div key={index} className="event-detail__mobile-artist">
                      <div className="event-detail__mobile-artist-avatar">
                        <img src={artist.image} alt={artist.name} />
                      </div>
                      <div className="event-detail__mobile-artist-info">
                        <span className="event-detail__mobile-artist-name">{artist.name}</span>
                        <span className="event-detail__mobile-artist-time">{artist.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="event-detail__mobile-organizers">
              <h2 className="event-detail__mobile-organizers-title">Organizatörler</h2>
              <div className="event-detail__mobile-organizers-list">
                {organizer ? (
                  <div className="event-detail__mobile-organizer">
                    <div className="event-detail__mobile-organizer-avatar">
                      <img 
                        src={organizer.avatar || '/placeholder-organizer.jpg'} 
                        alt={organizer.company || 'Organizatör'} 
                      />
                    </div>
                    <div className="event-detail__mobile-organizer-info">
                      <span className="event-detail__mobile-organizer-name">
                        {organizer.company || 'Organizatör'}
                      </span>
                      <span className="event-detail__mobile-organizer-type">
                        {organizer.approved ? 'Onaylı Organizatör' : 'Organizatör'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="event-detail__mobile-organizer">
                    <div className="event-detail__mobile-organizer-avatar">
                      <img src="/placeholder-organizer.jpg" alt="Organizatör" />
                    </div>
                    <div className="event-detail__mobile-organizer-info">
                      <span className="event-detail__mobile-organizer-name">Organizatör Bilgisi</span>
                      <span className="event-detail__mobile-organizer-type">Yükleniyor...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Event Details Section */}
            <div className="event-detail__mobile-details">
              <div className="event-detail__mobile-detail-item">
                <span className="event-detail__mobile-detail-label">Mekan:</span>
                <span className="event-detail__mobile-detail-value">{event.venue}</span>
              </div>
              
              {event.address && (
                <div className="event-detail__mobile-detail-item">
                  <span className="event-detail__mobile-detail-label">Adres:</span>
                  <span className="event-detail__mobile-detail-value">{event.address}</span>
                </div>
              )}
              
              <div className="event-detail__mobile-detail-item">
                <span className="event-detail__mobile-detail-label">Şehir:</span>
                <span className="event-detail__mobile-detail-value">{event.city}</span>
              </div>

              {event.description && (
                <div className="event-detail__mobile-detail-item event-detail__mobile-detail-description">
                  <span className="event-detail__mobile-detail-label">Açıklama:</span>
                  <span className="event-detail__mobile-detail-value">{event.description}</span>
                </div>
              )}
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
                  {event.ticketTypes && event.ticketTypes.map(ticket => (
                    <option key={ticket.type} value={ticket.type}>
                      {ticket.type} - {ticket.price} TL
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

              {userHasTicket ? (
                <div className="event-detail__ticket-buttons-split">
                  <button
                    onClick={handlePurchase}
                    disabled={purchaseLoading}
                    className="event-detail__ticket-button-half event-detail__ticket-button-new"
                  >
                    {purchaseLoading ? 'İşleniyor...' : 'Yeni Bilet Al'}
                  </button>
                  <button
                    onClick={handleGoToChat}
                    className="event-detail__ticket-button-half event-detail__ticket-button-chat"
                  >
                    Sohbete Git
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePurchase}
                  disabled={purchaseLoading}
                  className="event-detail__ticket-button"
                >
                  {purchaseLoading ? 'İşleniyor...' : 'Biletini Seç'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile only purchase button */}
      <div className="event-detail__mobile-purchase-blur" />
      <div className="event-detail__mobile-purchase-container">
        {userHasTicket ? (
          <div className="event-detail__mobile-buttons-split">
            <button
              onClick={handlePurchase}
              disabled={purchaseLoading}
              className="event-detail__mobile-button-half event-detail__mobile-button-new"
            >
              {purchaseLoading ? 'İşleniyor...' : 'Yeni Bilet Al'}
            </button>
            <button
              onClick={handleGoToChat}
              className="event-detail__mobile-button-half event-detail__mobile-button-chat"
            >
              Sohbete Git
            </button>
          </div>
        ) : (
          <button
            onClick={handlePurchase}
            disabled={purchaseLoading}
            className="event-detail__mobile-purchase-button"
          >
            {purchaseLoading ? 'İşleniyor...' : 'Biletini Seç'}
          </button>
        )}
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
              {location.state?.ticketCount > 1 
                ? `${location.state.ticketCount} bilet başarıyla alındı! QR kodlar tüm katılımcıların e-posta adreslerine gönderildi.`
                : `Hazırsın ${user?.isim}! ${event.name} maceranın bileti cebinde. Sohbet grubuna katıl, anılar şimdi başlasın`
              }
            </p>
            
            {location.state?.ticketCount > 1 && participants.length > 0 && (
              <div className="event-detail__participants-info">
                <h3 className="event-detail__participants-title">Katılımcılar:</h3>
                <div className="event-detail__participants-list">
                  <div className="event-detail__participant-item">
                    <span className="event-detail__participant-name">{user?.isim} {user?.soyisim}</span>
                    <span className="event-detail__participant-email">{user?.email}</span>
                  </div>
                  {participants.map((participant, index) => (
                    <div key={index} className="event-detail__participant-item">
                      <span className="event-detail__participant-name">Katılımcı {index + 2}</span>
                      <span className="event-detail__participant-email">{participant.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <button className="event-detail__success-button" onClick={() => {
              handleClosePopup();
              handleGoToChat();
            }}>
              Sohbet Grubuna Git
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EventDetail; 

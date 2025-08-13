import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layouts/PageHeader';
import './EventPurchase.css';

interface Event {
  id: string;
  name: string;
  banner?: string;
  organizerId: string;
  ticketTypes: Array<{
    type: string;
    price: number;
    capacity: number;
  }>;
}

interface SelectedTicket {
  type: string;
  price: number;
  capacity: number;
}

const EventPurchase: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  // Get selectedTicket from location.state or sessionStorage
  const getSelectedTicket = (): SelectedTicket | undefined => {
    if (location.state?.selectedTicket) {
      // If coming from ticket selection, save to sessionStorage
      sessionStorage.setItem(`selectedTicket_${slug}`, JSON.stringify(location.state.selectedTicket));
      return location.state.selectedTicket;
    }
    
    // Try to get from sessionStorage
    const savedTicket = sessionStorage.getItem(`selectedTicket_${slug}`);
    return savedTicket ? JSON.parse(savedTicket) : undefined;
  };

  // Get participants data from location.state or sessionStorage
  const getParticipants = () => {
    if (location.state?.participants) {
      return location.state.participants;
    }
    
    const savedParticipants = sessionStorage.getItem(`participants_${slug}`);
    return savedParticipants ? JSON.parse(savedParticipants) : [];
  };

  const selectedTicket = getSelectedTicket();

  useEffect(() => {
    if (!slug) {
      navigate('/');
      return;
    }

    if (!selectedTicket) {
      navigate(`/events/${slug}/event-ticket-categories`);
      return;
    }

    // Get participants and ticket count from location.state or sessionStorage
    const participantsData = getParticipants();
    if (participantsData.length > 0) {
      setParticipants(participantsData);
      setTicketCount(participantsData.length + 1); // +1 for current user
    }

    fetchEventDetails();
  }, [slug, selectedTicket, navigate]);

  const fetchEventDetails = async () => {
    try {
      // Use the new backendN API endpoint with slug
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/events/slug/${slug}`);
      setEvent(response.data);
    } catch (error) {
      console.error('API Error:', error);
      toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup sessionStorage on unmount
  useEffect(() => {
    return () => {
      sessionStorage.removeItem(`selectedTicket_${slug}`);
    };
  }, [slug]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Bilet almak için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    if (!event || !selectedTicket) return;

    // If multiple tickets, navigate to participant info page
    if (ticketCount > 1) {
      // Save event data to sessionStorage
      sessionStorage.setItem(`event_${slug}`, JSON.stringify(event));
      sessionStorage.setItem(`selectedTicket_${slug}`, JSON.stringify(selectedTicket));
      sessionStorage.setItem(`ticketCount_${slug}`, ticketCount.toString());
      
      navigate(`/events/${slug}/participant-info`, {
        state: {
          event: event,
          selectedTicket: selectedTicket,
          ticketCount: ticketCount
        }
      });
      return;
    }

    // Single ticket purchase
    try {
      setPurchaseLoading(true);
      const token = localStorage.getItem('token');
      
      if (ticketCount === 1) {
        // Single ticket purchase
        await axios.post(
          `${process.env.REACT_APP_API_URL}/tickets`,
          {
            eventId: event.id,
            ticketType: selectedTicket.type,
            price: selectedTicket.price
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        toast.success('Bilet alındı! QR kod e-postanıza gönderildi.');
        navigate('/purchase-success', {
          state: { eventId: event.id }
        });
      } else {
        // Multiple tickets purchase
        const ticketsData = [
          // Current user's ticket
          {
            eventId: event.id,
            ticketType: selectedTicket.type,
            price: selectedTicket.price,
            email: user?.email
          },
          // Additional participants' tickets
          ...participants.map(participant => ({
            eventId: event.id,
            ticketType: selectedTicket.type,
            price: selectedTicket.price,
            email: participant.email,
            phone: participant.phone
          }))
        ];

        // Purchase all tickets
        for (const ticketData of ticketsData) {
          await axios.post(
            `${process.env.REACT_APP_API_URL}/tickets`,
            ticketData,
            {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          );
        }
        
        toast.success(`${ticketCount} bilet başarıyla alındı! QR kodlar e-posta adreslerine gönderildi.`);
        navigate('/purchase-success', {
          state: { eventId: event.id }
        });
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      const errorMessage = error.response?.data?.message || 'Bilet alınırken bir hata oluştu';
      toast.error(errorMessage);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedTicket) return 0;
    return selectedTicket.price * ticketCount;
  };

  if (loading) {
    return (
      <div className="event-purchase">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!event || !selectedTicket) {
    return null;
  }

  return (
    <div className="event-purchase">
      <PageHeader title="Ödeme Sayfası" />
      
      <div className="event-purchase__container">
        <div className="event-purchase__event-info">
          <div className="event-purchase__banner">
            <img
              src={event.banner || '/placeholder-event.jpg'}
              alt={event.name}
              className="event-purchase__banner-image"
            />
          </div>

          <h1 className="event-purchase__title">{event.name}</h1>
          <h2 className="event-purchase__organizer">Organizatör</h2>

          <div className="event-purchase__ticket-info">
            <div className="event-purchase__info-row">
              <span className="event-purchase__info-label">Bilet Grubu</span>
              <span className="event-purchase__info-value">{selectedTicket.type}</span>
            </div>
            <div className="event-purchase__info-row">
              <span className="event-purchase__info-label">Bilet Fiyatı</span>
              <span className="event-purchase__info-value">{selectedTicket.price} TL</span>
            </div>
            <div className="event-purchase__info-row">
              <span className="event-purchase__info-label">Hizmet Bedeli</span>
              <span className="event-purchase__info-value">Ücretsiz</span>
            </div>
          </div>

          <div className="event-purchase__total">
            <span className="event-purchase__total-label">Toplam Tutar</span>
            <span className="event-purchase__total-amount">
              {calculateTotal()} TL
            </span>
          </div>

          <div className="event-purchase__quantity-selector">
            <button
              onClick={() => setTicketCount(prev => Math.max(1, prev - 1))}
              className="event-purchase__quantity-button"
              disabled={ticketCount <= 1}
            >
              -
            </button>
            <input
              type="number"
              max={selectedTicket.capacity}
              value={ticketCount}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setTicketCount(Math.max(1, Math.min(selectedTicket.capacity, value)));
              }}
              className="event-purchase__quantity-input"
            />
            <button
              onClick={() => setTicketCount(prev => Math.min(selectedTicket.capacity, prev + 1))}
              className="event-purchase__quantity-button"
              disabled={ticketCount >= selectedTicket.capacity}
            >
              +
            </button>
          </div>

          <button
            onClick={handlePurchase}
            disabled={purchaseLoading}
            className="event-purchase__submit-button"
          >
            {purchaseLoading ? 'İşleniyor...' : ticketCount > 1 ? 'Devam Et' : 'Ödeme Yap'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPurchase; 
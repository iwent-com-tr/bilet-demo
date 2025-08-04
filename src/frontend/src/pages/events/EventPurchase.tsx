import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layouts/PageHeader';
import './EventPurchase.css';

interface Event {
  id: string;
  ad: string;
  banner: string;
  organizator: string;
  bilet_tipleri: Array<{
    tip: string;
    fiyat: number;
    kapasite: number;
  }>;
}

interface SelectedTicket {
  tip: string;
  fiyat: number;
  kapasite: number;
}

const EventPurchase: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(1);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Get selectedTicket from location.state or sessionStorage
  const getSelectedTicket = (): SelectedTicket | undefined => {
    if (location.state?.selectedTicket) {
      // If coming from ticket selection, save to sessionStorage
      sessionStorage.setItem(`selectedTicket_${id}`, JSON.stringify(location.state.selectedTicket));
      return location.state.selectedTicket;
    }
    
    // Try to get from sessionStorage
    const savedTicket = sessionStorage.getItem(`selectedTicket_${id}`);
    return savedTicket ? JSON.parse(savedTicket) : undefined;
  };

  const selectedTicket = getSelectedTicket();

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    if (!selectedTicket) {
      navigate(`/events/${id}/tickets`);
      return;
    }

    fetchEventDetails();
  }, [id, selectedTicket, navigate]);

  const fetchEventDetails = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/event/${id}`);
      setEvent(response.data.event);
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
      sessionStorage.removeItem(`selectedTicket_${id}`);
    };
  }, [id]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Bilet almak için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    if (!event || !selectedTicket) return;

    try {
      setPurchaseLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/ticket/purchase`,
        {
          event_id: event.id,
          bilet_tipi: selectedTicket.tip,
          adet: ticketCount
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success('Bilet alındı! QR kod e-postanıza gönderildi.');
      navigate('/purchase-success', {
        state: { eventId: id }
      });
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
    return selectedTicket.fiyat * ticketCount;
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
              alt={event.ad}
              className="event-purchase__banner-image"
            />
          </div>

          <h1 className="event-purchase__title">{event.ad}</h1>
          <h2 className="event-purchase__organizer">Wake Up Works</h2>

          <div className="event-purchase__ticket-info">
            <div className="event-purchase__info-row">
              <span className="event-purchase__info-label">Bilet Grubu</span>
              <span className="event-purchase__info-value">{selectedTicket.tip}</span>
            </div>
            <div className="event-purchase__info-row">
              <span className="event-purchase__info-label">Bilet Fiyatı</span>
              <span className="event-purchase__info-value">{selectedTicket.fiyat} TL</span>
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
            >
              -
            </button>
            <span className="event-purchase__quantity">{ticketCount}</span>
            <button
              onClick={() => setTicketCount(prev => Math.min(5, prev + 1))}
              className="event-purchase__quantity-button"
            >
              +
            </button>
          </div>

          <button
            onClick={handlePurchase}
            disabled={purchaseLoading}
            className="event-purchase__submit-button"
          >
            {purchaseLoading ? 'İşleniyor...' : 'Ödeme Yap'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPurchase; 
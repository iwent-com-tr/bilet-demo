import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface PurchaseState {
  eventId: string;
  ticketType: string;
  quantity: number;
}

interface Event {
  id: string;
  ad: string;
  banner: string;
  bilet_tipleri: Array<{
    tip: string;
    fiyat: number;
    kapasite: number;
  }>;
  baslangic_tarih: string;
  yer: string;
}

const EventPurchase: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseState, setPurchaseState] = useState<PurchaseState | null>(null);

  useEffect(() => {
    if (!location.state?.eventId || !location.state?.ticketType || !location.state?.quantity) {
      toast.error('Geçersiz satın alma bilgileri');
      navigate('/');
      return;
    }

    setPurchaseState({
      eventId: location.state.eventId,
      ticketType: location.state.ticketType,
      quantity: location.state.quantity
    });

    fetchEventDetails(location.state.eventId);
  }, [location.state]);

  const fetchEventDetails = async (eventId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/event/${eventId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setEvent(response.data.event);
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      navigate('/');
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Bilet almak için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    if (!purchaseState || !event) return;

    try {
      setPurchaseLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${process.env.REACT_APP_API_URL}/ticket/purchase`,
        {
          event_id: purchaseState.eventId,
          bilet_tipi: purchaseState.ticketType,
          adet: purchaseState.quantity
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      toast.success('Bilet alındı! QR kod e-postanıza gönderildi.');
      navigate('/purchase-success');
    } catch (error: any) {
      console.error('Purchase error:', error);
      const errorMessage = error.response?.data?.message || 'Bilet alınırken bir hata oluştu';
      toast.error(errorMessage);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!event || !purchaseState) return 0;
    const ticket = event.bilet_tipleri.find(t => t.tip === purchaseState.ticketType);
    return (ticket?.fiyat || 0) * purchaseState.quantity;
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

  if (loading || !event || !purchaseState) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const selectedTicket = event.bilet_tipleri.find(t => t.tip === purchaseState.ticketType);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Bilet Satın Alma</h1>

          {/* Event Summary */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <img
                src={event.banner || '/placeholder-event.jpg'}
                alt={event.ad}
                className="w-20 h-20 object-cover rounded"
              />
              <div>
                <h2 className="text-xl font-semibold">{event.ad}</h2>
                <p className="text-gray-600">{formatDate(event.baslangic_tarih)}</p>
                <p className="text-gray-600">{event.yer}</p>
              </div>
            </div>
          </div>

          {/* Purchase Details */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Bilet Tipi</span>
              <span className="font-medium">{purchaseState.ticketType}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Bilet Adedi</span>
              <span className="font-medium">{purchaseState.quantity}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Bilet Fiyatı</span>
              <span className="font-medium">
                {selectedTicket?.fiyat.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b text-lg font-bold">
              <span>Toplam</span>
              <span>
                {calculateTotal().toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={() => navigate(`/events/${event.id}`)}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Geri Dön
            </button>
            <button
              onClick={handlePurchase}
              disabled={purchaseLoading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {purchaseLoading ? 'İşleniyor...' : 'Satın Almayı Onayla'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPurchase; 
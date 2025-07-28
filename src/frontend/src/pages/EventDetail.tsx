import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

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

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

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

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('Bilet almak için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    try {
      setPurchaseLoading(true);
      await axios.post(`${process.env.REACT_APP_API_URL}/ticket/purchase`, {
        event_id: id,
        bilet_tipi: selectedTicket,
        adet: ticketCount
      });
      toast.success('Bilet alındı! QR kod e-postanıza gönderildi.');
      navigate('/my-tickets');
    } catch (error) {
      toast.error('Bilet alınırken bir hata oluştu');
    } finally {
      setPurchaseLoading(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Etkinlik bulunamadı</h3>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Banner */}
      <div className="aspect-w-16 aspect-h-9 mb-8">
        <img
          src={event.banner || '/placeholder-event.jpg'}
          alt={event.ad}
          className="object-cover w-full h-full rounded-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Event Info */}
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold mb-4">{event.ad}</h1>
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Etkinlik Detayları</h2>
              <div className="space-y-2 text-gray-600">
                <p>
                  <span className="font-medium">Kategori:</span> {event.kategori}
                </p>
                <p>
                  <span className="font-medium">Başlangıç:</span> {formatDate(event.baslangic_tarih)}
                </p>
                <p>
                  <span className="font-medium">Bitiş:</span> {formatDate(event.bitis_tarih)}
                </p>
                <p>
                  <span className="font-medium">Yer:</span> {event.yer}
                </p>
                <p>
                  <span className="font-medium">Adres:</span> {event.adres}
                </p>
                <p>
                  <span className="font-medium">Şehir:</span> {event.il}
                </p>
              </div>
            </div>

            {event.aciklama && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Açıklama</h2>
                <p className="text-gray-600 whitespace-pre-line">{event.aciklama}</p>
              </div>
            )}

            {Object.keys(event.sosyal_medya).length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Sosyal Medya</h2>
                <div className="flex space-x-4">
                  {Object.entries(event.sosyal_medya).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Purchase */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Bilet Al</h2>

          {event.bilet_tipleri.length > 0 ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="bilet_tipi" className="block text-sm font-medium text-gray-700 mb-1">
                  Bilet Tipi
                </label>
                <select
                  id="bilet_tipi"
                  value={selectedTicket}
                  onChange={e => setSelectedTicket(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  {event.bilet_tipleri.map(bilet => (
                    <option key={bilet.tip} value={bilet.tip}>
                      {bilet.tip} - {bilet.fiyat} TL
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="adet" className="block text-sm font-medium text-gray-700 mb-1">
                  Adet
                </label>
                <select
                  id="adet"
                  value={ticketCount}
                  onChange={e => setTicketCount(parseInt(e.target.value))}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between mb-4">
                  <span className="font-medium">Toplam</span>
                  <span className="font-bold">
                    {(
                      event.bilet_tipleri.find(b => b.tip === selectedTicket)?.fiyat || 0
                    ).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </span>
                </div>

                <button
                  onClick={handlePurchase}
                  disabled={purchaseLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {purchaseLoading ? 'İşleniyor...' : 'Satın Al'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">Bu etkinlik için bilet satışı yapılmıyor.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetail; 
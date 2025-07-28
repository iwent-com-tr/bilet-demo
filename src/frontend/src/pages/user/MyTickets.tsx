import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Ticket {
  id: string;
  event: string;
  bilet_tipi: string;
  durum: 'aktif' | 'kullanildi' | 'iptal';
  qr_kod: string;
  giris_zamani: string | null;
}

const MyTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/ticket/my-tickets`);
      setTickets(response.data.tickets);
      setLoading(false);
    } catch (error) {
      toast.error('Biletler yüklenirken bir hata oluştu');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aktif':
        return 'bg-green-100 text-green-800';
      case 'kullanildi':
        return 'bg-gray-100 text-gray-800';
      case 'iptal':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aktif':
        return 'Aktif';
      case 'kullanildi':
        return 'Kullanıldı';
      case 'iptal':
        return 'İptal';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Biletlerim</h1>

      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Henüz biletiniz yok</h3>
          <p className="mt-2 text-sm text-gray-500">
            Etkinliklere göz atıp bilet almaya başlayabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* QR Code */}
              {ticket.durum === 'aktif' && (
                <div className="p-4 border-b bg-gray-50 flex justify-center">
                  <img src={ticket.qr_kod} alt="QR Kod" className="w-48 h-48" />
                </div>
              )}

              {/* Ticket Info */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{ticket.event}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Bilet Tipi:</span> {ticket.bilet_tipi}
                  </p>
                  <p>
                    <span className="font-medium">Durum:</span>{' '}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.durum)}`}>
                      {getStatusText(ticket.durum)}
                    </span>
                  </p>
                  {ticket.giris_zamani && (
                    <p>
                      <span className="font-medium">Giriş Zamanı:</span>{' '}
                      {formatDate(ticket.giris_zamani)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTickets; 
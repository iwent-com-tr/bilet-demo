import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import QRCode from 'qrcode';
import './MyTickets.css';

interface Event {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  banner?: string;
  category: string;
}

interface Ticket {
  id: string;
  eventId: string;
  userId: string;
  ticketType: string;
  price: number;
  status: 'ACTIVE' | 'USED' | 'CANCELLED';
  qrCode: string;
  referenceCode: string;
  entryTime?: string;
  createdAt: string;
  event: Event;
}

const MyTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchTickets();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Generate QR codes for all tickets when tickets change
    if (tickets.length > 0) {
      generateAllQRCodes();
    }
  }, [tickets]);

  const generateAllQRCodes = async () => {
    const newQrCodes: { [key: string]: string } = {};
    
    for (const ticket of tickets) {
      if (ticket.status === 'ACTIVE') {
        try {
          const qrDataUrl = await generateQRCode(ticket.referenceCode, ticket.eventId, ticket.userId);
          newQrCodes[ticket.id] = qrDataUrl;
        } catch (error) {
          console.error(`Error generating QR for ticket ${ticket.id}:`, error);
        }
      }
    }
    
    setQrCodes(newQrCodes);
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/tickets/my-tickets`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setTickets(response.data.tickets || []);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      const errorMessage = error.response?.data?.message || 'Biletler yüklenirken bir hata oluştu';
      toast.error(errorMessage);
    } finally {
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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'my-tickets__status-badge--aktif';
      case 'USED':
        return 'my-tickets__status-badge--kullanildi';
      case 'CANCELLED':
        return 'my-tickets__status-badge--iptal';
      default:
        return 'my-tickets__status-badge--kullanildi';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Aktif';
      case 'USED':
        return 'Kullanıldı';
      case 'CANCELLED':
        return 'İptal';
      default:
        return status;
    }
  };

  const generateQRCode = async (referenceCode: string, eventId: string, userId: string): Promise<string> => {
    try {
      const qrPayload = JSON.stringify({ t: 'ticket', id: referenceCode, e: eventId, u: userId });
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      // Fallback to a simple text display if QR generation fails
      return `data:image/svg+xml;base64,${btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
          <rect width="200" height="200" fill="white"/>
          <text x="100" y="100" text-anchor="middle" font-family="monospace" font-size="12">${referenceCode}</text>
        </svg>
      `)}`;
    }
  };

  if (loading) {
    return (
      <div className="my-tickets__loading">
        <div className="my-tickets__spinner" />
      </div>
    );
  }

  return (
    <div className="my-tickets">
      <div className="my-tickets__header">
        <h1 className="my-tickets__title">→ Biletlerim</h1>
        <p className="my-tickets__subtitle">Satın aldığınız biletlerin detaylarını görüntüleyin ve etkinlik sohbetine katılın.</p>
      </div>

      {tickets.length === 0 ? (
        <div className="my-tickets__empty">
          <h3 className="my-tickets__empty-title">Henüz biletiniz yok</h3>
          <p className="my-tickets__empty-text">Etkinliklere göz atıp bilet almaya başlayabilirsiniz.</p>
          <button 
            className="my-tickets__empty-button"
            onClick={() => navigate('/events')}
          >
            Etkinliklere Göz At
          </button>
        </div>
      ) : (
        <div className="my-tickets__grid">
          {tickets.map(ticket => (
            <div key={ticket.id} className="my-tickets__card">
              {ticket.status === 'ACTIVE' && (
                <div className="my-tickets__qr">
                  {qrCodes[ticket.id] ? (
                    <img 
                      src={qrCodes[ticket.id]} 
                      alt="QR Kod" 
                      className="my-tickets__qr-image" 
                    />
                  ) : (
                    <div className="my-tickets__qr-loading">
                      <div className="my-tickets__qr-spinner"></div>
                      <span>QR Kod Yükleniyor...</span>
                    </div>
                  )}
                  <div className="my-tickets__qr-info">
                    <span className="my-tickets__qr-code">{ticket.referenceCode}</span>
                  </div>
                </div>
              )}

              <div className="my-tickets__content">
                <div className="my-tickets__event-header">
                  {ticket.event.banner && (
                    <img 
                      src={ticket.event.banner} 
                      alt={ticket.event.name} 
                      className="my-tickets__event-banner"
                    />
                  )}
                  <div className="my-tickets__event-info">
                    <h3 className="my-tickets__event-name">{ticket.event.name}</h3>
                    <span className="my-tickets__event-category">{ticket.event.category}</span>
                  </div>
                </div>

                <div className="my-tickets__meta">
                  <div className="my-tickets__meta-row">
                    <span className="my-tickets__meta-label">Bilet Tipi</span>
                    <span className="my-tickets__meta-value">{ticket.ticketType}</span>
                  </div>
                  <div className="my-tickets__meta-row">
                    <span className="my-tickets__meta-label">Fiyat</span>
                    <span className="my-tickets__meta-value">{ticket.price} TL</span>
                  </div>
                  <div className="my-tickets__meta-row">
                    <span className="my-tickets__meta-label">Durum</span>
                    <span className={`my-tickets__status-badge ${getStatusClass(ticket.status)}`}>
                      {getStatusText(ticket.status)}
                    </span>
                  </div>
                  <div className="my-tickets__meta-row">
                    <span className="my-tickets__meta-label">Etkinlik Tarihi</span>
                    <span className="my-tickets__meta-value">
                      {formatDate(ticket.event.startDate)}
                    </span>
                  </div>
                  <div className="my-tickets__meta-row">
                    <span className="my-tickets__meta-label">Mekan</span>
                    <span className="my-tickets__meta-value">
                      {ticket.event.venue}, {ticket.event.city}
                    </span>
                  </div>
                  {ticket.entryTime && (
                    <div className="my-tickets__meta-row">
                      <span className="my-tickets__meta-label">Giriş Zamanı</span>
                      <span className="my-tickets__meta-value">{formatDate(ticket.entryTime)}</span>
                    </div>
                  )}
                </div>

                <div className="my-tickets__actions">
                  <button
                    className="my-tickets__action-btn my-tickets__action-btn--secondary"
                    onClick={() => navigate(`/events/${ticket.event.slug}`)}
                  >
                    Etkinlik Detayı
                  </button>
                  <button
                    className={`my-tickets__action-btn ${ticket.status === 'ACTIVE' ? 'my-tickets__action-btn--primary' : 'my-tickets__action-btn--disabled'}`}
                    onClick={() => navigate(`/events/${ticket.event.slug}/chat`)}
                    disabled={ticket.status !== 'ACTIVE'}
                  >
                    Sohbete Gir
                  </button>
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
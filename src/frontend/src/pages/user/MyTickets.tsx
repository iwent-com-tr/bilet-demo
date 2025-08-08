import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './MyTickets.css';

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
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchTickets();
  }, [isAuthenticated, navigate]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/ticket/my-tickets`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.durum === 1) {
        setTickets(response.data.tickets);
      } else {
        toast.error('Biletler yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      const errorMessage = error.response?.data?.message || 'Biletler yüklenirken bir hata oluştu';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const extractEventIdFromQrUrl = (qrUrl: string): string | null => {
    try {
      const url = new URL(qrUrl);
      const dataParam = url.searchParams.get('data');
      if (!dataParam) return null;
      const decoded = decodeURIComponent(dataParam);
      const parsed = JSON.parse(decoded);
      return parsed.event_id || null;
    } catch (e) {
      return null;
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
      case 'aktif':
        return 'my-tickets__status-badge--aktif';
      case 'kullanildi':
        return 'my-tickets__status-badge--kullanildi';
      case 'iptal':
        return 'my-tickets__status-badge--iptal';
      default:
        return 'my-tickets__status-badge--kullanildi';
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
        </div>
      ) : (
        <div className="my-tickets__grid">
          {tickets.map(ticket => {
            const eventId = extractEventIdFromQrUrl(ticket.qr_kod);
            const canChat = !!eventId;
            return (
              <div key={ticket.id} className="my-tickets__card">
                {ticket.durum === 'aktif' && (
                  <div className="my-tickets__qr">
                    <img src={ticket.qr_kod} alt="QR Kod" className="my-tickets__qr-image" />
                  </div>
                )}

                <div className="my-tickets__content">
                  <h3 className="my-tickets__event-name">{ticket.event}</h3>
                  <div className="my-tickets__meta">
                    <div className="my-tickets__meta-row">
                      <span className="my-tickets__meta-label">Bilet Tipi</span>
                      <span className="my-tickets__meta-value">{ticket.bilet_tipi}</span>
                    </div>
                    <div className="my-tickets__meta-row">
                      <span className="my-tickets__meta-label">Durum</span>
                      <span className={`my-tickets__status-badge ${getStatusClass(ticket.durum)}`}>
                        {getStatusText(ticket.durum)}
                      </span>
                    </div>
                    {ticket.giris_zamani && (
                      <div className="my-tickets__meta-row">
                        <span className="my-tickets__meta-label">Giriş Zamanı</span>
                        <span className="my-tickets__meta-value">{formatDate(ticket.giris_zamani)}</span>
                      </div>
                    )}
                  </div>

                  <div className="my-tickets__actions">
                    <button
                      className="my-tickets__action-btn my-tickets__action-btn--secondary"
                      onClick={() => navigate('/events')}
                    >
                      Etkinliklere Göz At
                    </button>
                    <button
                      className={`my-tickets__action-btn ${canChat ? 'my-tickets__action-btn--primary' : 'my-tickets__action-btn--disabled'}`}
                      onClick={() => canChat && navigate(`/events/${eventId}/chat`)}
                      disabled={!canChat}
                    >
                      Sohbete Gir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyTickets; 
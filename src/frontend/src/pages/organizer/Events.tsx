import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './Events.css';

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
  description?: string;
  status: string;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

const OrganizerEvents: React.FC = () => {
  const { user, isAuthenticated, isOrganizer, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!isOrganizer) {
      navigate('/');
      return;
    }
    
    fetchEvents();
  }, [isAuthenticated, isOrganizer, navigate, authLoading, user?.id]);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !user?.id) {
        navigate('/login');
        return;
      }

      // Use the new endpoint with organizerId
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/events/organizer/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // New API returns data directly in the data array
      if (response.data && response.data.data) {
        setEvents(response.data.data);
      } else {
        setEvents([]);
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Etkinlik listeleme hatası:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      } else if (error.response?.status === 403) {
        toast.error('Bu etkinliklere erişim yetkiniz yok');
      } else {
        toast.error('Etkinlikler yüklenirken bir hata oluştu');
      }
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  };



  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Taslak';
      case 'ACTIVE':
        return 'Yayında';
      case 'CANCELLED':
        return 'İptal';
      case 'COMPLETED':
        return 'Tamamlandı';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'taslak';
      case 'ACTIVE':
        return 'yayinda';
      case 'CANCELLED':
        return 'iptal';
      case 'COMPLETED':
        return 'tamamlandi';
      default:
        return status.toLowerCase();
    }
  };

  const getCategoryText = (category: string) => {
    const categoryDictionary: { [key: string]: string } = {
      'CONCERT': 'Konser',
      'FESTIVAL': 'Festival',
      'UNIVERSITY': 'Üniversite',
      'WORKSHOP': 'Atölye',
      'CONFERENCE': 'Konferans',
      'SPORT': 'Spor',
      'PERFORMANCE': 'Performans',
      'EDUCATION': 'Eğitim'
    };
    
    return categoryDictionary[category] || category;
  };

  if (authLoading || loading) {
    return (
      <div className="organizer-events">
        <div className="organizer-events__loading">
          <div className="organizer-events__spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="organizer-events">
      <div className="organizer-events__container">
        <div className="organizer-events__header">
          <h1 className="organizer-events__title">→ Etkinliklerim</h1>
          <Link
            to="/organizer/events/create"
            className="organizer-events__create-button"
          >
            <svg 
              className="organizer-events__create-icon" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Yeni Etkinlik
          </Link>
        </div>

        <div className="organizer-events__content">
          {events.length === 0 ? (
            <div className="organizer-events__empty">
              <h3 className="organizer-events__empty-title">Henüz etkinliğiniz yok</h3>
              <p className="organizer-events__empty-description">
                İlk etkinliğinizi oluşturmak için "Yeni Etkinlik" butonuna tıklayın.
              </p>
            </div>
          ) : (
            <div className="organizer-events__table-container">
              <table className="organizer-events__table">
                <thead className="organizer-events__table-header">
                  <tr>
                    <th>Etkinlik</th>
                    <th>Kategori</th>
                    <th>Tarih</th>
                    <th>Mekan</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => (
                    <tr key={event.id} className="organizer-events__table-row">
                      <td className="organizer-events__table-cell">
                        <div className="organizer-events__event-info">
                          <p className="organizer-events__event-name">{event.name}</p>
                          <p className="organizer-events__event-city">{event.city}</p>
                        </div>
                      </td>
                      <td className="organizer-events__table-cell">
                        <span className="organizer-events__category">{getCategoryText(event.category)}</span>
                      </td>
                      <td className="organizer-events__table-cell">
                        <p className="organizer-events__event-date">{formatDate(event.startDate)}</p>
                      </td>
                      <td className="organizer-events__table-cell">
                        <div className="organizer-events__venue-info">
                          <p className="organizer-events__venue-name">{event.venue}</p>
                          <p className="organizer-events__venue-address">{event.address}</p>
                        </div>
                      </td>
                      <td className="organizer-events__table-cell">
                        <span className={`organizer-events__status organizer-events__status--${getStatusClass(event.status)}`}>
                          {getStatusText(event.status)}
                        </span>
                      </td>
                      <td className="organizer-events__table-cell">
                        <div className="organizer-events__actions">
                          <Link
                            to={`/organizer/events/${event.id}/edit`}
                            className="organizer-events__action-link"
                          >
                            Düzenle
                          </Link>
                          <Link
                            to={`/events/${event.id}/chat`}
                            className="organizer-events__action-link organizer-events__action-link--chat"
                          >
                            💬 Sohbet
                          </Link>
                          <Link
                            to={`/organizer/events/${event.id}/stats`}
                            className="organizer-events__action-link organizer-events__action-link--secondary"
                          >
                            📊 İstatistik
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerEvents; 
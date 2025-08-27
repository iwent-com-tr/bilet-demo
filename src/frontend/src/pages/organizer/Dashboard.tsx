import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

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

interface Stats {
  totalTickets: number;
  usedTickets: number;
  cancelledTickets: number;
  totalRevenue: number;
  averagePrice: number;
  ticketTypeBreakdown: Array<{
    type: string;
    count: number;
    used: number;
    cancelled: number;
    revenue: number;
    averagePrice: number;
  }>;
  salesOverTime: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
  usageStats: {
    usagePercentage: number;
    remainingTickets: number;
    peakEntryTime?: string;
  };
}

const OrganizerDashboard: React.FC = () => {
  const { user, isAuthenticated, isOrganizer, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  
  // Notification states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    type: 'update', // 'update' | 'reminder'
    updateType: 'general_update', // 'time_change' | 'venue_change' | 'general_update'
    title: '',
    message: '',
    hoursBeforeEvent: 24
  });

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

  useEffect(() => {
    if (selectedEvent) {
      fetchEventStats();
    }
  }, [selectedEvent]);

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token, redirecting to login');
        navigate('/login');
        return;
      }

      console.log('Fetching dashboard events for organizer:', user.id);
      
      // Use the new organizer events endpoint that gets ALL events (all statuses)
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizers/${user.id}/events?page=1&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Dashboard API Response:', response.data);
      
      if (response.data && response.data.data) {
        const fetchedEvents = response.data.data.filter((event: any) => {
          if (!event || !event.id) {
            console.warn('Invalid event found:', event);
            return false;
          }
          return true;
        });
        
        console.log('Valid dashboard events:', fetchedEvents.length);
        setEvents(fetchedEvents);
        
        // Check if eventId is provided in URL parameters
        const eventIdFromUrl = searchParams.get('eventId');
        
        if (eventIdFromUrl && fetchedEvents.find((event: Event) => event.id === eventIdFromUrl)) {
          // If eventId is in URL and exists in events, select it
          setSelectedEvent(eventIdFromUrl);
          
          // Clean up URL parameter after successful selection
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('eventId');
          const newUrl = `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
        } else if (fetchedEvents.length > 0) {
          // Otherwise, select the first event as default
          setSelectedEvent(fetchedEvents[0].id);
        }
      } else {
        console.log('No events data found in response');
        setEvents([]);
      }
    } catch (error: any) {
      console.error('Dashboard events fetching error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      } else if (error.response?.status === 403) {
        toast.error('Bu etkinliklere erişim yetkiniz yok');
      } else {
        toast.error('Etkinlikler yüklenirken bir hata oluştu');
      }
      
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, navigate, searchParams]);

  const fetchEventStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Use the new stats endpoint
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/events/${selectedEvent}/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      // New API returns stats directly
      if (response.data && response.data.stats) {
        setStats(response.data.stats);
      } else {
        setStats(null);
      }
    } catch (error: any) {
      console.error('İstatistik yükleme hatası:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      } else if (error.response?.status === 403) {
        toast.error('Bu etkinlik istatistiklerine erişim yetkiniz yok');
      } else if (error.response?.status === 404) {
        toast.error('Etkinlik bulunamadı');
      } else {
        toast.error('İstatistikler yüklenirken bir hata oluştu');
      }
      setStats(null);
    }
  };

  const formatDate = (date: string) => {
    try {
      if (!date) return '-';
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '-';
      
      return dateObj.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '-';
    }
  };

  const formatCurrency = (amount: number) => {
    try {
      if (typeof amount !== 'number' || isNaN(amount)) return '₺0';
      return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    } catch (error) {
      console.error('Currency formatting error:', error);
      return '₺0';
    }
  };

  const calculateTicketUsagePercentage = () => {
    if (!stats || stats.totalTickets === 0 || !stats.usageStats) return 0;
    return stats.usageStats.usagePercentage || 0;
  };

  const getSelectedEventName = () => {
    const event = events.find(e => e.id === selectedEvent);
    return event ? String(event.name || 'İsimsiz Etkinlik') : '';
  };

  const downloadReport = async () => {
    if (!selectedEvent) {
      toast.error('Lütfen bir etkinlik seçin');
      return;
    }

    setReportLoading(true);
    
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/organizers/event/${selectedEvent}/report`,
        {
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Dosya adını response header'dan al veya varsayılan oluştur
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'etkinlik_raporu.xlsx';
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (fileNameMatch) {
          fileName = decodeURIComponent(fileNameMatch[1].replace(/['"]/g, ''));
        }
      }

      // Blob'u indirilebilir link oluştur
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Rapor başarıyla indirildi! 📊');
    } catch (error: any) {
      console.error('Rapor indirme hatası:', error);
      
      if (error.response?.status === 404) {
        toast.error('Etkinlik bulunamadı');
      } else if (error.response?.status === 403) {
        toast.error('Bu etkinlik için rapor indirme yetkiniz yok');
      } else {
        toast.error('Rapor indirilirken bir hata oluştu');
      }
    } finally {
      setReportLoading(false);
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEvent) {
      toast.error('Lütfen bir etkinlik seçin');
      return;
    }

    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      toast.error('Başlık ve mesaj alanları zorunludur');
      return;
    }

    setNotificationLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      if (notificationForm.type === 'reminder') {
        // Send reminder
        const selectedEventData = events.find(e => e.id === selectedEvent);
        await axios.post(
          `${process.env.REACT_APP_API_URL}/events/${selectedEvent}/send-reminder`,
          {
            hoursBeforeEvent: notificationForm.hoursBeforeEvent
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        toast.success(`Etkinlik hatırlatması gönderildi! (${notificationForm.hoursBeforeEvent} saat öncesi)`);
      } else {
        // Send update notification
        await axios.post(
          `${process.env.REACT_APP_API_URL}/events/${selectedEvent}/notify-update`,
          {
            updateType: notificationForm.updateType,
            message: notificationForm.message
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        toast.success('Etkinlik güncellemesi bilet sahiplerine gönderildi! 📱');
      }

      // Reset form and close modal
      setNotificationForm({
        type: 'update',
        updateType: 'general_update',
        title: '',
        message: '',
        hoursBeforeEvent: 24
      });
      setShowNotificationModal(false);
    } catch (error: any) {
      console.error('Bildirim gönderme hatası:', error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      } else if (error.response?.status === 403) {
        toast.error('Bu işlem için yetkiniz yok');
      } else if (error.response?.status === 404) {
        toast.error('Etkinlik bulunamadı');
      } else {
        toast.error('Bildirim gönderilirken bir hata oluştu');
      }
    } finally {
      setNotificationLoading(false);
    }
  };

  const openNotificationModal = (type: 'update' | 'reminder') => {
    if (!selectedEvent) {
      toast.error('Lütfen bir etkinlik seçin');
      return;
    }

    const selectedEventData = events.find(e => e.id === selectedEvent);
    
    setNotificationForm({
      type,
      updateType: type === 'update' ? 'general_update' : notificationForm.updateType,
      title: type === 'reminder' 
        ? `${selectedEventData?.name} Hatırlatması`
        : `${selectedEventData?.name} Güncelleme`,
      message: type === 'reminder'
        ? `${selectedEventData?.name} etkinliği yaklaşıyor! Hazırlıklarınızı tamamlamayı unutmayın.`
        : '',
      hoursBeforeEvent: 24
    });
    setShowNotificationModal(true);
  };

  if (authLoading || loading) {
    return (
      <div className="organizer-dashboard__loading">
        <div className="organizer-dashboard__spinner"></div>
      </div>
    );
  }

  return (
    <div className="organizer-dashboard">
      <div className="organizer-dashboard__container">
        {/* Header */}
        <div className="organizer-dashboard__header">
          <div>
            <h1 className="organizer-dashboard__title">Kontrol Paneli</h1>
            <p className="organizer-dashboard__subtitle">
              Etkinliklerinizi yönetin ve performansınızı takip edin
            </p>
          </div>
          <Link
            to="/organizer/events/create"
            className="organizer-dashboard__create-button"
          >
            <span>+</span>
            Yeni Etkinlik
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="organizer-dashboard__empty">
            <div className="organizer-dashboard__empty-icon">
              🎯
            </div>
            <h3 className="organizer-dashboard__empty-title">Henüz etkinliğiniz yok</h3>
            <p className="organizer-dashboard__empty-description">
              İlk etkinliğinizi oluşturmak ve satış yapmaya başlamak için "Yeni Etkinlik" butonuna tıklayın.
              Etkinlik oluşturduktan sonra burada tüm istatistiklerinizi görebileceksiniz.
            </p>
            <Link
              to="/organizer/events/create"
              className="organizer-dashboard__create-button"
            >
              <span>+</span>
              İlk Etkinliğinizi Oluşturun
            </Link>
          </div>
        ) : (
          <>
            {/* Event Selector */}
            <div className="organizer-dashboard__event-selector">
              <h3 className="organizer-dashboard__selector-label">
                Etkinlik Seçin
              </h3>
              <select
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
                className="organizer-dashboard__select"
              >
                {events
                  .filter(event => event && event.id && event.name)
                  .map(event => (
                  <option key={event.id} value={event.id}>
                    {String(event.name || 'İsimsiz Etkinlik')} - {event.startDate ? formatDate(String(event.startDate)) : '-'}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Stats Row */}
            {stats && (
              <div className="organizer-dashboard__quick-stats">
                <div className="organizer-dashboard__quick-stat">
                  <div className="organizer-dashboard__quick-stat-icon">📊</div>
                  <div className="organizer-dashboard__quick-stat-content">
                    <p className="organizer-dashboard__quick-stat-label">Kullanım Oranı</p>
                    <p className="organizer-dashboard__quick-stat-value">{calculateTicketUsagePercentage()}%</p>
                  </div>
                </div>
                <div className="organizer-dashboard__quick-stat">
                  <div className="organizer-dashboard__quick-stat-icon">🎫</div>
                  <div className="organizer-dashboard__quick-stat-content">
                    <p className="organizer-dashboard__quick-stat-label">Kalan Bilet</p>
                    <p className="organizer-dashboard__quick-stat-value">{stats.usageStats?.remainingTickets || 0}</p>
                  </div>
                </div>
                <div className="organizer-dashboard__quick-stat">
                  <div className="organizer-dashboard__quick-stat-icon">💬</div>
                  <div className="organizer-dashboard__quick-stat-content">
                    <p className="organizer-dashboard__quick-stat-label">Sohbet</p>
                    <p className="organizer-dashboard__quick-stat-value">Aktif</p>
                  </div>
                </div>
                <div className="organizer-dashboard__quick-stat">
                  <div className="organizer-dashboard__quick-stat-icon">🎭</div>
                  <div className="organizer-dashboard__quick-stat-content">
                    <p className="organizer-dashboard__quick-stat-label">Etkinlik</p>
                    <p className="organizer-dashboard__quick-stat-value">{getSelectedEventName()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Stats */}
            {stats && (
              <div className="organizer-dashboard__stats">
                <div className="organizer-dashboard__stat-card">
                  <div className="organizer-dashboard__stat-header">
                    <h3 className="organizer-dashboard__stat-title">Toplam Bilet</h3>
                    <div className="organizer-dashboard__stat-icon">🎫</div>
                  </div>
                  <p className="organizer-dashboard__stat-value">{stats.totalTickets}</p>
                  <div className="organizer-dashboard__progress">
                    <div className="organizer-dashboard__progress-bar">
                      <div 
                        className="organizer-dashboard__progress-fill" 
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="organizer-dashboard__stat-card">
                  <div className="organizer-dashboard__stat-header">
                    <h3 className="organizer-dashboard__stat-title">Kullanılan Bilet</h3>
                    <div className="organizer-dashboard__stat-icon">✅</div>
                  </div>
                  <p className="organizer-dashboard__stat-value">{stats.usedTickets}</p>
                  <div className="organizer-dashboard__progress">
                    <div className="organizer-dashboard__progress-bar">
                      <div 
                        className="organizer-dashboard__progress-fill" 
                        style={{ width: `${calculateTicketUsagePercentage()}%` }}
                      ></div>
                    </div>
                    <p className="organizer-dashboard__progress-text">{calculateTicketUsagePercentage()}%</p>
                  </div>
                </div>

                <div className="organizer-dashboard__stat-card">
                  <div className="organizer-dashboard__stat-header">
                    <h3 className="organizer-dashboard__stat-title">İptal Edilen</h3>
                    <div className="organizer-dashboard__stat-icon">❌</div>
                  </div>
                  <p className="organizer-dashboard__stat-value">{stats.cancelledTickets}</p>
                  <div className="organizer-dashboard__stat-change">
                    {stats.cancelledTickets === 0 ? (
                      <span className="organizer-dashboard__stat-change--positive">Hiç iptal yok! 🎉</span>
                    ) : (
                      <span>Son 30 gün</span>
                    )}
                  </div>
                </div>

                <div className="organizer-dashboard__stat-card">
                  <div className="organizer-dashboard__stat-header">
                    <h3 className="organizer-dashboard__stat-title">Toplam Kazanç</h3>
                    <div className="organizer-dashboard__stat-icon">💰</div>
                  </div>
                  <p className="organizer-dashboard__stat-value organizer-dashboard__stat-value--currency">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                  <div className="organizer-dashboard__stat-change organizer-dashboard__stat-change--positive">
                    ↗ Toplam gelir
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Types Table */}
            {stats && stats.ticketTypeBreakdown.length > 0 && (
              <div className="organizer-dashboard__ticket-types">
                <div className="organizer-dashboard__section-header">
                  <h2 className="organizer-dashboard__section-title">Bilet Tipleri Detayı</h2>
                </div>
                <div className="organizer-dashboard__table-container">
                  <table className="organizer-dashboard__table">
                    <thead className="organizer-dashboard__table-header">
                      <tr>
                        <th>Bilet Tipi</th>
                        <th>Satılan</th>
                        <th>Kullanılan</th>
                        <th>Kazanç</th>
                      </tr>
                    </thead>
                    <tbody className="organizer-dashboard__table-body">
                      {stats.ticketTypeBreakdown
                        .filter(ticketType => ticketType && ticketType.type)
                        .map((ticketType) => (
                        <tr key={ticketType.type}>
                          <td className="organizer-dashboard__ticket-type">{ticketType.type}</td>
                          <td className="organizer-dashboard__ticket-sold">{ticketType.count || 0}</td>
                          <td className="organizer-dashboard__ticket-used">{ticketType.used || 0}</td>
                          <td className="organizer-dashboard__ticket-revenue">
                            {formatCurrency(ticketType.revenue || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Report Info */}
            {stats && (
              <div className="organizer-dashboard__report-info">
                <div className="organizer-dashboard__report-info-icon">📊</div>
                <div className="organizer-dashboard__report-info-content">
                  <h4 className="organizer-dashboard__report-info-title">Detaylı Excel Raporu</h4>
                  <p className="organizer-dashboard__report-info-description">
                    Etkinlik özeti, bilet detayları, satış analizi ve zaman bazlı raporları içeren kapsamlı Excel dosyası indirebilirsiniz.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="organizer-dashboard__actions">
              <Link
                to={`/organizer/events/${selectedEvent}/edit`}
                state={{ event: events.find(e => e.id === selectedEvent) }}
                className="organizer-dashboard__action-button organizer-dashboard__action-button--primary"
              >
                <span className="organizer-dashboard__action-icon">✏️</span>
                Etkinliği Düzenle
              </Link>
              <Link
                to={`/events/${selectedEvent}/chat`}
                className="organizer-dashboard__action-button organizer-dashboard__action-button--chat"
              >
                <span className="organizer-dashboard__action-icon">💬</span>
                Sohbet Odası
              </Link>
              <button
                onClick={() => openNotificationModal('update')}
                disabled={!selectedEvent}
                className="organizer-dashboard__action-button organizer-dashboard__action-button--notification"
              >
                <span className="organizer-dashboard__action-icon">📱</span>
                Bildirim Gönder
              </button>
              <button
                onClick={() => openNotificationModal('reminder')}
                disabled={!selectedEvent}
                className="organizer-dashboard__action-button organizer-dashboard__action-button--reminder"
              >
                <span className="organizer-dashboard__action-icon">⏰</span>
                Hatırlatma Gönder
              </button>
              <button
                onClick={downloadReport}
                disabled={reportLoading || !selectedEvent}
                className={`organizer-dashboard__action-button organizer-dashboard__action-button--secondary ${
                  reportLoading ? 'organizer-dashboard__action-button--loading' : ''
                }`}
              >
                {reportLoading ? (
                  <>
                    <div className="organizer-dashboard__action-spinner"></div>
                    İndiriliyor...
                  </>
                ) : (
                  <>
                    <span className="organizer-dashboard__action-icon">📊</span>
                    Excel Rapor İndir
                  </>
                )}
              </button>
              <Link
                to="/organizer/events"
                className="organizer-dashboard__action-button organizer-dashboard__action-button--secondary"
              >
                <span className="organizer-dashboard__action-icon">📋</span>
                Tüm Etkinlikler
              </Link>
            </div>
          </>
        )}
      </div>
      
      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="organizer-dashboard__modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="organizer-dashboard__modal" onClick={e => e.stopPropagation()}>
            <div className="organizer-dashboard__modal-header">
              <h3 className="organizer-dashboard__modal-title">
                {notificationForm.type === 'reminder' ? '⏰ Hatırlatma Gönder' : '📱 Bildirim Gönder'}
              </h3>
              <button 
                className="organizer-dashboard__modal-close"
                onClick={() => setShowNotificationModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleNotificationSubmit} className="organizer-dashboard__modal-form">
              <div className="organizer-dashboard__modal-info">
                <p><strong>Etkinlik:</strong> {getSelectedEventName()}</p>
                <p><strong>Hedef:</strong> Bu etkinliğin bilet sahipleri</p>
              </div>
              
              {notificationForm.type === 'update' && (
                <>
                  <div className="organizer-dashboard__form-group">
                    <label className="organizer-dashboard__form-label">Güncelleme Türü</label>
                    <select
                      value={notificationForm.updateType}
                      onChange={(e) => setNotificationForm(prev => ({ 
                        ...prev, 
                        updateType: e.target.value as 'time_change' | 'venue_change' | 'general_update'
                      }))}
                      className="organizer-dashboard__form-select"
                    >
                      <option value="general_update">Genel Duyuru</option>
                      <option value="time_change">Saat Değişikliği</option>
                      <option value="venue_change">Mekan Değişikliği</option>
                    </select>
                  </div>
                  
                  <div className="organizer-dashboard__form-group">
                    <label className="organizer-dashboard__form-label">Mesaj</label>
                    <textarea
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Bilet sahiplerine göndermek istediğiniz mesajı yazın..."
                      className="organizer-dashboard__form-textarea"
                      rows={4}
                      required
                    />
                  </div>
                </>
              )}
              
              {notificationForm.type === 'reminder' && (
                <div className="organizer-dashboard__form-group">
                  <label className="organizer-dashboard__form-label">Kaç Saat Öncesi Hatırlatma</label>
                  <select
                    value={notificationForm.hoursBeforeEvent}
                    onChange={(e) => setNotificationForm(prev => ({ 
                      ...prev, 
                      hoursBeforeEvent: parseInt(e.target.value)
                    }))}
                    className="organizer-dashboard__form-select"
                  >
                    <option value={1}>1 saat öncesi</option>
                    <option value={2}>2 saat öncesi</option>
                    <option value={6}>6 saat öncesi</option>
                    <option value={24}>1 gün öncesi</option>
                    <option value={48}>2 gün öncesi</option>
                    <option value={168}>1 hafta öncesi</option>
                  </select>
                  <p className="organizer-dashboard__form-help">
                    Bu hatırlatma anında bilet sahiplerine gönderilir.
                  </p>
                </div>
              )}
              
              <div className="organizer-dashboard__modal-actions">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="organizer-dashboard__modal-button organizer-dashboard__modal-button--secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={notificationLoading}
                  className="organizer-dashboard__modal-button organizer-dashboard__modal-button--primary"
                >
                  {notificationLoading ? (
                    <>
                      <div className="organizer-dashboard__action-spinner"></div>
                      Gönderiliyor...
                    </>
                  ) : (
                    notificationForm.type === 'reminder' ? 'Hatırlatma Gönder' : 'Bildirim Gönder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard; 
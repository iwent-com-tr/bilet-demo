import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

interface Event {
  id: string;
  ad: string;
  baslangic_tarih: string;
  durum: string;
}

interface Stats {
  toplam_bilet: number;
  kullanilan_bilet: number;
  iptal_edilen: number;
  toplam_kazanc: number;
  bilet_tipleri: {
    [key: string]: {
      adet: number;
      kazanc: number;
      kullanilan: number;
    };
  };
}

const OrganizerDashboard: React.FC = () => {
  const { user, isAuthenticated, isOrganizer, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

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
  }, [isAuthenticated, isOrganizer, navigate, authLoading]);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventStats();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizer/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.durum === 1) {
        setEvents(response.data.events);
        if (response.data.events.length > 0) {
          setSelectedEvent(response.data.events[0].id);
        }
      } else {
        toast.error('Etkinlikler yüklenirken bir hata oluştu');
      }
      setLoading(false);
    } catch (error: any) {
      console.error('Etkinlik listeleme hatası:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      toast.error('Etkinlikler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const fetchEventStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/organizer/event/${selectedEvent}/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (response.data.durum === 1) {
        setStats(response.data.stats);
      } else {
        toast.error('İstatistikler yüklenirken bir hata oluştu');
      }
    } catch (error: any) {
      console.error('İstatistik yükleme hatası:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      toast.error('İstatistikler yüklenirken bir hata oluştu');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  };

  const calculateTicketUsagePercentage = () => {
    if (!stats || stats.toplam_bilet === 0) return 0;
    return Math.round((stats.kullanilan_bilet / stats.toplam_bilet) * 100);
  };

  const getSelectedEventName = () => {
    const event = events.find(e => e.id === selectedEvent);
    return event ? event.ad : '';
  };

  const downloadReport = async () => {
    if (!selectedEvent) {
      toast.error('Lütfen bir etkinlik seçin');
      return;
    }

    setReportLoading(true);
    
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/organizer/event/${selectedEvent}/report`,
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
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.ad} - {formatDate(event.baslangic_tarih)}
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
                    <p className="organizer-dashboard__quick-stat-value">{stats.toplam_bilet - stats.kullanilan_bilet}</p>
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
                  <p className="organizer-dashboard__stat-value">{stats.toplam_bilet}</p>
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
                  <p className="organizer-dashboard__stat-value">{stats.kullanilan_bilet}</p>
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
                  <p className="organizer-dashboard__stat-value">{stats.iptal_edilen}</p>
                  <div className="organizer-dashboard__stat-change">
                    {stats.iptal_edilen === 0 ? (
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
                    {formatCurrency(stats.toplam_kazanc)}
                  </p>
                  <div className="organizer-dashboard__stat-change organizer-dashboard__stat-change--positive">
                    ↗ Toplam gelir
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Types Table */}
            {stats && Object.keys(stats.bilet_tipleri).length > 0 && (
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
                      {Object.entries(stats.bilet_tipleri).map(([tip, data]) => (
                        <tr key={tip}>
                          <td className="organizer-dashboard__ticket-type">{tip}</td>
                          <td className="organizer-dashboard__ticket-sold">{data.adet}</td>
                          <td className="organizer-dashboard__ticket-used">{data.kullanilan}</td>
                          <td className="organizer-dashboard__ticket-revenue">
                            {formatCurrency(data.kazanc)}
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
                className="organizer-dashboard__action-button organizer-dashboard__action-button--primary"
              >
                <span className="organizer-dashboard__action-icon">✏️</span>
                Etkinliği Düzenle
              </Link>
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
    </div>
  );
};

export default OrganizerDashboard; 
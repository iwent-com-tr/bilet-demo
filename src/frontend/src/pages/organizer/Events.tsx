import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import MobileLayout from '../../components/layouts/MobileLayout';
import './Events.css';

interface CityItem {
  name: string;
  plate: string;
  latitude?: string;
  longitude?: string;
}

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

interface Filters {
  q: string;
  category: string;
  city: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  organizerId: string;
}

const EVENT_CATEGORIES = [
  { value: 'CONCERT', label: 'Konser' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'UNIVERSITY', label: 'Üniversite' },
  { value: 'WORKSHOP', label: 'Atölye' },
  { value: 'CONFERENCE', label: 'Konferans' },
  { value: 'SPORT', label: 'Spor' },
  { value: 'PERFORMANCE', label: 'Performans' },
  { value: 'EDUCATION', label: 'Eğitim' }
];

const EVENT_STATUSES = [
  { value: 'DRAFT', label: 'Taslak' },
  { value: 'ACTIVE', label: 'Yayında' },
  { value: 'CANCELLED', label: 'İptal' },
  { value: 'COMPLETED', label: 'Tamamlandı' }
];

const OrganizerEvents: React.FC = () => {
  const { user, isAuthenticated, isOrganizer, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({
    q: '',
    category: '',
    city: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    organizerId: ''
  });
  const [showMyEventsOnly, setShowMyEventsOnly] = useState(true);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [isDateFiltering, setIsDateFiltering] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Notification states
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [selectedEventForNotification, setSelectedEventForNotification] = useState<Event | null>(null);
  const [notificationForm, setNotificationForm] = useState({
    type: 'update', // 'update' | 'reminder'
    updateType: 'general_update', // 'time_change' | 'venue_change' | 'general_update'
    title: '',
    message: '',
    hoursBeforeEvent: 24
  });

  // Debounced search effect
  useEffect(() => {
    if (searchInput !== filters.q) {
      setIsSearching(true);
    }
    
    const timeoutId = setTimeout(() => {
      if (searchInput !== filters.q) {
        setFilters(prev => ({ ...prev, q: searchInput }));
        setCurrentPage(1);
        setIsSearching(false);
      }
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timeoutId);
      if (searchInput === filters.q) {
        setIsSearching(false);
      }
    };
  }, [searchInput, filters.q]);

  // Debounced date from effect
  useEffect(() => {
    if (dateFromInput !== filters.dateFrom) {
      setIsDateFiltering(true);
    }
    
    const timeoutId = setTimeout(() => {
      if (dateFromInput !== filters.dateFrom) {
        setFilters(prev => ({ ...prev, dateFrom: dateFromInput }));
        setCurrentPage(1);
        setIsDateFiltering(false);
      }
    }, 800); // Longer delay for date inputs

    return () => {
      clearTimeout(timeoutId);
      if (dateFromInput === filters.dateFrom) {
        setIsDateFiltering(false);
      }
    };
  }, [dateFromInput, filters.dateFrom]);

  // Debounced date to effect
  useEffect(() => {
    if (dateToInput !== filters.dateTo) {
      setIsDateFiltering(true);
    }
    
    const timeoutId = setTimeout(() => {
      if (dateToInput !== filters.dateTo) {
        setFilters(prev => ({ ...prev, dateTo: dateToInput }));
        setCurrentPage(1);
        setIsDateFiltering(false);
      }
    }, 800); // Longer delay for date inputs

    return () => {
      clearTimeout(timeoutId);
      if (dateToInput === filters.dateTo) {
        setIsDateFiltering(false);
      }
    };
  }, [dateToInput, filters.dateTo]);

  // Sync input states when filters are reset externally
  useEffect(() => {
    setSearchInput(filters.q);
    setDateFromInput(filters.dateFrom);
    setDateToInput(filters.dateTo);
  }, [filters.q, filters.dateFrom, filters.dateTo]);

  // Fetch cities from API
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/auth/cities`);
        const cityList: CityItem[] = response.data?.cities || [];
        setCities(cityList);
      } catch (error) {
        console.error('Error fetching cities:', error);
        // Non-blocking error, cities will remain empty
      }
    };
    fetchCities();
  }, []);

  // Memoized sorted cities for performance
  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [cities]);

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
  }, [isAuthenticated, isOrganizer, navigate, authLoading, user?.id, currentPage, filters, showMyEventsOnly]);

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

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '20');
      
      // Apply filters
      if (filters.q.trim()) queryParams.append('q', filters.q.trim());
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.city.trim()) queryParams.append('city', filters.city.trim());
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      console.log('Fetching events with params:', queryParams.toString());
      console.log('Show my events only:', showMyEventsOnly);
      
      // Use the new organizer events endpoint - always gets organizer's events
      // The showMyEventsOnly toggle is now just for UI consistency (organizers always see their own events)
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizers/${user.id}/events?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('API Response:', response.data);
      
      if (response.data) {
        const { data: eventsData, total, page, limit } = response.data;
        
        // Filter out any null or undefined events
        const validEvents = (eventsData || []).filter((event: any) => {
          if (!event || !event.id) {
            console.warn('Invalid event found:', event);
            return false;
          }
          return true;
        });
        
        console.log('Valid events:', validEvents);
        setEvents(validEvents);
        setTotalEvents(total || 0);
        setTotalPages(Math.ceil((total || 0) / (limit || 20)));
      } else {
        console.log('No events data found in response');
        setEvents([]);
        setTotalEvents(0);
        setTotalPages(1);
      }
    } catch (error: any) {
      console.error('Event fetching error:', error);
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
      setTotalEvents(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentPage, filters, showMyEventsOnly, navigate]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      q: '',
      category: '',
      city: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      organizerId: ''
    });
    setSearchInput(''); // Clear search input
    setDateFromInput(''); // Clear date inputs
    setDateToInput('');
    setCurrentPage(1);
    setShowMyEventsOnly(true); // Reset to showing organizer's events
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleMyEventsToggle = (enabled: boolean) => {
    setShowMyEventsOnly(enabled);
    setCurrentPage(1);
  };

  const formatDate = (date: string) => {
    try {
      if (!date) return '-';
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '-';
      
      return dateObj.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
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

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEventForNotification) {
      toast.error('Lütfen bir etkinlik seçin');
      return;
    }

    if (notificationForm.type === 'update' && !notificationForm.message.trim()) {
      toast.error('Mesaj alanı zorunludur');
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
        await axios.post(
          `${process.env.REACT_APP_API_URL}/events/${selectedEventForNotification.id}/send-reminder`,
          {
            hoursBeforeEvent: notificationForm.hoursBeforeEvent
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        toast.success(`${selectedEventForNotification.name} etkinliği için hatırlatma gönderildi! (${notificationForm.hoursBeforeEvent} saat öncesi)`);
      } else {
        // Send update notification
        await axios.post(
          `${process.env.REACT_APP_API_URL}/events/${selectedEventForNotification.id}/notify-update`,
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
        toast.success(`${selectedEventForNotification.name} güncellemesi bilet sahiplerine gönderildi! 📱`);
      }

      // Reset form and close modal
      setNotificationForm({
        type: 'update',
        updateType: 'general_update',
        title: '',
        message: '',
        hoursBeforeEvent: 24
      });
      setSelectedEventForNotification(null);
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

  const openNotificationModal = (event: Event, type: 'update' | 'reminder') => {
    setSelectedEventForNotification(event);
    setNotificationForm({
      type,
      updateType: type === 'update' ? 'general_update' : notificationForm.updateType,
      title: type === 'reminder' 
        ? `${event.name} Hatırlatması`
        : `${event.name} Güncelleme`,
      message: type === 'reminder'
        ? `${event.name} etkinliği yaklaşıyor! Hazırlıklarınızı tamamlamayı unutmayın.`
        : '',
      hoursBeforeEvent: 24
    });
    setShowNotificationModal(true);
  };

  if (authLoading || loading) {
    return (
      <div className="organizer-events-wrapper">
        <div className="organizer-events organizer-events--desktop">
          <div className="organizer-events__loading">
            <div className="organizer-events__spinner"></div>
          </div>
        </div>
        <MobileLayout title="Etkinliklerim">
          <div className="organizer-events__loading">
            <div className="organizer-events__spinner"></div>
          </div>
        </MobileLayout>
      </div>
    );
  }

  const content = (
    <div className="organizer-events__container">
      <div className="organizer-events__header">
        <div>
          <h1 className="organizer-events__title">→ Tüm Etkinlikler</h1>
          <p className="organizer-events__subtitle">
            {totalEvents} etkinlik bulundu (etkinliklerim)
          </p>
        </div>
        <div className="organizer-events__header-actions">
          <button className="organizer-events__filter-button" onClick={() => setIsFilterModalOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.83333 10H14.1667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.33333 5.83331H16.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M8.33333 14.1667H11.6667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Filtrele
          </button>
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
      </div>
      

      {/* Filters Section */}
      <div className={`organizer-events__filters ${isFilterModalOpen ? 'organizer-events__filters--modal' : ''}`}>
        <div className="organizer-events__filters-overlay" onClick={() => setIsFilterModalOpen(false)}></div>
        <div className="organizer-events__filters-content">
          <div className="organizer-events__filters-header">
            <h3>Filtreler</h3>
            <button className="organizer-events__filters-close" onClick={() => setIsFilterModalOpen(false)}>×</button>
          </div>
        <div className="organizer-events__filters-row">
          <div className="organizer-events__filter-group">
            <label className="organizer-events__filter-label">Arama</label>
            <div className="organizer-events__search-container">
              <input
                type="text"
                placeholder="Etkinlik adı, mekan veya şehir ara..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="organizer-events__filter-input"
              />
              {isSearching && (
                <div className="organizer-events__search-loading">
                  <div className="organizer-events__search-spinner"></div>
                </div>
              )}
            </div>
          </div>
          
          <div className="organizer-events__filter-group">
            <label className="organizer-events__filter-label">Kategori</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="organizer-events__filter-select"
            >
              <option value="">Tüm Kategoriler</option>
              {EVENT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div className="organizer-events__filter-group">
            <label className="organizer-events__filter-label">Şehir</label>
            <select
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className="organizer-events__filter-select"
            >
              <option value="">Tüm Şehirler</option>
              {sortedCities.map(city => (
                <option key={city.name} value={city.name}>
                  {city.name.charAt(0).toUpperCase() + city.name.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="organizer-events__filter-group">
            <label className="organizer-events__filter-label">Durum</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="organizer-events__filter-select"
            >
              <option value="">Tüm Durumlar</option>
              {EVENT_STATUSES.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="organizer-events__filters-row">
          <div className="organizer-events__filter-group">
            <label className="organizer-events__filter-label">Başlangıç Tarihi</label>
            <input
              type="date"
              value={dateFromInput}
              onChange={(e) => setDateFromInput(e.target.value)}
              className="organizer-events__filter-input"
            />
          </div>
          
          <div className="organizer-events__filter-group">
            <label className="organizer-events__filter-label">Bitiş Tarihi</label>
            <input
              type="date"
              value={dateToInput}
              onChange={(e) => setDateToInput(e.target.value)}
              className="organizer-events__filter-input"
            />
          </div>
          
          <div className="organizer-events__filter-actions">
            <button
              onClick={handleClearFilters}
              className="organizer-events__clear-filters"
            >
              Filtreleri Temizle
            </button>
            {isDateFiltering && (
              <div className="organizer-events__date-filtering">
                <div className="organizer-events__search-spinner"></div>
                <span>Tarih filtreleniyor...</span>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      <div className="organizer-events__content">
        {!events || events.length === 0 ? (
          <div className="organizer-events__empty">
            <h3 className="organizer-events__empty-title">
              {loading ? 'Etkinlikler yükleniyor...' : 'Henüz etkinliğiniz yok'}
            </h3>
            <p className="organizer-events__empty-description">
              {loading ? 'Lütfen bekleyin...' : 'İlk etkinliğinizi oluşturmak için "Yeni Etkinlik" butonuna tıklayın.'}
            </p>
          </div>
        ) : (
          <>
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
                  {events
                    .filter(event => event && event.id)
                    
                    .filter(event => event && event.id) // Filter out null/undefined events
                    .map(event => (
                    <tr key={event.id} className="organizer-events__table-row">
                      <td className="organizer-events__table-cell" data-label="Etkinlik">
                        <div className="organizer-events__event-info">
                          <p className="organizer-events__event-name">{String(event?.name || 'İsimsiz Etkinlik') || 'İsimsiz Etkinlik'}</p>
                          <p className="organizer-events__event-city">{String(event?.city || '-') || 'Şehir belirtilmemiş'}</p>
                        </div>
                      </td>
                      <td className="organizer-events__table-cell" data-label="Kategori">
                        <span className="organizer-events__category">{getCategoryText(String(event?.category || ''))}</span>
                      </td>
                      <td className="organizer-events__table-cell" data-label="Tarih">
                        <p className="organizer-events__event-date">{event?.startDate ? event?.startDate ? formatDate(String(event.startDate)) : '-' : 'Tarih belirtilmemiş'}</p>
                      </td>
                      <td className="organizer-events__table-cell" data-label="Mekan">
                        <div className="organizer-events__venue-info">
                          <p className="organizer-events__venue-name">{String(event?.venue || '-') || 'Mekan belirtilmemiş'}</p>
                          <p className="organizer-events__venue-address">{String(event?.address || '-') || 'Adres belirtilmemiş'}</p>
                        </div>
                      </td>
                      <td className="organizer-events__table-cell" data-label="Durum">
                        <span className={`organizer-events__status organizer-events__status--${getStatusClass(String(event?.status || 'DRAFT'))}`}>
                          {getStatusText(String(event?.status || 'DRAFT'))}
                        </span>
                      </td>
                      <td className="organizer-events__table-cell" data-label="İşlemler">
                        <div className="organizer-events__actions">
                          {/* Show edit action only for organizer's own events */}
                          {user?.id === String(event.organizerId) && (
                            <Link
                              to={`/organizer/events/${event.id}/edit`}
                              state={{ event }}
                              className="organizer-events__action-link"
                            >
                              Düzenle
                            </Link>
                          )}
                          <Link
                            to={`/events/${event.id}/chat`}
                            className="organizer-events__action-link organizer-events__action-link--chat"
                          >
                            💬 Sohbet
                          </Link>
                          {/* Show notification actions only for organizer's own events */}
                          {user?.id === String(event.organizerId) && (
                            <>
                              <button
                                onClick={() => openNotificationModal(event, 'update')}
                                className="organizer-events__action-button organizer-events__action-button--notification"
                                title="Bilet sahiplerine bildirim gönder"
                              >
                                📱 Bildirim
                              </button>
                              <button
                                onClick={() => openNotificationModal(event, 'reminder')}
                                className="organizer-events__action-button organizer-events__action-button--reminder"
                                title="Etkinlik hatırlatması gönder"
                              >
                                ⏰ Hatırlatma
                              </button>
                            </>
                          )}
                          {/* Show statistics action only for organizer's own events */}
                          {user?.id === String(event.organizerId) && (
                            <Link
                              to={`/organizer?eventId=${event.id}`}
                              className="organizer-events__action-link organizer-events__action-link--secondary"
                            >
                              📊 İstatistik
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="organizer-events__pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="organizer-events__pagination-button"
                >
                  Önceki
                </button>
                
                <div className="organizer-events__pagination-info">
                  <span>{currentPage} / {totalPages}</span>
                  <span className="organizer-events__pagination-total">({totalEvents} etkinlik)</span>
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="organizer-events__pagination-button"
                >
                  Sonraki
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Notification Modal */}
      {showNotificationModal && selectedEventForNotification && (
        <div className="organizer-events__modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="organizer-events__modal" onClick={e => e.stopPropagation()}>
            <div className="organizer-events__modal-header">
              <h3 className="organizer-events__modal-title">
                {notificationForm.type === 'reminder' ? '⏰ Hatırlatma Gönder' : '📱 Bildirim Gönder'}
              </h3>
              <button 
                className="organizer-events__modal-close"
                onClick={() => setShowNotificationModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleNotificationSubmit} className="organizer-events__modal-form">
              <div className="organizer-events__modal-info">
                <p><strong>Etkinlik:</strong> {selectedEventForNotification.name}</p>
                <p><strong>Tarih:</strong> {formatDate(selectedEventForNotification.startDate)}</p>
                <p><strong>Hedef:</strong> Bu etkinliğin bilet sahipleri</p>
              </div>
              
              {notificationForm.type === 'update' && (
                <>
                  <div className="organizer-events__form-group">
                    <label className="organizer-events__form-label">Güncelleme Türü</label>
                    <select
                      value={notificationForm.updateType}
                      onChange={(e) => setNotificationForm(prev => ({ 
                        ...prev, 
                        updateType: e.target.value as 'time_change' | 'venue_change' | 'general_update'
                      }))}
                      className="organizer-events__form-select"
                    >
                      <option value="general_update">Genel Duyuru</option>
                      <option value="time_change">Saat Değişikliği</option>
                      <option value="venue_change">Mekan Değişikliği</option>
                    </select>
                  </div>
                  
                  <div className="organizer-events__form-group">
                    <label className="organizer-events__form-label">Mesaj</label>
                    <textarea
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Bilet sahiplerine göndermek istediğiniz mesajı yazın..."
                      className="organizer-events__form-textarea"
                      rows={4}
                      required
                    />
                  </div>
                </>
              )}
              
              {notificationForm.type === 'reminder' && (
                <div className="organizer-events__form-group">
                  <label className="organizer-events__form-label">Kaç Saat Öncesi Hatırlatma</label>
                  <select
                    value={notificationForm.hoursBeforeEvent}
                    onChange={(e) => setNotificationForm(prev => ({ 
                      ...prev, 
                      hoursBeforeEvent: parseInt(e.target.value)
                    }))}
                    className="organizer-events__form-select"
                  >
                    <option value={1}>1 saat öncesi</option>
                    <option value={2}>2 saat öncesi</option>
                    <option value={6}>6 saat öncesi</option>
                    <option value={24}>1 gün öncesi</option>
                    <option value={48}>2 gün öncesi</option>
                    <option value={168}>1 hafta öncesi</option>
                  </select>
                  <p className="organizer-events__form-help">
                    Bu hatırlatma anında bilet sahiplerine gönderilir.
                  </p>
                </div>
              )}
              
              <div className="organizer-events__modal-actions">
                <button
                  type="button"
                  onClick={() => setShowNotificationModal(false)}
                  className="organizer-events__modal-button organizer-events__modal-button--secondary"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={notificationLoading}
                  className="organizer-events__modal-button organizer-events__modal-button--primary"
                >
                  {notificationLoading ? (
                    <>
                      <div className="organizer-events__action-spinner"></div>
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

  return (
    <div className="organizer-events-wrapper">
      <div className="organizer-events organizer-events--desktop">
        {content}
      </div>
      <MobileLayout title="Etkinliklerim">
        {content}
      </MobileLayout>
    </div>
  );
};

export default OrganizerEvents; 
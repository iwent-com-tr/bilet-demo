import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import PageHeader from '../../components/layouts/PageHeader';
import './EventList.css';

interface Event {
  id: string;
  ad: string;
  kategori: string;
  baslangic_tarih: string;
  bitis_tarih: string;
  yer: string;
  il: string;
  banner: string;
}

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    kategori: '',
    il: '',
    baslangic_tarih: '',
    bitis_tarih: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [page, filters]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        sayfa: page.toString(),
        limit: '12',
        ...filters
      });

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/event?${params}`);
      setEvents(response.data.events);
      setTotalPages(response.data.sayfa_sayisi);
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlikler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
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
      <div className="event-list">
        <div className="event-list__mobile-header">
          <PageHeader title="Etkinlikler" />
        </div>
        <div className="event-list__container">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-list">
      <div className="event-list__mobile-header">
        <PageHeader title="Etkinlikler" />
      </div>
      <div className="event-list__container">
        {/* Filters */}
        <div className="event-list__filters">
          <div className="event-list__filters-header">
            <h2 className="event-list__filters-title">Filtreler</h2>
            <button
              className="event-list__filters-toggle"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            >
              {isFiltersExpanded ? 'Gizle' : 'Göster'}
            </button>
          </div>
          <div className={`event-list__filters-content ${isFiltersExpanded ? 'expanded' : ''}`}>
            <div className="event-list__filters-grid">
              <div className="event-list__filter-group">
                <label htmlFor="kategori" className="event-list__filter-label">
                  Kategori
                </label>
                <select
                  id="kategori"
                  name="kategori"
                  value={filters.kategori}
                  onChange={handleFilterChange}
                  className="event-list__filter-input"
                >
                  <option value="">Tümü</option>
                  <option value="Müzik">Müzik</option>
                  <option value="Tiyatro">Tiyatro</option>
                  <option value="Spor">Spor</option>
                  <option value="Festival">Festival</option>
                </select>
              </div>

              <div className="event-list__filter-group">
                <label htmlFor="il" className="event-list__filter-label">
                  Şehir
                </label>
                <select
                  id="il"
                  name="il"
                  value={filters.il}
                  onChange={handleFilterChange}
                  className="event-list__filter-input"
                >
                  <option value="">Tümü</option>
                  <option value="İstanbul">İstanbul</option>
                  <option value="Ankara">Ankara</option>
                  <option value="İzmir">İzmir</option>
                </select>
              </div>

              <div className="event-list__filter-group">
                <label htmlFor="baslangic_tarih" className="event-list__filter-label">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  id="baslangic_tarih"
                  name="baslangic_tarih"
                  value={filters.baslangic_tarih}
                  onChange={handleFilterChange}
                  className="event-list__filter-input"
                />
              </div>

              <div className="event-list__filter-group">
                <label htmlFor="bitis_tarih" className="event-list__filter-label">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  id="bitis_tarih"
                  name="bitis_tarih"
                  value={filters.bitis_tarih}
                  onChange={handleFilterChange}
                  className="event-list__filter-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event Grid */}
        {events.length > 0 ? (
          <div className="event-list__grid-container">
            <div className="event-list__grid">
              {events.map(event => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="event-list__card"
                >
                  <div className="event-list__image-container">
                    <img
                      src={event.banner || '/placeholder-event.jpg'}
                      alt={event.ad}
                      className="event-list__image"
                    />
                  </div>
                  <div className="event-list__content">
                    <p className="event-list__date">{formatDate(event.baslangic_tarih)}</p>
                    <h3 className="event-list__title">{event.ad}</h3>
                    <div className="event-list__venue">
                      {event.yer}, {event.il}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="event-list__empty">
            <h3 className="event-list__empty-title">Etkinlik bulunamadı</h3>
            <p className="event-list__empty-text">Farklı filtreler deneyebilirsiniz.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="event-list__pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="event-list__pagination-button"
            >
              Önceki
            </button>
            <span className="event-list__pagination-text">
              Sayfa {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="event-list__pagination-button"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventList; 
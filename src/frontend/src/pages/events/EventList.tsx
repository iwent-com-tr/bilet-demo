import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import PageHeader from '../../components/layouts/PageHeader';
import './EventList.css';
import searchIcon from '../../assets/search-icon.png';
import { citiesData } from 'constants/cities';

interface Event {
  id: string;
  name: string;
  slug: string;
  category: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  banner?: string;
  status: string;
}

interface ApiResponse {
  data: Event[];
  total: number;
  page: number;
  limit: number;
}

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    city: '',
    dateFrom: '',
    dateTo: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isSearchBarFocused, setIsSearchBarFocused] = useState(false);

  // Sort cities alphabetically by name
  const sortedCities = [...citiesData].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

  useEffect(() => {
    fetchEvents();
  }, [page, filters]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...filters
      });

      // Use the new backendN API endpoint
      const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/events?${params}`);
      setEvents(response.data.data);
      setTotalPages(Math.ceil(response.data.total / response.data.limit));
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFilters(prev => ({ ...prev, q: value }));
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
        {/* Search Bar */}
        <div className={"event-list__search-bar" + (isSearchBarFocused ? ' event-list__search-bar-focused' : '')}>
          <div className="event-list__search-label-wrapper">
          <img src={searchIcon} alt="Search" className="event-list__search-icon" />
          </div>
          <input
            type="text"
            value={filters.q}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchBarFocused(true)}
            onBlur={() => setIsSearchBarFocused(false)}
            placeholder="Ara..."
            className="event-list__search-input"
          />
        </div>
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
                <label htmlFor="category" className="event-list__filter-label">
                  Kategori
                </label>
                <select
                  id="category"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="event-list__filter-input"
                >
                  <option value="">Tümü</option>
                  <option value="CONCERT">Konser</option>
                  <option value="FESTIVAL">Festival</option>
                  <option value="SPORT">Spor</option>
                  <option value="PERFORMANCE">Gösteri</option>
                  <option value="WORKSHOP">Atölye</option>
                  <option value="CONFERENCE">Konferans</option>
                  <option value="EDUCATION">Eğitim</option>
                  <option value="UNIVERSITY">Üniversite</option>
                </select>
              </div>

              <div className="event-list__filter-group">
                <label htmlFor="city" className="event-list__filter-label">
                  Şehir
                </label>
                <select
                  id="city"
                  name="city"
                  value={filters.city}
                  onChange={handleFilterChange}
                  className="event-list__filter-input"
                >
                  <option value="">Tümü</option>
                  {sortedCities.map((city) => (
                    <option key={city.plate} value={city.name}>
                      {city.name.charAt(0).toUpperCase() + city.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="event-list__filter-group">
                <label htmlFor="dateFrom" className="event-list__filter-label">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  id="dateFrom"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="event-list__filter-input"
                />
              </div>

              <div className="event-list__filter-group">
                <label htmlFor="dateTo" className="event-list__filter-label">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  id="dateTo"
                  name="dateTo"
                  value={filters.dateTo}
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
                  to={`/events/${event.slug}`}
                  className="event-list__card"
                >
                  <div className="event-list__image-container">
                    <img
                      src={event.banner || '/placeholder-event.jpg'}
                      alt={event.name}
                      className="event-list__image"
                    />
                  </div>
                  <div className="event-list__content">
                    <p className="event-list__date">{formatDate(event.startDate)}</p>
                    <h3 className="event-list__title">{event.name}</h3>
                    <div className="event-list__venue">
                      {event.venue}, {event.city}
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
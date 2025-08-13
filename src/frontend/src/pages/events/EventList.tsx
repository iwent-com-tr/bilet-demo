import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import PageHeader from '../../components/layouts/PageHeader';
import './EventList.css';

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

// Cities data - same structure as backendN
const citiesData = [
  { name: "adana", plate: "01" },
  { name: "adıyaman", plate: "02" },
  { name: "afyonkarahisar", plate: "03" },
  { name: "ağrı", plate: "04" },
  { name: "amasya", plate: "05" },
  { name: "ankara", plate: "06" },
  { name: "antalya", plate: "07" },
  { name: "artvin", plate: "08" },
  { name: "aydın", plate: "09" },
  { name: "balıkesir", plate: "10" },
  { name: "bilecik", plate: "11" },
  { name: "bingöl", plate: "12" },
  { name: "bitlis", plate: "13" },
  { name: "bolu", plate: "14" },
  { name: "burdur", plate: "15" },
  { name: "bursa", plate: "16" },
  { name: "çanakkale", plate: "17" },
  { name: "çankırı", plate: "18" },
  { name: "çorum", plate: "19" },
  { name: "denizli", plate: "20" },
  { name: "diyarbakır", plate: "21" },
  { name: "edirne", plate: "22" },
  { name: "elazığ", plate: "23" },
  { name: "erzincan", plate: "24" },
  { name: "erzurum", plate: "25" },
  { name: "eskişehir", plate: "26" },
  { name: "gaziantep", plate: "27" },
  { name: "giresun", plate: "28" },
  { name: "gümüşhane", plate: "29" },
  { name: "hakkari", plate: "30" },
  { name: "hatay", plate: "31" },
  { name: "ısparta", plate: "32" },
  { name: "mersin", plate: "33" },
  { name: "istanbul", plate: "34" },
  { name: "izmir", plate: "35" },
  { name: "kars", plate: "36" },
  { name: "kastamonu", plate: "37" },
  { name: "kayseri", plate: "38" },
  { name: "kırklareli", plate: "39" },
  { name: "kırşehir", plate: "40" },
  { name: "kocaeli", plate: "41" },
  { name: "konya", plate: "42" },
  { name: "kütahya", plate: "43" },
  { name: "malatya", plate: "44" },
  { name: "manisa", plate: "45" },
  { name: "kahramanmaraş", plate: "46" },
  { name: "mardin", plate: "47" },
  { name: "muğla", plate: "48" },
  { name: "muş", plate: "49" },
  { name: "nevşehir", plate: "50" },
  { name: "niğde", plate: "51" },
  { name: "ordu", plate: "52" },
  { name: "rize", plate: "53" },
  { name: "sakarya", plate: "54" },
  { name: "samsun", plate: "55" },
  { name: "siirt", plate: "56" },
  { name: "sinop", plate: "57" },
  { name: "sivas", plate: "58" },
  { name: "tekirdağ", plate: "59" },
  { name: "tokat", plate: "60" },
  { name: "trabzon", plate: "61" },
  { name: "tunceli", plate: "62" },
  { name: "şanlıurfa", plate: "63" },
  { name: "uşak", plate: "64" },
  { name: "van", plate: "65" },
  { name: "yozgat", plate: "66" },
  { name: "zonguldak", plate: "67" },
  { name: "aksaray", plate: "68" },
  { name: "bayburt", plate: "69" },
  { name: "karaman", plate: "70" },
  { name: "kırıkkale", plate: "71" },
  { name: "batman", plate: "72" },
  { name: "şırnak", plate: "73" },
  { name: "bartın", plate: "74" },
  { name: "ardahan", plate: "75" },
  { name: "ığdır", plate: "76" },
  { name: "yalova", plate: "77" },
  { name: "karabük", plate: "78" },
  { name: "kilis", plate: "79" },
  { name: "osmaniye", plate: "80" },
  { name: "düzce", plate: "81" }
];

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    city: '',
    dateFrom: '',
    dateTo: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

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
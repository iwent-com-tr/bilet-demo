import MobileNavbar from "components/layouts/MobileNavbar"
import SearchHeader from "./SearchHeader"
import FilterScreen from "./SearchFilterScreen"
import React, { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { Link } from "react-router-dom"
import './Search.css'

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

interface Filter {
  q: string;
  category: string;
  city: string;
  dateFrom: string;
  dateTo: string;
}


export const SearchContext = createContext<[boolean, React.Dispatch<React.SetStateAction<boolean>>]>([false, () => {}]);
export const FilterContext = createContext<[Filter, React.Dispatch<React.SetStateAction<Filter>>]>([{ q: '', category: '', city: '', dateFrom: '', dateTo: '' }, () => {}]);

const Search: React.FC = () => {

    const [isFilterScreenOn, setIsFilterScreenOn] = useState(false);

    // EVENT RELATED
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        q: '',
        category: '',
        city: '',
        dateFrom: '',
        dateTo: ''
    });

    useEffect(() => {
        fetchEvents();
      }, [filters]);
    
    const fetchEvents = async () => {
    try {
        const params = new URLSearchParams({
        page: '1',
        limit: '12',
        ...filters
        });

        // Use the new backendN API endpoint
        const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/events?${params}`);
        setEvents(response.data.data);
        setLoading(false);
    } catch (error) {
        toast.error('Etkinlikler yüklenirken bir hata oluştu');
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


    return (
        <SearchContext.Provider value={[isFilterScreenOn, setIsFilterScreenOn]}>
        <FilterContext.Provider value={[filters, setFilters]}>
        <FilterScreen />
        <SearchHeader />

        {/* Event Grid */}
        {events.length > 0 ? (
            <div className="event-list__grid-container search__grid-container">
            <div className="event-list__grid search__grid">
                {events.map(event => (
                <Link
                    key={event.id}
                    to={`/events/${event.slug}`}
                    className="event-list__card search__card"
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

        <MobileNavbar />
        </FilterContext.Provider>
        </SearchContext.Provider>
    )
}

export default Search
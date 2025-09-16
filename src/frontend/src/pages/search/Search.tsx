import MobileNavbar from "components/layouts/MobileNavbar"
import SearchHeader from "./SearchHeader"
import FilterScreen from "./SearchFilterScreen"
import React, { createContext, useContext, useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { Link, useNavigate, useParams } from "react-router-dom"
import './Search.css'
import { useAuth } from "context/AuthContext"
import DiscoverGrid from "components/user-recommendations/DiscoverGrid"

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

interface SearchApiResponse {
  data: any;
  total: number;
  page: number;
  limit: number;
}

interface ApiResponse {
  data: any;
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

const INDICES = [
    "events",
    "artists",
    "venues",
    "organizers"
]

export const SearchContext = createContext<[boolean, React.Dispatch<React.SetStateAction<boolean>>]>([false, () => {}]);
export const FilterContext = createContext<any>([{}, () => {}]);
export const IndexContext = createContext<[number, React.Dispatch<React.SetStateAction<number>>]>([0, () => {}]);

const Search: React.FC = () => {

    const { isAuthenticated, user } = useAuth();
    const [isFilterScreenOn, setIsFilterScreenOn] = useState(false);
    const navigate = useNavigate();

    const { index_name } = useParams<{ index_name?: string }>();

    const initialIndex = index_name
      ? INDICES.indexOf(index_name.toLowerCase())
      : -1;

    const [activeIndex, setActiveIndex] = useState<number>(initialIndex >= 0 ? initialIndex : -1);


    useEffect(() => {
      if (!index_name) {
        setActiveIndex(-1);
        return;
      }

      // lower-case to ensure matching
      const idx = INDICES.indexOf(index_name.toLowerCase());
      setActiveIndex(idx >= 0 ? idx : -1);
    }, [index_name]);

    // CONTENT

    const [events, setEvents] = useState<Event[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);

    const [venues, setVenues] = useState<any>([]);
    const [venuesLoading, setVenuesLoading] = useState(true);

    const [artists, setArtists] = useState<any>([]);
    const [artistsLoading, setArtistsLoading] = useState(true);

    const [organizers, setOrganizers] = useState<any>([]);
    const [organizersLoading, setOrganizersLoading] = useState(true);

    const [eventsPage, setEventsPage] = useState(1);
    const [venuesPage, setVenuesPage] = useState(1);
    const [artistsPage, setArtistsPage] = useState(1);
    const [organizersPage, setOrganizersPage] = useState(1);

    const [filters, setFilters] = useState<any>({
      q: '',
      category: '',
      city: '',
      dateFrom: '',
      dateTo: '',
      price: 5000,
      latitude: 0,  
      longitude: 0, 
      distance: 50000
    });

    async function handleVenueFollow(id: string) {
    if (!isAuthenticated) {
      toast.error('Takip etmek için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    if (user?.userType !== 'USER') {
      toast.error('Sadece kullanıcılar takip edebilir');
      return;
    }

    const venue = venues.find((a: any) => a.id === id);
    if (!venue) return;

    try {
      if (venue.following) {
        const res = await axios.delete(`${process.env.REACT_APP_API_URL}/venues/follow/${venue.id}`);
        if (res.status === 200) {
          setVenues((prev: any) => prev.map((a: any) => (a.id === id ? { ...a, following: false } : a)));
        }
      } else {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/venues/follow/${venue.id}`);
        if (res.status === 200) {
          setVenues((prev: any) => prev.map((a: any) => (a.id === id ? { ...a, following: true } : a)));
        }
      }
    } catch (error) {
      toast.error('Takip isteği sırasında bir hata oluştu.');
      console.error(error);
      setVenues((prev: any) => prev.map((a: any) => (a.id === id ? { ...a, following: !(a.following) } : a)));
    }
  }

    async function handleArtistFollow(id: string) {
    if (!isAuthenticated) {
      toast.error('Takip etmek için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    if (user?.userType !== 'USER') {
      toast.error('Sadece kullanıcılar takip edebilir');
      return;
    }

    const artist = artists.find((a: any) => a.id === id);
    if (!artist) return;

    try {
      if (artist.following) {
        const res = await axios.delete(`${process.env.REACT_APP_API_URL}/artists/follow/${artist.id}`);
        if (res.status === 200) {
          setArtists((prev: any) => prev.map((a: any) => (a.id === id ? { ...a, following: false } : a)));
        }
      } else {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/artists/follow/${artist.id}`);
        if (res.status === 200) {
          setArtists((prev: any) => prev.map((a: any) => (a.id === id ? { ...a, following: true } : a)));
        }
      }
    } catch (error) {
      toast.error('Takip isteği sırasında bir hata oluştu.');
      console.error(error);
      setArtists((prev: any) => prev.map((a: any) => (a.id === id ? { ...a, following: !(a.following) } : a)));
    }
  }

    // get location
    useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setFilters((prev: any) => ({
              ...prev,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }));
          },
          () => {
            // If denied or error, keep them empty
            setFilters((prev: any) => ({ ...prev, latitude: null, longitude: null }));
          }
        );
      }
    }, []);

    // limiting scroll
    useEffect(() => {
      const handleScroll = () => {
        if (!isFilterScreenOn) return;

        const maxScroll = 300; // max scroll in px
        if (window.scrollY > maxScroll) {
          window.scrollTo(0, maxScroll); // prevent scrolling past maxScroll
        }
      };

      window.addEventListener('scroll', handleScroll, { passive: false });

      return () => window.removeEventListener('scroll', handleScroll);
    }, [isFilterScreenOn]);


    useEffect(() => {
        if (activeIndex != -1) {
            if (activeIndex === 0) fetchEvents();
            if (activeIndex === 1) fetchArtists();
            if (activeIndex === 2) fetchVenues();
            if (activeIndex === 3) fetchOrganizers();
        } else {
            fetchEvents();
            fetchArtists();
            fetchVenues();
            fetchOrganizers();
        }
      }, [activeIndex, filters, eventsPage, venuesPage, artistsPage, organizersPage]);

      useEffect(() => {
        setEvents([]);
        setVenues([]);
        setArtists([]);
        setOrganizers([]);
          setEventsPage(1);
          setVenuesPage(1);
          setArtistsPage(1);
          setOrganizersPage(1);
      }, [filters])

    const fetchEvents = async () => {
  try {
    const { latitude, longitude, distance, ...restFilters } = filters;

    const paramsObj = {
      page: eventsPage.toString(),
      limit: '6',
      ...restFilters,
      // only include location if available
      ...(latitude && longitude ? { latitude, longitude, distance } : {}),
    };

    const params = new URLSearchParams(paramsObj as any);

    const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/events?${params}`);

    setEvents((prevEvents : any) => {
      const newEvents = response.data.data.filter(
        (newEvent: any) => !prevEvents.some((event : any) => event.id === newEvent.id)
      );
      return [...prevEvents, ...newEvents];
    });

    setEventsLoading(false);
  } catch (error) {
    toast.error('Etkinlikler yüklenirken bir hata oluştu');
    setEventsLoading(false);
  }
};

const fetchVenues = async () => {
  try {
    const { latitude, longitude, distance, ...restFilters } = filters;

    const paramsObj = {
      page: eventsPage.toString(),
      limit: '6',
      ...restFilters,
      // only include location if available
      ...(latitude && longitude ? { latitude, longitude, distance } : {}),
    };

    const params = new URLSearchParams(paramsObj as any);

    const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/venues?${params}`);

    setVenues((prevVenues : any) => {
      const newVenues = response.data.data.filter(
        (newVenue: any) => !prevVenues.some((venue : any) => venue.id === newVenue.id)
      );
      return [...prevVenues, ...newVenues];
    });

    setVenuesLoading(false);
  } catch (error) {
    toast.error('Mekanlar yüklenirken bir hata oluştu');
    setVenuesLoading(false);
  }
};

const fetchArtists = async () => {
  try {
    const { latitude, longitude, distance, ...restFilters } = filters;

    const paramsObj = {
      page: eventsPage.toString(),
      limit: '6',
      ...restFilters,
      // only include location if available
      ...(latitude && longitude ? { latitude, longitude, distance } : {}),
    };

    const params = new URLSearchParams(paramsObj as any);

    const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/artists?${params}`);

    setArtists((prevArtists : any) => {
      const newArtists = response.data.data.filter(
        (newArtist: any) => !prevArtists.some((artist : any) => artist.id === newArtist.id)
      );
      return [...prevArtists, ...newArtists];
    });

    setArtistsLoading(false);
  } catch (error) {
    toast.error('Sanatçılar yüklenirken bir hata oluştu');
    setArtistsLoading(false);
  }
};

const fetchOrganizers = async () => {
  try {
    const { latitude, longitude, distance, ...restFilters } = filters;

    const paramsObj = {
      page: eventsPage.toString(),
      limit: '6',
      ...restFilters,
      // only include location if available
      ...(latitude && longitude ? { latitude, longitude, distance } : {}),
    };

    const params = new URLSearchParams(paramsObj as any);

    const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/organizers/public/?${params}`);
    console.log(response);

    setOrganizers((prevOrganizers : any) => {
      const newOrganizers = response.data.data.filter(
        (newOrganizer: any) => !prevOrganizers.some((org : any) => org.id === newOrganizer.id)
      );
      return [...prevOrganizers, ...newOrganizers];
    });

    setOrganizersLoading(false);
  } catch (error) {
    toast.error('Organizatörler yüklenirken bir hata oluştu');
    setOrganizersLoading(false);
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
        <IndexContext.Provider value={[activeIndex, setActiveIndex]}>
        <SearchContext.Provider value={[isFilterScreenOn, setIsFilterScreenOn]}>
        <FilterContext.Provider value={[filters, setFilters]}>
        <div className="home-container">
        <FilterScreen />
        <SearchHeader />
        
        {/* Discover Grid */}
        { activeIndex === -1 ? <DiscoverGrid /> : null}

        {/* Event Grid */}
        { activeIndex === 0 ? (events.length > 0 ? (
            <div className="event-list__grid-container search__grid-container">
                <h1 className="search__title">
                    Etkinlikler
                </h1>
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
            <div>
                <button className="load-more" onClick={() => setEventsPage(eventsPage + 1)}>Daha fazla etkinlik</button>
            </div>
            </div>
        ) : (
            <div className="event-list__empty">
            <h3 className="event-list__empty-title">Etkinlik bulunamadı</h3>
            <p className="event-list__empty-text">Farklı filtreler deneyebilirsiniz.</p>
            </div>
        )) : null}

        {/* Venue Grid */}
        { activeIndex === 2 ? (venues.length > 0 ? (
            <div className="venue-list__grid-container search__grid-container">
                <h1 className="search__title">
                    Mekanlar
                </h1>
            <div className="venue-list__grid search__grid">
                {venues.map((venue: any) => (
                <div className="veneu-list__card search__card">
                    <Link
                        key={venue.id}
                        to={`/venues/${venue.slug}`}
                    >
                    <div className="venue-list__image-container">
                    <img
                        src={venue.banner || '/placeholder-venue.jpg'}
                        alt={venue.name}
                        className="venue-list__image"
                    />
                    </div>
                    <div className="venue-list__content">
                    <h3 className="venue-list__title">{venue.name}</h3>
                    <div className="venue-list__venue">
                        {venue.address + ', ' + venue.city}
                    </div>
                    </div>
                    </Link>
                    <button
                      className={'featured-artists__follow-button search-venue-follow-button' + (venue.following ? ' following' : '')}
                      onClick={async () => handleVenueFollow(venue.id)}
                    >
                      {venue.following ? 'Takip ediyorsun' : 'Takip Et'}
                    </button>
                </div>
                ))}
            </div>
            <div>
                <button className="load-more" onClick={() => setVenuesPage(venuesPage + 1)}>Daha fazla mekan</button>
            </div>
            </div>
        ) : (
            <div className="event-list__empty">
            <h3 className="event-list__empty-title">Mekan bulunamadı</h3>
            <p className="event-list__empty-text">Farklı filtreler deneyebilirsiniz.</p>
            </div>
        )) : null}

        {/* Artists Grid */}
        { activeIndex === 1 ? (artists.length > 0 ? (
            <div className="artist-list__grid-container search__grid-container">
                <h1 className="search__title">
                    Sanatçılar
                </h1>
            <div className="artist-list__grid search__grid">
              {artists.map((artist: any) => (
                <div key={artist.id} className="artist-list__card search__card">
                  <Link
                    to={`/artists/${artist.slug}`}
                    className="artist-list__image-container"
                  >
                    <img
                      src={artist.banner || '/placeholder-artist.jpg'}
                      alt={artist.name}
                      className="artist-list__image"
                    />
                  </Link>

                  <div className="artist-list__stripe">
                    <div className="artist-list__left">
                      <div className="artist-list__content">
                        <h3 className="artist-list__title">{artist.name}</h3>
                        <div className="artist-list__bio">{artist.bio}</div>
                        <div className="artist-list__genres">{artist.genres.join(', ')}</div>
                      </div>
                    </div>
                    <button
                      className={
                        'featured-artists__follow-button search-artist-follow-button' +
                        (artist.following ? ' following' : '')
                      }
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleArtistFollow(artist.id);
                      }}
                    >
                      {artist.following ? 'Takip ediyorsun' : 'Takip Et'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div>
                <button className="load-more" onClick={() => setArtistsPage(artistsPage + 1)}>Daha fazla sanatçı</button>
            </div>
            </div>
        ) : (
            <div className="event-list__empty">
            <h3 className="event-list__empty-title">Sanatçı bulunamadı</h3>
            <p className="event-list__empty-text">Farklı filtreler deneyebilirsiniz.</p>
            </div>
        )) : null}

        {/* Organizers Grid */}
        { activeIndex === 3 ? (organizers.length > 0 ? (
            <div className="organizer-list__grid-container search__grid-container">
                <h1 className="search__title">
                    Organizatörler
                </h1>
            <div className="organizer-list__grid search__grid">
                {organizers.map((organizer: any) => (
                <Link
                    key={organizer.id}
                    to={`/organizer/${organizer.id}`}
                    className="organizer-list__card search__card"
                >
                    <div className="organizer-list__image-container">
                    <img
                        src={organizer.avatar || '/placeholder-organizer.jpg'}
                        alt={organizer.firstName + ' ' + organizer.lastName}
                        className="organizer-list__image"
                    />
                    </div>
                    <div className="organizer-list__content">
                    <h3 className="organizer-list__title">{organizer.firstName + ' ' + organizer.lastName}</h3>
                    <div className="organizer-list__company">
                        {organizer.company}
                    </div>
                    </div>
                </Link>
                ))}
            </div>
            <div>
                <button className="load-more" onClick={() => setOrganizersPage(organizersPage + 1)}>Daha fazla organizatör</button>
            </div>
            </div>
        ) : (
            <div className="event-list__empty">
            <h3 className="event-list__empty-title">Organizatör bulunamadı</h3>
            <p className="event-list__empty-text">Farklı filtreler deneyebilirsiniz.</p>
            </div>
        )) : null}


        {!isFilterScreenOn && <MobileNavbar />}
        </div>
        </FilterContext.Provider>
        </SearchContext.Provider>
        </IndexContext.Provider>
    )
}

export default Search


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/slider.css';
import '../styles/home.css';
import FeaturedEvents from '../components/user-recommendations/FeaturedEvents';
import FeaturedArtists from '../components/user-recommendations/FeaturedArtists';
import PopularArtistEvents from '../components/user-recommendations/PopularArtistEvents';
import PopularOrganizers from '../components/user-recommendations/PopularOrganizers';
import WeekEvents from '../components/user-recommendations/WeekEvents';
import MobileHeader from '../components/layouts/MobileHeader';
import MobileNavbar from '../components/layouts/MobileNavbar';

// Import slider navigation assets
import radioChecked from '../assets/slider/radio-button-checked.svg';
import radioUnchecked from '../assets/slider/material-symbols_radio-button-unchecked.svg';
import UserRecommendations from 'components/user-recommendations/UserRecommendations';

interface Event {
  id: string;
  name: string;
  slug: string;
  banner?: string;
  category: string;
  startDate: string;
  venue: string;
  status: string;
}

interface ApiResponse {
  data: Event[];
  total: number;
  page: number;
  limit: number;
}

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Use the new backendN API endpoint with status filter
        const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/events?status=ACTIVE`);

        // Filter events that have banners - use response.data.data instead of response.data.events
        const eventsWithBanners = response.data.data?.filter((event: Event) =>
          event.banner && event.banner.trim() !== ''
        ) || [];

        setEvents(eventsWithBanners);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        setLoading(false);
      }
    };

    fetchEvents();

    // Auto-advance slider every 5 seconds
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % (events.length || 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length]);

  const handleSlideClick = (eventSlug: string) => {
    navigate(`/events/${eventSlug}`);
  };

  return (
    <div className="home-container">
      <MobileHeader />
      {/* Hero Section with Slider */}
      <section className="hero-slider">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#5DEE83]"></div>
          </div>
        ) : events.length > 0 ? (
          <>
            <div className="hero-slider__wrapper">
              <div
                className="hero-slider__container"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="hero-slider__slide"
                    onClick={() => handleSlideClick(event.slug)}
                    style={{ cursor: 'pointer' }}
                    role="link"
                    aria-label={`View details for ${event.name}`}
                  >
                    <img
                      src={event.banner}
                      alt={event.name}
                      className="hero-slider__image"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-slider__navigation">
              {events.map((_, index) => (
                <button
                  key={index}
                  className="hero-slider__nav-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlide(index);
                  }}
                  aria-label={`Go to slide ${index + 1}`}
                >
                  <img
                    src={index === currentSlide ? radioChecked : radioUnchecked}
                    alt={index === currentSlide ? "Active slide" : "Inactive slide"}
                  />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Etkinlikleri Keşfet, Biletini Al
              </h1>
              <p className="text-lg md:text-xl mb-8 text-gray-300">
                Konserler, festivaller, tiyatrolar ve daha fazlası için biletinizi hemen alın.
              </p>
            </div>
          </div>
        )}
      </section>

      <UserRecommendations />

      <MobileNavbar />
    </div>
  );
};

export default Home; 
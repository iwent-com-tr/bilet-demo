import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/slider.css';
import FeaturedEvents from '../components/FeaturedEvents';
import FeaturedArtists from '../components/FeaturedArtists';
import PopularArtistEvents from '../components/PopularArtistEvents';
import PopularOrganizers from '../components/PopularOrganizers';
import WeekEvents from '../components/WeekEvents';

// Import slider navigation assets
import radioChecked from '../assets/slider/radio-button-checked.svg';
import radioUnchecked from '../assets/slider/material-symbols_radio-button-unchecked.svg';

interface Event {
  id: string;
  ad: string;
  banner: string;
  kategori: string;
  baslangic_tarih: string;
  yer: string;
}

interface ApiResponse {
  durum: number;
  toplam: number;
  sayfa: number;
  sayfa_sayisi: number;
  events: Event[];
}

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get<ApiResponse>(`${process.env.REACT_APP_API_URL}/event?status=yayinda`);
        setEvents(response.data.events.filter((event: Event) => event.banner));
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

  const handleSlideClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  return (
    <div className="flex flex-col">
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
                    onClick={() => handleSlideClick(event.id)}
                    style={{ cursor: 'pointer' }}
                    role="link"
                    aria-label={`View details for ${event.ad}`}
                  >
                    <img
                      src={event.banner}
                      alt={event.ad}
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
              <Link
                to="/events"
                className="inline-block bg-[#5DEE83] text-black px-8 py-3 rounded-md font-semibold hover:bg-[#4cd973] transition-colors"
              >
                Etkinlikleri Keşfet
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Featured Events Section */}
      <FeaturedEvents />

      {/* Featured Artists Section */}
      <FeaturedArtists />

      {/* Popular Artist Events Section */}
      <PopularArtistEvents />

      {/* Popular Organizers Section */}
      <PopularOrganizers />

      {/* Week Events Section */}
      <WeekEvents />
    </div>
  );
};

export default Home; 
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './VenueProfile.css';

interface VenueProfileData {
  id: string;
  name: string;
  slug: string;
  banner?: string;
  details?: string;
  address?: string;
  city: string;
  capacity?: number;
  seatedCapacity?: number;
  standingCapacity?: number;
  favoriteCount: number;
  socialMedia?: {
    instagram?: string;
    x?: string;
    youtube?: string;
    tiktok?: string;
  };
  accessibility?: any;
  mapsLocation?: string;
  approved: boolean;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  banner?: string;
  startDate: string;
  category: string;
}

const VenueProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [venueData, setVenueData] = useState<VenueProfileData | null>(null);
  const [venueEvents, setVenueEvents] = useState<Event[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchVenueProfile();
      fetchVenueEvents();
    }
  }, [slug]);

  useEffect(() => {
    if (venueData && user) {
      checkFollowStatus();
    }
  }, [venueData, user]);

  const fetchVenueProfile = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/venues/slug/${slug}`
      );
      setVenueData(response.data);
    } catch (error: any) {
      console.error('Error fetching venue profile:', error);
      setError('Mekan profili yüklenirken bir hata oluştu');
    }
  };

  const fetchVenueEvents = async () => {
    try {
      // Fetch events for this venue
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/events?venueSlug=${slug}&limit=10`
      );
      setVenueEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching venue events:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !venueData) return;

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/users/follow-status/venue/${venueData.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setIsFollowing(response.data.isFollowing);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!venueData) return;

    try {
      setActionLoading(true);
      
      if (isFollowing) {
        await axios.delete(
          `${process.env.REACT_APP_API_URL}/users/follow/venue/${venueData.id}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        setIsFollowing(false);
        setVenueData(prev => prev ? { ...prev, favoriteCount: prev.favoriteCount - 1 } : null);
        toast.success('Mekan takibi bırakıldı');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/users/follow/venue/${venueData.id}`,
          {},
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        setIsFollowing(true);
        setVenueData(prev => prev ? { ...prev, favoriteCount: prev.favoriteCount + 1 } : null);
        toast.success('Mekan takip edildi');
      }
    } catch (error: any) {
      console.error('Error following/unfollowing venue:', error);
      toast.error('İşlem gerçekleştirilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const getSocialIcon = (platform: string) => {
    const icons = {
      instagram: '📷',
      x: '🐦',
      youtube: '▶️',
      tiktok: '🎵'
    };
    return icons[platform as keyof typeof icons] || '🔗';
  };

  if (loading) {
    return (
      <div className="venue-profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Mekan profili yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !venueData) {
    return (
      <div className="venue-profile-page">
        <div className="profile-error">
          <h3>Bir Sorun Oluştu</h3>
          <p>{error || 'Mekan profili yüklenemedi'}</p>
          <button onClick={() => navigate(-1)} className="back-button">
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="venue-profile-page">
      {/* Header */}
      <div className="profile-header">
        <button 
          onClick={() => navigate(-1)} 
          className="back-button"
          aria-label="Geri"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path 
              d="M19 12H5M12 19L5 12L12 5" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
        
        <h1 className="profile-title">Mekan Profili</h1>
        
        <div className="profile-menu">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="menu-button"
            aria-label="Menü"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
          </button>
          
          {showMenu && (
            <div className="menu-dropdown">
              <button onClick={() => {/* Share venue */}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16,6 12,2 8,6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Profil Paylaş
              </button>
              <button onClick={() => {/* Venue details */}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Detaylı Bilgi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="profile-info">
        <div className="profile-avatar-container">
          {venueData.banner ? (
            <img 
              src={venueData.banner} 
              alt={venueData.name}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              🏛️
            </div>
          )}
          {venueData.approved && (
            <div className="verified-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        
        <h2 className="profile-name">
          {venueData.name} • Etkinlik Mekanı
        </h2>
        
        <div className="profile-username">
          @{venueData.slug}
        </div>

        {/* Social Media */}
        {venueData.socialMedia && Object.keys(venueData.socialMedia).length > 0 && (
          <div className="social-media">
            {Object.entries(venueData.socialMedia).map(([platform, url]) => (
              url && (
                <a 
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  title={platform}
                >
                  <span className="social-icon">{getSocialIcon(platform)}</span>
                </a>
              )
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-number">{venueEvents.length}</span>
            <span className="stat-label">Etkinlik</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{venueData.favoriteCount}</span>
            <span className="stat-label">Takipçi</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{venueData.capacity || '-'}</span>
            <span className="stat-label">Kapasite</span>
          </div>
        </div>

        {/* Follow Button */}
        <div className="profile-actions">
          <button 
            onClick={handleFollow}
            className={`profile-action-button ${isFollowing ? 'following' : 'follow'}`}
            disabled={actionLoading}
          >
            {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
          </button>
        </div>

        {/* Address & Details */}
        {(venueData.address || venueData.details) && (
          <div className="venue-details">
            {venueData.address && (
              <div className="venue-address">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>{venueData.address}, {venueData.city}</span>
              </div>
            )}
            {venueData.details && (
              <p className="venue-description">{venueData.details}</p>
            )}
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="profile-events">
        <h3 className="events-title">Yaklaşan Etkinlikler</h3>
        {venueEvents.length === 0 ? (
          <div className="no-events">
            <p>Henüz yaklaşan etkinlik bulunmuyor</p>
          </div>
        ) : (
          <div className="events-list">
            {venueEvents.map((event) => (
              <Link 
                key={event.id} 
                to={`/events/${event.slug}`}
                className="event-card"
              >
                {event.banner && (
                  <img 
                    src={event.banner} 
                    alt={event.name}
                    className="event-banner"
                  />
                )}
                <div className="event-info">
                  <h4 className="event-name">{event.name}</h4>
                  <p className="event-date">
                    {new Date(event.startDate).toLocaleDateString('tr-TR')}
                  </p>
                  <p className="event-category">{event.category}</p>
                </div>
                <div className="event-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueProfile;

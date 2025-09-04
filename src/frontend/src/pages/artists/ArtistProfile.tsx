import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './ArtistProfile.css';

interface ArtistProfileData {
  id: string;
  name: string;
  slug: string;
  banner?: string;
  bio?: string;
  genres: string[];
  favoriteCount: number;
  socialMedia?: {
    instagram?: string;
    x?: string;
    youtube?: string;
    tiktok?: string;
  };
  approved: boolean;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  banner?: string;
  startDate: string;
  venue: string;
  city: string;
}

const ArtistProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [artistData, setArtistData] = useState<ArtistProfileData | null>(null);
  const [artistEvents, setArtistEvents] = useState<Event[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchArtistProfile();
      fetchArtistEvents();
    }
  }, [slug]);

  useEffect(() => {
    if (artistData && user) {
      checkFollowStatus();
    }
  }, [artistData, user]);

  const fetchArtistProfile = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/artists/slug/${slug}`
      );
      setArtistData(response.data);
    } catch (error: any) {
      console.error('Error fetching artist profile:', error);
      setError('Sanatçı profili yüklenirken bir hata oluştu');
    }
  };

  const fetchArtistEvents = async () => {
    try {
      // Fetch events for this artist
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/events?artistSlug=${slug}&limit=10`
      );
      setArtistEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching artist events:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    if (!user || !artistData) return;

    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/users/follow-status/artist/${artistData.id}`,
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

    if (!artistData) return;

    try {
      setActionLoading(true);
      
      if (isFollowing) {
        await axios.delete(
          `${process.env.REACT_APP_API_URL}/users/follow/artist/${artistData.id}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        setIsFollowing(false);
        setArtistData(prev => prev ? { ...prev, favoriteCount: prev.favoriteCount - 1 } : null);
        toast.success('Sanatçı takibi bırakıldı');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/users/follow/artist/${artistData.id}`,
          {},
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        setIsFollowing(true);
        setArtistData(prev => prev ? { ...prev, favoriteCount: prev.favoriteCount + 1 } : null);
        toast.success('Sanatçı takip edildi');
      }
    } catch (error: any) {
      console.error('Error following/unfollowing artist:', error);
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
      <div className="artist-profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Sanatçı profili yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !artistData) {
    return (
      <div className="artist-profile-page">
        <div className="profile-error">
          <h3>Bir Sorun Oluştu</h3>
          <p>{error || 'Sanatçı profili yüklenemedi'}</p>
          <button onClick={() => navigate(-1)} className="back-button">
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-profile-page">
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
        
        <h1 className="profile-title">Sanatçı Profili</h1>
        
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
              <button onClick={() => {/* Share artist */}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16,6 12,2 8,6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Profil Paylaş
              </button>
              <button onClick={() => {/* Artist details */}}>
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
          {artistData.banner ? (
            <img 
              src={artistData.banner} 
              alt={artistData.name}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              🎤
            </div>
          )}
          {artistData.approved && (
            <div className="verified-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        
        <h2 className="profile-name">
          {artistData.name} • Sanatçı
        </h2>
        
        <div className="profile-username">
          @{artistData.slug}
        </div>

        {/* Genres */}
        {artistData.genres && artistData.genres.length > 0 && (
          <div className="genres">
            {artistData.genres.slice(0, 3).map((genre, index) => (
              <span key={index} className="genre-tag">
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Social Media */}
        {artistData.socialMedia && Object.keys(artistData.socialMedia).length > 0 && (
          <div className="social-media">
            {Object.entries(artistData.socialMedia).map(([platform, url]) => (
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
            <span className="stat-number">{artistEvents.length}</span>
            <span className="stat-label">Etkinlik</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{artistData.favoriteCount}</span>
            <span className="stat-label">Takipçi</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{artistData.genres.length}</span>
            <span className="stat-label">Tür</span>
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

        {/* Bio */}
        {artistData.bio && (
          <div className="artist-bio">
            <p>{artistData.bio}</p>
          </div>
        )}
      </div>

      {/* Events List */}
      <div className="profile-events">
        <h3 className="events-title">Yaklaşan Etkinlikler</h3>
        {artistEvents.length === 0 ? (
          <div className="no-events">
            <p>Henüz yaklaşan etkinlik bulunmuyor</p>
          </div>
        ) : (
          <div className="events-list">
            {artistEvents.map((event) => (
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
                  <p className="event-venue">{event.venue}, {event.city}</p>
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

export default ArtistProfile;

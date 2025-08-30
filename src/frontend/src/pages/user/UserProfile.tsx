import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import './UserProfile.css';

interface UserProfileData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  city: string;
  points: number;
  createdAt: string;
  stats: {
    totalFriends: number;
    totalTickets: number;
  };
  relationship: {
    status: 'PENDING' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED' | null;
    canMessage: boolean;
    isSelf: boolean;
  };
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

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchUserEvents();
    }
  }, [userId, user]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/users/${userId}/profile`,
        {
          headers: user ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}
        }
      );
      setProfileData(response.data.user);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
      setError('Kullanıcı profili yüklenirken bir hata oluştu');
    }
  };

  const fetchUserEvents = async () => {
    try {
      // This would be a new endpoint to get public events for a user
      // For now, we'll skip this or use mock data
      setUserEvents([]);
    } catch (error) {
      console.error('Error fetching user events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setActionLoading(true);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/friendships`,
        { toUserId: userId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      toast.success('Arkadaşlık isteği gönderildi');
      await fetchUserProfile(); // Refresh profile to update relationship status
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.response?.data?.message || 'Arkadaşlık isteği gönderilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      // We need to find the friendship ID first
      const friendshipsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/friendships`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      const pendingFriendship = friendshipsResponse.data.data.find((f: any) => 
        f.fromUserId === userId && f.toUserId === user.id && f.status === 'PENDING'
      );

      if (pendingFriendship) {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/friendships/${pendingFriendship.id}/accept`,
          {},
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        toast.success('Arkadaşlık isteği kabul edildi');
        await fetchUserProfile();
      }
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      toast.error('Arkadaşlık isteği kabul edilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      const friendshipsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/friendships`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      const pendingFriendship = friendshipsResponse.data.data.find((f: any) => 
        f.fromUserId === userId && f.toUserId === user.id && f.status === 'PENDING'
      );

      if (pendingFriendship) {
        await axios.post(
          `${process.env.REACT_APP_API_URL}/friendships/${pendingFriendship.id}/reject`,
          {},
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        toast.success('Arkadaşlık isteği reddedildi');
        await fetchUserProfile();
      }
    } catch (error: any) {
      console.error('Error rejecting friend request:', error);
      toast.error('Arkadaşlık isteği reddedilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!user) return;

    try {
      setActionLoading(true);
      const friendshipsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/friendships`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      const friendship = friendshipsResponse.data.data.find((f: any) => 
        ((f.fromUserId === userId && f.toUserId === user.id) || 
         (f.fromUserId === user.id && f.toUserId === userId)) && 
        f.status === 'ACCEPTED'
      );

      if (friendship) {
        await axios.delete(
          `${process.env.REACT_APP_API_URL}/friendships/${friendship.id}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        
        toast.success('Arkadaşlık sonlandırıldı');
        await fetchUserProfile();
      }
    } catch (error: any) {
      console.error('Error removing friend:', error);
      toast.error('Arkadaşlık sonlandırılamadı');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/chat/private/${userId}`);
  };

  const handleBlock = async () => {
    if (!user) return;

    const confirmed = window.confirm('Bu kullanıcıyı engellemek istediğinizden emin misiniz? Bu işlem mevcut arkadaşlığınızı da sonlandıracaktır.');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await axios.post(
        `${process.env.REACT_APP_API_URL}/friendships/blocks`,
        { blockedId: userId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      toast.success('Kullanıcı engellendi');
      await fetchUserProfile();
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error(error.response?.data?.message || 'Kullanıcı engellenemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionButton = () => {
    if (!user || !profileData || profileData.relationship.isSelf) {
      return null;
    }

    const { relationship } = profileData;

    if (relationship.status === 'BLOCKED') {
      return (
        <div className="profile-blocked">
          <span>Bu kullanıcı engellenmiş</span>
        </div>
      );
    }

    if (relationship.status === 'ACCEPTED') {
      return (
        <button 
          onClick={handleSendMessage}
          className="profile-action-button message-button"
          disabled={actionLoading}
        >
          Mesaj Gönder
        </button>
      );
    }

    if (relationship.status === 'PENDING_SENT') {
      return (
        <div className="profile-pending">
          <span>Arkadaşlık isteği gönderildi</span>
          <p className="pending-description">İsteğiniz onay bekliyor</p>
        </div>
      );
    }

    if (relationship.status === 'PENDING_RECEIVED') {
      return (
        <div className="profile-pending">
          <span>Arkadaşlık isteği aldınız</span>
          <div className="pending-actions">
            <button 
              onClick={handleAcceptFriendRequest}
              className="accept-button"
              disabled={actionLoading}
            >
              Kabul Et
            </button>
            <button 
              onClick={handleRejectFriendRequest}
              className="reject-button"
              disabled={actionLoading}
            >
              Reddet
            </button>
          </div>
        </div>
      );
    }

    return (
      <button 
        onClick={handleSendFriendRequest}
        className="profile-action-button friend-request-button"
        disabled={actionLoading}
      >
        Arkadaşlık İsteği Gönder
      </button>
    );
  };

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="user-profile-page">
        <div className="profile-error">
          <h3>Bir Sorun Oluştu</h3>
          <p>{error || 'Profil yüklenemedi'}</p>
          <button onClick={() => navigate(-1)} className="back-button">
            Geri Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
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
        
        <h1 className="profile-title">Üye Profili</h1>
        
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
              <button onClick={() => {/* Share profile */}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16,6 12,2 8,6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Profil Paylaş
              </button>
              {!profileData.relationship.isSelf && (
                <>
                  <button onClick={() => {/* Report user */}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Şikayet Et
                  </button>
                  <button onClick={handleBlock} className="block-button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                    Engelle
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="profile-info">
        <div className="profile-avatar-container">
          {profileData.avatar ? (
            <img 
              src={profileData.avatar} 
              alt={`${profileData.firstName} ${profileData.lastName}`}
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar-placeholder">
              {profileData.firstName.charAt(0)}
            </div>
          )}
        </div>
        
        <h2 className="profile-name">
          {profileData.firstName} {profileData.lastName} • Üye
        </h2>
        
        <div className="profile-username">
          @{profileData.firstName.toLowerCase()}{profileData.lastName.toLowerCase()}
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-number">{userEvents.length}</span>
            <span className="stat-label">Etkinlik</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{profileData.stats.totalFriends}</span>
            <span className="stat-label">Arkadaş</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{profileData.stats.totalTickets}</span>
            <span className="stat-label">Bilet</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="profile-actions">
          {renderActionButton()}
        </div>
      </div>

      {/* No Friends Message */}
      {!profileData.relationship.canMessage && !profileData.relationship.isSelf && (
        <div className="no-friends-message">
          <div className="message-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3>Henüz Arkadaş Değilsiniz</h3>
          <p>Ortak etkinliklerinizi görmek ve mesajlaşabilmek için arkadaşlığınızı onaylayın.</p>
        </div>
      )}

      {/* Events List (only show if friends or self) */}
      {(profileData.relationship.canMessage || profileData.relationship.isSelf) && (
        <div className="profile-events">
          <h3 className="events-title">Katıldığı Etkinlikler</h3>
          {userEvents.length === 0 ? (
            <div className="no-events">
              <p>Henüz katıldığı etkinlik bulunmuyor</p>
            </div>
          ) : (
            <div className="events-list">
              {userEvents.map((event) => (
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
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;

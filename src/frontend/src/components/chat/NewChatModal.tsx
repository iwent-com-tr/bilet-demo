import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import OnlineIndicator from '../OnlineIndicator';
import './NewChatModal.css';

interface Friend {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  fromUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    lastSeenAt?: string;
  };
  toUser: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    lastSeenAt?: string;
  };
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchFriends();
    }
  }, [isOpen, user]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/friendships?status=ACCEPTED&limit=100`,
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );

      setFriends(response.data.data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setError('Arkadaş listesi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (friendUserId: string) => {
    navigate(`/messages/private/${friendUserId}`);
    onClose();
  };

  const filteredFriends = friends.filter(friendship => {
    const friend = friendship.fromUserId === user?.id ? friendship.toUser : friendship.fromUser;
    const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="new-chat-modal-overlay" onClick={onClose}>
      <div className="new-chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="new-chat-modal-header">
          <h2>Yeni Sohbet</h2>
          <button className="new-chat-modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M18 6L6 18M6 6l12 12" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="new-chat-modal-search">
          <div className="search-input-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path 
                d="M9 17A8 8 0 1 0 9 1A8 8 0 0 0 9 17ZM20 20L15.35 15.35" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              placeholder="Arkadaş ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="new-chat-modal-content">
          {loading ? (
            <div className="new-chat-loading">
              <p>Arkadaşlar yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="new-chat-error">
              <p>{error}</p>
              <button onClick={fetchFriends} className="retry-button">
                Tekrar Dene
              </button>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="new-chat-empty">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Arkadaş Bulunamadı</h3>
              <p>
                {searchQuery 
                  ? 'Arama kriterlerinize uygun arkadaş bulunamadı'
                  : 'Henüz arkadaşınız yok. Yeni insanlarla tanışmaya ne dersiniz?'
                }
              </p>
            </div>
          ) : (
            <div className="friends-list">
              {filteredFriends.map((friendship) => {
                const friend = friendship.fromUserId === user?.id ? friendship.toUser : friendship.fromUser;
                return (
                  <div
                    key={friend.id}
                    className="friend-item"
                    onClick={() => handleStartChat(friend.id)}
                  >
                    <div className="friend-avatar">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.firstName} />
                      ) : (
                        <div className="friend-avatar-placeholder">
                          {friend.firstName.charAt(0)}
                        </div>
                      )}
                      <OnlineIndicator isOnline={false} size="sm" className="friend-online-status" />
                    </div>
                    <div className="friend-info">
                      <h4>{friend.firstName} {friend.lastName}</h4>
                      <p>Mesaj göndermek için tıklayın</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatModal; 
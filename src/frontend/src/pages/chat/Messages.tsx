import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import MobileNavbar from '../../components/layouts/MobileNavbar';
import './Messages.css';

interface ChatPreview {
  id: string;
  type: 'event' | 'private';
  name: string;
  avatar?: string;
  lastMessage: {
    text: string;
    time: string;
    senderId: string;
    senderName?: string;
  };
  unreadCount: number;
  eventSlug?: string;
  userId?: string;
}

interface FilterTab {
  id: string;
  label: string;
  active: boolean;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Hepsi');
  const [error, setError] = useState<string | null>(null);

  const filterTabs: FilterTab[] = [
    { id: 'all', label: 'Hepsi', active: activeFilter === 'Hepsi' },
    { id: 'unread', label: 'Okunmayanlar', active: activeFilter === 'Okunmayanlar' },
    { id: 'events', label: 'Etkinlikler', active: activeFilter === 'Etkinlikler' },
    { id: 'people', label: 'Kişiler', active: activeFilter === 'Kişiler' }
  ];

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    filterChats();
  }, [chats, activeFilter, searchQuery]);

  const fetchChats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user's event chats (events they have tickets for)
      const [eventChatsResponse, privateChatsResponse] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_URL}/chat/my-event-chats`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        ),
        axios.get(
          `${process.env.REACT_APP_API_URL}/chat/my-private-chats`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        )
      ]);

      const eventChats: ChatPreview[] = eventChatsResponse.data.chats?.map((chat: any) => ({
        id: `event-${chat.eventId}`,
        type: 'event' as const,
        name: chat.eventName,
        avatar: chat.eventBanner,
        lastMessage: chat.lastMessage ? {
          text: chat.lastMessage.senderName 
            ? `${chat.lastMessage.senderName}: ${chat.lastMessage.message}`
            : chat.lastMessage.message,
          time: formatTime(chat.lastMessage.createdAt),
          senderId: chat.lastMessage.senderId,
          senderName: chat.lastMessage.senderName
        } : {
          text: 'Henüz mesaj yok',
          time: formatTime(chat.event?.startDate),
          senderId: 'system',
          senderName: undefined
        },
        unreadCount: chat.unreadCount || 0,
        eventSlug: chat.eventSlug
      })) || [];

      const privateChats: ChatPreview[] = privateChatsResponse.data.chats?.map((chat: any) => ({
        id: `private-${chat.userId}`,
        type: 'private' as const,
        name: chat.user ? `${chat.user.firstName} ${chat.user.lastName}` : 'Bilinmeyen Kullanıcı',
        avatar: chat.user?.avatar,
        lastMessage: {
          text: chat.lastMessage?.message || 'Henüz mesaj yok',
          time: formatTime(chat.lastMessage?.createdAt),
          senderId: chat.lastMessage?.senderId || chat.userId,
          senderName: chat.user?.firstName
        },
        unreadCount: chat.unreadCount || 0,
        userId: chat.userId
      })) || [];

      const allChats = [...eventChats, ...privateChats].sort((a, b) => {
        const aTime = a.lastMessage.time || '0';
        const bTime = b.lastMessage.time || '0';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setChats(allChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setError('Mesajlar yüklenirken bir hata oluştu');
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const filterChats = () => {
    let filtered = chats;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(chat =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply tab filter
    switch (activeFilter) {
      case 'Okunmayanlar':
        filtered = filtered.filter(chat => chat.unreadCount > 0);
        break;
      case 'Etkinlikler':
        filtered = filtered.filter(chat => chat.type === 'event');
        break;
      case 'Kişiler':
        filtered = filtered.filter(chat => chat.type === 'private');
        break;
      default:
        // 'Hepsi' - no additional filtering
        break;
    }

    setFilteredChats(filtered);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('tr-TR', { 
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const getChatLink = (chat: ChatPreview) => {
    if (chat.type === 'event') {
      return `/events/${chat.eventSlug}/chat`;
    } else {
      return `/chat/private/${chat.userId}`;
    }
  };

  // Show login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="messages-page">
        <div className="messages-empty">
          <div className="empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>Mesajlarınızı Görüntülemek İçin Giriş Yapmalısınız</h3>
          <p>Arkadaşlarınızla sohbet etmek ve etkinlik gruplarına katılmak için hesabınıza giriş yapın</p>
          <Link to="/login" className="login-button">
            Giriş Yap
          </Link>
        </div>
        <MobileNavbar />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="messages-page">
        <div className="messages-loading">
          <div className="loading-spinner"></div>
          <p>Mesajlar yükleniyor...</p>
        </div>
        <MobileNavbar />
      </div>
    );
  }

  return (
    <div className="messages-page">
      {/* Header */}
      <div className="messages-header">
        <h1 className="messages-title">Mesajlar</h1>
        <button className="messages-add-button" aria-label="Yeni sohbet başlat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path 
              d="M12 5V19M5 12H19" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="messages-search">
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
            placeholder="Etkinlik, Topluluk veya Kişi Ara"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="messages-filters">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            className={`filter-tab ${tab.active ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab.label)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="messages-error">
          <p>{error}</p>
          <button onClick={fetchChats} className="retry-button">
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Chat List */}
      <div className="messages-list">
        {filteredChats.length === 0 && !error ? (
          <div className="messages-empty">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>Henüz Hiç Mesajınız Yok</h3>
            <p>Etkinliklere bilet alarak grup sohbetlerine katılabilir veya arkadaşlarınızla özel mesajlaşabilirsiniz</p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <Link
              key={chat.id}
              to={getChatLink(chat)}
              className="chat-preview-item"
            >
              <div className="chat-avatar-container">
                {chat.avatar ? (
                  <img 
                    src={chat.avatar} 
                    alt={chat.name}
                    className="chat-avatar"
                  />
                ) : (
                  <div className="chat-avatar-placeholder">
                    {chat.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="chat-content">
                <div className="chat-header-row">
                  <h3 className="chat-name">{chat.name}</h3>
                  <span className="chat-time">{chat.lastMessage.time}</span>
                </div>
                <div className="chat-message-row">
                  <p className="chat-last-message">{chat.lastMessage.text}</p>
                  {chat.unreadCount > 0 && (
                    <div className="chat-unread-badge">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <MobileNavbar />
    </div>
  );
};

export default Messages;

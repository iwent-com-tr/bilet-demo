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

  const filterTabs: FilterTab[] = [
    { id: 'all', label: 'Hepsi', active: activeFilter === 'Hepsi' },
    { id: 'unread', label: 'Okunmayanlar', active: activeFilter === 'Okunmayanlar' },
    { id: 'events', label: 'Etkinlikler', active: activeFilter === 'Etkinlikler' },
    { id: 'people', label: 'Kişiler', active: activeFilter === 'Kişiler' }
  ];

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    filterChats();
  }, [chats, activeFilter, searchQuery]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      
      // Fetch user's event chats (events they have tickets for)
      const eventChatsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/chat/my-event-chats`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      // Fetch private message chats
      const privateChatsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/chat/my-private-chats`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      const eventChats: ChatPreview[] = eventChatsResponse.data.chats?.map((chat: any) => ({
        id: `event-${chat.eventId}`,
        type: 'event' as const,
        name: chat.eventName,
        avatar: chat.eventBanner,
        lastMessage: {
          text: chat.lastMessage?.message || 'Etkinliğe gidelim hadi 🎉',
          time: formatTime(chat.lastMessage?.createdAt || chat.event?.startDate),
          senderId: chat.lastMessage?.senderId || 'system',
          senderName: chat.lastMessage?.senderName
        },
        unreadCount: chat.unreadCount || 0,
        eventSlug: chat.eventSlug
      })) || [];

      const privateChats: ChatPreview[] = privateChatsResponse.data.chats?.map((chat: any) => ({
        id: `private-${chat.userId}`,
        type: 'private' as const,
        name: `${chat.user.firstName} ${chat.user.lastName}`,
        avatar: chat.user.avatar,
        lastMessage: {
          text: chat.lastMessage?.message || 'Merhaba! 👋',
          time: formatTime(chat.lastMessage?.createdAt),
          senderId: chat.lastMessage?.senderId || chat.userId,
          senderName: chat.user.firstName
        },
        unreadCount: chat.unreadCount || 0,
        userId: chat.userId
      })) || [];

      const allChats = [...eventChats, ...privateChats].sort((a, b) => 
        new Date(b.lastMessage.time).getTime() - new Date(a.lastMessage.time).getTime()
      );

      setChats(allChats);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setLoading(false);
      
      // Mock data for development
      const mockChats: ChatPreview[] = [
        {
          id: 'event-1',
          type: 'event',
          name: 'Sonance Festival \'25',
          avatar: '/api/placeholder/60/60',
          lastMessage: {
            text: 'Selin: Biz saat 3 gibi alanda olacağız ✨',
            time: '19:35',
            senderId: 'user-2',
            senderName: 'Selin'
          },
          unreadCount: 3,
          eventSlug: 'sonance-festival-25'
        },
        {
          id: 'private-1',
          name: 'Metehan Öztürk',
          type: 'private',
          avatar: '/api/placeholder/60/60',
          lastMessage: {
            text: 'Etkinliğe gidelim hadi 🎉',
            time: '19:35',
            senderId: 'user-3',
            senderName: 'Metehan'
          },
          unreadCount: 3,
          userId: 'user-3'
        }
      ];
      setChats(mockChats);
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

      {/* Chat List */}
      <div className="messages-list">
        {filteredChats.length === 0 ? (
          <div className="messages-empty">
            <p>Henüz mesajınız bulunmuyor</p>
            <span>Etkinliklere katılarak sohbet etmeye başlayın</span>
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

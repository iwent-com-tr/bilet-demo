import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ChatMessage from '../../components/chat/ChatMessage';
import ChatInput from '../../components/chat/ChatInput';
import OnlineIndicator from '../../components/OnlineIndicator';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import './PrivateChat.css';

interface PrivateMessage {
  id: string;
  message: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  status: 'SENT' | 'READ' | 'DELETED';
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isOnline?: boolean;
}

const PrivateChat: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { updateOnlineStatus, isUserOnline } = useOnlineStatus();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!userId) {
      navigate('/messages');
      return;
    }

    fetchChatData();
  }, [user, userId, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update online status when chatUser changes
  useEffect(() => {
    if (chatUser) {
      updateOnlineStatus([chatUser.id]);
    }
  }, [chatUser, updateOnlineStatus]);

  const fetchChatData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch messages and user info in parallel
      const [messagesResponse, userResponse] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_URL}/chat/private/${userId}/messages`,
          {
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }
        ),
        axios.get(
          `${process.env.REACT_APP_API_URL}/users/${userId}`,
          {
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }
        )
      ]);

      setMessages(messagesResponse.data.messages || []);
      setChatUser({
        id: userResponse.data.user.id,
        firstName: userResponse.data.user.firstName,
        lastName: userResponse.data.user.lastName,
        avatar: userResponse.data.user.avatar,
        isOnline: false // TODO: Implement online status
      });
    } catch (error: any) {
      console.error('Error fetching chat data:', error);
      if (error.response?.status === 403) {
        if (error.response?.data?.message === 'Can only send messages to friends') {
          setError('Bu kullanıcıyla mesajlaşabilmek için arkadaş olmanız gerekiyor. Önce arkadaşlık isteği gönderin.');
        } else {
          setError('Bu kullanıcıyla mesajlaşma yetkiniz bulunmuyor');
        }
      } else if (error.response?.status === 404) {
        setError('Kullanıcı bulunamadı');
      } else {
        setError('Mesajlar yüklenirken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!userId || !message.trim() || sending) return;

    try {
      setSending(true);
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/chat/private/${userId}/messages`,
        { message: message.trim() },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      const newMessage = response.data.message;
      setMessages(prev => [...prev, newMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      if (error.response?.status === 403) {
        if (error.response?.data?.message === 'Can only send messages to friends') {
          setError('Bu kullanıcıyla mesajlaşabilmek için arkadaş olmanız gerekiyor. Önce arkadaşlık isteği gönderin.');
        } else {
          setError('Bu kullanıcıyla mesajlaşma yetkiniz bulunmuyor');
        }
      } else {
        setError('Mesaj gönderilirken bir hata oluştu');
      }
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };



  if (!user) {
    return (
      <div className="private-chat-page">
        <div className="chat-error">
          <p>Mesajlaşmak için giriş yapmalısınız</p>
          <Link to="/login" className="login-link">Giriş Yap</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="private-chat-page">
        <div className="chat-loading">
          <div className="loading-spinner"></div>
          <p>Sohbet yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="private-chat-page">
        <div className="chat-header">
          <button 
            onClick={() => navigate('/messages')} 
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
          <div className="chat-user-info">
            <h1>Sohbet</h1>
          </div>
        </div>
        
        <div className="chat-error">
          <div className="error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h3>Bir Sorun Oluştu</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchChatData} className="retry-button">
              Tekrar Dene
            </button>
            <button onClick={() => navigate('/messages')} className="back-to-messages-button">
              Mesajlara Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="private-chat-page">
      {/* Header */}
      <div className="private-chat-header">
        <div className="header-left">
          <Link to="/messages" className="back-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path 
                d="M19 12H5M12 19L5 12L12 5" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          
          <div className="user-info">
            <div className="user-avatar-container">
              {chatUser?.avatar ? (
                <img 
                  src={chatUser.avatar} 
                  alt={`${chatUser.firstName} ${chatUser.lastName}`}
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {chatUser ? chatUser.firstName.charAt(0) : '?'}
                </div>
              )}
            </div>
            
            <div className="user-details">
              <h1 className="user-name">
                {chatUser ? `${chatUser.firstName} ${chatUser.lastName}` : 'Yükleniyor...'}
              </h1>
              {chatUser && (
                <OnlineIndicator 
                  isOnline={isUserOnline(chatUser.id)} 
                  size="sm" 
                  className="user-status" 
                />
              )}
            </div>
          </div>
        </div>
        
        <div className="header-right">
          {/* Menu button or other actions */}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3>Sohbet Başlatın</h3>
            <p>
              {chatUser ? `${chatUser.firstName} ile ilk mesajınızı gönderin` : 'İlk mesajınızı gönderin'}
            </p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{
                  id: message.id,
                  senderId: message.senderId,
                  senderType: 'USER', // Private messages are always user-to-user
                  message: message.message,
                  createdAt: message.createdAt,
                  senderName: message.sender.firstName,
                  senderAvatar: message.sender.avatar
                }}
                currentUserId={user?.id || ''}
                currentUserType="user"
              />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={sending}
          placeholder={chatUser ? `${chatUser.firstName}'a mesaj yazın...` : 'Mesaj yazın...'}
        />
      </div>
    </div>
  );
};

export default PrivateChat;

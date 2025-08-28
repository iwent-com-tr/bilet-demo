import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ChatHeader from '../../components/chat/ChatHeader';
import ChatMessage from '../../components/chat/ChatMessage';
import ChatInput from '../../components/chat/ChatInput';
import GroupInfo from '../../components/chat/GroupInfo';
import { toast } from 'react-toastify';
import './EventChat.css';

interface Message {
  id: string;
  senderId: string;
  senderType: 'USER' | 'ORGANIZER';
  message: string;
  createdAt: string;
  senderName?: string;
  senderAvatar?: string;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  banner?: string;
  startDate: string;
  venue: string;
  city: string;
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isOnline?: boolean;
  role?: 'USER' | 'ORGANIZER';
}

const EventChat: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasTicket, setHasTicket] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (slug) {
      fetchEventAndMessages();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [slug, isAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchEventAndMessages = async () => {
    try {
      setLoading(true);

      // Fetch event details
      const eventResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/events/${slug}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      const eventData = eventResponse.data.event;
      setEvent(eventData);

      // Check if user has ticket for this event
      const ticketResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/tickets/my-tickets?eventId=${eventData.id}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      const userHasTicket = ticketResponse.data.tickets?.length > 0;
      setHasTicket(userHasTicket);

      if (!userHasTicket) {
        toast.error('Bu etkinliğin sohbet odasına katılmak için biletiniz olması gerekiyor.');
        navigate(`/events/${slug}`);
      return;
    }
    
      // Fetch chat messages
      const messagesResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/chat/event/${eventData.id}/messages`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setMessages(messagesResponse.data.messages || []);

      // Fetch participants
      const participantsResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/chat/event/${eventData.id}/participants`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      setParticipants(participantsResponse.data.participants || []);

      // Initialize socket connection
      initializeSocket(eventData);

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching event chat:', error);
      setLoading(false);
      
      if (error.response?.status === 403) {
        toast.error('Bu sohbet odasına erişim izniniz yok.');
        navigate(`/events/${slug}`);
      } else if (error.response?.status === 404) {
        toast.error('Etkinlik bulunamadı.');
        navigate('/events');
      } else {
        toast.error('Sohbet odası yüklenirken bir hata oluştu.');
      }
    }
  };

  const initializeSocket = (eventData: Event) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000', {
      path: '/chat',
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      
      // Join event room
      newSocket.emit('chat:join', { eventSlug: eventData.slug });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('chat:message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('chat:joined', ({ eventId }: { eventId: string }) => {
      console.log('Joined event room:', eventId);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Sohbet bağlantısı kurulamadı.');
    });

    setSocket(newSocket);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (messageText: string) => {
    if (!socket || !event || !isConnected) {
      toast.error('Sohbet bağlantısı yok. Lütfen sayfayı yenileyin.');
      return;
    }

    socket.emit('chat:send', {
      eventSlug: event.slug,
      message: messageText
    }, (response: any) => {
      if (!response.ok) {
        toast.error(response.message || 'Mesaj gönderilemedi.');
      }
    });
  };

  const handleBackClick = () => {
    navigate('/messages');
  };

  const handleGroupInfoClick = () => {
    setShowGroupInfo(true);
  };

  const handleCloseGroupInfo = () => {
    setShowGroupInfo(false);
  };

  if (loading) {
    return (
      <div className="event-chat-page">
        <div className="event-chat-loading">
          <div className="loading-spinner"></div>
          <p>Sohbet odası yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!event) {
  return (
      <div className="event-chat-page">
        <div className="event-chat-error">
          <h2>Etkinlik bulunamadı</h2>
          <button onClick={() => navigate('/events')} className="back-to-events-btn">
            Etkinliklere Dön
          </button>
          </div>
        </div>
    );
  }

            return (
    <div className="event-chat-page">
      <ChatHeader
        eventName={event.name}
        eventBanner={event.banner}
        participantCount={participants.length}
        onGroupInfoClick={handleGroupInfoClick}
        onBackClick={handleBackClick}
      />

      <div className="event-chat-content" ref={messagesContainerRef}>
        {/* Welcome Message */}
        <div className="welcome-message">
          <div className="welcome-text">
            <h3>🎉 {event.name} sohbet odasına hoş geldiniz!</h3>
            <p>Bu grup, etkinlik katılımcıları arasında iletişim kurmak için oluşturulmuştur.</p>
            <div className="event-details">
              <span>📅 {new Date(event.startDate).toLocaleDateString('tr-TR')}</span>
              <span>📍 {event.venue}, {event.city}</span>
                  </div>
                </div>
              </div>

        {/* Messages */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="no-messages">
              <p>Henüz mesaj yok. İlk mesajı siz gönderin! 👋</p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                currentUserId={user?.id || ''}
                currentUserType={user?.tip || 'user'}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={!isConnected || !hasTicket}
        placeholder={
          !isConnected 
            ? "Bağlantı kuruluyor..." 
            : !hasTicket 
              ? "Bu etkinlik için biletiniz yok" 
              : "Ücretsiz sohbet"
        }
      />

      {/* Connection Status */}
      {!isConnected && (
        <div className="connection-status">
          <span className="connection-indicator offline"></span>
          <span>Bağlantı kuruluyor...</span>
      </div>
      )}

      {/* Group Info Modal */}
      {showGroupInfo && (
        <GroupInfo
          eventName={event.name}
          eventBanner={event.banner}
          participants={participants}
          onClose={handleCloseGroupInfo}
          currentUserId={user?.id || ''}
          isOrganizer={user?.tip === 'organizer' && event.organizer.id === user.id}
        />
      )}
    </div>
  );
};

export default EventChat;
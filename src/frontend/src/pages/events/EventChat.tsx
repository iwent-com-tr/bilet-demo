import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import './EventChat.css';

type SenderType = 'USER' | 'ORGANIZER';

interface ChatMessageDto {
  id: string;
  senderId: string;
  senderType: SenderType;
  message: string;
  createdAt: string;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const EventChat: React.FC = () => {
  const { slug: eventIdOrSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [eventData, setEventData] = useState<{ id: string; slug: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Determine if the param is a UUID (event ID) or slug
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Fetch initial messages via socket after connection
  const loadChatHistory = (socket: Socket) => {
    if (!eventIdOrSlug) return;
    
    const payload = isUUID(eventIdOrSlug) 
      ? { eventId: eventIdOrSlug, limit: 100 }
      : { eventSlug: eventIdOrSlug, limit: 100 };
      
    socket.emit('chat:history', payload, (response: any) => {
      if (response?.ok && response?.data) {
        const list: ChatMessageDto[] = response.data;
        setMessages(list);
      }
    });
  };

  // Setup socket connection
  useEffect(() => {
    if (!eventIdOrSlug || !token || !isAuthenticated) {
      return;
    }
    
    let isMounted = true;
    
    // Disconnect any existing socket first
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    const socket = io(SOCKET_URL, {
      path: '/chat',
      auth: { token },
      forceNew: true,
      withCredentials: true,
      transports: ['polling', 'websocket'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      if (isMounted) {
        setSocketConnected(true);
        // Join the event chat room
        setTimeout(() => {
          const joinPayload = isUUID(eventIdOrSlug) 
            ? { eventId: eventIdOrSlug }
            : { eventSlug: eventIdOrSlug };
            
          socket.emit('chat:join', joinPayload, (response: any) => {
            if (response?.ok) {
              // Store event data from response
              if (response.eventId && response.eventSlug) {
                setEventData({ id: response.eventId, slug: response.eventSlug });
              }
              // Load chat history after successfully joining
              loadChatHistory(socket);
            }
          });
        }, 100);
      }
    });

    socket.on('connect_error', (_error) => {
      if (isMounted) {
        setSocketConnected(false);
      }
    });

    socket.on('disconnect', () => {
      if (isMounted) {
        setSocketConnected(false);
      }
    });

    // Listen for new messages
    socket.on('chat:message', (msg: ChatMessageDto) => {
      if (isMounted) {
        setMessages((prev) => {
          // Duplicate check
          if (prev.find(m => m.id === msg.id)) {
            return prev;
          }
          const newMessages = [...prev, msg];
          return newMessages;
        });
      }
    });

    // Listen for chat events
    socket.on('chat:joined', ({ eventId: joinedEventId, eventSlug: joinedEventSlug }: { eventId?: string; eventSlug?: string }) => {
      if (isMounted) {
        console.log('Successfully joined event chat:', joinedEventId || joinedEventSlug);
        if (joinedEventId && joinedEventSlug) {
          setEventData({ id: joinedEventId, slug: joinedEventSlug });
        }
      }
    });

    socket.on('chat:error', ({ code, message }: { code: string; message: string }) => {
      if (isMounted) {
        console.error('Chat error:', code, message);
      }
    });

    return () => {
      isMounted = false;
      if (socket.connected) {
        const leavePayload = isUUID(eventIdOrSlug) 
          ? { eventId: eventIdOrSlug }
          : { eventSlug: eventIdOrSlug };
        socket.emit('chat:leave', leavePayload);
      }
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [eventIdOrSlug, token, isAuthenticated]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !eventIdOrSlug || sending || !socketRef.current) return;
    
    const messageText = input.trim();
    setInput(''); // Clear input immediately for better UX
    setSending(true);
    
    const sendPayload = isUUID(eventIdOrSlug) 
      ? { eventId: eventIdOrSlug, message: messageText }
      : { eventSlug: eventIdOrSlug, message: messageText };
    
    socketRef.current.emit('chat:send', sendPayload, (response: any) => {
      if (!response?.ok) {
        // Restore input on error
        setInput(messageText);
        console.error('Failed to send message:', response?.message);
      }
      setSending(false);
    });
  };

  if (!eventIdOrSlug) {
    return (
      <div className="event-chat">
        <div className="event-chat__error">Geçersiz etkinlik</div>
      </div>
    );
  }

  return (
    <div className="event-chat">
      <div className="event-chat__container">
        <div className="event-chat__header">
          <button onClick={() => navigate(-1)} className="event-chat__back-btn">
            ← Geri
          </button>
          <h1 className="event-chat__title">💬 Etkinlik Sohbeti</h1>
          <div style={{ fontSize: '12px', color: socketConnected ? '#05EF7E' : '#ef4444', marginLeft: 'auto' }}>
            {socketConnected ? '🟢 Bağlı' : '🔴 Bağlantı Yok'}
          </div>
        </div>

        <div ref={listRef} className="event-chat__messages">
          {messages.map((m) => {
            const mine = user && m.senderId === user.id;
            return (
              <div 
                key={m.id} 
                className={`event-chat__message ${mine ? 'event-chat__message--mine' : 'event-chat__message--other'}`}
              >
                <div className={`event-chat__message-bubble ${mine ? 'event-chat__message-bubble--mine' : 'event-chat__message-bubble--other'}`}>
                  <div className={`event-chat__message-header ${mine ? 'event-chat__message-header--mine' : 'event-chat__message-header--other'}`}>
                    {m.senderType === 'ORGANIZER' ? 'Organizatör' : 'Kullanıcı'}
                  </div>
                  <p className="event-chat__message-text">{m.message}</p>
                  <div className="event-chat__message-time">
                    {new Date(m.createdAt).toLocaleString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="event-chat__empty">
              Henüz mesaj yok. İlk mesajı gönderin!
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="event-chat__form">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mesaj yazın..."
            className="event-chat__input"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="event-chat__send-btn"
          >
            {sending ? '...' : 'Gönder'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EventChat;



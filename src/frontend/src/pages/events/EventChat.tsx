import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import './EventChat.css';

type SenderType = 'user' | 'organizer';

interface ChatMessageDto {
  id: string;
  gonderenId: string;
  gonderenTipi: SenderType;
  mesaj: string;
  createdAt: string;
}

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const EventChat: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const token = useMemo(() => localStorage.getItem('token') || '', []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Fetch initial messages
  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      if (!eventId) return;
      try {
        const { data } = await axios.get(`${API_BASE}/chat/event/${eventId}?sayfa=1&limit=100`);
        if (!isMounted) return;
        const list: ChatMessageDto[] = data.messages || [];
        // Oldest first
        setMessages(list.sort((a: ChatMessageDto, b: ChatMessageDto) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      } catch (err) {
        // noop for now
      }
    };
    fetchMessages();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  // Setup socket connection
  useEffect(() => {
    if (!eventId || !token || !isAuthenticated) {
      return;
    }
    
    let isMounted = true;
    
    // Disconnect any existing socket first
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    const socket = io(SOCKET_URL, {
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
        // Delay join-event to ensure auth middleware is processed
        setTimeout(() => {
          socket.emit('join-event', eventId);
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

    // No-op handlers for optional events can be added here if needed

    socket.on('new-message', (msg: ChatMessageDto) => {
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

    socket.on('delete-message', ({ message_id }: { message_id: string }) => {
      if (isMounted) {
        setMessages((prev) => prev.filter((m) => m.id !== message_id));
      }
    });

    return () => {
      isMounted = false;
      if (socket.connected) {
        socket.emit('leave-event', eventId);
      }
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [eventId, token, isAuthenticated]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !eventId || sending) return;
    
    const messageText = input.trim();
    setInput(''); // Clear input immediately for better UX
    setSending(true);
    
    try {
      const response = await axios.post(`${API_BASE}/chat/message`, {
        event_id: eventId,
        mesaj: messageText,
      });
      // new message will arrive via socket 'new-message'
    } catch {
      // Restore input on error
      setInput(messageText);
    } finally {
      setSending(false);
    }
  };

  if (!eventId) {
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
            const mine = user && m.gonderenId === user.id;
            return (
              <div 
                key={m.id} 
                className={`event-chat__message ${mine ? 'event-chat__message--mine' : 'event-chat__message--other'}`}
              >
                <div className={`event-chat__message-bubble ${mine ? 'event-chat__message-bubble--mine' : 'event-chat__message-bubble--other'}`}>
                  <div className={`event-chat__message-header ${mine ? 'event-chat__message-header--mine' : 'event-chat__message-header--other'}`}>
                    {m.gonderenTipi === 'organizer' ? 'Organizatör' : 'Kullanıcı'}
                  </div>
                  <p className="event-chat__message-text">{m.mesaj}</p>
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



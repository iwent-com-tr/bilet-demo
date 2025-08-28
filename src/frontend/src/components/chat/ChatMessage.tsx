import React from 'react';
import './ChatMessage.css';

interface ChatMessageProps {
  message: {
    id: string;
    senderId: string;
    senderType: 'USER' | 'ORGANIZER';
    message: string;
    createdAt: string;
    senderName?: string;
    senderAvatar?: string;
  };
  currentUserId: string;
  currentUserType: 'user' | 'organizer';
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  currentUserId, 
  currentUserType 
}) => {
  const isOwnMessage = message.senderId === currentUserId;
  const isOrganizer = message.senderType === 'ORGANIZER';
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
      {!isOwnMessage && (
        <div className="message-sender">
          {message.senderAvatar && (
            <img 
              src={message.senderAvatar} 
              alt={message.senderName} 
              className="sender-avatar"
            />
          )}
          <div className="sender-info">
            <span className={`sender-name ${isOrganizer ? 'organizer' : 'user'}`}>
              {message.senderName || 'Anonim'}
              {isOrganizer && <span className="organizer-badge">Organizatör</span>}
            </span>
          </div>
        </div>
      )}
      
      <div className={`message-bubble ${isOwnMessage ? 'own-bubble' : 'other-bubble'} ${isOrganizer && !isOwnMessage ? 'organizer-bubble' : ''}`}>
        <p className="message-text">{message.message}</p>
        <span className="message-time">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
};

export default ChatMessage;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatHeader.css';

interface ChatHeaderProps {
  eventName: string;
  eventBanner?: string;
  participantCount: number;
  onGroupInfoClick: () => void;
  onBackClick?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  eventName,
  eventBanner,
  participantCount,
  onGroupInfoClick,
  onBackClick
}) => {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="chat-header">
      <div className="chat-header-content">
        <button 
          onClick={handleBackClick}
          className="chat-back-button"
          aria-label="Geri dön"
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

        <div className="chat-header-info" onClick={onGroupInfoClick}>
          {eventBanner && (
            <img 
              src={eventBanner} 
              alt={eventName}
              className="event-banner-small"
            />
          )}
          <div className="event-info">
            <h3 className="event-name">{eventName}</h3>
            <p className="event-subtitle">Festival Grubu</p>
          </div>
        </div>

        <button 
          onClick={onGroupInfoClick}
          className="chat-menu-button"
          aria-label="Grup bilgileri"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
            <circle cx="19" cy="12" r="1" fill="currentColor"/>
            <circle cx="5" cy="12" r="1" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;

import React, { useState } from 'react';
import './GroupInfo.css';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isOnline?: boolean;
  role?: 'USER' | 'ORGANIZER';
}

interface GroupInfoProps {
  eventName: string;
  eventBanner?: string;
  participants: Participant[];
  onClose: () => void;
  onLeaveGroup?: () => void;
  currentUserId: string;
  isOrganizer?: boolean;
}

const GroupInfo: React.FC<GroupInfoProps> = ({
  eventName,
  eventBanner,
  participants,
  onClose,
  onLeaveGroup,
  currentUserId,
  isOrganizer = false
}) => {
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  
  const displayedParticipants = showAllParticipants ? participants : participants.slice(0, 10);
  const hasMoreParticipants = participants.length > 10;

  const handleParticipantClick = (participant: Participant) => {
    if (participant.id !== currentUserId) {
      // Navigate to user profile or start DM
      console.log('Navigate to user:', participant.id);
    }
  };

  return (
    <div className="group-info-overlay">
      <div className="group-info-modal">
        <div className="group-info-header">
          <button 
            onClick={onClose}
            className="group-info-back-button"
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
          <h2 className="group-info-title">{eventName}</h2>
          <button 
            className="group-info-menu-button"
            aria-label="Daha fazla seçenek"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="1" fill="currentColor"/>
              <circle cx="19" cy="12" r="1" fill="currentColor"/>
              <circle cx="5" cy="12" r="1" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <div className="group-info-content">
          {/* Notification Settings */}
          <div className="group-info-section">
            <button className="group-info-option">
              <div className="option-icon notification-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path 
                    d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                  <path 
                    d="M13.73 21A2 2 0 0 1 10.27 21" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span>Bildirim Ayarları</span>
              <svg className="option-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path 
                  d="M7.5 5L12.5 10L7.5 15" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="group-info-section">
            <button className="group-info-option mute-option">
              <span>Sessizce Al</span>
            </button>
            
            <button className="group-info-option leave-option">
              <span>Gruptan Ayrıl</span>
            </button>
          </div>

          {/* Participants List */}
          <div className="group-info-section">
            <div className="participants-header">
              <h3 className="participants-title">Katılımcı Listesi</h3>
              <span className="participants-count">{participants.length} Kişi</span>
            </div>

            <div className="participants-list">
              {displayedParticipants.map((participant) => (
                <div 
                  key={participant.id}
                  className="participant-item"
                  onClick={() => handleParticipantClick(participant)}
                >
                  <div className="participant-avatar-container">
                    {participant.avatar ? (
                      <img 
                        src={participant.avatar} 
                        alt={`${participant.firstName} ${participant.lastName}`}
                        className="participant-avatar"
                      />
                    ) : (
                      <div className="participant-avatar-placeholder">
                        {participant.firstName.charAt(0)}{participant.lastName.charAt(0)}
                      </div>
                    )}
                    {participant.isOnline && <div className="online-indicator" />}
                  </div>
                  
                  <div className="participant-info">
                    <span className="participant-name">
                      {participant.firstName} {participant.lastName}
                      {participant.role === 'ORGANIZER' && (
                        <span className="organizer-badge">Organizatör</span>
                      )}
                    </span>
                    <span className="participant-status">Üye</span>
                  </div>

                  <svg className="participant-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path 
                      d="M7.5 5L12.5 10L7.5 15" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ))}
              
              {hasMoreParticipants && !showAllParticipants && (
                <button 
                  className="show-more-participants"
                  onClick={() => setShowAllParticipants(true)}
                >
                  Daha fazla katılımcı göster ({participants.length - 10})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupInfo;

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface MobileOrganizerButtonProps {
  className?: string;
}

const MobileOrganizerButton: React.FC<MobileOrganizerButtonProps> = ({ className = '' }) => {
  const navigate = useNavigate();

  const handleOrganizerLogin = () => {
    navigate('/login?type=organizer');
  };

  return (
    <button 
      className={`mobile-organizer-button ${className}`}
      onClick={handleOrganizerLogin}
      title="Organizatör Girişi"
    >
      <svg className="mobile-organizer-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m11 0a2 2 0 01-2 2H7a2 2 0 01-2-2m2 0V9a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2m-6 0a2 2 0 002-2v-2a2 2 0 00-2-2H9a2 2 0 00-2 2v2a2 2 0 002 2h2Z" 
        />
      </svg>
    </button>
  );
};

export default MobileOrganizerButton;
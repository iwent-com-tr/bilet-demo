import React from 'react';
import './OnlineIndicator.css';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ 
  isOnline, 
  size = 'md', 
  className = '',
  showText = false
}) => {
  return (
    <div className={`online-indicator-container ${className}`}>
      <div 
        className={`
          online-indicator-dot
          online-indicator-${size}
          ${isOnline ? 'online' : 'offline'}
        `}
      />
      {showText && (
        <span className={`online-indicator-text online-indicator-text-${size} ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'çevrimiçi' : 'çevrimdışı'}
        </span>
      )}
    </div>
  );
};

export default OnlineIndicator; 
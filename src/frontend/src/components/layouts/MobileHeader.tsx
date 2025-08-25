import React from 'react';
import { useAuth } from '../../context/AuthContext';
import greetingEmoji from '../../assets/greeting-emoji.svg';
import './MobileHeader.css';

const MobileHeader: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.isim || 'Misafir';

  const greetingMessage = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) {
      return 'Günaydın';
    } else if (hour >= 12 && hour < 18) {
      return 'İyi Günler';
    } else {
      return 'İyi Akşamlar';
    }
  };

  return (
    <div className="mobile-header">
      <h1 className="mobile-header__greeting">
        <img src={greetingEmoji} alt="Greeting" className="mobile-header__greeting-emoji" />
        {greetingMessage()}, {firstName}
      </h1>
    </div>
  );
};

export default MobileHeader; 
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import greetingEmoji from '../../assets/greeting-emoji.svg';
import './MobileHeader.css';

const MobileHeader: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.isim || 'Misafir';

  return (
    <div className="mobile-header">
      <h1 className="mobile-header__greeting">
        <img src={greetingEmoji} alt="Greeting" className="mobile-header__greeting-emoji" />
        Günaydın, {firstName}
      </h1>
    </div>
  );
};

export default MobileHeader; 
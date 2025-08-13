import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="not-found-container">
      {/* Floating background shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>
      
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Sayfa Bulunamadı</h2>
        <p className="not-found-description">
          Aradığınız sayfa mevcut değil, taşınmış veya geçici olarak erişilemez durumda olabilir.
          Lütfen URL'yi kontrol edin veya ana sayfaya dönün.
        </p>
        
        <div className="not-found-actions">
          <Link to="/" className="home-button">
            <span className="home-icon">🏠</span>
            Ana Sayfaya Dön
          </Link>
          
          <button 
            onClick={handleGoBack}
            className="back-button"
            type="button"
          >
            ← Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 
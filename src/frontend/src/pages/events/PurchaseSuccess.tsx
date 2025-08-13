import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PurchaseSuccess.css';

const PurchaseSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Auto-redirect after 5 seconds on mobile
    if (isMobile) {
      const timer = setTimeout(() => {
        const slug = location.state?.slug;
        if (slug) {
          navigate(`/events/${slug}`, {
            state: { purchaseSuccess: true },
            replace: true
          });
        } else {
          navigate('/');
        }
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isMobile, location.state?.slug, navigate]);

  const handleViewTickets = () => {
    navigate('/my-tickets');
  };

  const handleGoHome = () => {
    navigate('/');
  };


  return (
    <div className="purchase-success">
      <div className="purchase-success__container">
        {/* Success Icon */}
        <div className="purchase-success__icon-container">
          <div className="purchase-success__icon-circle">
            <svg
              className="purchase-success__icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        
        {/* Success Content */}
        <div className="purchase-success__content">
          <h1 className="purchase-success__title">Tebrikler! 🎉</h1>
          <h2 className="purchase-success__subtitle">Biletiniz Başarıyla Alındı</h2>
          
          <div className="purchase-success__message-container">
            <p className="purchase-success__message">
              Etkinlik biletiniz başarıyla satın alındı. QR kodunuz ve bilet detayları e-posta adresinize gönderildi.
            </p>
            
            <div className="purchase-success__info-cards">
              <div className="purchase-success__info-card">
                <div className="purchase-success__info-icon">📧</div>
                <div className="purchase-success__info-text">
                  <span className="purchase-success__info-label">E-posta</span>
                  <span className="purchase-success__info-value">Gönderildi</span>
                </div>
              </div>
              
              <div className="purchase-success__info-card">
                <div className="purchase-success__info-icon">📱</div>
                <div className="purchase-success__info-text">
                  <span className="purchase-success__info-label">QR Kod</span>
                  <span className="purchase-success__info-value">Hazır</span>
                </div>
              </div>
              
              <div className="purchase-success__info-card">
                <div className="purchase-success__info-icon">✅</div>
                <div className="purchase-success__info-text">
                  <span className="purchase-success__info-label">Durum</span>
                  <span className="purchase-success__info-value">Aktif</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="purchase-success__actions">
          <button
            onClick={handleViewTickets}
            className="purchase-success__primary-button"
          >
            <span className="purchase-success__button-icon">🎫</span>
            Biletlerimi Görüntüle
          </button>
          
          <button
            onClick={handleGoHome}
            className="purchase-success__tertiary-button"
          >
            <span className="purchase-success__button-icon">🏠</span>
            Ana Sayfaya Dön
          </button>
        </div>

        {/* Mobile Auto-redirect Info */}
        {isMobile && (
          <div className="purchase-success__mobile-info">
            <p className="purchase-success__mobile-text">
              Otomatik olarak etkinlik sayfasına yönlendirileceksiniz...
            </p>
            <div className="purchase-success__mobile-timer">
              <div className="purchase-success__mobile-progress"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseSuccess; 
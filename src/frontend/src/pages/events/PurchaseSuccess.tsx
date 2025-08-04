import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './PurchaseSuccess.css';

const PurchaseSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If on mobile, redirect to event detail page with success state
    if (window.innerWidth <= 768) {
      const eventId = location.state?.eventId;
      if (eventId) {
        navigate(`/events/${eventId}`, {
          state: { purchaseSuccess: true },
          replace: true
        });
      } else {
        navigate('/');
      }
    }
  }, []);

  // Only render on desktop
  if (window.innerWidth <= 768) {
    return null;
  }

  return (
    <div className="purchase-success">
      <div className="purchase-success__container">
        <div className="purchase-success__icon-container">
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
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        
        <h2 className="purchase-success__title">Satın Alma Başarılı!</h2>
        <p className="purchase-success__message">
          Biletiniz başarıyla satın alındı. QR kodunuz e-posta adresinize gönderildi.
        </p>
        
        <div className="purchase-success__buttons">
          <button
            onClick={() => navigate('/my-tickets')}
            className="purchase-success__primary-button"
          >
            Biletlerimi Görüntüle
          </button>
          <button
            onClick={() => navigate('/')}
            className="purchase-success__secondary-button"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseSuccess; 
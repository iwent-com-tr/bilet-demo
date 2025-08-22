import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { isAuthenticated, isOrganizer, user, logout } = useAuth();

  return (
    <header className="navbar">
      <nav className="navbar__container">
        <div className="navbar__content">
          {/* Logo */}
          <Link to="/" className="navbar__logo">
            <span className="navbar__logo-i">i</span>
            <span className="navbar__logo-text">Went</span>
          </Link>

          {/* Navigation */}
          <div className="navbar__links">
            <Link to="/search" className="navbar__link">
              Keşfet
            </Link>
            <Link to="/events" className="navbar__link">
              Etkinlikler
            </Link>
            <Link to="/calendar" className="navbar__link">
              Takvim
            </Link>
            <Link to="/artists" className="navbar__link">
              Sanatçılar
            </Link>
            <Link to="/venues" className="navbar__link">
              Mekanlar
            </Link>
            
            {isAuthenticated ? (
              <div className="navbar__user-menu">
                <div className="navbar__user-dropdown">
                  <button className="navbar__user-button">
                    <span>{user?.isim} {user?.soyisim}</span>
                    <svg
                      className="navbar__dropdown-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <div className="navbar__dropdown-menu">
                    <Link
                      to={isOrganizer ? '/organizer/profile' : '/profile'}
                      className="navbar__dropdown-item"
                    >
                      Profil
                    </Link>
                    {!isOrganizer && (
                      <Link
                        to="/my-tickets"
                        className="navbar__dropdown-item"
                      >
                        Biletlerim
                      </Link>
                    )}
                    {isOrganizer && (
                      <>
                        <Link
                          to="/organizer/events"
                          className="navbar__dropdown-item"
                        >
                          Etkinliklerim
                        </Link>
                        <Link
                          to="/organizer"
                          className="navbar__dropdown-item"
                        >
                          Gösterge Paneli
                        </Link>
                        <Link
                          to="/organizer/devices"
                          className="navbar__dropdown-item"
                        >
                          Cihazlar
                        </Link>
                      </>
                    )}
                    <button
                      onClick={logout}
                      className="navbar__dropdown-item navbar__dropdown-button"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="navbar__auth-buttons">
                <Link
                  to="/register"
                  className="navbar__button navbar__button--primary"
                >
                  Kayıt Ol
                </Link>
                <Link
                  to="/login"
                  className="navbar__button navbar__button--secondary"
                >
                  Giriş Yap
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar; 
import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface MainLayoutProps {
  requireAuth?: boolean;
  organizerOnly?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ requireAuth, organizerOnly }) => {
  const { isAuthenticated, isOrganizer, user, logout, loading } = useAuth();

  // Show loading state or return null while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (organizerOnly && !isOrganizer) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#262626] shadow">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="text-3xl font-bold font-amnesty flex items-center">
              <span style={{ color: '#5DEE83' }}>i</span>
              <span style={{ color: '#FFFFFF' }}>Went</span>
            </Link>

            {/* Navigation */}
            <div className="flex items-center space-x-6">
              <Link to="/events" className="text-gray-300 hover:text-white">
                Etkinlikler
              </Link>

              {isAuthenticated ? (
                <>
                  {isOrganizer ? (
                    <>
                      <Link to="/organizer" className="text-gray-300 hover:text-white">
                        Kontrol Paneli
                      </Link>
                      <Link to="/organizer/events" className="text-gray-300 hover:text-white">
                        Etkinliklerim
                      </Link>
                    </>
                  ) : (
                    <Link to="/my-tickets" className="text-gray-300 hover:text-white">
                      Biletlerim
                    </Link>
                  )}

                  {/* User Menu */}
                  <div className="relative group">
                    <button className="flex items-center space-x-1 text-gray-300 hover:text-white">
                      <span>{user?.isim} {user?.soyisim} - {isOrganizer ? 'Organizatör' : 'Kullanıcı'}</span>
                      <svg
                        className="w-4 h-4"
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

                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
                      <Link
                        to={isOrganizer ? '/organizer/profile' : '/profile'}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Profil
                      </Link>
                      {isOrganizer && (
                        <Link
                          to="/organizer/devices"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Cihazlar
                        </Link>
                      )}
                      <button
                        onClick={logout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Çıkış Yap
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-300 hover:text-white">
                    Giriş Yap
                  </Link>
                  <Link
                    to="/register"
                    className="bg-[#5DEE83] text-gray-800 px-4 py-2 rounded-md hover:bg-[#4cd973]"
                  >
                    Kayıt Ol
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Hakkımızda</h3>
              <p className="text-gray-300">
                iWent, organizatörlerin etkinlik oluşturup bilet satışı yapabileceği, kullanıcıların
                bilet alabileceği modern bir online bilet satış platformudur.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Hızlı Bağlantılar</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/events" className="text-gray-300 hover:text-white">
                    Etkinlikler
                  </Link>
                </li>
                <li>
                  <Link to="/register/organizer" className="text-gray-300 hover:text-white">
                    Organizatör Ol
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">İletişim</h3>
              <ul className="space-y-2 text-gray-300">
                <li>Email: info@iwent.com</li>
                <li>Tel: +90 (212) 123 45 67</li>
                <li>Adres: İstanbul, Türkiye</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-300">
            <p>&copy; {new Date().getFullYear()} Iwent. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout; 
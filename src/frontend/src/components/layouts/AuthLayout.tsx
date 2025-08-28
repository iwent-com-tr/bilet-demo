import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AuthLayout: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-white text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect based on user type
    if (user?.userType === 'ORGANIZER') {
      return <Navigate to="/organizer" />;
    } else if (user?.userType === 'ADMIN' || user?.adminRole === 'ADMIN') {
      return <Navigate to="/admin" />;
    } else {
      return <Navigate to="/" />;
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 shadow-lg border-b border-gray-800">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-green-400 hover:text-green-300 transition-colors">
              Iwent
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800">
        <div className="container mx-auto px-4 py-4 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} iWent.com.tr Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  );
};

export default AuthLayout; 
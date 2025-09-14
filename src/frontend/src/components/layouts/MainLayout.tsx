import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileNavbar from './MobileNavbar';
import PageHeader from './PageHeader';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const location = useLocation();

  const getTitle = (pathname: string): string | undefined => {
    if (pathname === '/organizer/events') return 'Etkinliklerim';
    if (pathname === '/organizer') return 'Kontrol Paneli';
    if (pathname.startsWith('/organizer/events/') && pathname.endsWith('/edit')) return 'Etkinlik Düzenle';
    if (pathname.startsWith('/organizer/events/create')) return 'Etkinlik Oluştur';
    if (pathname === '/profile') return 'Profil';
    if (pathname === '/my-tickets') return 'Biletlerim';
    if (pathname === '/user/settings') return 'Ayarlar';
    if (pathname === '/calendar') return 'Takvim';
    if (pathname.startsWith('/search')) return 'Keşfet';
    if (pathname.startsWith('/events/')) return 'Etkinlik Detayı';
    return undefined;
  };

  const title = getTitle(location.pathname);

  return (
    <div className="main-layout">
      <Navbar />
      {/* PageHeader only for pages not using MobileLayout */}
      <PageHeader title={title} />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <MobileNavbar />
    </div>
  );
};

export default MainLayout;
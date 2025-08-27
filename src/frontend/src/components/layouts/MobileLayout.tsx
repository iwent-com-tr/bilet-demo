import React from 'react';
import MobileNavbar from './MobileNavbar';
import PageHeader from './PageHeader';
import './MobileLayout.css';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, title }) => {
  return (
    <div className="mobile-layout">
      <PageHeader title={title} />
      <main className="mobile-layout__main">
        {children}
      </main>
      <MobileNavbar />
    </div>
  );
};

export default MobileLayout;
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-600">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Sayfa Bulunamadı</h2>
        <p className="mt-2 text-gray-600">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        <Link
          to="/"
          className="mt-6 inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700"
        >
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
};

export default NotFound; 
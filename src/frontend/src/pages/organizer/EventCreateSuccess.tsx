import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface EventDetails {
  ad: string;
  kategori: string;
  baslangic_tarih: string;
  bitis_tarih: string;
  yer: string;
  il: string;
  adres: string;
  kapasite: number;
  bilet_tipleri: Array<{
    tip: string;
    fiyat: number;
    kapasite: number;
  }>;
}

const EventCreateSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const eventDetails = location.state?.eventDetails as EventDetails;

  if (!eventDetails) {
    navigate('/organizer/events');
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-green-800">
              Etkinlik Başarıyla Oluşturuldu!
            </h3>
            <p className="text-green-700">
              Etkinliğiniz başarıyla oluşturuldu ve yayına alındı.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Etkinlik Özeti</h2>
        </div>

        <div className="px-6 py-4 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{eventDetails.ad}</h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 mt-2">
              {eventDetails.kategori}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Tarih ve Saat</h4>
              <p className="mt-1">
                <span className="block">{formatDate(eventDetails.baslangic_tarih)}</span>
                <span className="block text-gray-500">ile</span>
                <span className="block">{formatDate(eventDetails.bitis_tarih)}</span>
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500">Konum</h4>
              <p className="mt-1">
                <span className="block font-medium">{eventDetails.yer}</span>
                <span className="block">{eventDetails.il}</span>
                <span className="block text-gray-600">{eventDetails.adres}</span>
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Bilet Tipleri</h4>
            <div className="space-y-2">
              {eventDetails.bilet_tipleri.map((bilet, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded">
                  <span className="font-medium">{bilet.tip}</span>
                  <div>
                    <span className="text-gray-600">{bilet.fiyat} TL</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-gray-600">{bilet.kapasite} kişi</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => navigate('/organizer/events')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Etkinlik Listesine Dön
            </button>
            <button
              onClick={() => navigate(`/organizer/events/${location.state?.eventId}/edit#durum`)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Etkinliği Yayına Al!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventCreateSuccess; 
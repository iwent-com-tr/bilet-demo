import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Event {
  id: string;
  ad: string;
  kategori: string;
  baslangic_tarih: string;
  bitis_tarih: string;
  yer: string;
  il: string;
  banner: string;
}

const EventList: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    kategori: '',
    il: '',
    baslangic_tarih: '',
    bitis_tarih: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEvents();
  }, [page, filters]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        sayfa: page.toString(),
        limit: '12',
        ...filters
      });

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/event?${params}`);
      setEvents(response.data.events);
      setTotalPages(response.data.sayfa_sayisi);
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlikler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Filtrele</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="kategori" className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              id="kategori"
              name="kategori"
              value={filters.kategori}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Tümü</option>
              <option value="Müzik">Müzik</option>
              <option value="Tiyatro">Tiyatro</option>
              <option value="Spor">Spor</option>
              <option value="Festival">Festival</option>
            </select>
          </div>

          <div>
            <label htmlFor="il" className="block text-sm font-medium text-gray-700 mb-1">
              Şehir
            </label>
            <select
              id="il"
              name="il"
              value={filters.il}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Tümü</option>
              <option value="İstanbul">İstanbul</option>
              <option value="Ankara">Ankara</option>
              <option value="İzmir">İzmir</option>
            </select>
          </div>

          <div>
            <label htmlFor="baslangic_tarih" className="block text-sm font-medium text-gray-700 mb-1">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              id="baslangic_tarih"
              name="baslangic_tarih"
              value={filters.baslangic_tarih}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div>
            <label htmlFor="bitis_tarih" className="block text-sm font-medium text-gray-700 mb-1">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              id="bitis_tarih"
              name="bitis_tarih"
              value={filters.bitis_tarih}
              onChange={handleFilterChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => (
          <Link
            key={event.id}
            to={`/events/${event.id}`}
            className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="aspect-w-16 aspect-h-9">
              <img
                src={event.banner || '/placeholder-event.jpg'}
                alt={event.ad}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{event.ad}</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>{event.kategori}</p>
                <p>{formatDate(event.baslangic_tarih)}</p>
                <p>
                  {event.yer}, {event.il}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-md disabled:opacity-50"
          >
            Önceki
          </button>
          <span className="px-4 py-2">
            Sayfa {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-md disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* No Events */}
      {events.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Etkinlik bulunamadı</h3>
          <p className="mt-2 text-sm text-gray-500">Farklı filtreler deneyebilirsiniz.</p>
        </div>
      )}
    </div>
  );
};

export default EventList; 
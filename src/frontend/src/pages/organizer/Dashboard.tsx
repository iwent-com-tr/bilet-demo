import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Event {
  id: string;
  ad: string;
  baslangic_tarih: string;
  durum: string;
}

interface Stats {
  toplam_bilet: number;
  kullanilan_bilet: number;
  iptal_edilen: number;
  toplam_kazanc: number;
  bilet_tipleri: {
    [key: string]: {
      adet: number;
      kazanc: number;
      kullanilan: number;
    };
  };
}

const OrganizerDashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventStats();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizer/events`);
      setEvents(response.data.events);
      if (response.data.events.length > 0) {
        setSelectedEvent(response.data.events[0].id);
      }
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlikler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const fetchEventStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/organizer/event/${selectedEvent}/stats`
      );
      setStats(response.data.stats);
    } catch (error) {
      toast.error('İstatistikler yüklenirken bir hata oluştu');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Kontrol Paneli</h1>
        <Link
          to="/organizer/events/create"
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Yeni Etkinlik
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Henüz etkinliğiniz yok</h3>
          <p className="mt-2 text-sm text-gray-500">
            İlk etkinliğinizi oluşturmak için "Yeni Etkinlik" butonuna tıklayın.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Event Selector */}
          <div className="bg-white shadow rounded-lg p-6">
            <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-2">
              Etkinlik Seçin
            </label>
            <select
              id="event"
              value={selectedEvent}
              onChange={e => setSelectedEvent(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.ad} - {formatDate(event.baslangic_tarih)}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500">Toplam Bilet</h3>
                <p className="mt-2 text-3xl font-semibold">{stats.toplam_bilet}</p>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500">Kullanılan Bilet</h3>
                <p className="mt-2 text-3xl font-semibold">{stats.kullanilan_bilet}</p>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500">İptal Edilen</h3>
                <p className="mt-2 text-3xl font-semibold">{stats.iptal_edilen}</p>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500">Toplam Kazanç</h3>
                <p className="mt-2 text-3xl font-semibold">{formatCurrency(stats.toplam_kazanc)}</p>
              </div>
            </div>
          )}

          {/* Ticket Types */}
          {stats && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Bilet Tipleri</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bilet Tipi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Satılan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kullanılan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kazanç
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(stats.bilet_tipleri).map(([tip, data]) => (
                      <tr key={tip}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {data.adet}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {data.kullanilan}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(data.kazanc)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-4">
            <Link
              to={`/organizer/events/${selectedEvent}/edit`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Etkinliği Düzenle
            </Link>
            <Link
              to={`/organizer/event/${selectedEvent}/report`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Rapor İndir
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerDashboard; 
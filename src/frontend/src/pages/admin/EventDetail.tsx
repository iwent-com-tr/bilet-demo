import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminEventDetail: React.FC = () => {
  const { id } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDetail(); }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/events/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setEvent(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Etkinlik detay yüklenirken hata');
    } finally { setLoading(false); }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleString('tr-TR') : '-';
  const trCurrency = (n?: number) => typeof n === 'number' ? n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '-';

  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen p-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!event) return <div className="bg-gray-900 text-white min-h-screen p-8">Bulunamadı</div>;

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <span className={`px-3 py-1 rounded-full text-xs ${
            event.status === 'ACTIVE' ? 'bg-green-900 text-green-300' :
            event.status === 'COMPLETED' ? 'bg-blue-900 text-blue-300' :
            event.status === 'CANCELLED' ? 'bg-red-900 text-red-300' : 'bg-gray-900 text-gray-300'
          }`}>{event.status}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Etkinlik Bilgileri</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Şehir: <span className="text-white">{event.city}</span></div>
              <div>Mekan: <span className="text-white">{event.venue}</span></div>
              <div>Başlangıç: <span className="text-white">{formatDate(event.startDate)}</span></div>
              <div>Bitiş: <span className="text-white">{formatDate(event.endDate)}</span></div>
              <div>Kategori: <span className="text-white">{event.category}</span></div>
              <div>Oluşturulma: <span className="text-white">{formatDate(event.createdAt)}</span></div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Organizer</h3>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Şirket: <span className="text-white">{event.organizer?.company || '-'}</span></div>
              <div>Email: <span className="text-white">{event.organizer?.email || '-'}</span></div>
              <div>Telefon: <span className="text-white">{event.organizer?.phone || '-'}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="font-semibold mb-4">İstatistikler</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700 rounded p-3">
              <div className="text-2xl font-bold">{event.stats?.soldTickets ?? '-'}</div>
              <div className="text-xs text-gray-300">Satılan Bilet</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-2xl font-bold">{event.stats?.isCompleted ? (event.stats?.usedEntries ?? 0) : '-'}</div>
              <div className="text-xs text-gray-300">Giriş Sayısı</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-2xl font-bold">{event.stats?.capacity ?? '-'}</div>
              <div className="text-xs text-gray-300">Kapasite</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-2xl font-bold">{trCurrency(event.stats?.revenue)}</div>
              <div className="text-xs text-gray-300">Ciro</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEventDetail;


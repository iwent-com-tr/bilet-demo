import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

interface AdminEventItem {
  id: string;
  name: string;
  category: string;
  startDate: string;
  endDate: string;
  city: string;
  venue: string;
  status: 'DRAFT' | 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  organizer?: { id: string; company?: string };
  stats?: { soldTickets: number; usedEntries: number; revenue: number; isCompleted: boolean };
}

const EventList: React.FC = () => {
  const [items, setItems] = useState<AdminEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [sort, setSort] = useState('-startDate');
  const [filters, setFilters] = useState({ q: '', organizer_id: '', status: '', category: '', city: '', date_from: '', date_to: '' });

  useEffect(() => { fetchEvents(true); }, [sort, JSON.stringify(filters)]);

  const fetchEvents = async (reset = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params: any = { ...filters, sort, limit: 25 };
      if (!reset && nextCursor) params.cursor = nextCursor;
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/admin/events`, { headers: { Authorization: `Bearer ${token}` }, params });
      const newItems = res.data.items as AdminEventItem[];
      setItems(reset ? newItems : [...items, ...newItems]);
      setNextCursor(res.data.page?.next_cursor || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Etkinlikler yüklenirken hata');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSort = (field: string) => {
    const newSort = sort === field ? `-${field}` : field;
    setSort(newSort);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/admin/events/export`, null, {
        headers: { Authorization: `Bearer ${token}` },
        params: filters,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `events_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      toast.error('Excel dışa aktarımında hata');
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString('tr-TR');

  const getStatusBadge = (s: string) => {
    const statusStyles: Record<string, string> = {
      DRAFT: 'bg-gray-900 text-gray-300',
      ACTIVE: 'bg-green-900 text-green-300',
      CANCELLED: 'bg-red-900 text-red-300',
      COMPLETED: 'bg-blue-900 text-blue-300',
    };
    return statusStyles[s] || 'bg-gray-900 text-gray-300';
  };

  const getCategoryText = (category: string) => {
    const categoryMap: Record<string, string> = {
      CONCERT: 'Konser',
      FESTIVAL: 'Festival',
      UNIVERSITY: 'Üniversite',
      WORKSHOP: 'Atölye',
      CONFERENCE: 'Konferans',
      SPORT: 'Spor',
      PERFORMANCE: 'Performans',
      EDUCATION: 'Eğitim',
    };
    return categoryMap[category] || category;
  };

  const SortIndicator = ({ field }: { field: string }) => {
    if (sort === field) return <span>▲</span>;
    if (sort === `-${field}`) return <span>▼</span>;
    return null;
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Etkinlik Yönetimi</h1>
          <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Export to XLSX</button>
        </div>

        <div className="mb-6 p-4 bg-gray-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <input name="q" placeholder="Ara (ad, şehir, mekan...)" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2" />
          <input name="organizer_id" placeholder="Organizer ID" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2" />
          <select name="status" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2">
            <option value="">Tüm Durumlar</option>
            <option value="DRAFT">Taslak</option>
            <option value="ACTIVE">Yayında</option>
            <option value="CANCELLED">İptal</option>
            <option value="COMPLETED">Tamamlandı</option>
          </select>
          <select name="category" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2">
            <option value="">Tüm Kategoriler</option>
            <option value="CONCERT">Konser</option>
            <option value="FESTIVAL">Festival</option>
            <option value="UNIVERSITY">Üniversite</option>
            <option value="WORKSHOP">Atölye</option>
            <option value="CONFERENCE">Konferans</option>
            <option value="SPORT">Spor</option>
            <option value="PERFORMANCE">Performans</option>
            <option value="EDUCATION">Eğitim</option>
          </select>
          <input type="date" name="date_from" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2" />
          <input type="date" name="date_to" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2" />
        </div>

        <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>Etkinlik <SortIndicator field="name" /></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Organizer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('startDate')}>Başlangıç <SortIndicator field="startDate" /></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Satış</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Giriş</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Detay</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {loading && items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8">Etkinlik bulunamadı.</td></tr>
              ) : (
                items.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold">{e.name}</div>
                      <div className="text-xs text-gray-400">{e.city} • {e.venue}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{e.organizer?.company || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{getCategoryText(e.category)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(e.startDate)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(e.status)}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{e.stats?.soldTickets ?? '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{e.stats?.isCompleted ? (e.stats?.usedEntries ?? 0) : <span className="text-gray-400">-</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/admin/events/${e.id}`} className="text-green-400 hover:underline">İncele</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {nextCursor && (
            <div className="p-4 bg-gray-700">
              <button onClick={() => fetchEvents()} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full transition-colors">
                {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventList;


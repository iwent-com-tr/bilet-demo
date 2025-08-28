import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const OrganizerList: React.FC = () => {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '' });
  const [sort, setSort] = useState('-createdAt');
  const [nextCursor, setNextCursor] = useState(null);
  const [aggregates, setAggregates] = useState({ total: 0, approved: 0, pending: 0 });

  useEffect(() => {
    fetchOrganizers(true);
  }, [filters, sort]);

  const fetchOrganizers = async (reset = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        ...filters,
        sort,
        limit: '25',
      });
      if (!reset && nextCursor) {
        params.append('cursor', nextCursor);
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users/organizers`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setOrganizers(reset ? response.data.items : [...organizers, ...response.data.items]);
      setNextCursor(response.data.page.next_cursor);
      setAggregates(response.data.aggregates);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        toast.error(`Organizerler yüklenirken bir hata oluştu: ${message}`);
      } else {
        toast.error('Organizerler yüklenirken bir hata oluştu');
      }
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
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/organizers/export`, filters,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate dynamic filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_').slice(0, -5);
      const filename = `all_organizers_${timestamp}.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        toast.error(`Organizerler dışa aktarılırken bir hata oluştu: ${message}`);
      } else {
        toast.error('Organizerler dışa aktarılırken bir hata oluştu');
      }
    }
  };

  const handleApprovalChange = async (organizerId: string, newApprovalStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/admin/users/organizers/${organizerId}/approval`,
        { approved: newApprovalStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the local state
      setOrganizers(organizers.map((organizer: any) => 
        organizer.id === organizerId 
          ? { ...organizer, approved: newApprovalStatus }
          : organizer
      ));
      
      // Update aggregates
      setAggregates(prev => ({
        ...prev,
        approved: newApprovalStatus ? prev.approved + 1 : prev.approved - 1,
        pending: newApprovalStatus ? prev.pending - 1 : prev.pending + 1
      }));
      
      toast.success(`Organizer ${newApprovalStatus ? 'onaylandı' : 'onayı kaldırıldı'}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        toast.error(`Onay durumu güncellenirken bir hata oluştu: ${message}`);
      } else {
        toast.error('Onay durumu güncellenirken bir hata oluştu');
      }
    }
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
          <div>
            <h1 className="text-3xl font-bold">Tüm Organizerler</h1>
            <div className="flex space-x-4 mt-2 text-sm text-gray-300">
              <span>Toplam: {aggregates.total}</span>
              <span>Onaylı: {aggregates.approved}</span>
              <span>Bekleyen: {aggregates.pending}</span>
            </div>
          </div>
          <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Export to XLSX
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <input
            type="text"
            name="q"
            placeholder="Ara (İsim, Email, Şirket, Telefon...)"
            onChange={handleFilterChange}
            className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
          />
          <select
            name="approved"
            onChange={handleFilterChange}
            className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Tüm Durumlar</option>
            <option value="true">Onaylı</option>
            <option value="false">Bekleyen</option>
          </select>
          <div className="flex space-x-2">
            <Link
              to="/admin/users"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-center flex items-center justify-center"
            >
              Tüm Kullanıcılar
            </Link>
          </div>
        </div>

        <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('firstName')}>
                  İsim <SortIndicator field='firstName' />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('company')}>
                  Şirket <SortIndicator field='company' />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('email')}>
                  Email <SortIndicator field='email' />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('approved')}>
                  Onay Durumu <SortIndicator field='approved' />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Etkinlik Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>
                  Oluşturulma <SortIndicator field='createdAt' />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Detay
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {loading && organizers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div></td></tr>
              ) : organizers.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8">Organizer bulunamadı.</td></tr>
              ) : (
                organizers.map((organizer: any) => (
                  <tr key={organizer.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{organizer.firstName} {organizer.lastName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{organizer.company}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{organizer.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{organizer.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={organizer.approved ? 'true' : 'false'}
                        onChange={(e) => handleApprovalChange(organizer.id, e.target.value === 'true')}
                        className={`px-2 py-1 text-xs rounded-lg border-0 cursor-pointer transition-colors ${
                          organizer.approved 
                            ? 'bg-green-900 text-green-300 hover:bg-green-800' 
                            : 'bg-yellow-900 text-yellow-300 hover:bg-yellow-800'
                        }`}
                      >
                        <option value="true" className="bg-green-900 text-green-300">Onaylı</option>
                        <option value="false" className="bg-yellow-900 text-yellow-300">Bekleyen</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{organizer.events}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(organizer.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/admin/organizers/${organizer.id}`} className="text-green-400 hover:underline">Detay</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {nextCursor && (
            <div className="p-4 bg-gray-700">
              <button onClick={() => fetchOrganizers()} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full transition-colors">
                {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerList;
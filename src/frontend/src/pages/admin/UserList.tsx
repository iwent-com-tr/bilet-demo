import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const UserList: React.FC = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', role: '', status: '', verified: '' });
  const [sort, setSort] = useState('-createdAt');
  const [nextCursor, setNextCursor] = useState(null);

  useEffect(() => {
    fetchUsers(true);
  }, [filters, sort]);

  const fetchUsers = async (reset = false) => {
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

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setUsers(reset ? response.data.items : [...users, ...response.data.items]);
      setNextCursor(response.data.page.next_cursor);
    } catch (error) {
      toast.error('Kullanıcılar yüklenirken bir hata oluştu');
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
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/export`, filters,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      toast.error('Kullanıcılar dışa aktarılırken bir hata oluştu');
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
          <h1 className="text-3xl font-bold">Kullanıcı Yönetimi</h1>
          <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Export to XLSX
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <input type="text" name="q" placeholder="Ara (İsim, Email, Telefon...)" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-green-500 focus:border-green-500" />
          <select name="role" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-green-500 focus:border-green-500">
            <option value="">Tüm Roller</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPPORT">Support</option>
            <option value="USER">User</option>
          </select>
          <select name="status" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-green-500 focus:border-green-500">
            <option value="">Tüm Durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="SUSPENDED">Askıda</option>
            <option value="DELETED">Silinmiş</option>
          </select>
          <select name="verified" onChange={handleFilterChange} className="bg-gray-700 border border-gray-600 text-white rounded-lg p-2 focus:ring-green-500 focus:border-green-500">
            <option value="">Tüm Doğrulama</option>
            <option value="email">Email</option>
            <option value="phone">Telefon</option>
            <option value="both">İkisi de</option>
            <option value="none">Hiçbiri</option>
          </select>
        </div>

        <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('lastName')}>İsim <SortIndicator field='lastName' /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('email')}>Email <SortIndicator field='email' /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('adminRole')}>Rol <SortIndicator field='adminRole' /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>Durum <SortIndicator field='status' /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>Oluşturulma <SortIndicator field='createdAt' /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Detay</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {loading && users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8">Kullanıcı bulunamadı.</td></tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{user.firstName} {user.lastName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.adminRole}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/admin/users/${user.id}`} className="text-green-400 hover:underline">Detay</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {nextCursor && (
            <div className="p-4 bg-gray-700">
              <button onClick={() => fetchUsers()} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full transition-colors">
                {loading ? 'Yükleniyor...' : 'Daha Fazla Yükle'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserList;

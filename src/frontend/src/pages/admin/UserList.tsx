import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: 'USER' | 'ADMIN' | 'ORGANIZER';
  adminRole: 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: '', role: '', status: '', verified: '' });
  const [sort, setSort] = useState('-createdAt');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [updating, setUpdating] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    userId: string;
    field: 'userType' | 'adminRole';
    value: string;
    requiresUserTypeUpdate?: boolean;
    requiresAdminRoleReset?: boolean;
  } | null>(null);
  const { user: currentUser } = useAuth();

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
        include_organizers: 'true', // Include approved organizers
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
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        toast.error(`Kullanıcılar yüklenirken bir hata oluştu: ${message}`);
      } else {
        toast.error('Kullanıcılar yüklenirken bir hata oluştu');
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
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/export`, filters,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.setAttribute('download', `users_${timestamp}.xlsx`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      toast.error('Kullanıcılar dışa aktarılırken bir hata oluştu');
    }
  };

  // Check if current user can edit roles
  const canEditRoles = currentUser?.userType === 'ADMIN' && currentUser?.adminRole === 'ADMIN';

  const handleRoleChange = (userId: string, field: 'userType' | 'adminRole', value: string) => {
    const user = users.find((u: User) => u.id === userId);
    if (!user) return;

    // Prevent self-editing
    if (userId === currentUser?.id) {
      toast.error('Kendi rolünüzü düzenleyemezsiniz');
      return;
    }

    // If changing userType to USER, adminRole will be automatically set to USER
    if (field === 'userType' && value === 'USER' && user.adminRole !== 'USER') {
      setPendingUpdate({
        userId,
        field,
        value,
        requiresAdminRoleReset: true
      });
      setShowConfirmModal(true);
      return;
    }

    // If changing adminRole to something other than USER, ensure userType is ADMIN
    if (field === 'adminRole' && value !== 'USER' && user.userType !== 'ADMIN') {
      setPendingUpdate({
        userId,
        field,
        value,
        requiresUserTypeUpdate: true
      });
      setShowConfirmModal(true);
      return;
    }

    // Direct update for other cases
    setPendingUpdate({ userId, field, value });
    setShowConfirmModal(true);
  };

  const confirmRoleUpdate = async () => {
    if (!pendingUpdate) return;

    setUpdating(pendingUpdate.userId);
    try {
      const token = localStorage.getItem('token');
      const updateData: any = {};

      // If we need to update userType first
      if (pendingUpdate.requiresUserTypeUpdate) {
        updateData.userType = 'ADMIN';
        updateData.adminRole = pendingUpdate.value;
      } else if (pendingUpdate.requiresAdminRoleReset) {
        // When changing userType to USER, adminRole will be automatically set to USER by backend
        updateData.userType = pendingUpdate.value;
      } else {
        updateData[pendingUpdate.field] = pendingUpdate.value;
      }

      await axios.patch(
        `${process.env.REACT_APP_API_URL}/admin/users/${pendingUpdate.userId}/roles`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setUsers(users.map((user: User) => {
        if (user.id === pendingUpdate.userId) {
          const updatedUser: User = {
            ...user,
            [pendingUpdate.field]: pendingUpdate.value as any
          };
          
          if (pendingUpdate.requiresUserTypeUpdate) {
            updatedUser.userType = 'ADMIN';
          } else if (pendingUpdate.requiresAdminRoleReset) {
            updatedUser.adminRole = 'USER';
          }
          
          return updatedUser;
        }
        return user;
      }));

      toast.success('Rol başarıyla güncellendi');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        toast.error(`Rol güncellenirken hata: ${message}`);
      } else {
        toast.error('Rol güncellenirken bir hata oluştu');
      }
    } finally {
      setUpdating('');
      setShowConfirmModal(false);
      setPendingUpdate(null);
    }
  };

  const cancelRoleUpdate = () => {
    setShowConfirmModal(false);
    setPendingUpdate(null);
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
            <h1 className="text-3xl font-bold">Kullanıcılar & Onaylı Organizerler</h1>
            {canEditRoles && (
              <p className="text-sm text-gray-400 mt-1">
                Kullanıcı tiplerini ve admin rollerini düzenleyebilirsiniz
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <Link
              to="/admin/organizers"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Organizerler
            </Link>
            <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
              Export to XLSX
            </button>
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('adminRole')}>Admin Rolü <SortIndicator field='adminRole' /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>Durum <SortIndicator field='status' /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>Oluşturulma <SortIndicator field='createdAt' /></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Detay</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {loading && users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8">Kullanıcı bulunamadı.</td></tr>
              ) : (
                users.map((user: User) => (
                  <tr key={user.id} className="hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">{user.firstName} {user.lastName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canEditRoles && user.userType !== 'ORGANIZER' && user.id !== currentUser?.id ? (
                        <select
                          value={user.userType}
                          onChange={(e) => handleRoleChange(user.id, 'userType', e.target.value)}
                          disabled={updating === user.id}
                          className="px-2 py-1 text-xs rounded bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.userType === 'ORGANIZER' ? 'bg-purple-900 text-purple-300' :
                          user.userType === 'ADMIN' ? 'bg-red-900 text-red-300' :
                          'bg-blue-900 text-blue-300'
                        }`}>
                          {user.userType === 'ORGANIZER' ? 'Organizer' : user.userType}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canEditRoles && user.userType !== 'ORGANIZER' && user.id !== currentUser?.id ? (
                        <select
                          value={user.adminRole}
                          onChange={(e) => handleRoleChange(user.id, 'adminRole', e.target.value)}
                          disabled={updating === user.id}
                          className="px-2 py-1 text-xs rounded bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPPORT">SUPPORT</option>
                          <option value="READONLY">READONLY</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.adminRole === 'ADMIN' ? 'bg-red-900 text-red-300' :
                          user.adminRole === 'SUPPORT' ? 'bg-yellow-900 text-yellow-300' :
                          user.adminRole === 'READONLY' ? 'bg-gray-900 text-gray-300' :
                          'bg-blue-900 text-blue-300'
                        }`}>
                          {user.adminRole}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.status === 'ACTIVE' ? 'bg-green-900 text-green-300' :
                        user.status === 'SUSPENDED' ? 'bg-red-900 text-red-300' :
                        'bg-gray-900 text-gray-300'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        to={user.userType === 'ORGANIZER' ? `/admin/organizers/${user.id}` : `/admin/users/${user.id}`} 
                        className="text-green-400 hover:underline"
                      >
                        Detay
                      </Link>
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

        {/* Confirmation Modal */}
        {showConfirmModal && pendingUpdate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">
                {pendingUpdate.requiresUserTypeUpdate ? 'Admin Rolü Güncellemesi' : 
                 pendingUpdate.requiresAdminRoleReset ? 'Kullanıcı Tipi Güncellemesi' : 
                 'Rol Güncellemesi'}
              </h3>
              <div className="mb-4 text-gray-300">
                {pendingUpdate.requiresUserTypeUpdate ? (
                  <div>
                    <p className="mb-2">
                      Admin rolü atayabilmek için kullanıcı tipinin ADMIN olması gerekiyor.
                    </p>
                    <p className="mb-2">
                      <strong>Yapılacak değişiklikler:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Kullanıcı Tipi: ADMIN olarak güncellenecek</li>
                      <li>Admin Rolü: {pendingUpdate.value} olarak atanacak</li>
                    </ul>
                  </div>
                ) : pendingUpdate.requiresAdminRoleReset ? (
                  <div>
                    <p className="mb-2">
                      Kullanıcı tipi USER olarak değiştirildiğinde admin rolü otomatik olarak USER olur.
                    </p>
                    <p className="mb-2">
                      <strong>Yapılacak değişiklikler:</strong>
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Kullanıcı Tipi: USER olarak güncellenecek</li>
                      <li>Admin Rolü: USER olarak sıfırlanacak</li>
                    </ul>
                  </div>
                ) : (
                  <p>
                    {pendingUpdate.field === 'userType' ? 'Kullanıcı tipi' : 'Admin rolü'} <strong>{pendingUpdate.value}</strong> olarak güncellenecek.
                  </p>
                )}
                <p className="mt-2 text-yellow-400 text-sm">
                  Bu işlemi onaylamak istiyor musunuz?
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={confirmRoleUpdate}
                  disabled={updating !== ''}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                  {updating !== '' ? 'Güncelleniyor...' : 'Onayla'}
                </button>
                <button
                  onClick={cancelRoleUpdate}
                  disabled={updating !== ''}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;

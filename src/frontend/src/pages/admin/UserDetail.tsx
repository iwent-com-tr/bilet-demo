import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

interface AttendedEvent {
  id: string;
  name: string;
  slug: string;
  category: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
}

type AttendedEventsByCategory = Record<string, AttendedEvent[]>;

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [attendedEvents, setAttendedEvents] = useState<AttendedEventsByCategory>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    field: 'userType' | 'adminRole';
    value: string;
    requiresUserTypeUpdate?: boolean;
    requiresAdminRoleReset?: boolean;
  } | null>(null);
  const { user: currentUser } = useAuth();

  const eventCategories = [
    { id: 'CONCERT', name: 'Konser' },
    { id: 'FESTIVAL', name: 'Festival' },
    { id: 'UNIVERSITY', name: 'Üniversite' },
    { id: 'WORKSHOP', name: 'Atölye' },
    { id: 'CONFERENCE', name: 'Konferans' },
    { id: 'SPORT', name: 'Spor' },
    { id: 'PERFORMANCE', name: 'Performans' },
    { id: 'EDUCATION', name: 'Eğitim' },
  ];

  const fetchAttendedEvents = async (category?: string) => {
    setLoadingEvents(true);
    try {
      const token = localStorage.getItem('token');
      const params = category && category !== 'all' ? { category } : {};
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users/${id}/attended-events`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setAttendedEvents(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        toast.error(`Etkinlik bilgileri yüklenirken bir hata oluştu: ${message}`);
      } else {
        toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      }
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        setLoading(false);
        
        // Fetch attended events after user is loaded
        fetchAttendedEvents();
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.message || error.message;
          toast.error(`Kullanıcı bilgileri yüklenirken bir hata oluştu: ${message}`);
        } else {
          toast.error('Kullanıcı bilgileri yüklenirken bir hata oluştu');
        }
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    fetchAttendedEvents(category === 'all' ? undefined : category);
  };

  const handleEventClick = (slug: string) => {
    // Open event in new tab for easier navigation
    window.open(`/events/${slug}`, '_blank');
  };

  const handleRoleUpdate = async (field: 'userType' | 'adminRole', value: string) => {
    if (!user) return;

    // If changing userType to USER, adminRole will be automatically set to USER
    if (field === 'userType' && value === 'USER' && user.adminRole !== 'USER') {
      setPendingUpdate({
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
        field,
        value,
        requiresUserTypeUpdate: true
      });
      setShowConfirmModal(true);
      return;
    }

    // Direct update for other cases
    setPendingUpdate({ field, value });
    setShowConfirmModal(true);
  };

  const confirmRoleUpdate = async () => {
    if (!pendingUpdate) return;

    setUpdating(true);
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
        `${process.env.REACT_APP_API_URL}/admin/users/${id}/roles`,
        updateData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      const stateUpdate: any = {
        ...user,
        [pendingUpdate.field]: pendingUpdate.value
      };

      if (pendingUpdate.requiresUserTypeUpdate) {
        stateUpdate.userType = 'ADMIN';
      } else if (pendingUpdate.requiresAdminRoleReset) {
        stateUpdate.adminRole = 'USER';
      }

      setUser(stateUpdate);

      toast.success('Rol başarıyla güncellendi');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        toast.error(`Güncelleme hatası: ${message}`);
      } else {
        toast.error('Rol güncellenirken bir hata oluştu');
      }
    } finally {
      setUpdating(false);
      setShowConfirmModal(false);
      setPendingUpdate(null);
    }
  };

  const cancelRoleUpdate = () => {
    setShowConfirmModal(false);
    setPendingUpdate(null);
  };

  // Check if current user is admin and not editing their own account
  const isCurrentUserAdmin = currentUser?.userType === 'ADMIN' && currentUser?.adminRole === 'ADMIN';
  const isEditingSelf = currentUser?.id === id;
  const canEditRoles = isCurrentUserAdmin && !isEditingSelf;

  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Kullanıcı bulunamadı</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          {user.firstName} {user.lastName}
          {isEditingSelf && (
            <span className="ml-4 text-sm text-yellow-400 font-normal">
              (Kendi profiliniz - rol düzenlemesi devre dışı)
            </span>
          )}
        </h1>
        
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Genel Bilgiler</h2>
            <div className="space-y-3">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Telefon:</strong> {user.phone}</p>
              <p><strong>Email Doğrulandı:</strong> {user.emailVerified ? 'Evet' : 'Hayır'}</p>
              <p><strong>Telefon Doğrulandı:</strong> {user.phoneVerified ? 'Evet' : 'Hayır'}</p>
              <p><strong>Şehir:</strong> {user.city}</p>
              <p><strong>Ülke:</strong> {user.country || 'Belirtilmemiş'}</p>
              <p><strong>Doğum Yılı:</strong> {user.birthYear}</p>
              <p><strong>Kayıt Tarihi:</strong> {new Date(user.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Yönetim Bilgileri</h2>
            <div className="space-y-3">
              <div>
                <strong>Kullanıcı Tipi:</strong>
                {canEditRoles ? (
                  <select
                    value={user.userType}
                    onChange={(e) => handleRoleUpdate('userType', e.target.value)}
                    disabled={updating}
                    className="ml-2 px-2 py-1 text-xs rounded bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="ORGANIZER">ORGANIZER</option>
                  </select>
                ) : (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    user.userType === 'ADMIN' ? 'bg-red-900 text-red-300' :
                    user.userType === 'ORGANIZER' ? 'bg-purple-900 text-purple-300' :
                    'bg-blue-900 text-blue-300'
                  }`}>
                    {user.userType}
                  </span>
                )}
              </div>
              <div>
                <strong>Admin Rolü:</strong>
                {canEditRoles ? (
                  <select
                    value={user.adminRole}
                    onChange={(e) => handleRoleUpdate('adminRole', e.target.value)}
                    disabled={updating}
                    className="ml-2 px-2 py-1 text-xs rounded bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPPORT">SUPPORT</option>
                    <option value="READONLY">READONLY</option>
                  </select>
                ) : (
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    user.adminRole === 'ADMIN' ? 'bg-red-900 text-red-300' :
                    user.adminRole === 'SUPPORT' ? 'bg-yellow-900 text-yellow-300' :
                    user.adminRole === 'READONLY' ? 'bg-gray-900 text-gray-300' :
                    'bg-blue-900 text-blue-300'
                  }`}>
                    {user.adminRole}
                  </span>
                )}
              </div>
              <p><strong>Durum:</strong> 
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  user.status === 'ACTIVE' ? 'bg-green-900 text-green-300' :
                  user.status === 'SUSPENDED' ? 'bg-red-900 text-red-300' :
                  'bg-gray-900 text-gray-300'
                }`}>
                  {user.status}
                </span>
              </p>
              <p><strong>Pazarlama İzni:</strong> {user.marketingConsent ? 'Evet' : 'Hayır'}</p>
              <p><strong>Puan:</strong> {user.points}</p>
              <p><strong>Son Giriş:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Hiç giriş yapmamış'}</p>
              <p><strong>Son Görülme:</strong> {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'Bilinmiyor'}</p>
            </div>
          </div>
        </div>

        {/* Attended Events */}
        <div className="bg-gray-800 shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Katıldığı Etkinlikler</h2>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="px-3 py-1 rounded bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none"
            >
              <option value="all">Tüm Kategoriler</option>
              {eventCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {loadingEvents ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(attendedEvents).length > 0 ? (
                Object.entries(attendedEvents).map(([category, events]) => {
                  const categoryInfo = eventCategories.find(c => c.id === category);
                  return (
                    <div key={category} className="border border-gray-700 rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-3 text-green-400">
                        {categoryInfo?.name || category} ({events.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {events.map((event) => (
                          <div
                            key={event.id}
                            onClick={() => handleEventClick(event.slug)}
                            className="bg-gray-700 p-3 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                          >
                            <h4 className="font-medium text-white hover:text-green-400 transition-colors">
                              {event.name}
                            </h4>
                            <p className="text-sm text-gray-400 mt-1">
                              {new Date(event.startDate).toLocaleDateString('tr-TR')}
                            </p>
                            <p className="text-sm text-gray-400">
                              {event.venue}, {event.city}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 text-center py-8">
                  {selectedCategory === 'all' 
                    ? 'Hiç katıldığı etkinlik bulunmuyor.' 
                    : `${eventCategories.find(c => c.id === selectedCategory)?.name || selectedCategory} kategorisinde katıldığı etkinlik bulunmuyor.`
                  }
                </p>
              )}
            </div>
          )}
        </div>

        {/* Login Events */}
        <div className="bg-gray-800 shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Son Giriş Etkinlikleri</h2>
          {user.loginEvents && user.loginEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Adresi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Yöntem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User Agent</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {user.loginEvents.map((event: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(event.ts).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{event.ip || 'Belirtilmemiş'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          (event.method === 'PASSWORD' || !event.method) ? 'bg-blue-900 text-blue-300' :
                          event.method === 'GOOGLE' ? 'bg-red-900 text-red-300' :
                          event.method === 'FACEBOOK' ? 'bg-blue-800 text-blue-200' :
                          'bg-gray-900 text-gray-300'
                        }`}>
                          {event.method || 'PASSWORD'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{event.ua || 'Belirtilmemiş'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Hiç giriş etkinliği bulunmuyor.</p>
          )}
        </div>

        {/* Audit Logs */}
        <div className="bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Son Aktiviteler</h2>
          {user.auditLogsAsActor && user.auditLogsAsActor.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tarih</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Eylem</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Varlık</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Varlık ID</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {user.auditLogsAsActor.map((log: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(log.ts).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{log.action}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{log.entity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{log.entityId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Hiç aktivite kaydı bulunmuyor.</p>
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
                  disabled={updating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
                >
                  {updating ? 'Güncelleniyor...' : 'Onayla'}
                </button>
                <button
                  onClick={cancelRoleUpdate}
                  disabled={updating}
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

export default UserDetail;

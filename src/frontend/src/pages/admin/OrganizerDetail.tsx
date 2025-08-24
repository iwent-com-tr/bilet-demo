import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const OrganizerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchOrganizer = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users/organizers/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrganizer(response.data);
        setLoading(false);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.message || error.message;
          toast.error(`Organizer bilgileri yüklenirken bir hata oluştu: ${message}`);
        } else {
          toast.error('Organizer bilgileri yüklenirken bir hata oluştu');
        }
        setLoading(false);
      }
    };

    fetchOrganizer();
  }, [id]);

  const toggleApproval = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${process.env.REACT_APP_API_URL}/admin/users/organizers/${id}/approval`,
        { approved: !organizer.approved },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOrganizer({ ...organizer, approved: !organizer.approved });
      toast.success(`Organizer ${!organizer.approved ? 'onaylandı' : 'onayı kaldırıldı'}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        toast.error(`Onay durumu güncellenirken bir hata oluştu: ${message}`);
      } else {
        toast.error('Onay durumu güncellenirken bir hata oluştu');
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Organizer bulunamadı</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{organizer.firstName} {organizer.lastName}</h1>
          <button
            onClick={toggleApproval}
            disabled={updating}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              organizer.approved
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {updating 
              ? 'Güncelleniyor...' 
              : organizer.approved 
                ? 'Onayı Kaldır' 
                : 'Onayla'
            }
          </button>
        </div>
        
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Genel Bilgiler</h2>
            <div className="space-y-3">
              <p><strong>Şirket:</strong> {organizer.company}</p>
              <p><strong>Email:</strong> {organizer.email}</p>
              <p><strong>Telefon:</strong> {organizer.phone}</p>
              <p><strong>Telefon Doğrulandı:</strong> {organizer.phoneVerified ? 'Evet' : 'Hayır'}</p>
              <p><strong>Onay Durumu:</strong> 
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                  organizer.approved 
                    ? 'bg-green-900 text-green-300' 
                    : 'bg-yellow-900 text-yellow-300'
                }`}>
                  {organizer.approved ? 'Onaylı' : 'Bekleyen'}
                </span>
              </p>
              <p><strong>Kayıt Tarihi:</strong> {new Date(organizer.createdAt).toLocaleString()}</p>
              <p><strong>Son Giriş:</strong> {organizer.lastLogin ? new Date(organizer.lastLogin).toLocaleString() : 'Hiç giriş yapmamış'}</p>
            </div>
          </div>

          <div className="bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">İşletme Bilgileri</h2>
            <div className="space-y-3">
              <p><strong>Vergi Numarası:</strong> {organizer.taxNumber || 'Belirtilmemiş'}</p>
              <p><strong>Vergi Dairesi:</strong> {organizer.taxOffice || 'Belirtilmemiş'}</p>
              <p><strong>Adres:</strong> {organizer.address || 'Belirtilmemiş'}</p>
              <p><strong>Banka Hesabı:</strong> {organizer.bankAccount || 'Belirtilmemiş'}</p>
            </div>
          </div>
        </div>

        {/* Events */}
        <div className="bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Etkinlikler ({organizer.events?.length || 0})</h2>
          {organizer.events && organizer.events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Etkinlik Adı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Başlangıç Tarihi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Bitiş Tarihi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Kapasite</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Oluşturulma</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {organizer.events.map((event: any) => (
                    <tr key={event.id} className="hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">{event.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          event.status === 'ACTIVE' ? 'bg-green-900 text-green-300' :
                          event.status === 'DRAFT' ? 'bg-yellow-900 text-yellow-300' :
                          event.status === 'CANCELLED' ? 'bg-red-900 text-red-300' :
                          'bg-gray-900 text-gray-300'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(event.startDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(event.endDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{event.capacity || 'Sınırsız'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(event.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400">Henüz etkinlik oluşturulmamış.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDetail;
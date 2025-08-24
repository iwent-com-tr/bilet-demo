import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data);
        setLoading(false);
      } catch (error) {
        toast.error('Kullanıcı bilgileri yüklenirken bir hata oluştu');
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (!user) {
    return <div>Kullanıcı bulunamadı.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{user.firstName} {user.lastName}</h1>
      <div className="bg-gray-800 shadow rounded-lg p-6">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Telefon:</strong> {user.phone}</p>
        <p><strong>Admin Rolü:</strong> {user.adminRole}</p>
        <p><strong>Durum:</strong> {user.status}</p>
        <p><strong>Kayıt Tarihi:</strong> {new Date(user.createdAt).toLocaleString()}</p>
        <p><strong>Son Görülme:</strong> {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : '-'}</p>
        <p><strong>Son Giriş:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}</p>
      </div>
    </div>
  );
};

export default UserDetail;

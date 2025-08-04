import React, { useState, useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import FavoriteEvents from '../../components/FavoriteEvents';
import RecommendedEvents from '../../components/RecommendedEvents';
import MobileNavbar from '../../components/layouts/MobileNavbar';
import PageHeader from '../../components/layouts/PageHeader';
import avatar from '../../assets/profile/avatar.png';
import './Profile.css';

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>(avatar);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Dosya tipini kontrol et
      if (!file.type.startsWith('image/')) {
        toast.error('Lütfen geçerli bir resim dosyası seçin');
        return;
      }
      
      // Dosya boyutunu kontrol et (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Resim dosyası 5MB\'dan küçük olmalıdır');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formik = useFormik({
    initialValues: {
      isim: user?.isim || '',
      soyisim: user?.soyisim || '',
      email: user?.email || '',
      telefon: '',
      dogum_yili: '',
      cinsiyet: 'Erkek',
      sehir: 'Ankara'
    },
    validationSchema: Yup.object({
      isim: Yup.string()
        .min(2, 'İsim en az 2 karakter olmalıdır')
        .required('İsim zorunludur'),
      soyisim: Yup.string()
        .min(2, 'Soyisim en az 2 karakter olmalıdır')
        .required('Soyisim zorunludur'),
      email: Yup.string()
        .email('Geçerli bir e-posta adresi giriniz')
        .required('E-posta adresi zorunludur'),
      telefon: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, 'Geçerli bir telefon numarası giriniz'),
      dogum_yili: Yup.string(),
      cinsiyet: Yup.string(),
      sehir: Yup.string()
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        
        // Profil resmini yükle
        if (selectedImage !== avatar) {
          const formData = new FormData();
          const base64Data = selectedImage.split(',')[1];
          const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());
          formData.append('avatar', blob, 'avatar.jpg');
          
          await axios.post(`${process.env.REACT_APP_API_URL}/user/avatar`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        }

        // Profil bilgilerini güncelle
        await axios.put(`${process.env.REACT_APP_API_URL}/user/profile`, values);
        toast.success('Profil güncellendi');
        setShowSettings(false);
      } catch (error) {
        toast.error('Profil güncellenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }
  });

  // Stats data
  const stats = [
    { label: 'Etkinlik', value: '94' },
    { label: 'Puan', value: '1204' },
    { label: 'Arkadaş', value: '505' }
  ];

  const renderSettingsForm = () => (
    <form onSubmit={formik.handleSubmit} className="settings-form">
      <div className="avatar-upload">
        <div 
          className="avatar-upload__preview"
          onClick={handleImageClick}
          role="button"
          tabIndex={0}
        >
          <img 
            src={selectedImage} 
            alt="Profil resmi"
            className="avatar-upload__image" 
          />
          <div className="avatar-upload__overlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 15.2L7.4 10.6L8.8 9.2L11 11.4V4H13V11.4L15.2 9.2L16.6 10.6L12 15.2ZM6 20C5.45 20 4.979 19.804 4.587 19.412C4.195 19.02 4 18.549 4 18V16H6V18H18V16H20V18C20 18.55 19.804 19.021 19.412 19.413C19.02 19.805 18.549 20 18 20H6Z" fill="white"/>
            </svg>
            <span>Fotoğrafı Değiştir</span>
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="avatar-upload__input"
          aria-label="Profil fotoğrafı yükle"
        />
      </div>

      <div className="form-group">
        <label htmlFor="isim">İsim</label>
        <input
          type="text"
          id="isim"
          {...formik.getFieldProps('isim')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="soyisim">Soyisim</label>
        <input
          type="text"
          id="soyisim"
          {...formik.getFieldProps('soyisim')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">E-Posta Adresi</label>
        <input
          type="email"
          id="email"
          {...formik.getFieldProps('email')}
        />
      </div>

      <div className="form-group">
        <label htmlFor="telefon">İletişim Numarası</label>
        <div className="phone-input">
          <input
            type="text"
            value="+90"
            disabled
            className="country-code"
            aria-label="Ülke kodu"
          />
          <input
            type="tel"
            id="telefon"
            {...formik.getFieldProps('telefon')}
            className="phone-number"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="dogum_yili">Doğum Yılı</label>
        <input
          type="text"
          id="dogum_yili"
          {...formik.getFieldProps('dogum_yili')}
        />
      </div>

      <div className="form-row">
        <div className="form-group half">
          <label htmlFor="cinsiyet">Cinsiyet</label>
          <select
            id="cinsiyet"
            {...formik.getFieldProps('cinsiyet')}
          >
            <option value="Erkek">Erkek</option>
            <option value="Kadın">Kadın</option>
            <option value="Diğer">Diğer</option>
          </select>
        </div>

        <div className="form-group half">
          <label htmlFor="sehir">Şehir</label>
          <select
            id="sehir"
            {...formik.getFieldProps('sehir')}
          >
            <option value="Ankara">Ankara</option>
            <option value="İstanbul">İstanbul</option>
            <option value="İzmir">İzmir</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="profile-update-button"
        disabled={loading}
      >
        {loading ? 'Güncelleniyor...' : 'Profili Güncelle'}
      </button>
    </form>
  );

  return (
    <div className="profile-page">
      {isMobile && <PageHeader title="Profilim" />}
      <div className="profile-mobile-content">
        {showSettings ? (
          renderSettingsForm()
        ) : (
          <>
            <div className="profile-user-info">
              <div 
                className="profile-avatar"
                onClick={handleImageClick}
                role="button"
                tabIndex={0}
              >
                <img 
                  src={selectedImage}
                  alt={user?.isim} 
                  className="profile-avatar__image"
                />
                <div className="profile-avatar__overlay">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 15.2L7.4 10.6L8.8 9.2L11 11.4V4H13V11.4L15.2 9.2L16.6 10.6L12 15.2ZM6 20C5.45 20 4.979 19.804 4.587 19.412C4.195 19.02 4 18.549 4 18V16H6V18H18V16H20V18C20 18.55 19.804 19.021 19.412 19.413C19.02 19.805 18.549 20 18 20H6Z" fill="white"/>
                  </svg>
                  <span>Fotoğrafı Değiştir</span>
                </div>
              </div>
              <div className="profile-user-details">
                <h2 className="profile-username">@{user?.isim?.toLowerCase()}{user?.soyisim?.toLowerCase()}</h2>
                <h3 className="profile-fullname">{user?.isim} {user?.soyisim} · Üye</h3>
                <div className="profile-stats">
                  {stats.map((stat, index) => (
                    <div key={index} className="profile-stat-item">
                      <span className="profile-stat-value">{stat.value}</span>
                      <span className="profile-stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button 
              className="profile-settings-button"
              onClick={() => setShowSettings(true)}
            >
              Profil Ayarları
            </button>

            <div className="profile-events">
              <div className="profile-section">
                <FavoriteEvents />
              </div>
              <div className="profile-section">
                <RecommendedEvents />
              </div>
            </div>
          </>
        )}
      </div>
      <MobileNavbar />
    </div>
  );
};

export default Profile; 
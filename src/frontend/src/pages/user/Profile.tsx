import React, { useState, useRef, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FavoriteEvents from '../../components/FavoriteEvents';
import RecommendedEvents from '../../components/RecommendedEvents';
import MobileNavbar from '../../components/layouts/MobileNavbar';
import PageHeader from '../../components/layouts/PageHeader';
import avatar from '../../assets/profile/avatar.png';
import './Profile.css';

interface CityItem {
  name: string;
  plate: string;
  latitude?: string;
  longitude?: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ events: number; points: number; friends: number }>({ events: 0, points: 0, friends: 0 });
  const [favorites, setFavorites] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>(avatar);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [profilePhone, setProfilePhone] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cities, setCities] = useState<CityItem[]>([]);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const base = process.env.REACT_APP_API_URL;
        const res = await axios.get(`${base}/auth/cities`);
        const list: CityItem[] = res.data?.cities || [];
        setCities(list);
      } catch (e) {
        // non-blocking
      }
    };
    fetchCities();
  }, []);

  // Fetch live stats, favorites, and phone info from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const base = process.env.REACT_APP_API_URL;
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const userId = localStorage.getItem('user:id') || undefined;
        const favUrl = userId ? `${base}/users/favorites?userId=${encodeURIComponent(userId)}` : `${base}/users/favorites`;
        const [attendedRes, pointsRes, friendsRes, favRes, meRes] = await Promise.all([
          axios.get(`${base}/tickets/attended/count`, { headers }),
          axios.get(`${base}/users/points`, { headers }),
          axios.get(`${base}/friendships/count`, { headers }),
          axios.get(favUrl, { headers }),
          axios.get(`${base}/users/me`, { headers })
        ]);
        setStats({
          events: attendedRes.data?.attendedCount ?? 0,
          points: pointsRes.data?.points ?? 0,
          friends: friendsRes.data?.friendCount ?? 0
        });
        setFavorites(Array.isArray(favRes.data?.events) ? favRes.data.events : []);
        const me = meRes.data?.user;
        setPhoneVerified(Boolean(me?.phoneVerified));
        setProfilePhone(me?.phone || '');
      } catch (e) {
        // non-blocking
      }
    };
    fetchData();
  }, []);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Dosya tipini kontrol et
      if (!file.type.startsWith('image/')) {
        setServerError('Lütfen geçerli bir resim dosyası seçin');
        return;
      }
      
      // Dosya boyutunu kontrol et (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setServerError("Resim dosyası 5MB'dan küçük olmalıdır");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setServerError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const getLocalPhoneFromE164 = (input: string): string => {
    if (!input) return '';
    const trimmed = input.trim();
    if (trimmed.startsWith('+90')) return trimmed.slice(3);
    if (trimmed.startsWith('+')) return trimmed.slice(1);
    return trimmed;
  };

  const toE164WithTurkeyPrefix = (input: string): string => {
    // Accept local 10 or 11 digits, trim leading zeros, ensure E.164 +90XXXXXXXXXX
    const digitsOnly = String(input || '').replace(/\D+/g, '');
    // If already starts with 90 and length 12, assume correct without leading +
    if (digitsOnly.startsWith('90') && digitsOnly.length === 12) return `+${digitsOnly}`;
    // Remove any leading zero from local numbers like 05XXXXXXXXX
    const local = digitsOnly.replace(/^0+/, '');
    if (!local) return '';
    // If user entered 10 digits (5XXXXXXXXX), prefix with +90
    if (local.length === 10) return `+90${local}`;
    // If user entered 11 digits and first is 5 (05...), treat as local and prefix +90 after trimming 0
    if (local.length === 11 && local.startsWith('5')) return `+90${local}`;
    // Fallback: if user somehow included + already, keep as is
    return local.startsWith('+') ? local : `+90${local}`;
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      isim: user?.isim || '',
      soyisim: user?.soyisim || '',
      email: user?.email || '',
      telefon: getLocalPhoneFromE164(profilePhone),
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
      // Expect local TR format (10-11 digits with or without leading 0). We convert to E.164 on submit.
      telefon: Yup.string()
        .matches(/^\+?\d{10,13}$/i, 'Geçerli bir telefon numarası giriniz'),
      dogum_yili: Yup.string(),
      cinsiyet: Yup.string(),
      sehir: Yup.string()
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setServerError(null);
        const base = process.env.REACT_APP_API_URL;
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        // Map to backend UpdateProfileDTO
        const payload: any = {
          firstName: values.isim,
          lastName: values.soyisim,
          email: values.email,
          phone: phoneVerified ? undefined : (values.telefon ? toE164WithTurkeyPrefix(values.telefon) : undefined),
          city: values.sehir,
          avatar: selectedImage !== avatar ? selectedImage : undefined,
        };

        await axios.patch(`${base}/users/me`, payload, { headers });
        setShowSettings(false);
      } catch (error: any) {
        const raw = error?.response?.data;
        let msg: string | null = null;
        if (typeof raw === 'string') {
          const text = raw.replace(/<br\s*\/?>(\s*)/gi, '\n').replace(/<[^>]*>/g, '').trim();
          const m = text.match(/Error:\s*([^\n]+)/i);
          msg = m ? m[1].trim() : text.split('\n')[0];
        } else {
          const backendMsg = raw?.error || raw?.message;
          msg = backendMsg || 'Profil güncelleme başarısız';
        }
        setServerError(msg);
      } finally {
        setLoading(false);
      }
    }
  });

  // Stats data (from API)
  const statsList = [
    { label: 'Etkinlik', value: String(stats.events) },
    { label: 'Puan', value: String(stats.points) },
    { label: 'Arkadaş', value: String(stats.friends) }
  ];

  const renderSettingsForm = () => (
    <form onSubmit={formik.handleSubmit} className="settings-form">
      {serverError && (
        <div className="profile__server-error" role="alert" aria-live="polite">
          {serverError}
        </div>
      )}
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
            type="tel"
            id="telefon"
            {...formik.getFieldProps('telefon')}
            className="phone-number"
            disabled={phoneVerified}
          />
          {!phoneVerified && (
            <button type="button" className="phone-verify-button" onClick={() => navigate('/verify-phone')}>
              Doğrula
            </button>
          )}
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
            {cities.map((city) => (
              <option key={city.name} value={city.name}>
                {city.name.charAt(0).toUpperCase() + city.name.slice(1)}
              </option>
            ))}
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
                <h2 className="profile-username">@{((user?.isim || '').trim().toLowerCase() + (user?.soyisim || '').trim().toLowerCase()).replace(/\s+/g, '')}</h2>
                <h3 className="profile-fullname">{user?.isim} {user?.soyisim} · Üye</h3>
                <div className="profile-stats">
                  {statsList.map((stat, index) => (
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
                <FavoriteEvents events={favorites} />
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
import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './OrganizerProfile.css';

interface OrganizerData {
  isim: string;
  soyisim: string;
  sirket: string;
  email: string;
  telefon: string;
  vergi_no: string;
  vergi_dairesi: string;
  adres: string;
  banka_hesap: string;
}

const OrganizerProfile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<OrganizerData | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);

  // Fetch current organizer profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizer/profile`);
        if (response.data.durum === 1) {
          setProfileData(response.data.organizer);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Profil bilgileri yüklenemedi');
      } finally {
        setFetchingProfile(false);
      }
    };

    if (user?.tip === 'organizer') {
      fetchProfileData();
    } else {
      setFetchingProfile(false);
    }
  }, [user]);

  const formik = useFormik({
    initialValues: {
      isim: profileData?.isim || '',
      soyisim: profileData?.soyisim || '',
      sirket: profileData?.sirket || '',
      email: profileData?.email || '',
      telefon: profileData?.telefon || '',
      vergi_no: profileData?.vergi_no || '',
      vergi_dairesi: profileData?.vergi_dairesi || '',
      adres: profileData?.adres || '',
      banka_hesap: profileData?.banka_hesap || '',
      sifre: '',
      sifre_tekrar: ''
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      isim: Yup.string()
        .min(2, 'İsim en az 2 karakter olmalıdır')
        .required('İsim zorunludur'),
      soyisim: Yup.string()
        .min(2, 'Soyisim en az 2 karakter olmalıdır')
        .required('Soyisim zorunludur'),
      sirket: Yup.string()
        .min(2, 'Şirket adı en az 2 karakter olmalıdır')
        .required('Şirket adı zorunludur'),
      email: Yup.string()
        .email('Geçerli bir e-posta adresi giriniz')
        .required('E-posta adresi zorunludur'),
      telefon: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, 'Geçerli bir telefon numarası giriniz')
        .required('Telefon numarası zorunludur'),
      vergi_no: Yup.string()
        .matches(/^\d{10,11}$/, 'Geçerli bir vergi numarası giriniz'),
      vergi_dairesi: Yup.string(),
      adres: Yup.string(),
      banka_hesap: Yup.string(),
      sifre: Yup.string()
        .min(6, 'Şifre en az 6 karakter olmalıdır'),
      sifre_tekrar: Yup.string()
        .oneOf([Yup.ref('sifre')], 'Şifreler eşleşmiyor')
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await axios.put(`${process.env.REACT_APP_API_URL}/organizer/profile`, values);
        toast.success('Profil güncellendi');
      } catch (error) {
        toast.error('Profil güncellenirken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }
  });

  if (fetchingProfile) {
    return (
      <div className="organizer-profile">
        <div className="organizer-profile__container">
          <div className="organizer-profile__header">
            <h1 className="organizer-profile__title">Organizatör Profili</h1>
            <p className="organizer-profile__subtitle">Profil bilgileri yükleniyor...</p>
          </div>
          <div className="organizer-profile__section">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.7)' }}>
                Yükleniyor...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="organizer-profile">
      <div className="organizer-profile__container">
        <div className="organizer-profile__header">
          <h1 className="organizer-profile__title">Organizatör Profili</h1>
          <p className="organizer-profile__subtitle">Profil bilgilerinizi güncelleyin</p>
        </div>

        <form onSubmit={formik.handleSubmit} className="organizer-profile__form">
          {/* Kişisel Bilgiler */}
          <div className="organizer-profile__section">
            <h2 className="organizer-profile__section-title">Kişisel Bilgiler</h2>
            <div className="organizer-profile__grid organizer-profile__grid--two-columns">
              <div className="organizer-profile__field">
                <label htmlFor="isim" className="organizer-profile__label">
                  İsim
                </label>
                <input
                  type="text"
                  id="isim"
                  {...formik.getFieldProps('isim')}
                  className={`organizer-profile__input ${
                    formik.touched.isim && formik.errors.isim
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="İsminizi girin"
                />
                {formik.touched.isim && formik.errors.isim && (
                  <p className="organizer-profile__error">{formik.errors.isim}</p>
                )}
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="soyisim" className="organizer-profile__label">
                  Soyisim
                </label>
                <input
                  type="text"
                  id="soyisim"
                  {...formik.getFieldProps('soyisim')}
                  className={`organizer-profile__input ${
                    formik.touched.soyisim && formik.errors.soyisim
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="Soyisminizi girin"
                />
                {formik.touched.soyisim && formik.errors.soyisim && (
                  <p className="organizer-profile__error">{formik.errors.soyisim}</p>
                )}
              </div>
            </div>
          </div>

          {/* Şirket Bilgileri */}
          <div className="organizer-profile__section">
            <h2 className="organizer-profile__section-title">Şirket Bilgileri</h2>
            <div className="organizer-profile__grid">
              <div className="organizer-profile__field">
                <label htmlFor="sirket" className="organizer-profile__label">
                  Şirket Adı
                </label>
                <input
                  type="text"
                  id="sirket"
                  {...formik.getFieldProps('sirket')}
                  className={`organizer-profile__input ${
                    formik.touched.sirket && formik.errors.sirket
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="Şirket adınızı girin"
                />
                {formik.touched.sirket && formik.errors.sirket && (
                  <p className="organizer-profile__error">{formik.errors.sirket}</p>
                )}
              </div>

              <div className="organizer-profile__grid organizer-profile__grid--two-columns">
                <div className="organizer-profile__field">
                  <label htmlFor="vergi_no" className="organizer-profile__label">
                    Vergi No
                  </label>
                  <input
                    type="text"
                    id="vergi_no"
                    {...formik.getFieldProps('vergi_no')}
                    className={`organizer-profile__input ${
                      formik.touched.vergi_no && formik.errors.vergi_no
                        ? 'organizer-profile__input--error'
                        : ''
                    }`}
                    placeholder="Vergi numaranızı girin"
                  />
                  {formik.touched.vergi_no && formik.errors.vergi_no && (
                    <p className="organizer-profile__error">{formik.errors.vergi_no}</p>
                  )}
                </div>

                <div className="organizer-profile__field">
                  <label htmlFor="vergi_dairesi" className="organizer-profile__label">
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    id="vergi_dairesi"
                    {...formik.getFieldProps('vergi_dairesi')}
                    className="organizer-profile__input"
                    placeholder="Vergi dairenizi girin"
                  />
                </div>
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="adres" className="organizer-profile__label">
                  Adres
                </label>
                <textarea
                  id="adres"
                  rows={3}
                  {...formik.getFieldProps('adres')}
                  className="organizer-profile__textarea"
                  placeholder="Şirket adresinizi girin"
                />
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="banka_hesap" className="organizer-profile__label">
                  Banka Hesap Bilgileri
                </label>
                <input
                  type="text"
                  id="banka_hesap"
                  {...formik.getFieldProps('banka_hesap')}
                  className="organizer-profile__input"
                  placeholder="IBAN numaranızı girin"
                />
              </div>
            </div>
          </div>

          {/* İletişim Bilgileri */}
          <div className="organizer-profile__section">
            <h2 className="organizer-profile__section-title">İletişim Bilgileri</h2>
            <div className="organizer-profile__grid organizer-profile__grid--two-columns">
              <div className="organizer-profile__field">
                <label htmlFor="email" className="organizer-profile__label">
                  E-posta
                </label>
                <input
                  type="email"
                  id="email"
                  {...formik.getFieldProps('email')}
                  className={`organizer-profile__input ${
                    formik.touched.email && formik.errors.email
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="E-posta adresinizi girin"
                />
                {formik.touched.email && formik.errors.email && (
                  <p className="organizer-profile__error">{formik.errors.email}</p>
                )}
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="telefon" className="organizer-profile__label">
                  Telefon
                </label>
                <input
                  type="tel"
                  id="telefon"
                  {...formik.getFieldProps('telefon')}
                  className={`organizer-profile__input ${
                    formik.touched.telefon && formik.errors.telefon
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="Telefon numaranızı girin"
                />
                {formik.touched.telefon && formik.errors.telefon && (
                  <p className="organizer-profile__error">{formik.errors.telefon}</p>
                )}
              </div>
            </div>
          </div>

          {/* Şifre Değiştirme */}
          <div className="organizer-profile__section">
            <h2 className="organizer-profile__section-title">Şifre Değiştirme</h2>
            <div className="organizer-profile__grid organizer-profile__grid--two-columns">
              <div className="organizer-profile__field">
                <label htmlFor="sifre" className="organizer-profile__label">
                  Yeni Şifre
                </label>
                <input
                  type="password"
                  id="sifre"
                  {...formik.getFieldProps('sifre')}
                  className={`organizer-profile__input ${
                    formik.touched.sifre && formik.errors.sifre
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="Yeni şifrenizi girin"
                />
                {formik.touched.sifre && formik.errors.sifre && (
                  <p className="organizer-profile__error">{formik.errors.sifre}</p>
                )}
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="sifre_tekrar" className="organizer-profile__label">
                  Yeni Şifre Tekrar
                </label>
                <input
                  type="password"
                  id="sifre_tekrar"
                  {...formik.getFieldProps('sifre_tekrar')}
                  className={`organizer-profile__input ${
                    formik.touched.sifre_tekrar && formik.errors.sifre_tekrar
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="Şifrenizi tekrar girin"
                />
                {formik.touched.sifre_tekrar && formik.errors.sifre_tekrar && (
                  <p className="organizer-profile__error">{formik.errors.sifre_tekrar}</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="organizer-profile__submit-container">
            <button
              type="submit"
              disabled={loading}
              className={`organizer-profile__submit-button ${loading ? 'organizer-profile__submit-button--loading' : ''}`}
            >
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizerProfile; 
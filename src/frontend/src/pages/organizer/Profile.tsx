import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './OrganizerProfile.css';

interface OrganizerData {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  phoneVerified?: boolean;
  taxNumber?: string;
  taxOffice?: string;
  address?: string;
  bankAccount?: string;
}

const OrganizerProfile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<OrganizerData | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  // Fetch current organizer profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        if (!user?.id) return setFetchingProfile(false);
        const base = process.env.REACT_APP_API_URL;
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.get(`${base}/organizers/${user.id}`, { headers });
        const org = response.data?.organizer;
        if (org) {
          setProfileData({
            firstName: org.firstName,
            lastName: org.lastName,
            company: org.company,
            email: org.email,
            phone: org.phone,
            phoneVerified: org.phoneVerified,
            taxNumber: org.taxNumber,
            taxOffice: org.taxOffice,
            address: org.address,
            bankAccount: org.bankAccount,
          });
        }
      } catch (error) {
        setServerError('Profil bilgileri yüklenemedi');
      } finally {
        setFetchingProfile(false);
      }
    };

    if (user?.userType === 'ORGANIZER') {
      fetchProfileData();
    } else {
      setFetchingProfile(false);
    }
  }, [user]);

  const formik = useFormik({
    initialValues: {
      firstName: profileData?.firstName || '',
      lastName: profileData?.lastName || '',
      company: profileData?.company || '',
      email: profileData?.email || '', // shown but not updated by self
      phone: profileData?.phone || '',
      taxNumber: profileData?.taxNumber || '',
      taxOffice: profileData?.taxOffice || '',
      address: profileData?.address || '',
      bankAccount: profileData?.bankAccount || ''
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      firstName: Yup.string().min(2, 'İsim en az 2 karakter olmalıdır').required('İsim zorunludur'),
      lastName: Yup.string().min(2, 'Soyisim en az 2 karakter olmalıdır').required('Soyisim zorunludur'),
      company: Yup.string().min(2, 'Şirket adı en az 2 karakter olmalıdır').required('Şirket adı zorunludur'),
      email: Yup.string().email('Geçerli bir e-posta adresi giriniz'),
      phone: Yup.string().matches(/^\+?[0-9]{10,15}$/, 'Geçerli bir telefon numarası giriniz').required('Telefon numarası zorunludur'),
      taxNumber: Yup.string().matches(/^[1-9][0-9]{9}$/,{ message: 'Vergi numarası 10 haneli olmalı ve 0 ile başlamaz.' }).optional(),
      taxOffice: Yup.string().optional(),
      address: Yup.string().optional(),
      bankAccount: Yup.string().optional()
    }),
    onSubmit: async (values) => {
      try {
        if (!user?.id) return;
        setLoading(true);
        setServerError(null);
        const base = process.env.REACT_APP_API_URL;
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        // Map to OrganizerSelfUpdateDTO (email is admin-only, do not send it here)
        const payload: any = {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          company: values.company,
          taxNumber: values.taxNumber || undefined,
          taxOffice: values.taxOffice || undefined,
          address: values.address || undefined,
          bankAccount: values.bankAccount || undefined
        };
        await axios.patch(`${base}/organizers/${user.id}`, payload, { headers });
        navigate('/');
      } catch (error: any) {
        const raw = error?.response?.data;
        let msg: string | null = null;
        if (typeof raw === 'string') {
          let text = raw
            .replace(/<br\s*\/?>(\s*)/gi, '\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/<[^>]*>/g, '')
            .trim();
          // Prefer JSON-like message field inside ZodError payloads
          const jsonMsg = text.match(/"message"\s*:\s*"([^"]+)"/);
          if (jsonMsg) {
            msg = jsonMsg[1];
          } else {
            const m = text.match(/Error:\s*([^\n]+)/i) || text.match(/ZodError:\s*([^\n]+)/i);
            msg = m ? m[1].trim() : text.split('\n')[0];
          }
        } else {
          const backendMsg = raw?.error || raw?.message || raw?.details?.[0]?.message;
          msg = backendMsg || 'Profil güncelleme başarısız';
        }
        setServerError(msg);
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
          {serverError && (
            <div className="organizer-profile__server-error" role="alert" aria-live="polite">
              {serverError}
            </div>
          )}
          {/* Kişisel Bilgiler */}
          <div className="organizer-profile__section">
            <h2 className="organizer-profile__section-title">Kişisel Bilgiler</h2>
            <div className="organizer-profile__grid organizer-profile__grid--two-columns">
              <div className="organizer-profile__field">
                <label htmlFor="firstName" className="organizer-profile__label">
                  İsim
                </label>
                <input
                  type="text"
                  id="firstName"
                  {...formik.getFieldProps('firstName')}
                  className={`organizer-profile__input ${
                    formik.touched.firstName && formik.errors.firstName
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="İsminizi girin"
                />
                {formik.touched.firstName && formik.errors.firstName && (
                  <p className="organizer-profile__error">{formik.errors.firstName}</p>
                )}
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="lastName" className="organizer-profile__label">
                  Soyisim
                </label>
                <input
                  type="text"
                  id="lastName"
                  {...formik.getFieldProps('lastName')}
                  className={`organizer-profile__input ${
                    formik.touched.lastName && formik.errors.lastName
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="Soyisminizi girin"
                />
                {formik.touched.lastName && formik.errors.lastName && (
                  <p className="organizer-profile__error">{formik.errors.lastName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Şirket Bilgileri */}
          <div className="organizer-profile__section">
            <h2 className="organizer-profile__section-title">Şirket Bilgileri</h2>
            <div className="organizer-profile__grid">
              <div className="organizer-profile__field">
                <label htmlFor="company" className="organizer-profile__label">
                  Şirket Adı
                </label>
                <input
                  type="text"
                  id="company"
                  {...formik.getFieldProps('company')}
                  className={`organizer-profile__input ${
                    formik.touched.company && formik.errors.company
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="Şirket adınızı girin"
                />
                {formik.touched.company && formik.errors.company && (
                  <p className="organizer-profile__error">{formik.errors.company}</p>
                )}
              </div>

              <div className="organizer-profile__grid organizer-profile__grid--two-columns">
                <div className="organizer-profile__field">
                  <label htmlFor="taxNumber" className="organizer-profile__label">
                    Vergi No
                  </label>
                  <input
                    type="text"
                    id="taxNumber"
                    {...formik.getFieldProps('taxNumber')}
                    className={`organizer-profile__input ${
                      formik.touched.taxNumber && formik.errors.taxNumber
                        ? 'organizer-profile__input--error'
                        : ''
                    }`}
                    placeholder="Vergi numaranızı girin"
                  />
                  {formik.touched.taxNumber && formik.errors.taxNumber && (
                    <p className="organizer-profile__error">{formik.errors.taxNumber}</p>
                  )}
                </div>

                <div className="organizer-profile__field">
                  <label htmlFor="taxOffice" className="organizer-profile__label">
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    id="taxOffice"
                    {...formik.getFieldProps('taxOffice')}
                    className="organizer-profile__input"
                    placeholder="Vergi dairenizi girin"
                  />
                </div>
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="address" className="organizer-profile__label">
                  Adres
                </label>
                <textarea
                  id="address"
                  rows={3}
                  {...formik.getFieldProps('address')}
                  className="organizer-profile__textarea"
                  placeholder="Şirket adresinizi girin"
                />
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="bankAccount" className="organizer-profile__label">
                  Banka Hesap Bilgileri
                </label>
                <input
                  type="text"
                  id="bankAccount"
                  {...formik.getFieldProps('bankAccount')}
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
                  E-posta (değişiklik için yöneticiye <a href="mailto:admin@iwent.com">başvurun</a>.)
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
                  placeholder="E-posta adresiniz"
                  disabled
                />
              </div>

              <div className="organizer-profile__field">
                <label htmlFor="phone" className="organizer-profile__label">
                  Telefon
                </label>
                <input
                  type="tel"
                  id="phone"
                  {...formik.getFieldProps('phone')}
                  className={`organizer-profile__input ${
                    formik.touched.phone && formik.errors.phone
                      ? 'organizer-profile__input--error'
                      : ''
                  }`}
                  placeholder="Telefon numaranızı girin"
                  disabled={Boolean(profileData?.phoneVerified)}
                />
                {/* Show verify action only when number is not verified (organizer verification may share same route) */}
                {user?.userType === 'ORGANIZER' && !profileData?.phoneVerified && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="phone-verify-button"
                      onClick={() => navigate('/verify-phone-organizer')}
                    >
                      Telefonu Doğrula
                    </button>
                  </div>
                )}
                {formik.touched.phone && formik.errors.phone && (
                  <p className="organizer-profile__error">{formik.errors.phone}</p>
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
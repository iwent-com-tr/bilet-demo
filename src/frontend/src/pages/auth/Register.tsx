import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './Register.css';

interface CityItem {
  name: string;
  plate: string;
  latitude?: string;
  longitude?: string;
}

// Accept local TR formats in UI; normalize to E.164 (+90...) on submit
const phoneRegex = /^\+?\d{10,13}$/; 
const currentYear = new Date().getFullYear();

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<CityItem[]>([]);

  const API_BASE_URL = process.env.REACT_APP_API_URL as string ;

  useEffect(() => {
    const fetchCities = async () => {
      try {
        if (!API_BASE_URL) return;
        const res = await axios.get(`${API_BASE_URL}/auth/cities`);
        const list: CityItem[] = res.data?.cities || [];
        setCities(list);
      } catch (e) {
        // Non-blocking
      }
    };
    fetchCities();
  }, [API_BASE_URL]);

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [cities]);

  const formik = useFormik({
    initialValues: {
      isim: '',
      soyisim: '',
      email: '',
      sifre: '',
      sifre_tekrar: '',
      dogum_yili: '',
      telefon: '',
      sehir: ''
    },
    validationSchema: Yup.object({
      isim: Yup.string().min(2, 'İsim en az 2 karakter olmalıdır').required('İsim zorunludur'),
      soyisim: Yup.string().min(2, 'Soyisim en az 2 karakter olmalıdır').required('Soyisim zorunludur'),
      email: Yup.string().email('Geçerli bir e-posta adresi giriniz').required('E-posta adresi zorunludur'),
      sifre: Yup.string()
        .min(8, 'Şifre en az 8 karakter olmalıdır')
        .matches(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
        .matches(/[^A-Za-z0-9]/, 'Şifre en az bir özel karakter içermelidir')
        .required('Şifre zorunludur'),
      sifre_tekrar: Yup.string().oneOf([Yup.ref('sifre')], 'Şifreler eşleşmiyor').required('Şifre tekrarı zorunludur'),
      dogum_yili: Yup.number()
        .typeError('Doğum yılı geçerli bir sayı olmalıdır')
        .min(1900, 'Geçerli bir doğum yılı giriniz')
        .max(currentYear, 'Geçerli bir doğum yılı giriniz')
        .required('Doğum yılı zorunludur'),
      telefon: Yup.string().matches(phoneRegex, 'Geçerli bir telefon numarası giriniz (örn: 5551112233 veya +905551112233)').required('Telefon numarası zorunludur'),
      sehir: Yup.string().required('Şehir zorunludur')
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        const toE164TR = (input: string): string => {
          const digitsOnly = String(input || '').replace(/\D+/g, '');
          if (!digitsOnly) return '';
          // already like 90XXXXXXXXXX (12 digits)
          if (digitsOnly.startsWith('90') && digitsOnly.length === 12) return `+${digitsOnly}`;
          // trim leading zeros for local numbers like 05XXXXXXXXX
          const local = digitsOnly.replace(/^0+/, '');
          if (local.length === 10) return `+90${local}`;
          if (local.length === 11 && local.startsWith('5')) return `+90${local}`;
          return local.startsWith('+') ? local : `+90${local}`;
        };
        // Map to backendN RegisterDTO fields
        const payload = {
          firstName: values.isim,
          lastName: values.soyisim,
          email: values.email,
          password: values.sifre,
          birthYear: parseInt(values.dogum_yili, 10),
          phone: toE164TR(values.telefon),
          city: values.sehir.toLowerCase()
        };
        await register(payload);
        toast.success('Kayıt başarılı');
        navigate('/');
      } catch (error: any) {
        const msg = error?.response?.data?.error || error?.message || 'Bilinmeyen bir hata oluştu';
        toast.error('Kayıt başarısız: ' + msg);
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <div className="register">
      <div className="register__container">
        <h2 className="register__title">Kayıt Ol</h2>

        <form onSubmit={formik.handleSubmit} className="register__form">
          {/* İsim Soyisim */}
          <div className="register__row register__row--2">
            <div className="register__form-group">
              <label htmlFor="isim" className="register__label">İsim</label>
              <input
                id="isim"
                type="text"
                {...formik.getFieldProps('isim')}
                className={`register__input ${formik.touched.isim && formik.errors.isim ? 'error' : ''}`}
              />
              {formik.touched.isim && formik.errors.isim && (
                <p className="register__error">{formik.errors.isim}</p>
              )}
            </div>

            <div className="register__form-group">
              <label htmlFor="soyisim" className="register__label">Soyisim</label>
              <input
                id="soyisim"
                type="text"
                {...formik.getFieldProps('soyisim')}
                className={`register__input ${formik.touched.soyisim && formik.errors.soyisim ? 'error' : ''}`}
              />
              {formik.touched.soyisim && formik.errors.soyisim && (
                <p className="register__error">{formik.errors.soyisim}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="register__form-group">
            <label htmlFor="email" className="register__label">E-posta</label>
            <input
              id="email"
              type="email"
              {...formik.getFieldProps('email')}
              className={`register__input ${formik.touched.email && formik.errors.email ? 'error' : ''}`}
            />
            {formik.touched.email && formik.errors.email && (
              <p className="register__error">{formik.errors.email}</p>
            )}
          </div>

          {/* Şifreler */}
          <div className="register__row register__row--2">
            <div className="register__form-group">
              <label htmlFor="sifre" className="register__label">Şifre</label>
              <input
                id="sifre"
                type="password"
                {...formik.getFieldProps('sifre')}
                className={`register__input ${formik.touched.sifre && formik.errors.sifre ? 'error' : ''}`}
              />
              {formik.touched.sifre && formik.errors.sifre && (
                <p className="register__error">{formik.errors.sifre}</p>
              )}

              {/* Password requirements checklist */}
              {(() => {
                const password = formik.values.sifre || '';
                const hasMinLength = password.length >= 8;
                const hasUppercase = /[A-Z]/.test(password);
                const hasSpecial = /[^A-Za-z0-9]/.test(password);
                return (
                  <div className="password-requirements" aria-live="polite">
                    <div className={`password-requirements__item ${hasMinLength ? 'met' : 'unmet'}`}>
                      <span className="password-requirements__icon">{hasMinLength ? '✓' : '✗'}</span>
                      En az 8 karakter
                    </div>
                    <div className={`password-requirements__item ${hasUppercase ? 'met' : 'unmet'}`}>
                      <span className="password-requirements__icon">{hasUppercase ? '✓' : '✗'}</span>
                      En az bir büyük harf (A-Z)
                    </div>
                    <div className={`password-requirements__item ${hasSpecial ? 'met' : 'unmet'}`}>
                      <span className="password-requirements__icon">{hasSpecial ? '✓' : '✗'}</span>
                      En az bir özel karakter (ör. !@#$%^&*.)
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="register__form-group">
              <label htmlFor="sifre_tekrar" className="register__label">Şifre Tekrar</label>
              <input
                id="sifre_tekrar"
                type="password"
                {...formik.getFieldProps('sifre_tekrar')}
                className={`register__input ${formik.touched.sifre_tekrar && formik.errors.sifre_tekrar ? 'error' : ''}`}
              />
              {formik.touched.sifre_tekrar && formik.errors.sifre_tekrar && (
                <p className="register__error">{formik.errors.sifre_tekrar}</p>
              )}
            </div>
          </div>

          {/* Doğum Yılı, Telefon, Şehir */}
          <div className="register__row register__row--3">
            <div className="register__form-group">
              <label htmlFor="dogum_yili" className="register__label">Doğum Yılı</label>
              <input
                id="dogum_yili"
                type="number"
                min={1900}
                max={currentYear}
                {...formik.getFieldProps('dogum_yili')}
                className={`register__input ${formik.touched.dogum_yili && formik.errors.dogum_yili ? 'error' : ''}`}
              />
              {formik.touched.dogum_yili && formik.errors.dogum_yili && (
                <p className="register__error">{formik.errors.dogum_yili}</p>
              )}
            </div>

            <div className="register__form-group">
              <label htmlFor="telefon" className="register__label">Telefon</label>
              <input
                id="telefon"
                type="tel"
                placeholder="+905551112233"
                {...formik.getFieldProps('telefon')}
                className={`register__input ${formik.touched.telefon && formik.errors.telefon ? 'error' : ''}`}
              />
              {formik.touched.telefon && formik.errors.telefon && (
                <p className="register__error">{formik.errors.telefon}</p>
              )}
            </div>

            <div className="register__form-group">
              <label htmlFor="sehir" className="register__label">Şehir</label>
              <select
                id="sehir"
                {...formik.getFieldProps('sehir')}
                className={`register__input ${formik.touched.sehir && formik.errors.sehir ? 'error' : ''}`}
              >
                <option value="">Şehir seçiniz</option>
                {sortedCities.map((c) => (
                  <option key={c.plate} value={c.name}>
                    {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                  </option>
                ))}
              </select>
              {formik.touched.sehir && formik.errors.sehir && (
                <p className="register__error">{formik.errors.sehir}</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="register__submit-button">
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </button>

          <div className="register__links">
            <p className="register__link-text">
              Zaten hesabınız var mı?{' '}
              <Link to="/login" className="register__link">Giriş Yap</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register; 
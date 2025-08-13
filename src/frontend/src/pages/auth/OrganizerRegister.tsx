import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import './OrganizerRegister.css';

// Accept local formats and normalize to E.164 (+90...) on submit
const phoneRegex = /^\+?\d{10,13}$/; 

const OrganizerRegister: React.FC = () => {
  const navigate = useNavigate();
  const { registerOrganizer } = useAuth();
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      isim: '',
      soyisim: '',
      sirket: '',
      telefon: '',
      email: '',
      sifre: '',
      sifre_tekrar: '',
      vergi_no: '',
      vergi_dairesi: '',
      adres: '',
      banka_hesap: ''
    },
    validationSchema: Yup.object({
      isim: Yup.string().min(2, 'İsim en az 2 karakter olmalıdır').required('İsim zorunludur'),
      soyisim: Yup.string().min(2, 'Soyisim en az 2 karakter olmalıdır').required('Soyisim zorunludur'),
      sirket: Yup.string().min(2, 'Şirket adı en az 2 karakter olmalıdır').required('Şirket adı zorunludur'),
      telefon: Yup.string().matches(phoneRegex, 'Geçerli bir telefon numarası giriniz (örn: 5551112233 veya +905551112233)').required('Telefon numarası zorunludur'),
      email: Yup.string().email('Geçerli bir e-posta adresi giriniz').required('E-posta adresi zorunludur'),
      sifre: Yup.string()
        .min(8, 'Şifre en az 8 karakter olmalıdır')
        .matches(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
        .matches(/[^A-Za-z0-9]/, 'Şifre en az bir özel karakter içermelidir')
        .required('Şifre zorunludur'),
      sifre_tekrar: Yup.string().oneOf([Yup.ref('sifre')], 'Şifreler eşleşmiyor').required('Şifre tekrarı zorunludur'),
      vergi_no: Yup.string().matches(/^$|^\d{10,11}$/, 'Geçerli bir vergi numarası giriniz'),
      vergi_dairesi: Yup.string(),
      adres: Yup.string(),
      banka_hesap: Yup.string()
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        const toE164TR = (input: string): string => {
          const digitsOnly = String(input || '').replace(/\D+/g, '');
          if (!digitsOnly) return '';
          if (digitsOnly.startsWith('90') && digitsOnly.length === 12) return `+${digitsOnly}`;
          const local = digitsOnly.replace(/^0+/, '');
          if (local.length === 10) return `+90${local}`;
          if (local.length === 11 && local.startsWith('5')) return `+90${local}`;
          return local.startsWith('+') ? local : `+90${local}`;
        };
        // Map to backendN RegisterOrganizerDTO fields
        const payload = {
          firstName: values.isim,
          lastName: values.soyisim,
          company: values.sirket,
          phone: toE164TR(values.telefon),
          email: values.email,
          password: values.sifre,
          taxNumber: values.vergi_no || undefined,
          taxOffice: values.vergi_dairesi || undefined,
          address: values.adres || undefined,
          bankAccount: values.banka_hesap || undefined
        };
        await registerOrganizer(payload);
        toast.success('Kayıt başarılı');
        navigate('/organizer');
      } catch (error: any) {
        const msg = error?.response?.data?.error || error?.message || 'Bilinmeyen bir hata oluştu';
        toast.error('Kayıt başarısız: ' + msg);
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <div className="organizer-register">
      <div className="organizer-register__container">
        <h2 className="organizer-register__title">Organizatör Kaydı</h2>

        <form onSubmit={formik.handleSubmit} className="organizer-register__form">
          {/* İsim Soyisim */}
          <div className="organizer-register__row organizer-register__row--2">
            <div className="organizer-register__form-group">
              <label htmlFor="isim" className="organizer-register__label">İsim</label>
              <input
                id="isim"
                type="text"
                {...formik.getFieldProps('isim')}
                className={`organizer-register__input ${formik.touched.isim && formik.errors.isim ? 'error' : ''}`}
              />
              {formik.touched.isim && formik.errors.isim && (
                <p className="organizer-register__error">{formik.errors.isim}</p>
              )}
            </div>

            <div className="organizer-register__form-group">
              <label htmlFor="soyisim" className="organizer-register__label">Soyisim</label>
              <input
                id="soyisim"
                type="text"
                {...formik.getFieldProps('soyisim')}
                className={`organizer-register__input ${formik.touched.soyisim && formik.errors.soyisim ? 'error' : ''}`}
              />
              {formik.touched.soyisim && formik.errors.soyisim && (
                <p className="organizer-register__error">{formik.errors.soyisim}</p>
              )}
            </div>
          </div>

          {/* Şirket ve Telefon */}
          <div className="organizer-register__row organizer-register__row--2">
            <div className="organizer-register__form-group">
              <label htmlFor="sirket" className="organizer-register__label">Şirket Adı</label>
              <input
                id="sirket"
                type="text"
                {...formik.getFieldProps('sirket')}
                className={`organizer-register__input ${formik.touched.sirket && formik.errors.sirket ? 'error' : ''}`}
              />
              {formik.touched.sirket && formik.errors.sirket && (
                <p className="organizer-register__error">{formik.errors.sirket}</p>
              )}
            </div>

            <div className="organizer-register__form-group">
              <label htmlFor="telefon" className="organizer-register__label">Telefon</label>
              <input
                id="telefon"
                type="tel"
                placeholder="+905551112233"
                {...formik.getFieldProps('telefon')}
                className={`organizer-register__input ${formik.touched.telefon && formik.errors.telefon ? 'error' : ''}`}
              />
              {formik.touched.telefon && formik.errors.telefon && (
                <p className="organizer-register__error">{formik.errors.telefon}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="organizer-register__form-group">
            <label htmlFor="email" className="organizer-register__label">E-posta</label>
            <input
              id="email"
              type="email"
              {...formik.getFieldProps('email')}
              className={`organizer-register__input ${formik.touched.email && formik.errors.email ? 'error' : ''}`}
            />
            {formik.touched.email && formik.errors.email && (
              <p className="organizer-register__error">{formik.errors.email}</p>
            )}
          </div>

          {/* Şifreler */}
          <div className="organizer-register__row organizer-register__row--2">
            <div className="organizer-register__form-group">
              <label htmlFor="sifre" className="organizer-register__label">Şifre</label>
              <input
                id="sifre"
                type="password"
                {...formik.getFieldProps('sifre')}
                className={`organizer-register__input ${formik.touched.sifre && formik.errors.sifre ? 'error' : ''}`}
              />
              {formik.touched.sifre && formik.errors.sifre && (
                <p className="organizer-register__error">{formik.errors.sifre}</p>
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
                      En az bir özel karakter (ör. !@#$%)
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="organizer-register__form-group">
              <label htmlFor="sifre_tekrar" className="organizer-register__label">Şifre Tekrar</label>
              <input
                id="sifre_tekrar"
                type="password"
                {...formik.getFieldProps('sifre_tekrar')}
                className={`organizer-register__input ${formik.touched.sifre_tekrar && formik.errors.sifre_tekrar ? 'error' : ''}`}
              />
              {formik.touched.sifre_tekrar && formik.errors.sifre_tekrar && (
                <p className="organizer-register__error">{formik.errors.sifre_tekrar}</p>
              )}
            </div>
          </div>

          {/* Vergi, Adres, Banka */}
          <div className="organizer-register__row organizer-register__row--2">
            <div className="organizer-register__form-group">
              <label htmlFor="vergi_no" className="organizer-register__label">Vergi No</label>
              <input
                id="vergi_no"
                type="text"
                {...formik.getFieldProps('vergi_no')}
                className={`organizer-register__input ${formik.touched.vergi_no && formik.errors.vergi_no ? 'error' : ''}`}
              />
              {formik.touched.vergi_no && formik.errors.vergi_no && (
                <p className="organizer-register__error">{formik.errors.vergi_no}</p>
              )}
            </div>

            <div className="organizer-register__form-group">
              <label htmlFor="vergi_dairesi" className="organizer-register__label">Vergi Dairesi</label>
              <input
                id="vergi_dairesi"
                type="text"
                {...formik.getFieldProps('vergi_dairesi')}
                className={`organizer-register__input ${formik.touched.vergi_dairesi && formik.errors.vergi_dairesi ? 'error' : ''}`}
              />
              {formik.touched.vergi_dairesi && formik.errors.vergi_dairesi && (
                <p className="organizer-register__error">{formik.errors.vergi_dairesi}</p>
              )}
            </div>
          </div>

          <div className="organizer-register__form-group">
            <label htmlFor="adres" className="organizer-register__label">Adres</label>
            <textarea
              id="adres"
              rows={3}
              {...formik.getFieldProps('adres')}
              className={`organizer-register__input organizer-register__textarea ${formik.touched.adres && formik.errors.adres ? 'error' : ''}`}
            />
            {formik.touched.adres && formik.errors.adres && (
              <p className="organizer-register__error">{formik.errors.adres}</p>
            )}
          </div>

          <div className="organizer-register__form-group">
            <label htmlFor="banka_hesap" className="organizer-register__label">Banka Hesap Bilgileri</label>
            <input
              id="banka_hesap"
              type="text"
              {...formik.getFieldProps('banka_hesap')}
              className={`organizer-register__input ${formik.touched.banka_hesap && formik.errors.banka_hesap ? 'error' : ''}`}
            />
            {formik.touched.banka_hesap && formik.errors.banka_hesap && (
              <p className="organizer-register__error">{formik.errors.banka_hesap}</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="organizer-register__submit-button">
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </button>

          <div className="organizer-register__links">
            <p className="organizer-register__link-text">
              Zaten hesabınız var mı?{' '}
              <Link to="/login" className="organizer-register__link">Giriş Yap</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizerRegister; 
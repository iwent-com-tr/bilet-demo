import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import showPasswordIcon from '../../assets/show-passowrd.svg';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [awareOfScreen, setAwareOfScreen] = useState(false);

  // Unsplash images for the grid
  const gridImages = [
    'https://images.unsplash.com/photo-1516450137517-162bfbeb8dba?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Concert crowd
    'https://images.unsplash.com/photo-1576967402682-19976eb930f2?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // DJ performance
    'https://images.unsplash.com/photo-1565035010268-a3816f98589a?q=80&w=688&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Festival crowd
    'https://images.unsplash.com/photo-1454908027598-28c44b1716c1?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Stage performance
    'https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Concert lights
    'https://images.unsplash.com/flagged/photo-1573585808609-26146616378d?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Festival atmosphere
    'https://images.unsplash.com/photo-1508435660444-33f17a7ca262?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Music performance
    'https://images.unsplash.com/photo-1569617084133-26942bb441f2?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Crowd energy
    'https://images.unsplash.com/photo-1628336707631-68131ca720c3?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  ];

  const formik = useFormik({
    initialValues: {
      email: '',
      sifre: '',
      tip: 'user'
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Geçerli bir e-posta adresi giriniz')
        .required('E-posta adresi zorunludur'),
      sifre: Yup.string()
        .min(6, 'Şifre en az 6 karakter olmalıdır')
        .required('Şifre zorunludur'),
      tip: Yup.string().oneOf(['user', 'organizer']).required()
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await login(values.email, values.sifre, values.tip as 'user' | 'organizer');
        toast.success('Giriş başarılı');
        navigate(values.tip === 'organizer' ? '/organizer' : '/');
      } catch (error) {
        toast.error('Giriş başarısız: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <div className="login">
      <div className="login__image-grid">
        <div className="login__image-grid-container">
          {gridImages.map((image, index) => (
            <div key={index} className="login__image-item">
              <img
                src={image}
                alt={`Event ${index + 1}`}
                className="login__image"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="login__container">
        <h2 className="login__title">Giriş Yap</h2>

        <form onSubmit={formik.handleSubmit} className="login__form">
          {/* User Type - Desktop Only */}
          <div className="login__user-type">
            <label className="login__user-type-label">
              <input
                type="radio"
                name="tip"
                value="user"
                checked={formik.values.tip === 'user'}
                onChange={formik.handleChange}
                className="login__user-type-input"
              />
              Kullanıcı
            </label>
            <label className="login__user-type-label">
              <input
                type="radio"
                name="tip"
                value="organizer"
                checked={formik.values.tip === 'organizer'}
                onChange={formik.handleChange}
                className="login__user-type-input"
              />
              Organizatör
            </label>
          </div>

          {/* Email */}
          <div className="login__form-group">
            <label htmlFor="email" className="login__label">
              E-Mail Adresi
            </label>
            <div className="login__input-container">
              <svg className="login__input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                id="email"
                type="email"
                {...formik.getFieldProps('email')}
                placeholder="ornek@email.com"
                className={`login__input ${
                  formik.touched.email && formik.errors.email ? 'error' : ''
                }`}
              />
            </div>
            {formik.touched.email && formik.errors.email && (
              <p className="login__error">{formik.errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="login__form-group">
            <label htmlFor="sifre" className="login__label">
              Parola
            </label>
            <div className="login__input-container">
              <svg className="login__input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                id="sifre"
                type={showPassword ? 'text' : 'password'}
                {...formik.getFieldProps('sifre')}
                placeholder="*********"
                className={`login__input ${
                  formik.touched.sifre && formik.errors.sifre ? 'error' : ''
                }`}
              />
              <button
                type="button"
                className="login__password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <img 
                  src={showPasswordIcon} 
                  alt={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  className="login__password-toggle-icon"
                />
              </button>
            </div>
            {formik.touched.sifre && formik.errors.sifre && (
              <p className="login__error">{formik.errors.sifre}</p>
            )}
          </div>

          {/* Checkboxes - Mobile Only */}
          <div className="login__checkbox-group">
            <label className="login__checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="login__checkbox"
              />
              Beni Hatırla
            </label>
            <label className="login__checkbox-label">
              <input
                type="checkbox"
                checked={awareOfScreen}
                onChange={(e) => setAwareOfScreen(e.target.checked)}
                className="login__checkbox"
              />
              Ekrana baktığımın farkındayım
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="login__submit-button"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>

          {/* Links */}
          <div className="login__links">
            <p className="login__link-text">
              Henüz bir hesabın yok mu?{' '}
              <Link
                to={formik.values.tip === 'organizer' ? '/register/organizer' : '/register'}
                className="login__link"
              >
                Kayıt Ol
              </Link>
            </p>
          </div>
        </form>
      </div>
      
      {/* Mobile Home Navigation */}
      <button 
        className="login__home-button"
        onClick={() => navigate('/')}
        title="Ana Sayfaya Dön"
      >
        <svg className="login__home-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </button>
    </div>
  );
};

export default Login; 
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
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
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Check if in production environment
  const currentEnv = process.env.REACT_APP_ENV || 'development';
  const isProduction = currentEnv === 'production';
  const isDevelopment = currentEnv === 'development';
  
  // Debug: Log environment info (remove in production)
  console.log('Environment Debug:', {
    REACT_APP_ENV: process.env.REACT_APP_ENV,
    currentEnv,
    isProduction,
    isDevelopment,
    awareOfScreen
  });
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

  const phoneRegex = /^\+?[0-9]{10,15}$/;

  const formik = useFormik({
    initialValues: {
      identifier: '',
      sifre: '',
      userType: 'USER'
    },
    validationSchema: Yup.object({
      identifier: Yup.string()
        .required('E-posta adresi veya telefon numarası zorunludur')
        .test('email-or-phone', 'Geçerli bir e-posta veya telefon giriniz', function (val) {
          const userType = (this.parent as any).userType;
          if (!val) return false;
          if (userType === 'ORGANIZER' || userType === 'ADMIN') {
            return /.+@.+\..+/.test(val);
          }
          return /.+@.+\..+/.test(val) || phoneRegex.test(val);
        }),
      sifre: Yup.string()
        .min(6, 'Şifre en az 6 karakter olmalıdır')
        .required('Şifre zorunludur'),
      userType: Yup.string().oneOf(['USER', 'ORGANIZER', 'ADMIN']).required()
    }),
    onSubmit: async (values) => {
      try {
        setServerError(null);
        setLoading(true);
        // Admin users use the regular user login endpoint since they're stored in the user table
        const loginType = values.userType === 'ADMIN' ? 'user' : values.userType.toLowerCase() as 'user' | 'organizer';
        await login(values.identifier, values.sifre, loginType);
        if (rememberMe) {
          localStorage.setItem('login:remember', '1');
          localStorage.setItem('login:identifier', values.identifier);
          localStorage.setItem('login:userType', values.userType);
        } else {
          localStorage.removeItem('login:remember');
          localStorage.removeItem('login:identifier');
          localStorage.removeItem('login:userType');
        }
        if (values.userType === 'ORGANIZER') {
          navigate('/organizer');
        } else if (values.userType === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } catch (error: any) {
        const raw = error?.response?.data;
        let msg: string | null = null;
        if (typeof raw === 'string') {
          // Strip HTML and extract the first line starting with "Error:"
          const text = raw.replace(/<br\s*\/?>(\s*)/gi, '\n').replace(/<[^>]*>/g, '').trim();
          const errorLineMatch = text.match(/Error:\s*([^\n]+)/i);
          if (errorLineMatch) {
            msg = `${errorLineMatch[1].trim()}`;
          } else {
            msg = text.split('\n')[0];
          }
        } else {
          const backendMsg = raw?.error || raw?.message;
          msg = backendMsg ? `${backendMsg}` : null;
        }
        if (!msg) msg = 'Giriş başarısız';
        setServerError(msg);
      } finally {
        setLoading(false);
      }
    }
  });

  const isOrganizer = formik.values.userType === 'ORGANIZER';
  const isAdmin = formik.values.userType === 'ADMIN';

  // Prefill from localStorage when rememberMe was set previously
  useEffect(() => {
    const remembered = localStorage.getItem('login:remember') === '1';
    if (remembered) {
      setRememberMe(true);
      const storedId = localStorage.getItem('login:identifier') || '';
      const storeduserType = (localStorage.getItem('login:userType') as 'USER' | 'ORGANIZER' | 'ADMIN') || 'USER';
      formik.setValues({ identifier: storedId, sifre: '', userType: storeduserType });
    }
    
    // In development, automatically set awareness to true
    // In production, keep it false (user must check)
    if (isDevelopment) {
      setAwareOfScreen(true);
    } else {
      setAwareOfScreen(false);
    }
  }, [isDevelopment, formik.setValues]);

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

        <h2 className="login__title">{isAdmin ? 'Yönetici Girişi' : isOrganizer ? 'Organizatör Girişi' : 'Giriş Yap'}</h2>
        
        {/* Environment Debug Badge - Remove in production */}
        {(isDevelopment || isProduction) && (
          <div style={{
            background: isDevelopment ? 'rgba(5, 239, 126, 0.1)' : 'rgba(255, 165, 0, 0.1)',
            border: isDevelopment ? '1px solid #05EF7E' : '1px solid #FFA500',
            color: isDevelopment ? '#05EF7E' : '#FFA500',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            {isDevelopment ? '🚀 Development Mode - Login Enabled' : '🔒 Production Mode - Checkbox Required'}
            <br />
            <small>ENV: {process.env.REACT_APP_ENV} | AwareOfScreen: {awareOfScreen.toString()}</small>
          </div>
        )}
        
        {serverError && (
          <div className="login__server-error" role="alert" aria-live="polite">
            {serverError}
          </div>
        )}

        <form onSubmit={formik.handleSubmit} className="login__form">
          {/* User Type - Desktop Only */}
          <div className="login__user-type">
            <label className="login__user-type-label">
              <input
                type="radio"
                name="userType"
                value="USER"
                checked={formik.values.userType === 'USER'}
                onChange={formik.handleChange}
                className="login__user-type-input"
              />
              Kullanıcı
            </label>
            <label className="login__user-type-label">
              <input
                type="radio"
                name="userType"
                value="ORGANIZER"
                checked={formik.values.userType === 'ORGANIZER'}
                onChange={formik.handleChange}
                className="login__user-type-input"
              />
              Organizatör
            </label>
           {/* Hide admin option in production */}
           {!isProduction && (
            <label className="login__user-type-label">
              <input
                type="radio"
                name="userType"
                value="ADMIN"
                checked={formik.values.userType === 'ADMIN'}
                onChange={formik.handleChange}
                className="login__user-type-input"
              />
              Yönetici
            </label>
           )}
            
          </div>

          {/* Identifier */}
          <div className="login__form-group">
            <label htmlFor="identifier" className="login__label">
              {isOrganizer || isAdmin ? 'E-Posta adresi' : 'E-Posta adresi veya Telefon Numarası'}
            </label>
            <div className="login__input-container">
              <svg className="login__input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                id="identifier"
                type="text"
                inputMode="email"
                {...formik.getFieldProps('identifier')}
                placeholder="ornek@email.com"
                className={`login__input ${formik.touched.identifier && formik.errors.identifier ? 'error' : ''}`}
              />
            </div>
            {formik.touched.identifier && formik.errors.identifier && (
              <p className="login__error">{formik.errors.identifier as string}</p>
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
                className={`login__input ${formik.touched.sifre && formik.errors.sifre ? 'error' : ''}`}
              />
              <button
                type="button"
                className="login__password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <img 
                  src={showPasswordIcon} 
                  alt={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
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
            {/* Show awareness checkbox only in production */}
            {isProduction && (
              <label className="login__checkbox-label">
                <input
                  type="checkbox"
                  checked={awareOfScreen}
                  onChange={(e) => setAwareOfScreen(e.target.checked)}
                  className="login__checkbox"
                />
                Ekrana baktığımın farkındayım
              </label>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (isProduction && !awareOfScreen)}
            className="login__submit-button"
          >
            {loading ? 'Giriş yapılıyor...' : (isAdmin ? 'Yönetici Girişi' : isOrganizer ? 'Organizatör Girişi' : 'Giriş Yap')}
          </button>

          {/* Links */}
          <div className="login__links">
            <p className="login__link-text">
              Henüz bir hesabın yok mu?{' '}
              <Link
                to={formik.values.userType === 'ORGANIZER' ? '/register/organizer' : formik.values.userType === 'ADMIN' ? '/register/admin' : '/register'}
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
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

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
    <div className="bg-white shadow-md rounded-lg p-8">
      <h2 className="text-2xl font-bold text-center mb-6">Giriş Yap</h2>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* User Type */}
        <div className="flex space-x-4">
          <label className="flex-1">
            <input
              type="radio"
              name="tip"
              value="user"
              checked={formik.values.tip === 'user'}
              onChange={formik.handleChange}
              className="mr-2"
            />
            Kullanıcı
          </label>
          <label className="flex-1">
            <input
              type="radio"
              name="tip"
              value="organizer"
              checked={formik.values.tip === 'organizer'}
              onChange={formik.handleChange}
              className="mr-2"
            />
            Organizatör
          </label>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-posta
          </label>
          <input
            id="email"
            type="email"
            {...formik.getFieldProps('email')}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              formik.touched.email && formik.errors.email
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
          />
          {formik.touched.email && formik.errors.email && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="sifre" className="block text-sm font-medium text-gray-700">
            Şifre
          </label>
          <input
            id="sifre"
            type="password"
            {...formik.getFieldProps('sifre')}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              formik.touched.sifre && formik.errors.sifre
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
          />
          {formik.touched.sifre && formik.errors.sifre && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.sifre}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>

        {/* Links */}
        <div className="text-sm text-center space-y-2">
          <p>
            Hesabınız yok mu?{' '}
            <Link
              to={formik.values.tip === 'organizer' ? '/register/organizer' : '/register'}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Kayıt Ol
            </Link>
          </p>
          <p>
            <Link to="#" className="font-medium text-primary-600 hover:text-primary-500">
              Şifremi Unuttum
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Login; 
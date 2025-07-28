import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

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
      isim: Yup.string()
        .min(2, 'İsim en az 2 karakter olmalıdır')
        .required('İsim zorunludur'),
      soyisim: Yup.string()
        .min(2, 'Soyisim en az 2 karakter olmalıdır')
        .required('Soyisim zorunludur'),
      email: Yup.string()
        .email('Geçerli bir e-posta adresi giriniz')
        .required('E-posta adresi zorunludur'),
      sifre: Yup.string()
        .min(6, 'Şifre en az 6 karakter olmalıdır')
        .required('Şifre zorunludur'),
      sifre_tekrar: Yup.string()
        .oneOf([Yup.ref('sifre')], 'Şifreler eşleşmiyor')
        .required('Şifre tekrarı zorunludur'),
      dogum_yili: Yup.number()
        .min(1900, 'Geçerli bir doğum yılı giriniz')
        .max(new Date().getFullYear(), 'Geçerli bir doğum yılı giriniz')
        .required('Doğum yılı zorunludur'),
      telefon: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, 'Geçerli bir telefon numarası giriniz')
        .required('Telefon numarası zorunludur'),
      sehir: Yup.string().required('Şehir zorunludur')
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await register({
          isim: values.isim,
          soyisim: values.soyisim,
          email: values.email,
          sifre: values.sifre,
          dogum_yili: parseInt(values.dogum_yili),
          telefon: values.telefon,
          sehir: values.sehir
        });
        toast.success('Kayıt başarılı');
        navigate('/');
      } catch (error) {
        toast.error('Kayıt başarısız: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <div className="bg-white shadow-md rounded-lg p-8">
      <h2 className="text-2xl font-bold text-center mb-6">Kayıt Ol</h2>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Name and Surname */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="isim" className="block text-sm font-medium text-gray-700">
              İsim
            </label>
            <input
              id="isim"
              type="text"
              {...formik.getFieldProps('isim')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.isim && formik.errors.isim
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.isim && formik.errors.isim && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.isim}</p>
            )}
          </div>

          <div>
            <label htmlFor="soyisim" className="block text-sm font-medium text-gray-700">
              Soyisim
            </label>
            <input
              id="soyisim"
              type="text"
              {...formik.getFieldProps('soyisim')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.soyisim && formik.errors.soyisim
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.soyisim && formik.errors.soyisim && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.soyisim}</p>
            )}
          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div>
            <label htmlFor="sifre_tekrar" className="block text-sm font-medium text-gray-700">
              Şifre Tekrar
            </label>
            <input
              id="sifre_tekrar"
              type="password"
              {...formik.getFieldProps('sifre_tekrar')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.sifre_tekrar && formik.errors.sifre_tekrar
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.sifre_tekrar && formik.errors.sifre_tekrar && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.sifre_tekrar}</p>
            )}
          </div>
        </div>

        {/* Birth Year, Phone, City */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="dogum_yili" className="block text-sm font-medium text-gray-700">
              Doğum Yılı
            </label>
            <input
              id="dogum_yili"
              type="number"
              {...formik.getFieldProps('dogum_yili')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.dogum_yili && formik.errors.dogum_yili
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.dogum_yili && formik.errors.dogum_yili && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.dogum_yili}</p>
            )}
          </div>

          <div>
            <label htmlFor="telefon" className="block text-sm font-medium text-gray-700">
              Telefon
            </label>
            <input
              id="telefon"
              type="tel"
              {...formik.getFieldProps('telefon')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.telefon && formik.errors.telefon
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.telefon && formik.errors.telefon && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.telefon}</p>
            )}
          </div>

          <div>
            <label htmlFor="sehir" className="block text-sm font-medium text-gray-700">
              Şehir
            </label>
            <input
              id="sehir"
              type="text"
              {...formik.getFieldProps('sehir')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.sehir && formik.errors.sehir
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.sehir && formik.errors.sehir && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.sehir}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
        </button>

        {/* Links */}
        <div className="text-sm text-center">
          <p>
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Giriş Yap
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register; 
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

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
      isim: Yup.string()
        .min(2, 'İsim en az 2 karakter olmalıdır')
        .required('İsim zorunludur'),
      soyisim: Yup.string()
        .min(2, 'Soyisim en az 2 karakter olmalıdır')
        .required('Soyisim zorunludur'),
      sirket: Yup.string()
        .min(2, 'Şirket adı en az 2 karakter olmalıdır')
        .required('Şirket adı zorunludur'),
      telefon: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, 'Geçerli bir telefon numarası giriniz')
        .required('Telefon numarası zorunludur'),
      email: Yup.string()
        .email('Geçerli bir e-posta adresi giriniz')
        .required('E-posta adresi zorunludur'),
      sifre: Yup.string()
        .min(6, 'Şifre en az 6 karakter olmalıdır')
        .required('Şifre zorunludur'),
      sifre_tekrar: Yup.string()
        .oneOf([Yup.ref('sifre')], 'Şifreler eşleşmiyor')
        .required('Şifre tekrarı zorunludur'),
      vergi_no: Yup.string().matches(/^\d{10,11}$/, 'Geçerli bir vergi numarası giriniz'),
      vergi_dairesi: Yup.string(),
      adres: Yup.string(),
      banka_hesap: Yup.string()
    }),
    onSubmit: async (values) => {
      try {
        setLoading(true);
        await registerOrganizer({
          isim: values.isim,
          soyisim: values.soyisim,
          sirket: values.sirket,
          telefon: values.telefon,
          email: values.email,
          sifre: values.sifre,
          vergi_no: values.vergi_no,
          vergi_dairesi: values.vergi_dairesi,
          adres: values.adres,
          banka_hesap: values.banka_hesap
        });
        toast.success('Kayıt başarılı');
        navigate('/organizer');
      } catch (error) {
        toast.error('Kayıt başarısız: ' + (error as Error).message);
      } finally {
        setLoading(false);
      }
    }
  });

  return (
    <div className="bg-white shadow-md rounded-lg p-8">
      <h2 className="text-2xl font-bold text-center mb-6">Organizatör Kaydı</h2>

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

        {/* Company and Phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sirket" className="block text-sm font-medium text-gray-700">
              Şirket Adı
            </label>
            <input
              id="sirket"
              type="text"
              {...formik.getFieldProps('sirket')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.sirket && formik.errors.sirket
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.sirket && formik.errors.sirket && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.sirket}</p>
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

        {/* Tax Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="vergi_no" className="block text-sm font-medium text-gray-700">
              Vergi No
            </label>
            <input
              id="vergi_no"
              type="text"
              {...formik.getFieldProps('vergi_no')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.vergi_no && formik.errors.vergi_no
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.vergi_no && formik.errors.vergi_no && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.vergi_no}</p>
            )}
          </div>

          <div>
            <label htmlFor="vergi_dairesi" className="block text-sm font-medium text-gray-700">
              Vergi Dairesi
            </label>
            <input
              id="vergi_dairesi"
              type="text"
              {...formik.getFieldProps('vergi_dairesi')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.vergi_dairesi && formik.errors.vergi_dairesi
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            />
            {formik.touched.vergi_dairesi && formik.errors.vergi_dairesi && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.vergi_dairesi}</p>
            )}
          </div>
        </div>

        {/* Address and Bank Account */}
        <div>
          <label htmlFor="adres" className="block text-sm font-medium text-gray-700">
            Adres
          </label>
          <textarea
            id="adres"
            rows={3}
            {...formik.getFieldProps('adres')}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              formik.touched.adres && formik.errors.adres
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
          />
          {formik.touched.adres && formik.errors.adres && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.adres}</p>
          )}
        </div>

        <div>
          <label htmlFor="banka_hesap" className="block text-sm font-medium text-gray-700">
            Banka Hesap Bilgileri
          </label>
          <input
            id="banka_hesap"
            type="text"
            {...formik.getFieldProps('banka_hesap')}
            className={`mt-1 block w-full rounded-md shadow-sm ${
              formik.touched.banka_hesap && formik.errors.banka_hesap
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
          />
          {formik.touched.banka_hesap && formik.errors.banka_hesap && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.banka_hesap}</p>
          )}
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

export default OrganizerRegister; 
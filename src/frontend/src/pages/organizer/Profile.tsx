import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const OrganizerProfile: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      isim: user?.isim || '',
      soyisim: user?.soyisim || '',
      sirket: '',
      email: user?.email || '',
      telefon: '',
      vergi_no: '',
      vergi_dairesi: '',
      adres: '',
      banka_hesap: '',
      sifre: '',
      sifre_tekrar: ''
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Organizatör Profili</h1>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Kişisel Bilgiler */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Kişisel Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="isim" className="block text-sm font-medium text-gray-700">
                İsim
              </label>
              <input
                type="text"
                id="isim"
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
                type="text"
                id="soyisim"
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
        </div>

        {/* Şirket Bilgileri */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Şirket Bilgileri</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="sirket" className="block text-sm font-medium text-gray-700">
                Şirket Adı
              </label>
              <input
                type="text"
                id="sirket"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="vergi_no" className="block text-sm font-medium text-gray-700">
                  Vergi No
                </label>
                <input
                  type="text"
                  id="vergi_no"
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
                  type="text"
                  id="vergi_dairesi"
                  {...formik.getFieldProps('vergi_dairesi')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="adres" className="block text-sm font-medium text-gray-700">
                Adres
              </label>
              <textarea
                id="adres"
                rows={3}
                {...formik.getFieldProps('adres')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="banka_hesap" className="block text-sm font-medium text-gray-700">
                Banka Hesap Bilgileri
              </label>
              <input
                type="text"
                id="banka_hesap"
                {...formik.getFieldProps('banka_hesap')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* İletişim Bilgileri */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">İletişim Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-posta
              </label>
              <input
                type="email"
                id="email"
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

            <div>
              <label htmlFor="telefon" className="block text-sm font-medium text-gray-700">
                Telefon
              </label>
              <input
                type="tel"
                id="telefon"
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
        </div>

        {/* Şifre Değiştirme */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Şifre Değiştirme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="sifre" className="block text-sm font-medium text-gray-700">
                Yeni Şifre
              </label>
              <input
                type="password"
                id="sifre"
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
                Yeni Şifre Tekrar
              </label>
              <input
                type="password"
                id="sifre_tekrar"
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
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrganizerProfile; 
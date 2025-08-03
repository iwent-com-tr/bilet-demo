import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';

interface Event {
  id: string;
  ad: string;
  kategori: string;
  baslangic_tarih: string;
  bitis_tarih: string;
  yer: string;
  adres: string;
  il: string;
  banner: string;
  sosyal_medya: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  aciklama: string;
  kapasite: number;
  bilet_tipleri: Array<{
    tip: string;
    fiyat: number;
    kapasite: number;
  }>;
  durum: string;
}

const MODULES = {
  temel: 'Temel Bilgiler',
  konum: 'Konum Bilgileri',
  detaylar: 'Detaylar',
  durum: 'Durum'
} as const;

const OrganizerEventEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const moduleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Scroll to module function
  const scrollToModule = (hash: string) => {
    if (hash && moduleRefs.current[hash]) {
      setTimeout(() => {
        moduleRefs.current[hash]?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  useEffect(() => {
    // Handle hash change for navigation
    const hash = location.hash.slice(1); // Remove the # symbol
    scrollToModule(hash);
  }, [location.hash]);

  // Handle initial hash navigation after data is loaded
  useEffect(() => {
    if (!loading) {
      const hash = location.hash.slice(1);
      scrollToModule(hash);
    }
  }, [loading, location.hash]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/event/${id}`);
      setEvent(response.data.event);
      formik.setValues({
        ...response.data.event,
        baslangic_tarih: response.data.event.baslangic_tarih.slice(0, 16),
        bitis_tarih: response.data.event.bitis_tarih.slice(0, 16)
      });
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      navigate('/organizer/events');
    }
  };

  const handleModuleClick = (moduleId: string) => {
    navigate(`#${moduleId}`);
  };

  const formik = useFormik({
    initialValues: {
      ad: '',
      kategori: '',
      baslangic_tarih: '',
      bitis_tarih: '',
      yer: '',
      adres: '',
      il: '',
      banner: '',
      sosyal_medya: {
        instagram: '',
        twitter: '',
        facebook: ''
      },
      aciklama: '',
      kapasite: 0,
      bilet_tipleri: [],
      durum: ''
    },
    validationSchema: Yup.object({
      ad: Yup.string()
        .min(2, 'En az 2 karakter olmalıdır')
        .required('Etkinlik adı zorunludur'),
      kategori: Yup.string().required('Kategori zorunludur'),
      baslangic_tarih: Yup.date()
        .min(new Date(), 'Başlangıç tarihi bugünden sonra olmalıdır')
        .required('Başlangıç tarihi zorunludur'),
      bitis_tarih: Yup.date()
        .min(Yup.ref('baslangic_tarih'), 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır')
        .required('Bitiş tarihi zorunludur'),
      yer: Yup.string().required('Etkinlik yeri zorunludur'),
      adres: Yup.string().required('Adres zorunludur'),
      il: Yup.string().required('Şehir zorunludur'),
      banner: Yup.string().url('Geçerli bir URL giriniz'),
      sosyal_medya: Yup.object({
        instagram: Yup.string().url('Geçerli bir URL giriniz'),
        twitter: Yup.string().url('Geçerli bir URL giriniz'),
        facebook: Yup.string().url('Geçerli bir URL giriniz')
      }),
      kapasite: Yup.number()
        .min(1, 'Kapasite en az 1 olmalıdır')
        .required('Kapasite zorunludur'),
      durum: Yup.string().required('Durum zorunludur')
    }),
    onSubmit: async values => {
      try {
        setLoading(true);
        await axios.put(`${process.env.REACT_APP_API_URL}/event/${id}`, values);
        toast.success('Etkinlik güncellendi');
        navigate('/organizer/events');
      } catch (error) {
        toast.error('Etkinlik güncellenirken bir hata oluştu');
        setLoading(false);
      }
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Etkinlik Düzenle</h1>

      {/* Module Navigation */}
      <div className="bg-white shadow rounded-lg p-4 mb-6 sticky top-0 z-10">
        <div className="flex space-x-4">
          {Object.entries(MODULES).map(([key, title]) => (
            <button
              key={key}
              onClick={() => handleModuleClick(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                location.hash === `#${key}`
                  ? 'bg-primary-100 text-primary-800'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <div
          ref={el => (moduleRefs.current['temel'] = el)}
          id="temel"
          className="bg-white shadow rounded-lg p-6 scroll-mt-24"
        >
          <h2 className="text-lg font-semibold mb-4">Temel Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="ad" className="block text-sm font-medium text-gray-700">
                Etkinlik Adı
              </label>
              <input
                type="text"
                id="ad"
                {...formik.getFieldProps('ad')}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  formik.touched.ad && formik.errors.ad
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {formik.touched.ad && formik.errors.ad && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.ad}</p>
              )}
            </div>

            <div>
              <label htmlFor="kategori" className="block text-sm font-medium text-gray-700">
                Kategori
              </label>
              <select
                id="kategori"
                {...formik.getFieldProps('kategori')}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  formik.touched.kategori && formik.errors.kategori
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              >
                <option value="">Seçin</option>
                <option value="Müzik">Müzik</option>
                <option value="Tiyatro">Tiyatro</option>
                <option value="Spor">Spor</option>
                <option value="Festival">Festival</option>
              </select>
              {formik.touched.kategori && formik.errors.kategori && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.kategori}</p>
              )}
            </div>

            <div>
              <label htmlFor="baslangic_tarih" className="block text-sm font-medium text-gray-700">
                Başlangıç Tarihi
              </label>
              <input
                type="datetime-local"
                id="baslangic_tarih"
                {...formik.getFieldProps('baslangic_tarih')}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  formik.touched.baslangic_tarih && formik.errors.baslangic_tarih
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {formik.touched.baslangic_tarih && formik.errors.baslangic_tarih && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.baslangic_tarih}</p>
              )}
            </div>

            <div>
              <label htmlFor="bitis_tarih" className="block text-sm font-medium text-gray-700">
                Bitiş Tarihi
              </label>
              <input
                type="datetime-local"
                id="bitis_tarih"
                {...formik.getFieldProps('bitis_tarih')}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  formik.touched.bitis_tarih && formik.errors.bitis_tarih
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {formik.touched.bitis_tarih && formik.errors.bitis_tarih && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.bitis_tarih}</p>
              )}
            </div>
          </div>
        </div>

        {/* Konum Bilgileri */}
        <div
          ref={el => (moduleRefs.current['konum'] = el)}
          id="konum"
          className="bg-white shadow rounded-lg p-6 scroll-mt-24"
        >
          <h2 className="text-lg font-semibold mb-4">Konum Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="yer" className="block text-sm font-medium text-gray-700">
                Etkinlik Yeri
              </label>
              <input
                type="text"
                id="yer"
                {...formik.getFieldProps('yer')}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  formik.touched.yer && formik.errors.yer
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {formik.touched.yer && formik.errors.yer && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.yer}</p>
              )}
            </div>

            <div>
              <label htmlFor="il" className="block text-sm font-medium text-gray-700">
                Şehir
              </label>
              <select
                id="il"
                {...formik.getFieldProps('il')}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  formik.touched.il && formik.errors.il
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              >
                <option value="">Seçin</option>
                <option value="İstanbul">İstanbul</option>
                <option value="Ankara">Ankara</option>
                <option value="İzmir">İzmir</option>
              </select>
              {formik.touched.il && formik.errors.il && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.il}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="adres" className="block text-sm font-medium text-gray-700">
                Açık Adres
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
          </div>
        </div>

        {/* Detaylar */}
        <div
          ref={el => (moduleRefs.current['detaylar'] = el)}
          id="detaylar"
          className="bg-white shadow rounded-lg p-6 scroll-mt-24"
        >
          <h2 className="text-lg font-semibold mb-4">Detaylar</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="banner" className="block text-sm font-medium text-gray-700">
                Banner URL
              </label>
              <input
                type="url"
                id="banner"
                {...formik.getFieldProps('banner')}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  formik.touched.banner && formik.errors.banner
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {formik.touched.banner && formik.errors.banner && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.banner}</p>
              )}
            </div>

            <div>
              <label htmlFor="aciklama" className="block text-sm font-medium text-gray-700">
                Açıklama
              </label>
              <textarea
                id="aciklama"
                rows={5}
                {...formik.getFieldProps('aciklama')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
            </div>

            <div>
              <label htmlFor="kapasite" className="block text-sm font-medium text-gray-700">
                Toplam Kapasite
              </label>
              <input
                type="number"
                id="kapasite"
                {...formik.getFieldProps('kapasite')}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  formik.touched.kapasite && formik.errors.kapasite
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
              />
              {formik.touched.kapasite && formik.errors.kapasite && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.kapasite}</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Sosyal Medya</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="instagram" className="block text-sm text-gray-500">
                    Instagram
                  </label>
                  <input
                    type="url"
                    id="instagram"
                    {...formik.getFieldProps('sosyal_medya.instagram')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="twitter" className="block text-sm text-gray-500">
                    Twitter
                  </label>
                  <input
                    type="url"
                    id="twitter"
                    {...formik.getFieldProps('sosyal_medya.twitter')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="facebook" className="block text-sm text-gray-500">
                    Facebook
                  </label>
                  <input
                    type="url"
                    id="facebook"
                    {...formik.getFieldProps('sosyal_medya.facebook')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Durum */}
        <div
          ref={el => (moduleRefs.current['durum'] = el)}
          id="durum"
          className="bg-white shadow rounded-lg p-6 scroll-mt-24"
        >
          <h2 className="text-lg font-semibold mb-4">Durum</h2>
          <div>
            <label htmlFor="durum" className="block text-sm font-medium text-gray-700">
              Etkinlik Durumu
            </label>
            <select
              id="durum"
              {...formik.getFieldProps('durum')}
              className={`mt-1 block w-full rounded-md shadow-sm ${
                formik.touched.durum && formik.errors.durum
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }`}
            >
              <option value="taslak">Taslak</option>
              <option value="yayinda">Yayında</option>
              <option value="iptal">İptal</option>
              <option value="tamamlandi">Tamamlandı</option>
            </select>
            {formik.touched.durum && formik.errors.durum && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.durum}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/organizer/events')}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            İptal
          </button>
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

export default OrganizerEventEdit;
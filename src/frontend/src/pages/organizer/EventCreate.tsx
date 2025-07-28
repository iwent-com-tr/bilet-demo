import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';

interface BiletTipi {
  tip: string;
  fiyat: number;
  kapasite: number;
}

const OrganizerEventCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [biletTipleri, setBiletTipleri] = useState<BiletTipi[]>([]);

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
      kapasite: '',
      yeni_bilet_tipi: '',
      yeni_bilet_fiyat: '',
      yeni_bilet_kapasite: ''
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
      yeni_bilet_tipi: Yup.string(),
      yeni_bilet_fiyat: Yup.number().min(0, 'Fiyat 0 veya daha büyük olmalıdır'),
      yeni_bilet_kapasite: Yup.number().min(1, 'Kapasite en az 1 olmalıdır')
    }),
    onSubmit: async values => {
      if (biletTipleri.length === 0) {
        toast.error('En az bir bilet tipi eklemelisiniz');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/event/create`, {
          ad: values.ad,
          kategori: values.kategori,
          baslangic_tarih: values.baslangic_tarih,
          bitis_tarih: values.bitis_tarih,
          yer: values.yer,
          adres: values.adres,
          il: values.il,
          banner: values.banner,
          sosyal_medya: values.sosyal_medya,
          aciklama: values.aciklama,
          kapasite: parseInt(values.kapasite),
          bilet_tipleri: biletTipleri
        });

        toast.success('Etkinlik oluşturuldu');
        navigate(`/organizer/events/${response.data.event_id}`);
      } catch (error) {
        toast.error('Etkinlik oluşturulurken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    }
  });

  const handleBiletTipiEkle = () => {
    const { yeni_bilet_tipi, yeni_bilet_fiyat, yeni_bilet_kapasite } = formik.values;

    if (!yeni_bilet_tipi || !yeni_bilet_fiyat || !yeni_bilet_kapasite) {
      toast.error('Tüm bilet bilgilerini doldurun');
      return;
    }

    setBiletTipleri([
      ...biletTipleri,
      {
        tip: yeni_bilet_tipi,
        fiyat: parseFloat(yeni_bilet_fiyat),
        kapasite: parseInt(yeni_bilet_kapasite)
      }
    ]);

    formik.setFieldValue('yeni_bilet_tipi', '');
    formik.setFieldValue('yeni_bilet_fiyat', '');
    formik.setFieldValue('yeni_bilet_kapasite', '');
  };

  const handleBiletTipiSil = (index: number) => {
    setBiletTipleri(biletTipleri.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Yeni Etkinlik Oluştur</h1>

      <form onSubmit={formik.handleSubmit} className="space-y-8">
        {/* Temel Bilgiler */}
        <div className="bg-white shadow rounded-lg p-6">
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
        <div className="bg-white shadow rounded-lg p-6">
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
        <div className="bg-white shadow rounded-lg p-6">
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

        {/* Bilet Tipleri */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Bilet Tipleri</h2>

          {/* Mevcut Bilet Tipleri */}
          {biletTipleri.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Eklenen Bilet Tipleri</h3>
              <div className="space-y-2">
                {biletTipleri.map((bilet, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-md"
                  >
                    <div>
                      <span className="font-medium">{bilet.tip}</span>
                      <span className="text-gray-500 mx-2">-</span>
                      <span>{bilet.fiyat} TL</span>
                      <span className="text-gray-500 mx-2">-</span>
                      <span>{bilet.kapasite} kişi</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBiletTipiSil(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Yeni Bilet Tipi Ekleme */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="yeni_bilet_tipi" className="block text-sm font-medium text-gray-700">
                Bilet Tipi
              </label>
              <input
                type="text"
                id="yeni_bilet_tipi"
                {...formik.getFieldProps('yeni_bilet_tipi')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Örn: VIP"
              />
            </div>
            <div>
              <label htmlFor="yeni_bilet_fiyat" className="block text-sm font-medium text-gray-700">
                Fiyat (TL)
              </label>
              <input
                type="number"
                id="yeni_bilet_fiyat"
                {...formik.getFieldProps('yeni_bilet_fiyat')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="yeni_bilet_kapasite" className="block text-sm font-medium text-gray-700">
                Kapasite
              </label>
              <input
                type="number"
                id="yeni_bilet_kapasite"
                {...formik.getFieldProps('yeni_bilet_kapasite')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="1"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleBiletTipiEkle}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Bilet Tipi Ekle
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Oluşturuluyor...' : 'Etkinlik Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrganizerEventCreate; 
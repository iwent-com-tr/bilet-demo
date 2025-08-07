import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  MusicIcon,
  FestivalIcon,
  UniversityIcon,
  WorkshopIcon,
  ConferenceIcon,
  SportsIcon,
  TheaterIcon,
  EducationIcon
} from '../../components/icons/CategoryIcons';
import './EventEdit.css';

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

const categories = [
  { 
    id: 'Müzik', 
    name: 'Konser', 
    icon: <MusicIcon className="event-edit__category-icon" />
  },
  { 
    id: 'Festival', 
    name: 'Festival', 
    icon: <FestivalIcon className="event-edit__category-icon" />
  },
  { 
    id: 'Eğitim', 
    name: 'Üniversite', 
    icon: <UniversityIcon className="event-edit__category-icon" />
  },
  { 
    id: 'Workshop', 
    name: 'Workshop', 
    icon: <WorkshopIcon className="event-edit__category-icon" />
  },
  { 
    id: 'Konferans', 
    name: 'Konferans', 
    icon: <ConferenceIcon className="event-edit__category-icon" />
  },
  { 
    id: 'Spor', 
    name: 'Spor', 
    icon: <SportsIcon className="event-edit__category-icon" />
  },
  { 
    id: 'Sanat', 
    name: 'Sahne', 
    icon: <TheaterIcon className="event-edit__category-icon" />
  },
  { 
    id: 'Diğer', 
    name: 'Eğitim', 
    icon: <EducationIcon className="event-edit__category-icon" />
  }
];

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

  const handleCategorySelect = (categoryId: string) => {
    formik.setFieldValue('kategori', categoryId);
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
      <div className="event-edit">
        <div className="event-edit__loading">
          <div className="event-edit__spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-edit">
      <div className="event-edit__container">
        <div className="event-edit__header">
          <h1 className="event-edit__title">→ Etkinlik Düzenle</h1>
        </div>

        {/* Module Navigation */}
        <div className="event-edit__module-navigation">
          <div className="event-edit__modules">
            {Object.entries(MODULES).map(([key, title]) => (
              <button
                key={key}
                onClick={() => handleModuleClick(key)}
                className={`event-edit__module-button ${
                  location.hash === `#${key}` ? 'event-edit__module-button--active' : ''
                }`}
              >
                {title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} className="event-edit__form">
          {/* Temel Bilgiler */}
          <div
            ref={el => (moduleRefs.current['temel'] = el)}
            id="temel"
            className="event-edit__section"
          >
            <h2 className="event-edit__section-title">Temel Bilgiler</h2>
            <div className="event-edit__grid event-edit__grid--full">
              <div className="event-edit__field">
                <label htmlFor="ad" className="event-edit__label">
                  Etkinlik Adı
                </label>
                <input
                  type="text"
                  id="ad"
                  {...formik.getFieldProps('ad')}
                  className={`event-edit__input ${
                    formik.touched.ad && formik.errors.ad ? 'event-edit__input--error' : ''
                  }`}
                  placeholder="Etkinlik adını giriniz"
                />
                {formik.touched.ad && formik.errors.ad && (
                  <span className="event-edit__error">{formik.errors.ad}</span>
                )}
              </div>

              <div className="event-edit__field">
                <label className="event-edit__label">
                  Kategori
                </label>
                <div className="event-edit__category-grid">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className={`event-edit__category-card ${
                        formik.values.kategori === category.id ? 'event-edit__category-card--selected' : ''
                      }`}
                      onClick={() => handleCategorySelect(category.id)}
                    >
                      {category.icon}
                      <p className="event-edit__category-name">{category.name}</p>
                      <div className="event-edit__category-check">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
                {formik.touched.kategori && formik.errors.kategori && (
                  <span className="event-edit__error">{formik.errors.kategori}</span>
                )}
              </div>
            </div>

            <div className="event-edit__grid">
              <div className="event-edit__field">
                <label htmlFor="baslangic_tarih" className="event-edit__label">
                  Başlangıç Tarihi
                </label>
                <input
                  type="datetime-local"
                  id="baslangic_tarih"
                  {...formik.getFieldProps('baslangic_tarih')}
                  className={`event-edit__input ${
                    formik.touched.baslangic_tarih && formik.errors.baslangic_tarih ? 'event-edit__input--error' : ''
                  }`}
                />
                {formik.touched.baslangic_tarih && formik.errors.baslangic_tarih && (
                  <span className="event-edit__error">{formik.errors.baslangic_tarih}</span>
                )}
              </div>

              <div className="event-edit__field">
                <label htmlFor="bitis_tarih" className="event-edit__label">
                  Bitiş Tarihi
                </label>
                <input
                  type="datetime-local"
                  id="bitis_tarih"
                  {...formik.getFieldProps('bitis_tarih')}
                  className={`event-edit__input ${
                    formik.touched.bitis_tarih && formik.errors.bitis_tarih ? 'event-edit__input--error' : ''
                  }`}
                />
                {formik.touched.bitis_tarih && formik.errors.bitis_tarih && (
                  <span className="event-edit__error">{formik.errors.bitis_tarih}</span>
                )}
              </div>
            </div>
          </div>

          {/* Konum Bilgileri */}
          <div
            ref={el => (moduleRefs.current['konum'] = el)}
            id="konum"
            className="event-edit__section"
          >
            <h2 className="event-edit__section-title">Konum Bilgileri</h2>
            <div className="event-edit__grid">
              <div className="event-edit__field">
                <label htmlFor="yer" className="event-edit__label">
                  Etkinlik Yeri
                </label>
                <input
                  type="text"
                  id="yer"
                  {...formik.getFieldProps('yer')}
                  className={`event-edit__input ${
                    formik.touched.yer && formik.errors.yer ? 'event-edit__input--error' : ''
                  }`}
                  placeholder="Örn: Zorlu PSM"
                />
                {formik.touched.yer && formik.errors.yer && (
                  <span className="event-edit__error">{formik.errors.yer}</span>
                )}
              </div>

              <div className="event-edit__field">
                <label htmlFor="il" className="event-edit__label">
                  Şehir
                </label>
                <select
                  id="il"
                  {...formik.getFieldProps('il')}
                  className={`event-edit__select ${
                    formik.touched.il && formik.errors.il ? 'event-edit__select--error' : ''
                  }`}
                >
                  <option value="">Seçin</option>
                  <option value="İstanbul">İstanbul</option>
                  <option value="Ankara">Ankara</option>
                  <option value="İzmir">İzmir</option>
                </select>
                {formik.touched.il && formik.errors.il && (
                  <span className="event-edit__error">{formik.errors.il}</span>
                )}
              </div>
            </div>

            <div className="event-edit__grid event-edit__grid--full">
              <div className="event-edit__field">
                <label htmlFor="adres" className="event-edit__label">
                  Açık Adres
                </label>
                <textarea
                  id="adres"
                  rows={3}
                  {...formik.getFieldProps('adres')}
                  className={`event-edit__textarea ${
                    formik.touched.adres && formik.errors.adres ? 'event-edit__textarea--error' : ''
                  }`}
                  placeholder="Detaylı adres bilgisini giriniz"
                />
                {formik.touched.adres && formik.errors.adres && (
                  <span className="event-edit__error">{formik.errors.adres}</span>
                )}
              </div>
            </div>
          </div>

          {/* Detaylar */}
          <div
            ref={el => (moduleRefs.current['detaylar'] = el)}
            id="detaylar"
            className="event-edit__section"
          >
            <h2 className="event-edit__section-title">Detaylar</h2>
            <div className="event-edit__grid event-edit__grid--full">
              <div className="event-edit__field">
                <label htmlFor="banner" className="event-edit__label">
                  Banner URL
                </label>
                <input
                  type="url"
                  id="banner"
                  {...formik.getFieldProps('banner')}
                  className={`event-edit__input ${
                    formik.touched.banner && formik.errors.banner ? 'event-edit__input--error' : ''
                  }`}
                  placeholder="https://example.com/banner.jpg"
                />
                {formik.touched.banner && formik.errors.banner && (
                  <span className="event-edit__error">{formik.errors.banner}</span>
                )}
              </div>

              <div className="event-edit__field">
                <label htmlFor="aciklama" className="event-edit__label">
                  Açıklama
                </label>
                <textarea
                  id="aciklama"
                  rows={5}
                  {...formik.getFieldProps('aciklama')}
                  className="event-edit__textarea"
                  placeholder="Etkinlik hakkında detaylı bilgi verin..."
                />
              </div>

              <div className="event-edit__field">
                <label htmlFor="kapasite" className="event-edit__label">
                  Toplam Kapasite
                </label>
                <input
                  type="number"
                  id="kapasite"
                  {...formik.getFieldProps('kapasite')}
                  className={`event-edit__input ${
                    formik.touched.kapasite && formik.errors.kapasite ? 'event-edit__input--error' : ''
                  }`}
                  placeholder="1000"
                />
                {formik.touched.kapasite && formik.errors.kapasite && (
                  <span className="event-edit__error">{formik.errors.kapasite}</span>
                )}
              </div>
            </div>

            <div className="event-edit__social">
              <h3 className="event-edit__social-title">Sosyal Medya</h3>
              <div className="event-edit__social-grid">
                <div className="event-edit__field">
                  <label htmlFor="instagram" className="event-edit__social-label">
                    Instagram
                  </label>
                  <input
                    type="url"
                    id="instagram"
                    {...formik.getFieldProps('sosyal_medya.instagram')}
                    className="event-edit__input"
                    placeholder="https://instagram.com/..."
                  />
                </div>
                <div className="event-edit__field">
                  <label htmlFor="twitter" className="event-edit__social-label">
                    Twitter
                  </label>
                  <input
                    type="url"
                    id="twitter"
                    {...formik.getFieldProps('sosyal_medya.twitter')}
                    className="event-edit__input"
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="event-edit__field">
                  <label htmlFor="facebook" className="event-edit__social-label">
                    Facebook
                  </label>
                  <input
                    type="url"
                    id="facebook"
                    {...formik.getFieldProps('sosyal_medya.facebook')}
                    className="event-edit__input"
                    placeholder="https://facebook.com/..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Durum */}
          <div
            ref={el => (moduleRefs.current['durum'] = el)}
            id="durum"
            className="event-edit__section"
          >
            <h2 className="event-edit__section-title">Durum</h2>
            <div className="event-edit__field">
              <label htmlFor="durum" className="event-edit__label">
                Etkinlik Durumu
              </label>
              <select
                id="durum"
                {...formik.getFieldProps('durum')}
                className={`event-edit__select ${
                  formik.touched.durum && formik.errors.durum ? 'event-edit__select--error' : ''
                }`}
              >
                <option value="taslak">Taslak</option>
                <option value="yayinda">Yayında</option>
                <option value="iptal">İptal</option>
                <option value="tamamlandi">Tamamlandı</option>
              </select>
              {formik.touched.durum && formik.errors.durum && (
                <span className="event-edit__error">{formik.errors.durum}</span>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="event-edit__submit">
            <button
              type="button"
              onClick={() => navigate('/organizer/events')}
              className="event-edit__cancel-button"
            >
              <svg className="event-edit__submit-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="event-edit__submit-button"
            >
              {loading ? (
                <>
                  <div className="event-edit__spinner"></div>
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <svg className="event-edit__submit-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Değişiklikleri Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizerEventEdit;
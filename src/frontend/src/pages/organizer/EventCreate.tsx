import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import './EventCreate.css';

interface BiletTipi {
  tip: string;
  fiyat: number;
  kapasite: number;
}

const OrganizerEventCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [biletTipleri, setBiletTipleri] = useState<BiletTipi[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { id: 0, name: 'Temel Bilgiler', title: 'Temel Bilgiler' },
    { id: 1, name: 'Konum Bilgileri', title: 'Konum Bilgileri' },
    { id: 2, name: 'Detaylar', title: 'Detaylar' },
    { id: 3, name: 'Bilet Tipleri', title: 'Bilet Tipleri' }
  ];

  const categories = [
    { 
      id: 'Müzik', 
      name: 'Konser', 
      icon: <MusicIcon className="event-create__category-icon" />
    },
    { 
      id: 'Festival', 
      name: 'Festival', 
      icon: <FestivalIcon className="event-create__category-icon" />
    },
    { 
      id: 'Eğitim', 
      name: 'Üniversite', 
      icon: <UniversityIcon className="event-create__category-icon" />
    },
    { 
      id: 'Workshop', 
      name: 'Workshop', 
      icon: <WorkshopIcon className="event-create__category-icon" />
    },
    { 
      id: 'Konferans', 
      name: 'Konferans', 
      icon: <ConferenceIcon className="event-create__category-icon" />
    },
    { 
      id: 'Spor', 
      name: 'Spor', 
      icon: <SportsIcon className="event-create__category-icon" />
    },
    { 
      id: 'Sanat', 
      name: 'Sahne', 
      icon: <TheaterIcon className="event-create__category-icon" />
    },
    { 
      id: 'Diğer', 
      name: 'Eğitim', 
      icon: <EducationIcon className="event-create__category-icon" />
    }
  ];

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
        navigate('/organizer/events/create-success', {
          state: {
            eventId: response.data.event_id,
            eventDetails: {
              ad: values.ad,
              kategori: values.kategori,
              baslangic_tarih: values.baslangic_tarih,
              bitis_tarih: values.bitis_tarih,
              yer: values.yer,
              il: values.il,
              adres: values.adres,
              kapasite: parseInt(values.kapasite),
              bilet_tipleri: biletTipleri
            }
          }
        });
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

  const validateCurrentStep = () => {
    const errors = formik.errors;
    const touched = formik.touched;

    switch (currentStep) {
      case 0: // Temel Bilgiler
        return !(
          (errors.ad && touched.ad) ||
          (errors.kategori && touched.kategori) ||
          (errors.baslangic_tarih && touched.baslangic_tarih) ||
          (errors.bitis_tarih && touched.bitis_tarih)
        );
      case 1: // Konum Bilgileri
        return !(
          (errors.yer && touched.yer) ||
          (errors.il && touched.il) ||
          (errors.adres && touched.adres)
        );
      case 2: // Detaylar
        return !(
          (errors.banner && touched.banner) ||
          (errors.kapasite && touched.kapasite)
        );
      case 3: // Bilet Tipleri
        return biletTipleri.length > 0;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    // Touch fields for current step to show validation errors
    switch (currentStep) {
      case 0:
        formik.setFieldTouched('ad', true);
        formik.setFieldTouched('kategori', true);
        formik.setFieldTouched('baslangic_tarih', true);
        formik.setFieldTouched('bitis_tarih', true);
        break;
      case 1:
        formik.setFieldTouched('yer', true);
        formik.setFieldTouched('il', true);
        formik.setFieldTouched('adres', true);
        break;
      case 2:
        formik.setFieldTouched('banner', true);
        formik.setFieldTouched('kapasite', true);
        break;
    }

    if (validateCurrentStep() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow going to previous steps or next step if current step is valid
    if (stepIndex < currentStep || (stepIndex === currentStep + 1 && validateCurrentStep())) {
      setCurrentStep(stepIndex);
    }
  };

  const isStepCompleted = (stepIndex: number) => {
    return stepIndex < currentStep;
  };

  const isStepActive = (stepIndex: number) => {
    return stepIndex === currentStep;
  };

  const canProceedToStep = (stepIndex: number) => {
    return stepIndex <= currentStep || (stepIndex === currentStep + 1 && validateCurrentStep());
  };

  const handleCategorySelect = (categoryId: string) => {
    formik.setFieldValue('kategori', categoryId);
  };

  return (
    <div className="event-create">
      <div className="event-create__container">
        <div className="event-create__header">
          <h1 className="event-create__title">→ Yeni Etkinlik Oluştur</h1>
        </div>

        {/* Step Navigation */}
        <div className="event-create__step-navigation">
          <div className="event-create__steps">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
                  className={`event-create__step ${
                    isStepActive(index) 
                      ? 'event-create__step--active' 
                      : isStepCompleted(index)
                      ? 'event-create__step--completed'
                      : 'event-create__step--inactive'
                  }`}
                  onClick={() => handleStepClick(index)}
                >
                  <div className="event-create__step-number">
                    {isStepCompleted(index) ? (
                      <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="event-create__step-text">{step.name}</span>
                </div>
                {index < steps.length - 1 && (
                  <div 
                    className={`event-create__step-separator ${
                      isStepCompleted(index) ? 'event-create__step-separator--completed' : ''
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} className="event-create__form">
          <div className="event-create__step-content">
            {/* Step 1: Temel Bilgiler */}
            <div className={`event-create__step-section ${currentStep === 0 ? 'event-create__step-section--active' : ''}`}>
              <div className="event-create__section">
                <h2 className="event-create__section-title">Temel Bilgiler</h2>
                <div className="event-create__grid event-create__grid--full">
                  <div className="event-create__field">
                    <label htmlFor="ad" className="event-create__label">
                      Etkinlik Adı
                    </label>
                    <input
                      type="text"
                      id="ad"
                      {...formik.getFieldProps('ad')}
                      className={`event-create__input ${
                        formik.touched.ad && formik.errors.ad ? 'event-create__input--error' : ''
                      }`}
                      placeholder="Etkinlik adını giriniz"
                    />
                    {formik.touched.ad && formik.errors.ad && (
                      <span className="event-create__error">{formik.errors.ad}</span>
                    )}
                  </div>

                  <div className="event-create__field">
                    <label className="event-create__label">
                      Kategori
                    </label>
                    <div className="event-create__category-grid">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className={`event-create__category-card ${
                            formik.values.kategori === category.id ? 'event-create__category-card--selected' : ''
                          }`}
                          onClick={() => handleCategorySelect(category.id)}
                        >
                          {category.icon}
                          <p className="event-create__category-name">{category.name}</p>
                          <div className="event-create__category-check">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                    {formik.touched.kategori && formik.errors.kategori && (
                      <span className="event-create__error">{formik.errors.kategori}</span>
                    )}
                  </div>
                </div>

                <div className="event-create__grid">
                  <div className="event-create__field">
                    <label htmlFor="baslangic_tarih" className="event-create__label">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      id="baslangic_tarih"
                      {...formik.getFieldProps('baslangic_tarih')}
                      className={`event-create__input ${
                        formik.touched.baslangic_tarih && formik.errors.baslangic_tarih ? 'event-create__input--error' : ''
                      }`}
                    />
                    {formik.touched.baslangic_tarih && formik.errors.baslangic_tarih && (
                      <span className="event-create__error">{formik.errors.baslangic_tarih}</span>
                    )}
                  </div>

                  <div className="event-create__field">
                    <label htmlFor="bitis_tarih" className="event-create__label">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      id="bitis_tarih"
                      {...formik.getFieldProps('bitis_tarih')}
                      className={`event-create__input ${
                        formik.touched.bitis_tarih && formik.errors.bitis_tarih ? 'event-create__input--error' : ''
                      }`}
                    />
                    {formik.touched.bitis_tarih && formik.errors.bitis_tarih && (
                      <span className="event-create__error">{formik.errors.bitis_tarih}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Konum Bilgileri */}
            <div className={`event-create__step-section ${currentStep === 1 ? 'event-create__step-section--active' : ''}`}>
              <div className="event-create__section">
                <h2 className="event-create__section-title">Konum Bilgileri</h2>
                <div className="event-create__grid">
                  <div className="event-create__field">
                    <label htmlFor="yer" className="event-create__label">
                      Etkinlik Yeri
                    </label>
                    <input
                      type="text"
                      id="yer"
                      {...formik.getFieldProps('yer')}
                      className={`event-create__input ${
                        formik.touched.yer && formik.errors.yer ? 'event-create__input--error' : ''
                      }`}
                      placeholder="Örn: Zorlu PSM"
                    />
                    {formik.touched.yer && formik.errors.yer && (
                      <span className="event-create__error">{formik.errors.yer}</span>
                    )}
                  </div>

                  <div className="event-create__field">
                    <label htmlFor="il" className="event-create__label">
                      Şehir
                    </label>
                    <select
                      id="il"
                      {...formik.getFieldProps('il')}
                      className={`event-create__select ${
                        formik.touched.il && formik.errors.il ? 'event-create__select--error' : ''
                      }`}
                    >
                      <option value="">Seçin</option>
                      <option value="İstanbul">İstanbul</option>
                      <option value="Ankara">Ankara</option>
                      <option value="İzmir">İzmir</option>
                    </select>
                    {formik.touched.il && formik.errors.il && (
                      <span className="event-create__error">{formik.errors.il}</span>
                    )}
                  </div>
                </div>

                <div className="event-create__grid event-create__grid--full">
                  <div className="event-create__field">
                    <label htmlFor="adres" className="event-create__label">
                      Açık Adres
                    </label>
                    <textarea
                      id="adres"
                      rows={3}
                      {...formik.getFieldProps('adres')}
                      className={`event-create__textarea ${
                        formik.touched.adres && formik.errors.adres ? 'event-create__textarea--error' : ''
                      }`}
                      placeholder="Detaylı adres bilgisini giriniz"
                    />
                    {formik.touched.adres && formik.errors.adres && (
                      <span className="event-create__error">{formik.errors.adres}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Detaylar */}
            <div className={`event-create__step-section ${currentStep === 2 ? 'event-create__step-section--active' : ''}`}>
              <div className="event-create__section">
                <h2 className="event-create__section-title">Detaylar</h2>
                <div className="event-create__grid event-create__grid--full">
                  <div className="event-create__field">
                    <label htmlFor="banner" className="event-create__label">
                      Banner URL
                    </label>
                    <input
                      type="url"
                      id="banner"
                      {...formik.getFieldProps('banner')}
                      className={`event-create__input ${
                        formik.touched.banner && formik.errors.banner ? 'event-create__input--error' : ''
                      }`}
                      placeholder="https://example.com/banner.jpg"
                    />
                    {formik.touched.banner && formik.errors.banner && (
                      <span className="event-create__error">{formik.errors.banner}</span>
                    )}
                  </div>

                  <div className="event-create__field">
                    <label htmlFor="aciklama" className="event-create__label">
                      Açıklama
                    </label>
                    <textarea
                      id="aciklama"
                      rows={5}
                      {...formik.getFieldProps('aciklama')}
                      className="event-create__textarea"
                      placeholder="Etkinlik hakkında detaylı bilgi verin..."
                    />
                  </div>

                  <div className="event-create__field">
                    <label htmlFor="kapasite" className="event-create__label">
                      Toplam Kapasite
                    </label>
                    <input
                      type="number"
                      id="kapasite"
                      {...formik.getFieldProps('kapasite')}
                      className={`event-create__input ${
                        formik.touched.kapasite && formik.errors.kapasite ? 'event-create__input--error' : ''
                      }`}
                      placeholder="1000"
                    />
                    {formik.touched.kapasite && formik.errors.kapasite && (
                      <span className="event-create__error">{formik.errors.kapasite}</span>
                    )}
                  </div>
                </div>

                <div className="event-create__social">
                  <h3 className="event-create__social-title">Sosyal Medya</h3>
                  <div className="event-create__social-grid">
                    <div className="event-create__field">
                      <label htmlFor="instagram" className="event-create__social-label">
                        Instagram
                      </label>
                      <input
                        type="url"
                        id="instagram"
                        {...formik.getFieldProps('sosyal_medya.instagram')}
                        className="event-create__input"
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div className="event-create__field">
                      <label htmlFor="twitter" className="event-create__social-label">
                        Twitter
                      </label>
                      <input
                        type="url"
                        id="twitter"
                        {...formik.getFieldProps('sosyal_medya.twitter')}
                        className="event-create__input"
                        placeholder="https://twitter.com/..."
                      />
                    </div>
                    <div className="event-create__field">
                      <label htmlFor="facebook" className="event-create__social-label">
                        Facebook
                      </label>
                      <input
                        type="url"
                        id="facebook"
                        {...formik.getFieldProps('sosyal_medya.facebook')}
                        className="event-create__input"
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Bilet Tipleri */}
            <div className={`event-create__step-section ${currentStep === 3 ? 'event-create__step-section--active' : ''}`}>
              <div className="event-create__section">
                <h2 className="event-create__section-title">Bilet Tipleri</h2>
                <div className="event-create__tickets">
                  {/* Mevcut Bilet Tipleri */}
                  {biletTipleri.length > 0 && (
                    <div className="event-create__existing-tickets">
                      <h3 className="event-create__existing-title">Eklenen Bilet Tipleri</h3>
                      <div className="event-create__ticket-list">
                        {biletTipleri.map((bilet, index) => (
                          <div key={index} className="event-create__ticket-item">
                            <div className="event-create__ticket-info">
                              <span className="event-create__ticket-name">{bilet.tip}</span>
                              <span className="event-create__ticket-separator">—</span>
                              <span className="event-create__ticket-price">{bilet.fiyat} TL</span>
                              <span className="event-create__ticket-separator">—</span>
                              <span className="event-create__ticket-capacity">{bilet.kapasite} kişi</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleBiletTipiSil(index)}
                              className="event-create__ticket-remove"
                            >
                              Sil
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Yeni Bilet Tipi Ekleme */}
                  <div className="event-create__add-ticket">
                    <div className="event-create__ticket-inputs">
                      <div className="event-create__field">
                        <label htmlFor="yeni_bilet_tipi" className="event-create__label">
                          Bilet Tipi
                        </label>
                        <input
                          type="text"
                          id="yeni_bilet_tipi"
                          {...formik.getFieldProps('yeni_bilet_tipi')}
                          className="event-create__input"
                          placeholder="Örn: VIP"
                        />
                      </div>
                      <div className="event-create__field">
                        <label htmlFor="yeni_bilet_fiyat" className="event-create__label">
                          Fiyat (TL)
                        </label>
                        <input
                          type="number"
                          id="yeni_bilet_fiyat"
                          {...formik.getFieldProps('yeni_bilet_fiyat')}
                          className="event-create__input"
                          placeholder="100"
                        />
                      </div>
                      <div className="event-create__field">
                        <label htmlFor="yeni_bilet_kapasite" className="event-create__label">
                          Kapasite
                        </label>
                        <input
                          type="number"
                          id="yeni_bilet_kapasite"
                          {...formik.getFieldProps('yeni_bilet_kapasite')}
                          className="event-create__input"
                          placeholder="50"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleBiletTipiEkle}
                      className="event-create__add-button"
                    >
                      <svg className="event-create__add-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Bilet Tipi Ekle
                    </button>
                  </div>

                  {biletTipleri.length === 0 && (
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', padding: '20px' }}>
                      En az bir bilet tipi eklemelisiniz
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Step Navigation Controls */}
          <div className="event-create__step-controls">
            <button
              type="button"
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="event-create__step-button event-create__step-button--prev"
            >
              <svg className="event-create__step-button-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Önceki
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!validateCurrentStep()}
                className="event-create__step-button event-create__step-button--next"
              >
                Sonraki
                <svg className="event-create__step-button-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !validateCurrentStep()}
                className="event-create__submit-button"
              >
                {loading ? (
                  <>
                    <div className="event-create__spinner"></div>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <svg className="event-create__submit-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Etkinlik Oluştur
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrganizerEventCreate; 
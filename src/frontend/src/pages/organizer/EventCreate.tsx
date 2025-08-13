import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
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

interface TicketType {
  type: string;
  price: number;
  capacity: number;
}

// Category-specific detail interfaces
interface ConcertDetails {
  artistList: string[];
  stageSetup: string;
  duration: string;
}

interface FestivalDetails {
  lineup: string[];
  sponsors: string[];
  activities: string[];
}

interface UniversityDetails {
  campus: string;
  department: string;
  studentDiscount: boolean;
  facultyList: string[];
}

interface WorkshopDetails {
  instructorList: string[];
  materials: string[];
  skillLevel: string;
}

interface ConferenceDetails {
  speakerList: string[];
  agenda: string[];
  topics: string[];
  hasCertificate: boolean;
}

interface SportDetails {
  teams: string[];
  league: string;
  scoreTracking: boolean;
  rules: string;
}

interface PerformanceDetails {
  performers: string[];
  scriptSummary: string;
  duration: string;
  genre: string;
}

interface EducationDetails {
  curriculum: string[];
  instructors: string[];
  prerequisites: string[];
  certification: boolean;
}

type CategoryDetails = 
  | ConcertDetails 
  | FestivalDetails 
  | UniversityDetails 
  | WorkshopDetails 
  | ConferenceDetails 
  | SportDetails 
  | PerformanceDetails 
  | EducationDetails 
  | null;

const OrganizerEventCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [categoryDetails, setCategoryDetails] = useState<CategoryDetails>(null);
  const [arrayInputs, setArrayInputs] = useState<{[key: string]: string}>({});

  const steps = [
    { id: 0, name: 'Temel Bilgiler', title: 'Temel Bilgiler' },
    { id: 1, name: 'Konum Bilgileri', title: 'Konum Bilgileri' },
    { id: 2, name: 'Detaylar', title: 'Detaylar' },
    { id: 3, name: 'Bilet Tipleri', title: 'Bilet Tipleri' }
  ];

  const categories = [
    { 
      id: 'CONCERT', 
      name: 'Konser', 
      icon: <MusicIcon className="event-create__category-icon" />
    },
    { 
      id: 'FESTIVAL', 
      name: 'Festival', 
      icon: <FestivalIcon className="event-create__category-icon" />
    },
    { 
      id: 'UNIVERSITY', 
      name: 'Üniversite', 
      icon: <UniversityIcon className="event-create__category-icon" />
    },
    { 
      id: 'WORKSHOP', 
      name: 'Workshop', 
      icon: <WorkshopIcon className="event-create__category-icon" />
    },
    { 
      id: 'CONFERENCE', 
      name: 'Konferans', 
      icon: <ConferenceIcon className="event-create__category-icon" />
    },
    { 
      id: 'SPORT', 
      name: 'Spor', 
      icon: <SportsIcon className="event-create__category-icon" />
    },
    { 
      id: 'PERFORMANCE', 
      name: 'Sahne', 
      icon: <TheaterIcon className="event-create__category-icon" />
    },
    { 
      id: 'EDUCATION', 
      name: 'Eğitim', 
      icon: <EducationIcon className="event-create__category-icon" />
    }
  ];

  const formik = useFormik({
    initialValues: {
      name: '',
      category: '',
      startDate: '',
      endDate: '',
      venue: '',
      address: '',
      city: '',
      banner: '',
      socialMedia: {
        instagram: '',
        twitter: '',
        facebook: ''
      },
      description: '',
      capacity: '',
      newTicketType: '',
      newTicketPrice: '',
      newTicketCapacity: ''
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .min(2, 'En az 2 karakter olmalıdır')
        .required('Etkinlik adı zorunludur'),
      category: Yup.string().required('Kategori zorunludur'),
      startDate: Yup.date()
        .min(new Date(), 'Başlangıç tarihi bugünden sonra olmalıdır')
        .required('Başlangıç tarihi zorunludur'),
      endDate: Yup.date()
        .min(Yup.ref('startDate'), 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır')
        .required('Bitiş tarihi zorunludur'),
      venue: Yup.string().required('Etkinlik yeri zorunludur'),
      address: Yup.string().required('Adres zorunludur'),
      city: Yup.string().required('Şehir zorunludur'),
      banner: Yup.string().url('Geçerli bir URL giriniz'),
      socialMedia: Yup.object({
        instagram: Yup.string().url('Geçerli bir URL giriniz'),
        twitter: Yup.string().url('Geçerli bir URL giriniz'),
        facebook: Yup.string().url('Geçerli bir URL giriniz')
      }),
      capacity: Yup.number().optional(),
      newTicketType: Yup.string(),
      newTicketPrice: Yup.number().min(0, 'Fiyat 0 veya daha büyük olmalıdır'),
      newTicketCapacity: Yup.number().min(1, 'Kapasite en az 1 olmalıdır')
    }).test('ticket-capacity-validation', '', function(values) {
      const { capacity, newTicketType, newTicketPrice, newTicketCapacity } = values;
      if (capacity && ticketTypes.length > 0) {
        const totalTicketCapacity = ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
        if (totalTicketCapacity > Number(capacity)) {
          return this.createError({
            path: 'capacity',
            message: `Bilet kapasiteleri toplamı (${totalTicketCapacity}) etkinlik kapasitesini (${capacity}) aşamaz.`
          });
        }
      }
      return true;
    }),
    onSubmit: async values => {
      if (ticketTypes.length === 0) {
        toast.error('En az bir bilet tipi eklemelisiniz');
        return;
      }

      // Check capacity validation before submission
      if (values.capacity && ticketTypes.length > 0) {
        const totalTicketCapacity = ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0);
        const eventCapacity = parseInt(values.capacity);
        
        if (totalTicketCapacity > eventCapacity) {
          // Go to details step (step 2) and show error
          setCurrentStep(2);
          formik.setFieldTouched('capacity', true);
          formik.setFieldError('capacity', `Bilet kapasiteleri toplamı (${totalTicketCapacity}) etkinlik kapasitesini (${eventCapacity}) aşamaz.`);
          toast.error(`Bilet kapasiteleri toplamı (${totalTicketCapacity}) etkinlik kapasitesini (${eventCapacity}) aşıyor. Lütfen kapasiteleri düzenleyin.`);
          return;
        }
      }

      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/events`, {
          name: values.name,
          category: values.category,
          startDate: values.startDate,
          endDate: values.endDate,
          venue: values.venue,
          address: values.address,
          city: values.city,
          banner: values.banner || undefined,
          socialMedia: values.socialMedia,
          description: values.description,
          capacity: parseInt(values.capacity),
          ticketTypes: ticketTypes,
          details: categoryDetails
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        toast.success('Etkinlik başarıyla oluşturuldu');
        navigate('/organizer/events/create-success', {
          state: {
            eventId: response.data.event.id,
            eventDetails: {
              name: values.name,
              category: values.category,
              startDate: values.startDate,
              endDate: values.endDate,
              venue: values.venue,
              city: values.city,
              address: values.address,
              capacity: parseInt(values.capacity),
              ticketTypes: ticketTypes
            }
          }
        });
      } catch (error: any) {
        console.error('Event creation error:', error);
        if (error.response?.status === 401) {
          toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
          localStorage.removeItem('token');
          navigate('/login');
        } else if (error.response?.status === 403) {
          toast.error('Etkinlik oluşturma yetkiniz yok');
        } else if (error.response?.data?.message) {
          toast.error(error.response.data.message);
        } else {
          toast.error('Etkinlik oluşturulurken bir hata oluştu');
        }
      } finally {
        setLoading(false);
      }
    }
  });

  const handleTicketTypeAdd = () => {
    const { newTicketType, newTicketPrice, newTicketCapacity } = formik.values;

    if (!newTicketType || !newTicketPrice || !newTicketCapacity) {
      toast.error('Tüm bilet bilgilerini doldurun');
      return;
    }

    setTicketTypes([
      ...ticketTypes,
      {
        type: newTicketType,
        price: parseFloat(newTicketPrice),
        capacity: parseInt(newTicketCapacity)
      }
    ]);

    formik.setFieldValue('newTicketType', '');
    formik.setFieldValue('newTicketPrice', '');
    formik.setFieldValue('newTicketCapacity', '');
  };

  const handleTicketTypeRemove = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const validateCurrentStep = () => {
    const errors = formik.errors;
    const touched = formik.touched;

    switch (currentStep) {
      case 0: // Temel Bilgiler
        return !(
          (errors.name && touched.name) ||
          (errors.category && touched.category) ||
          (errors.startDate && touched.startDate) ||
          (errors.endDate && touched.endDate)
        );
      case 1: // Konum Bilgileri
        return !(
          (errors.venue && touched.venue) ||
          (errors.city && touched.city) ||
          (errors.address && touched.address)
        );
      case 2: // Detaylar
        return !(
          (errors.banner && touched.banner) ||
          (errors.capacity && touched.capacity)
        );
      case 3: // Bilet Tipleri
        return ticketTypes.length > 0;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    // Touch fields for current step to show validation errors
    switch (currentStep) {
      case 0:
        formik.setFieldTouched('name', true);
        formik.setFieldTouched('category', true);
        formik.setFieldTouched('startDate', true);
        formik.setFieldTouched('endDate', true);
        break;
      case 1:
        formik.setFieldTouched('venue', true);
        formik.setFieldTouched('city', true);
        formik.setFieldTouched('address', true);
        break;
      case 2:
        formik.setFieldTouched('banner', true);
        formik.setFieldTouched('capacity', true);
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

  const getDefaultDetailsForCategory = (category: string): CategoryDetails => {
    switch (category) {
      case 'CONCERT':
        return {
          artistList: [],
          stageSetup: '',
          duration: ''
        };
      case 'FESTIVAL':
        return {
          lineup: [],
          sponsors: [],
          activities: []
        };
      case 'UNIVERSITY':
        return {
          campus: '',
          department: '',
          studentDiscount: false,
          facultyList: []
        };
      case 'WORKSHOP':
        return {
          instructorList: [],
          materials: [],
          skillLevel: 'Başlangıç'
        };
      case 'CONFERENCE':
        return {
          speakerList: [],
          agenda: [],
          topics: [],
          hasCertificate: false
        };
      case 'SPORT':
        return {
          teams: [],
          league: '',
          scoreTracking: false,
          rules: ''
        };
      case 'PERFORMANCE':
        return {
          performers: [],
          scriptSummary: '',
          duration: '',
          genre: ''
        };
      case 'EDUCATION':
        return {
          curriculum: [],
          instructors: [],
          prerequisites: [],
          certification: false
        };
      default:
        return null;
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    formik.setFieldValue('category', categoryId);
    const newDetails = getDefaultDetailsForCategory(categoryId);
    setCategoryDetails(newDetails);
    // Clear array inputs when category changes
    setArrayInputs({});
  };
  interface CityItem {
    name: string;
    plate: string;
    latitude?: string;
    longitude?: string;
  }
  const API_BASE_URL = process.env.REACT_APP_API_URL as string | undefined;
  useEffect(() => {
    const fetchCities = async () => {
      try {
        if (!API_BASE_URL) return;
        const res = await axios.get(`${API_BASE_URL}/auth/cities`);
        const list: CityItem[] = res.data?.cities || [];
        setCities(list);
      } catch (e) {
        // Non-blocking
      }
    };
    fetchCities();
  }, [API_BASE_URL]);

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [cities]);

  const updateCategoryDetails = (field: string, value: any) => {
    if (!categoryDetails) return;
    setCategoryDetails({
      ...categoryDetails,
      [field]: value
    } as CategoryDetails);
  };

  const addArrayItem = (field: string, value: string) => {
    if (!categoryDetails || !value.trim()) return;
    const currentArray = (categoryDetails as any)[field] || [];
    updateCategoryDetails(field, [...currentArray, value.trim()]);
  };

  const removeArrayItem = (field: string, index: number) => {
    if (!categoryDetails) return;
    const currentArray = (categoryDetails as any)[field] || [];
    updateCategoryDetails(field, currentArray.filter((_: any, i: number) => i !== index));
  };

  const renderCategoryDetails = () => {
    if (!formik.values.category || !categoryDetails) {
      return (
        <div className="event-create__category-placeholder">
          <p className="event-create__placeholder-text">
            Önce bir kategori seçin, ardından o kategoriye özel detayları ekleyebilirsiniz.
          </p>
        </div>
      );
    }

    const category = formik.values.category;

    switch (category) {
      case 'CONCERT':
        return renderConcertDetails();
      case 'FESTIVAL':
        return renderFestivalDetails();
      case 'UNIVERSITY':
        return renderUniversityDetails();
      case 'WORKSHOP':
        return renderWorkshopDetails();
      case 'CONFERENCE':
        return renderConferenceDetails();
      case 'SPORT':
        return renderSportDetails();
      case 'PERFORMANCE':
        return renderPerformanceDetails();
      case 'EDUCATION':
        return renderEducationDetails();
      default:
        return null;
    }
  };

  const updateArrayInput = (field: string, value: string) => {
    setArrayInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addArrayItemWithInput = (field: string) => {
    const value = arrayInputs[field] || '';
    if (value.trim()) {
      addArrayItem(field, value);
      updateArrayInput(field, '');
    }
  };

  const renderArrayField = (title: string, field: string, placeholder: string, description?: string) => {
    const currentArray = (categoryDetails as any)?.[field] || [];
    const inputValue = arrayInputs[field] || '';

    return (
      <div className="event-create__array-field">
        <h4 className="event-create__array-title">{title}</h4>
        {description && <p className="event-create__array-description">{description}</p>}
        
        <div className="event-create__array-list">
          {currentArray.map((item: string, index: number) => (
            <div key={index} className="event-create__array-item">
              <span className="event-create__array-item-text">{item}</span>
              <button
                type="button"
                onClick={() => removeArrayItem(field, index)}
                className="event-create__array-remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="event-create__array-add">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => updateArrayInput(field, e.target.value)}
            placeholder={placeholder}
            className="event-create__array-input"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItemWithInput(field);
              }
            }}
          />
          <button
            type="button"
            onClick={() => addArrayItemWithInput(field)}
            className="event-create__array-add-button"
          >
            Ekle
          </button>
        </div>
      </div>
    );
  };

  const renderConcertDetails = () => {
    const details = categoryDetails as ConcertDetails;
    return (
      <div className="event-create__category-details">
        <h3 className="event-create__details-title">🎵 Konser Detayları</h3>
        
        {renderArrayField('Sanatçı Listesi', 'artistList', 'Sanatçı adı girin', 'Bu konserde yer alacak sanatçıları ekleyin')}
        
        <div className="event-create__field">
          <label className="event-create__label">Sahne Düzeni</label>
          <textarea
            value={details.stageSetup}
            onChange={(e) => updateCategoryDetails('stageSetup', e.target.value)}
            placeholder="Sahne düzeni hakkında bilgi verin..."
            className="event-create__textarea"
            rows={3}
          />
        </div>

        <div className="event-create__field">
          <label className="event-create__label">Süre</label>
          <input
            type="text"
            value={details.duration}
            onChange={(e) => updateCategoryDetails('duration', e.target.value)}
            placeholder="Örn: 2 saat 30 dakika"
            className="event-create__input"
          />
        </div>
      </div>
    );
  };

  const renderFestivalDetails = () => {
    const details = categoryDetails as FestivalDetails;
    return (
      <div className="event-create__category-details">
        <h3 className="event-create__details-title">🎪 Festival Detayları</h3>
        
        {renderArrayField('Line-up', 'lineup', 'Sanatçı/grup adı girin', 'Festivalde sahne alacak sanatçıları ekleyin')}
        {renderArrayField('Sponsorlar', 'sponsors', 'Sponsor adı girin', 'Festival sponsorlarını ekleyin')}
        {renderArrayField('Aktiviteler', 'activities', 'Aktivite adı girin', 'Festival boyunca düzenlenecek aktiviteleri ekleyin')}
      </div>
    );
  };

  const renderUniversityDetails = () => {
    const details = categoryDetails as UniversityDetails;
    return (
      <div className="event-create__category-details">
        <h3 className="event-create__details-title">🎓 Üniversite Etkinliği Detayları</h3>
        
        <div className="event-create__grid">
          <div className="event-create__field">
            <label className="event-create__label">Kampüs</label>
            <input
              type="text"
              value={details.campus}
              onChange={(e) => updateCategoryDetails('campus', e.target.value)}
              placeholder="Kampüs adı"
              className="event-create__input"
            />
          </div>

          <div className="event-create__field">
            <label className="event-create__label">Bölüm</label>
            <input
              type="text"
              value={details.department}
              onChange={(e) => updateCategoryDetails('department', e.target.value)}
              placeholder="Bölüm adı"
              className="event-create__input"
            />
          </div>
        </div>

        <div className="event-create__field">
          <label className="event-create__checkbox-label">
            <input
              type="checkbox"
              checked={details.studentDiscount}
              onChange={(e) => updateCategoryDetails('studentDiscount', e.target.checked)}
              className="event-create__checkbox"
            />
            Öğrenci İndirimi Var
          </label>
        </div>

        {renderArrayField('Fakülte Listesi', 'facultyList', 'Fakülte adı girin', 'İlgili fakülteleri ekleyin')}
      </div>
    );
  };

  const renderWorkshopDetails = () => {
    const details = categoryDetails as WorkshopDetails;
    return (
      <div className="event-create__category-details">
        <h3 className="event-create__details-title">🛠️ Workshop Detayları</h3>
        
        {renderArrayField('Eğitmenler', 'instructorList', 'Eğitmen adı girin', 'Workshop eğitmenlerini ekleyin')}
        {renderArrayField('Gerekli Malzemeler', 'materials', 'Malzeme adı girin', 'Katılımcıların getirmesi gereken malzemeleri ekleyin')}
        
        <div className="event-create__field">
          <label className="event-create__label">Seviye</label>
          <select
            value={details.skillLevel}
            onChange={(e) => updateCategoryDetails('skillLevel', e.target.value)}
            className="event-create__select"
          >
            <option value="Başlangıç">Başlangıç</option>
            <option value="Orta">Orta</option>
            <option value="İleri">İleri</option>
            <option value="Uzman">Uzman</option>
          </select>
        </div>
      </div>
    );
  };

  const renderConferenceDetails = () => {
    const details = categoryDetails as ConferenceDetails;
    return (
      <div className="event-create__category-details">
        <h3 className="event-create__details-title">🎤 Konferans Detayları</h3>
        
        {renderArrayField('Konuşmacılar', 'speakerList', 'Konuşmacı adı girin', 'Konferans konuşmacılarını ekleyin')}
        {renderArrayField('Ajanda', 'agenda', 'Ajanda maddesi girin', 'Konferans programını ekleyin')}
        {renderArrayField('Konular', 'topics', 'Konu başlığı girin', 'Ele alınacak konuları ekleyin')}
        
        <div className="event-create__field">
          <label className="event-create__checkbox-label">
            <input
              type="checkbox"
              checked={details.hasCertificate}
              onChange={(e) => updateCategoryDetails('hasCertificate', e.target.checked)}
              className="event-create__checkbox"
            />
            Katılım Sertifikası Verilecek
          </label>
        </div>
      </div>
    );
  };

  const renderSportDetails = () => {
    const details = categoryDetails as SportDetails;
    return (
      <div className="event-create__category-details">
        <h3 className="event-create__details-title">⚽ Spor Etkinliği Detayları</h3>
        
        {renderArrayField('Takımlar', 'teams', 'Takım adı girin', 'Katılacak takımları ekleyin')}
        
        <div className="event-create__field">
          <label className="event-create__label">Lig</label>
          <input
            type="text"
            value={details.league}
            onChange={(e) => updateCategoryDetails('league', e.target.value)}
            placeholder="Lig adı"
            className="event-create__input"
          />
        </div>

        <div className="event-create__field">
          <label className="event-create__checkbox-label">
            <input
              type="checkbox"
              checked={details.scoreTracking}
              onChange={(e) => updateCategoryDetails('scoreTracking', e.target.checked)}
              className="event-create__checkbox"
            />
            Skor Takibi Yapılacak
          </label>
        </div>

        <div className="event-create__field">
          <label className="event-create__label">Kurallar</label>
          <textarea
            value={details.rules}
            onChange={(e) => updateCategoryDetails('rules', e.target.value)}
            placeholder="Özel kurallar veya açıklamalar..."
            className="event-create__textarea"
            rows={4}
          />
        </div>
      </div>
    );
  };

  const renderPerformanceDetails = () => {
    const details = categoryDetails as PerformanceDetails;
    return (
      <div className="event-create__category-details">
        <h3 className="event-create__details-title">🎭 Performans Detayları</h3>
        
        {renderArrayField('Sanatçılar', 'performers', 'Sanatçı adı girin', 'Performansta yer alacak sanatçıları ekleyin')}
        
        <div className="event-create__grid">
          <div className="event-create__field">
            <label className="event-create__label">Süre</label>
            <input
              type="text"
              value={details.duration}
              onChange={(e) => updateCategoryDetails('duration', e.target.value)}
              placeholder="Örn: 90 dakika"
              className="event-create__input"
            />
          </div>

          <div className="event-create__field">
            <label className="event-create__label">Tür</label>
            <input
              type="text"
              value={details.genre}
              onChange={(e) => updateCategoryDetails('genre', e.target.value)}
              placeholder="Örn: Drama, Komedi, Müzikal"
              className="event-create__input"
            />
          </div>
        </div>

        <div className="event-create__field">
          <label className="event-create__label">Senaryo Özeti</label>
          <textarea
            value={details.scriptSummary}
            onChange={(e) => updateCategoryDetails('scriptSummary', e.target.value)}
            placeholder="Performansın kısa özeti..."
            className="event-create__textarea"
            rows={4}
          />
        </div>
      </div>
    );
  };

  const renderEducationDetails = () => {
    const details = categoryDetails as EducationDetails;
    return (
      <div className="event-create__category-details">
        <h3 className="event-create__details-title">📚 Eğitim Etkinliği Detayları</h3>
        
        {renderArrayField('Müfredat', 'curriculum', 'Müfredat maddesi girin', 'Eğitim müfredatını ekleyin')}
        {renderArrayField('Eğitmenler', 'instructors', 'Eğitmen adı girin', 'Eğitmenleri ekleyin')}
        {renderArrayField('Ön Koşullar', 'prerequisites', 'Ön koşul girin', 'Katılım için gereken ön koşulları ekleyin')}
        
        <div className="event-create__field">
          <label className="event-create__checkbox-label">
            <input
              type="checkbox"
              checked={details.certification}
              onChange={(e) => updateCategoryDetails('certification', e.target.checked)}
              className="event-create__checkbox"
            />
            Sertifika Verilecek
          </label>
        </div>
      </div>
    );
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
                    <label htmlFor="name" className="event-create__label">
                      Etkinlik Adı
                    </label>
                    <input
                      type="text"
                      id="name"
                      {...formik.getFieldProps('name')}
                      className={`event-create__input ${
                        formik.touched.name && formik.errors.name ? 'event-create__input--error' : ''
                      }`}
                      placeholder="Etkinlik adını giriniz"
                    />
                    {formik.touched.name && formik.errors.name && (
                      <span className="event-create__error">{formik.errors.name}</span>
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
                            formik.values.category === category.id ? 'event-create__category-card--selected' : ''
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
                    {formik.touched.category && formik.errors.category && (
                      <span className="event-create__error">{formik.errors.category}</span>
                    )}
                  </div>
                </div>

                <div className="event-create__grid">
                  <div className="event-create__field">
                    <label htmlFor="startDate" className="event-create__label">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      id="startDate"
                      {...formik.getFieldProps('startDate')}
                      className={`event-create__input ${
                        formik.touched.startDate && formik.errors.startDate ? 'event-create__input--error' : ''
                      }`}
                    />
                    {formik.touched.startDate && formik.errors.startDate && (
                      <span className="event-create__error">{formik.errors.startDate}</span>
                    )}
                  </div>

                  <div className="event-create__field">
                    <label htmlFor="endDate" className="event-create__label">
                      Bitiş Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      id="endDate"
                      {...formik.getFieldProps('endDate')}
                      className={`event-create__input ${
                        formik.touched.endDate && formik.errors.endDate ? 'event-create__input--error' : ''
                      }`}
                    />
                    {formik.touched.endDate && formik.errors.endDate && (
                      <span className="event-create__error">{formik.errors.endDate}</span>
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
                    <label htmlFor="venue" className="event-create__label">
                      Etkinlik Yeri
                    </label>
                    <input
                      type="text"
                      id="venue"
                      {...formik.getFieldProps('venue')}
                      className={`event-create__input ${
                        formik.touched.venue && formik.errors.venue ? 'event-create__input--error' : ''
                      }`}
                      placeholder="Örn: Zorlu PSM"
                    />
                    {formik.touched.venue && formik.errors.venue && (
                      <span className="event-create__error">{formik.errors.venue}</span>
                    )}
                  </div>

                  <div className="event-create__field">
                    <label htmlFor="city" className="event-create__label">
                      Şehir
                    </label>
                    <select
                id="city"
                {...formik.getFieldProps('city')}
                className={`event-create__input ${formik.touched.city && formik.errors.city ? 'error' : ''}`}
              >
                <option value="">Şehir seçiniz</option>
                {sortedCities.map((c) => (
                  <option key={c.plate} value={c.name}>
                    {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                  </option>
                ))}
              </select>
                    {formik.touched.city && formik.errors.city && (
                      <span className="event-create__error">{formik.errors.city}</span>
                    )}
                  </div>
                </div>

                <div className="event-create__grid event-create__grid--full">
                  <div className="event-create__field">
                    <label htmlFor="address" className="event-create__label">
                      Açık Adres
                    </label>
                    <textarea
                      id="address"
                      rows={3}
                      {...formik.getFieldProps('address')}
                      className={`event-create__textarea ${
                        formik.touched.address && formik.errors.address ? 'event-create__textarea--error' : ''
                      }`}
                      placeholder="Detaylı adres bilgisini giriniz"
                    />
                    {formik.touched.address && formik.errors.address && (
                      <span className="event-create__error">{formik.errors.address}</span>
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
                    <label htmlFor="description" className="event-create__label">
                      Açıklama
                    </label>
                    <textarea
                      id="description"
                      rows={5}
                      {...formik.getFieldProps('description')}
                      className="event-create__textarea"
                      placeholder="Etkinlik hakkında detaylı bilgi verin..."
                    />
                  </div>

                  <div className="event-create__field">
                    <label htmlFor="capacity" className="event-create__label">
                      Toplam Kapasite
                    </label>
                    <input
                      type="number"
                      id="capacity"
                      {...formik.getFieldProps('capacity')}
                      className={`event-create__input ${
                        formik.touched.capacity && formik.errors.capacity ? 'event-create__input--error' : ''
                      }`}
                      placeholder="1000"
                    />
                    {formik.touched.capacity && formik.errors.capacity && (
                      <span className="event-create__error">{formik.errors.capacity}</span>
                    )}
                    
                    {/* Capacity Summary */}
                    {ticketTypes.length > 0 && (
                      <div className="event-create__capacity-summary">
                        <div className="event-create__capacity-row">
                          <span className="event-create__capacity-label">Etkinlik Kapasitesi:</span>
                          <span className={`event-create__capacity-value ${!formik.values.capacity ? 'event-create__capacity-value--warning' : ''}`}>
                            {formik.values.capacity || 'Belirtilmedi'}
                          </span>
                        </div>
                        <div className="event-create__capacity-row">
                          <span className="event-create__capacity-label">Bilet Kapasiteleri Toplamı:</span>
                          <span className={`event-create__capacity-value ${
                            formik.values.capacity && 
                            ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0) > parseInt(formik.values.capacity) 
                              ? 'event-create__capacity-value--error' 
                              : 'event-create__capacity-value--success'
                          }`}>
                            {ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0)}
                          </span>
                        </div>
                        {formik.values.capacity && ticketTypes.reduce((sum, ticket) => sum + ticket.capacity, 0) > parseInt(formik.values.capacity) && (
                          <div className="event-create__capacity-warning">
                            ⚠️ Bilet kapasiteleri toplamı etkinlik kapasitesini aşıyor!
                          </div>
                        )}
                      </div>
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
                        {...formik.getFieldProps('socialMedia.instagram')}
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
                        {...formik.getFieldProps('socialMedia.twitter')}
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
                        {...formik.getFieldProps('socialMedia.facebook')}
                        className="event-create__input"
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                  </div>
                </div>

                {/* Category-specific Details */}
                <div className="event-create__category-section">
                  <h3 className="event-create__section-subtitle">Kategori Detayları</h3>
                  {renderCategoryDetails()}
                </div>
              </div>
            </div>

            {/* Step 4: Bilet Tipleri */}
            <div className={`event-create__step-section ${currentStep === 3 ? 'event-create__step-section--active' : ''}`}>
              <div className="event-create__section">
                <h2 className="event-create__section-title">Bilet Tipleri</h2>
                <div className="event-create__tickets">
                  {/* Mevcut Bilet Tipleri */}
                  {ticketTypes.length > 0 && (
                    <div className="event-create__existing-tickets">
                      <h3 className="event-create__existing-title">Eklenen Bilet Tipleri</h3>
                      <div className="event-create__ticket-list">
                        {ticketTypes.map((ticket, index) => (
                          <div key={index} className="event-create__ticket-item">
                            <div className="event-create__ticket-info">
                              <span className="event-create__ticket-name">{ticket.type}</span>
                              <span className="event-create__ticket-separator">—</span>
                              <span className="event-create__ticket-price">{ticket.price} TL</span>
                              <span className="event-create__ticket-separator">—</span>
                              <span className="event-create__ticket-capacity">{ticket.capacity} kişi</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTicketTypeRemove(index)}
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
                        <label htmlFor="newTicketType" className="event-create__label">
                          Bilet Tipi
                        </label>
                        <input
                          type="text"
                          id="newTicketType"
                          {...formik.getFieldProps('newTicketType')}
                          className="event-create__input"
                          placeholder="Örn: VIP"
                        />
                      </div>
                      <div className="event-create__field">
                        <label htmlFor="newTicketPrice" className="event-create__label">
                          Fiyat (TL)
                        </label>
                        <input
                          type="number"
                          id="newTicketPrice"
                          {...formik.getFieldProps('newTicketPrice')}
                          className="event-create__input"
                          placeholder="100"
                        />
                      </div>
                      <div className="event-create__field">
                        <label htmlFor="newTicketCapacity" className="event-create__label">
                          Kapasite
                        </label>
                        <input
                          type="number"
                          id="newTicketCapacity"
                          {...formik.getFieldProps('newTicketCapacity')}
                          className="event-create__input"
                          placeholder="50"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTicketTypeAdd}
                      className="event-create__add-button"
                    >
                      <svg className="event-create__add-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Bilet Tipi Ekle
                    </button>
                  </div>

                  {ticketTypes.length === 0 && (
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
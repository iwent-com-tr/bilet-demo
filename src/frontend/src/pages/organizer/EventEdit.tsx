import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import './EventEdit.css';

// Utility function to safely extract error messages
const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    if (error.message) return String(error.message);
    if (error.name) return String(error.name);
    return 'Validation error occurred';
  }
  return 'Invalid input';
};

// Utility function to safely render dynamic content
const safeRender = (value: any, fallback: string = '-'): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') {
    if (value.name) return String(value.name);
    if (value.message) return String(value.message);
    return fallback;
  }
  return String(value);
};

interface TicketType {
  type: string;
  price: number;
  capacity: number;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  category: string;
  startDate: string;
  endDate: string;
  venue: string;
  address: string;
  city: string;
  banner?: string;
  socialMedia: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
  };
  description?: string;
  capacity?: number;
  ticketTypes: TicketType[];
  status: string;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
  details?: any;
  artists?: any[];
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

const MODULES = {
  temel: 'Temel Bilgiler',
  konum: 'Konum Bilgileri',
  detaylar: 'Detaylar',
  biletler: 'Bilet Türleri',
  durum: 'Durum'
} as const;

const categories = [
  { 
    id: 'CONCERT', 
    name: 'Konser', 
    icon: <MusicIcon className="event-edit__category-icon" />
  },
  { 
    id: 'FESTIVAL', 
    name: 'Festival', 
    icon: <FestivalIcon className="event-edit__category-icon" />
  },
  { 
    id: 'UNIVERSITY', 
    name: 'Üniversite', 
    icon: <UniversityIcon className="event-edit__category-icon" />
  },
  { 
    id: 'WORKSHOP', 
    name: 'Atölye', 
    icon: <WorkshopIcon className="event-edit__category-icon" />
  },
  { 
    id: 'CONFERENCE', 
    name: 'Konferans', 
    icon: <ConferenceIcon className="event-edit__category-icon" />
  },
  { 
    id: 'SPORT', 
    name: 'Spor', 
    icon: <SportsIcon className="event-edit__category-icon" />
  },
  { 
    id: 'PERFORMANCE', 
    name: 'Performans', 
    icon: <TheaterIcon className="event-edit__category-icon" />
  },
  { 
    id: 'EDUCATION', 
    name: 'Eğitim', 
    icon: <EducationIcon className="event-edit__category-icon" />
  }
];

const OrganizerEventEdit: React.FC = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL as string | undefined;

  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isOrganizer, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [categoryDetails, setCategoryDetails] = useState<CategoryDetails>(null);
  const [arrayInputs, setArrayInputs] = useState<{[key: string]: string}>({});
  const moduleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // VENUE SUGGESTIONS
    const [venueSuggestions, setVenueSuggestions] = useState<any[]>([]);
    const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const debounceRef = React.useRef<number | null>(null);
    const selectedVenueRef = React.useRef<any | null>(null); // optionally keep selected venue object
  
    const fetchVenueSuggestions = async (query: string) => {
      if (!API_BASE_URL || !query || query.trim().length === 0) {
        setVenueSuggestions([]);
        setIsVenueDropdownOpen(false);
        return;
      }
  
      try {
        const res = await axios.get(`${API_BASE_URL}/venues`, {
          params: { q: query, limit: 10 }
        });
        const list = res.data?.data || res.data || [];
        setVenueSuggestions(list);
        setIsVenueDropdownOpen(list.length > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        // non-blocking
        setVenueSuggestions([]);
        setIsVenueDropdownOpen(false);
      }
    };
  
    const handleVenueInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // update formik value (so validations still work)
      formik.setFieldValue('venue', value);
      // clear selectedVenueRef if user typed after selection
      selectedVenueRef.current = null;
  
      // debounce the search
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        fetchVenueSuggestions(value);
      }, 300);
    };
  
    const handleSelectVenue = (venue: any) => {
      // When user selects suggestion, write the *display* value to Formik
      // optionally store venue id somewhere (e.g. formik.setFieldValue('venueId', venue.id))
      formik.setFieldValue('venue', venue.name ?? venue.title ?? '');
      selectedVenueRef.current = venue;
      setVenueSuggestions([]);
      setIsVenueDropdownOpen(false);
      setHighlightedIndex(-1);
    };
  
    const handleVenueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isVenueDropdownOpen || venueSuggestions.length === 0) return;
  
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, venueSuggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < venueSuggestions.length) {
          handleSelectVenue(venueSuggestions[highlightedIndex]);
        } else if (venueSuggestions.length === 1) {
          handleSelectVenue(venueSuggestions[0]);
        }
      } else if (e.key === 'Escape') {
        setIsVenueDropdownOpen(false);
      }
    };
  
    // close dropdown after blur but allow click on suggestion -> short timeout
    const handleVenueBlur = () => {
      window.setTimeout(() => {
        setIsVenueDropdownOpen(false);
      }, 150);
    };
  
    // ARTIST SUGGESTIONS (shared for concert/festival/performance)
    const [artistSuggestions, setArtistSuggestions] = useState<any[]>([]);
    const [isArtistDropdownOpen, setIsArtistDropdownOpen] = useState(false);
    const [artistHighlightedIndex, setArtistHighlightedIndex] = useState(-1);
    const artistDebounceRef = React.useRef<number | null>(null);
    const artistActiveField = useState<string | null>(null)[0]; // placeholder, we'll use a setter below instead
    const [currentArtistField, setCurrentArtistField] = useState<string | null>(null);
    const selectedArtistRefs = React.useRef<{[key:string]: any}>({});
  
    const fetchArtistSuggestions = async (query: string) => {
      if (!API_BASE_URL || !query || query.trim().length === 0) {
        setArtistSuggestions([]);
        setIsArtistDropdownOpen(false);
        return;
      }
  
      try {
        const res = await axios.get(`${API_BASE_URL}/artists`, {
          params: { q: query, limit: 10 }
        });
        const list = res.data?.data || res.data || [];
        setArtistSuggestions(list);
        setIsArtistDropdownOpen(list.length > 0);
        setArtistHighlightedIndex(-1);
      } catch (err) {
        setArtistSuggestions([]);
        setIsArtistDropdownOpen(false);
      }
    };
  
    const handleArtistInputChange = (field: string, value: string) => {
      updateArrayInput(field, value);
      // clear selected artist if user typed after selection
      selectedArtistRefs.current[field] = null;
      setCurrentArtistField(field);
  
      if (artistDebounceRef.current) {
        window.clearTimeout(artistDebounceRef.current);
      }
      artistDebounceRef.current = window.setTimeout(() => {
        fetchArtistSuggestions(value);
      }, 300);
    };
  
    const handleSelectArtist = (field: string, artist: any) => {
      // add to the category array (artist.name assumed)
      addArrayItem(field, artist.name ?? artist.title ?? '');
      updateArrayInput(field, '');
      selectedArtistRefs.current[field] = artist;
      setArtistSuggestions([]);
      setIsArtistDropdownOpen(false);
      setArtistHighlightedIndex(-1);
      setCurrentArtistField(null);
    };
  
    const handleArtistKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: string) => {
      if (!isArtistDropdownOpen || artistSuggestions.length === 0 || currentArtistField !== field) return;
  
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setArtistHighlightedIndex(i => Math.min(i + 1, artistSuggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setArtistHighlightedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (artistHighlightedIndex >= 0 && artistHighlightedIndex < artistSuggestions.length) {
          handleSelectArtist(field, artistSuggestions[artistHighlightedIndex]);
        } else if (artistSuggestions.length === 1) {
          handleSelectArtist(field, artistSuggestions[0]);
        }
      } else if (e.key === 'Escape') {
        setIsArtistDropdownOpen(false);
      }
    };
  
    const handleArtistBlur = (field: string) => {
      // small timeout to allow click selection
      window.setTimeout(() => {
        setIsArtistDropdownOpen(false);
        setCurrentArtistField(null);
      }, 150);
    };
  

  // Scroll to module function
  const scrollToModule = (hash: string) => {
    if (hash && moduleRefs.current[hash]) {
      setTimeout(() => {
        moduleRefs.current[hash]?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!isOrganizer) {
      navigate('/');
      return;
    }

    const eventFromState = location.state?.event as Event | undefined;

    if (eventFromState) {
      setEvent(eventFromState);
      
      // Ensure ticketTypes is properly parsed if it's a string
      let ticketTypes = eventFromState.ticketTypes || [];
      if (typeof ticketTypes === 'string') {
        try {
          ticketTypes = JSON.parse(ticketTypes);
        } catch (e) {
          console.error('Error parsing ticketTypes:', e);
          ticketTypes = [];
        }
      }
      
      // Map backend field names to frontend field names
      if (Array.isArray(ticketTypes)) {
        ticketTypes = ticketTypes.map((ticket: any) => ({
          type: ticket.type || ticket.name || ticket.tip || '',
          price: Number(ticket.price || ticket.fiyat || 0),
          capacity: Number(ticket.capacity || ticket.quota || ticket.kapasite || 0)
        }));
      }
      
      formik.setValues({
        name: eventFromState.name || '',
        category: eventFromState.category || '',
        startDate: eventFromState.startDate ? eventFromState.startDate.slice(0, 16) : '',
        endDate: eventFromState.endDate ? eventFromState.endDate.slice(0, 16) : '',
        venue: eventFromState.venue || '',
        address: eventFromState.address || '',
        city: eventFromState.city || '',
        banner: eventFromState.banner || '',
        socialMedia: {
          instagram: (eventFromState.socialMedia && eventFromState.socialMedia.instagram) || '',
          twitter: (eventFromState.socialMedia && eventFromState.socialMedia.twitter) || '',
          facebook: (eventFromState.socialMedia && eventFromState.socialMedia.facebook) || ''
        },
        description: eventFromState.description || '',
        capacity: eventFromState.capacity || 0,
        ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : [],
        status: eventFromState.status || '',
        artists: eventFromState.artists || []
      });

      // Set banner preview if exists
      if (eventFromState.banner) {
        setBannerPreview(eventFromState.banner);
      }

      // Set category details if exists
      if (eventFromState.details) {
        setCategoryDetails(eventFromState.details);
      } else {
        // Initialize empty details for the category
        const defaultDetails = getDefaultDetailsForCategory(eventFromState.category);
        setCategoryDetails(defaultDetails);
      }
      setLoading(false);
    } else {
      fetchEvent();
    }
  }, [id, isAuthenticated, isOrganizer, navigate, authLoading, location.state]);

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
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/events/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const eventData = response.data.event;
      setEvent(eventData);
      
      // Map new API response to form values

      
      // Ensure ticketTypes is properly parsed if it's a string
      let ticketTypes = eventData.ticketTypes || [];
      if (typeof ticketTypes === 'string') {
        try {
          ticketTypes = JSON.parse(ticketTypes);
        } catch (e) {
          console.error('Error parsing ticketTypes:', e);
          ticketTypes = [];
        }
      }
      
      // Map backend field names to frontend field names
      if (Array.isArray(ticketTypes)) {
        ticketTypes = ticketTypes.map((ticket: any) => ({
          type: ticket.type || ticket.name || ticket.tip || '',
          price: Number(ticket.price || ticket.fiyat || 0),
          capacity: Number(ticket.capacity || ticket.quota || ticket.kapasite || 0)
        }));
      }
      
      formik.setValues({
        name: eventData.name || '',
        category: eventData.category || '',
        startDate: eventData.startDate ? eventData.startDate.slice(0, 16) : '',
        endDate: eventData.endDate ? eventData.endDate.slice(0, 16) : '',
        venue: eventData.venue || '',
        address: eventData.address || '',
        city: eventData.city || '',
        banner: eventData.banner || '',
        socialMedia: {
          instagram: (eventData.socialMedia && eventData.socialMedia.instagram) || '',
          twitter: (eventData.socialMedia && eventData.socialMedia.twitter) || '',
          facebook: (eventData.socialMedia && eventData.socialMedia.facebook) || ''
        },
        description: eventData.description || '',
        capacity: eventData.capacity || 0,
        ticketTypes: Array.isArray(ticketTypes) ? ticketTypes : [],
        status: eventData.status || '',
        artists: eventData.artists || [],
      });

      // Set banner preview if exists
      if (eventData.banner) {
        setBannerPreview(eventData.banner);
      }

      // Set category details if exists
      if (eventData.details) {
        setCategoryDetails(eventData.details);
      } else {
        // Initialize empty details for the category
        const defaultDetails = getDefaultDetailsForCategory(eventData.category);
        setCategoryDetails(defaultDetails);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Etkinlik yükleme hatası:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      } else if (error.response?.status === 403) {
        toast.error('Bu etkinliği düzenleme yetkiniz yok');
      } else if (error.response?.status === 404) {
        toast.error('Etkinlik bulunamadı');
      } else {
        toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      }
      navigate('/organizer/events');
    }
  };

  const handleModuleClick = (moduleId: string) => {
    navigate(`#${moduleId}`);
  };

  const handleCategorySelect = (categoryId: string) => {
    formik.setFieldValue('category', categoryId);
    const newDetails = getDefaultDetailsForCategory(categoryId);
    setCategoryDetails(newDetails);
    setArrayInputs({});
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

  const handleBannerFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Lütfen sadece resim dosyası seçin');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
        return;
      }

      setBannerFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadBannerFile = async (): Promise<string | null> => {
    if (!bannerFile) return null;

    try {
      setUploadingBanner(true);
      let token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return null;
      }

      // Use the dedicated banner upload endpoint
      const formData = new FormData();
      formData.append('banner', bannerFile);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/events/upload-banner`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      // Extract banner URL from response
      if (response.data && response.data.bannerUrl) {
        return response.data.bannerUrl;
      }
      
      return null;
    } catch (error: any) {
      console.error('Banner upload error:', error);
      
      if (error.response?.status === 401 || error.response?.data?.code === 'TOKEN_EXPIRED') {
        toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        localStorage.removeItem('token');
        navigate('/login');
        return null;
      } else if (error.response?.status === 403) {
        toast.error('Banner yükleme yetkiniz yok');
      } else if (error.response?.data?.code === 'FILE_REQUIRED') {
        toast.error('Lütfen bir dosya seçin');
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Yükleme zaman aşımına uğradı. Lütfen tekrar deneyin.');
      } else {
        toast.error('Banner yüklenirken bir hata oluştu');
      }
      
      return null;
    } finally {
      setUploadingBanner(false);
    }
  };

  const removeBannerFile = () => {
    setBannerFile(null);
    setBannerPreview('');
    formik.setFieldValue('banner', '');
  };

  const addTicketType = () => {
    const currentTicketTypes = formik.values.ticketTypes || [];
    const newTicketType: TicketType = {
      type: '',
      price: 0,
      capacity: 0
    };
    
    formik.setFieldValue('ticketTypes', [...currentTicketTypes, newTicketType]);
  };

  const removeTicketType = (index: number) => {
    const currentTicketTypes = formik.values.ticketTypes || [];
    const updatedTicketTypes = currentTicketTypes.filter((_, i) => i !== index);
    formik.setFieldValue('ticketTypes', updatedTicketTypes);
  };

  const updateTicketType = (index: number, field: keyof TicketType, value: any) => {
    const currentTicketTypes = [...(formik.values.ticketTypes || [])];
    if (currentTicketTypes[index]) {
      currentTicketTypes[index] = {
        ...currentTicketTypes[index],
        [field]: value
      };
      formik.setFieldValue('ticketTypes', currentTicketTypes);
    }
  };

  const getTotalTicketCapacity = () => {
    const ticketTypes = formik.values.ticketTypes || [];
    return ticketTypes.reduce((total, ticket) => total + (Number(ticket.capacity) || 0), 0);
  };

  const isCapacityExceeded = () => {
    const totalTicketCapacity = getTotalTicketCapacity();
    const eventCapacity = Number(formik.values.capacity) || 0;
    return totalTicketCapacity > eventCapacity;
  };

  const renderCategoryDetails = () => {
    if (!formik.values.category || !categoryDetails) {
      return (
        <div className="event-edit__category-placeholder">
          <p className="event-edit__placeholder-text">
            Kategori detayları yüklenebilmesi için önce bir kategori seçin.
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

  const renderArrayField = (title: string, field: string, placeholder: string, description?: string) => {
    const currentArray = (categoryDetails as any)?.[field] || [];
    const inputValue = arrayInputs[field] || '';

    const isArtistField = ['artistList', 'lineup', 'performers'].includes(field);

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

        <div className="event-create__array-add" style={{ position: 'relative' }}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              if (isArtistField) {
                handleArtistInputChange(field, e.target.value);
              } else {
                updateArrayInput(field, e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (isArtistField) {
                handleArtistKeyDown(e as any, field);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                addArrayItemWithInput(field);
              }
            }}
            onFocus={() => {
              if (isArtistField && artistSuggestions.length > 0) {
                setIsArtistDropdownOpen(true);
                setCurrentArtistField(field);
              }
            }}
            onBlur={() => {
              if (isArtistField) handleArtistBlur(field);
            }}
            placeholder={placeholder}
            className="event-create__array-input"
            onKeyPress={(e) => {
              if (!isArtistField && e.key === 'Enter') {
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

          {/* Artist suggestions dropdown (shared) */}
          {isArtistField && currentArtistField === field && isArtistDropdownOpen && artistSuggestions.length > 0 && (
            <ul
              role="listbox"
              className="event-create__venue-suggestions"
              style={{
                position: 'absolute',
                zIndex: 30,
                left: 0,
                right: 0,
                marginTop: 6,
                maxHeight: 220,
                overflowY: 'auto',
                background: '#111',
                borderRadius: 8,
                boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
                padding: 8,
              }}
            >
              {artistSuggestions.map((a, idx) => (
                <li
                  key={a.id ?? `${a.name}-${idx}`}
                  role="option"
                  aria-selected={artistHighlightedIndex === idx}
                  onMouseDown={(ev) => { ev.preventDefault(); handleSelectArtist(field, a); }}
                  onMouseEnter={() => setArtistHighlightedIndex(idx)}
                  className={`event-create__venue-suggestion ${artistHighlightedIndex === idx ? 'event-create__venue-suggestion--highlighted' : ''}`}
                  style={{
                    padding: '8px 10px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    background: artistHighlightedIndex === idx ? 'rgba(255,255,255,0.04)' : 'transparent',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontSize: 14 }}>{a.name ?? a.title ?? '—'}</span>
                  {a.genre && <small style={{ opacity: 0.7 }}>{a.genre}</small>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const renderConcertDetails = () => {
    const details = categoryDetails as ConcertDetails;
    return (
      <div className="event-edit__category-details">
        <h3 className="event-edit__details-title">🎵 Konser Detayları</h3>
        
        {renderArrayField('Sanatçı Listesi', 'artistList', 'Sanatçı adı girin', 'Bu konserde yer alacak sanatçıları ekleyin')}
        
        <div className="event-edit__field">
          <label className="event-edit__label">Sahne Düzeni</label>
          <textarea
            value={details.stageSetup || ''}
            onChange={(e) => updateCategoryDetails('stageSetup', e.target.value)}
            placeholder="Sahne düzeni hakkında bilgi verin..."
            className="event-edit__textarea"
            rows={3}
          />
        </div>

        <div className="event-edit__field">
          <label className="event-edit__label">Süre</label>
          <input
            type="text"
            value={details.duration || ''}
            onChange={(e) => updateCategoryDetails('duration', e.target.value)}
            placeholder="Örn: 2 saat 30 dakika"
            className="event-edit__input"
          />
        </div>
      </div>
    );
  };

  const renderFestivalDetails = () => {
    const details = categoryDetails as FestivalDetails;
    return (
      <div className="event-edit__category-details">
        <h3 className="event-edit__details-title">🎪 Festival Detayları</h3>
        
        {renderArrayField('Line-up', 'lineup', 'Sanatçı/grup adı girin', 'Festivalde sahne alacak sanatçıları ekleyin')}
        {renderArrayField('Sponsorlar', 'sponsors', 'Sponsor adı girin', 'Festival sponsorlarını ekleyin')}
        {renderArrayField('Aktiviteler', 'activities', 'Aktivite adı girin', 'Festival boyunca düzenlenecek aktiviteleri ekleyin')}
      </div>
    );
  };

  const renderUniversityDetails = () => {
    const details = categoryDetails as UniversityDetails;
    return (
      <div className="event-edit__category-details">
        <h3 className="event-edit__details-title">🎓 Üniversite Etkinliği Detayları</h3>
        
        <div className="event-edit__grid">
          <div className="event-edit__field">
            <label className="event-edit__label">Kampüs</label>
            <input
              type="text"
              value={details.campus || ''}
              onChange={(e) => updateCategoryDetails('campus', e.target.value)}
              placeholder="Kampüs adı"
              className="event-edit__input"
            />
          </div>

          <div className="event-edit__field">
            <label className="event-edit__label">Bölüm</label>
            <input
              type="text"
              value={details.department || ''}
              onChange={(e) => updateCategoryDetails('department', e.target.value)}
              placeholder="Bölüm adı"
              className="event-edit__input"
            />
          </div>
        </div>

        <div className="event-edit__field">
          <label className="event-edit__checkbox-label">
            <input
              type="checkbox"
              checked={details.studentDiscount}
              onChange={(e) => updateCategoryDetails('studentDiscount', e.target.checked)}
              className="event-edit__checkbox"
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
      <div className="event-edit__category-details">
        <h3 className="event-edit__details-title">🛠️ Workshop Detayları</h3>
        
        {renderArrayField('Eğitmenler', 'instructorList', 'Eğitmen adı girin', 'Workshop eğitmenlerini ekleyin')}
        {renderArrayField('Gerekli Malzemeler', 'materials', 'Malzeme adı girin', 'Katılımcıların getirmesi gereken malzemeleri ekleyin')}
        
        <div className="event-edit__field">
          <label className="event-edit__label">Seviye</label>
          <select
            value={details.skillLevel || 'Başlangıç'}
            onChange={(e) => updateCategoryDetails('skillLevel', e.target.value)}
            className="event-edit__select"
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
      <div className="event-edit__category-details">
        <h3 className="event-edit__details-title">🎤 Konferans Detayları</h3>
        
        {renderArrayField('Konuşmacılar', 'speakerList', 'Konuşmacı adı girin', 'Konferans konuşmacılarını ekleyin')}
        {renderArrayField('Ajanda', 'agenda', 'Ajanda maddesi girin', 'Konferans programını ekleyin')}
        {renderArrayField('Konular', 'topics', 'Konu başlığı girin', 'Ele alınacak konuları ekleyin')}
        
        <div className="event-edit__field">
          <label className="event-edit__checkbox-label">
            <input
              type="checkbox"
              checked={details.hasCertificate}
              onChange={(e) => updateCategoryDetails('hasCertificate', e.target.checked)}
              className="event-edit__checkbox"
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
      <div className="event-edit__category-details">
        <h3 className="event-edit__details-title">⚽ Spor Etkinliği Detayları</h3>
        
        {renderArrayField('Takımlar', 'teams', 'Takım adı girin', 'Katılacak takımları ekleyin')}
        
        <div className="event-edit__field">
          <label className="event-edit__label">Lig</label>
          <input
            type="text"
            value={details.league || ''}
            onChange={(e) => updateCategoryDetails('league', e.target.value)}
            placeholder="Lig adı"
            className="event-edit__input"
          />
        </div>

        <div className="event-edit__field">
          <label className="event-edit__checkbox-label">
            <input
              type="checkbox"
              checked={details.scoreTracking}
              onChange={(e) => updateCategoryDetails('scoreTracking', e.target.checked)}
              className="event-edit__checkbox"
            />
            Skor Takibi Yapılacak
          </label>
        </div>

        <div className="event-edit__field">
          <label className="event-edit__label">Kurallar</label>
          <textarea
            value={details.rules || ''}
            onChange={(e) => updateCategoryDetails('rules', e.target.value)}
            placeholder="Özel kurallar veya açıklamalar..."
            className="event-edit__textarea"
            rows={4}
          />
        </div>
      </div>
    );
  };

  const renderPerformanceDetails = () => {
    const details = categoryDetails as PerformanceDetails;
    return (
      <div className="event-edit__category-details">
        <h3 className="event-edit__details-title">🎭 Performans Detayları</h3>
        
        {renderArrayField('Sanatçılar', 'performers', 'Sanatçı adı girin', 'Performansta yer alacak sanatçıları ekleyin')}
        
        <div className="event-edit__grid">
          <div className="event-edit__field">
            <label className="event-edit__label">Süre</label>
            <input
              type="text"
              value={details.duration || ''}
              onChange={(e) => updateCategoryDetails('duration', e.target.value)}
              placeholder="Örn: 90 dakika"
              className="event-edit__input"
            />
          </div>

          <div className="event-edit__field">
            <label className="event-edit__label">Tür</label>
            <input
              type="text"
              value={details.genre || ''}
              onChange={(e) => updateCategoryDetails('genre', e.target.value)}
              placeholder="Örn: Drama, Komedi, Müzikal"
              className="event-edit__input"
            />
          </div>
        </div>

        <div className="event-edit__field">
          <label className="event-edit__label">Senaryo Özeti</label>
          <textarea
            value={details.scriptSummary || ''}
            onChange={(e) => updateCategoryDetails('scriptSummary', e.target.value)}
            placeholder="Performansın kısa özeti..."
            className="event-edit__textarea"
            rows={4}
          />
        </div>
      </div>
    );
  };

  const renderEducationDetails = () => {
    const details = categoryDetails as EducationDetails;
    return (
      <div className="event-edit__category-details">
        <h3 className="event-edit__details-title">📚 Eğitim Etkinliği Detayları</h3>
        
        {renderArrayField('Müfredat', 'curriculum', 'Müfredat maddesi girin', 'Eğitim müfredatını ekleyin')}
        {renderArrayField('Eğitmenler', 'instructors', 'Eğitmen adı girin', 'Eğitmenleri ekleyin')}
        {renderArrayField('Ön Koşullar', 'prerequisites', 'Ön koşul girin', 'Katılım için gereken ön koşulları ekleyin')}
        
        <div className="event-edit__field">
          <label className="event-edit__checkbox-label">
            <input
              type="checkbox"
              checked={details.certification}
              onChange={(e) => updateCategoryDetails('certification', e.target.checked)}
              className="event-edit__checkbox"
            />
            Sertifika Verilecek
          </label>
        </div>
      </div>
    );
  };

  const formik = useFormik<{
    name: string;
    category: string;
    startDate: string;
    endDate: string;
    venue: string;
    address: string;
    city: string;
    banner: string;
    socialMedia: {
      instagram: string;
      twitter: string;
      facebook: string;
    };
    description: string;
    capacity: number;
    ticketTypes: TicketType[];
    status: string;
    artists: string[];
  }>({
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
      capacity: 0,
      ticketTypes: [],
      status: '',
      artists: [],
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
      banner: Yup.string().url('Geçerli bir URL giriniz').optional(),
      socialMedia: Yup.object({
        instagram: Yup.string().url('Geçerli bir URL giriniz'),
        twitter: Yup.string().url('Geçerli bir URL giriniz'),
        facebook: Yup.string().url('Geçerli bir URL giriniz')
      }),
      capacity: Yup.number()
        .min(1, 'Kapasite en az 1 olmalıdır')
        .required('Kapasite zorunludur'),
      ticketTypes: Yup.array().of(
        Yup.object().shape({
          type: Yup.string().required('Bilet türü adı zorunludur'),
          price: Yup.number()
            .min(0, 'Fiyat 0 veya daha büyük olmalıdır')
            .required('Fiyat zorunludur'),
          capacity: Yup.number()
            .min(1, 'Bilet kapasitesi en az 1 olmalıdır')
            .required('Bilet kapasitesi zorunludur')
        })
      ),
      status: Yup.string().required('Durum zorunludur')
    })
    .test('capacity-check', '', function(values) {
      if (!values) return true;
      
      const totalTicketCapacity = (values.ticketTypes || []).reduce((total: number, ticket: any) => {
        return total + (Number(ticket.capacity) || 0);
      }, 0);
      
      const eventCapacity = Number(values.capacity) || 0;
      
      if (totalTicketCapacity > eventCapacity) {
        return this.createError({
          message: `Bilet kapasiteleri toplamı (${totalTicketCapacity}) etkinlik kapasitesini (${eventCapacity}) aşıyor`
        });
      }
      
      return true;
    }),
    onSubmit: async values => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Upload banner file if a new file is selected
        let finalValues = { ...values };
        if (bannerFile) {
          const uploadedBannerUrl = await uploadBannerFile();
          if (uploadedBannerUrl) {
            finalValues.banner = uploadedBannerUrl;
          } else {
            toast.error('Banner yüklenemedi, etkinlik güncellenmedi');
            setLoading(false);
            return;
          }
        }

        // Add category details to the final values
        const dataToSend = {
          ...finalValues,
          details: categoryDetails,
          ...(((values as any).category === "CONCERT" || (values as any).category === "PERFORMANCE" || (values as any).category === "FESTIVAL") && {
            artists: (categoryDetails as any)?.artistList?.map((artist: any) => artist.name) || []
          })
        };

        await axios.patch(`${process.env.REACT_APP_API_URL}/events/${id}`, dataToSend, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        toast.success('Etkinlik güncellendi');
        navigate('/organizer/events');
      } catch (error: any) {
        console.error('Etkinlik güncelleme hatası:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        } else if (error.response?.status === 403) {
          toast.error('Bu etkinliği güncelleme yetkiniz yok');
        } else if (error.response?.status === 404) {
          toast.error('Etkinlik bulunamadı');
        } else {
          toast.error('Etkinlik güncellenirken bir hata oluştu');
        }
        setLoading(false);
      }
    }
  });

  if (authLoading || loading) {
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
                <label htmlFor="name" className="event-edit__label">
                  Etkinlik Adı
                </label>
                <input
                  type="text"
                  id="name"
                  {...formik.getFieldProps('name')}
                  className={`event-edit__input ${
                    formik.touched.name && formik.errors.name ? 'event-edit__input--error' : ''
                  }`}
                  placeholder="Etkinlik adını giriniz"
                />
                {formik.touched.name && formik.errors.name && (
                  <span className="event-edit__error">{getErrorMessage(formik.errors.name)}</span>
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
                        formik.values.category === category.id ? 'event-edit__category-card--selected' : ''
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
                {formik.touched.category && formik.errors.category && (
                  <span className="event-edit__error">{getErrorMessage(formik.errors.category)}</span>
                )}
              </div>
            </div>

            <div className="event-edit__grid">
              <div className="event-edit__field">
                <label htmlFor="startDate" className="event-edit__label">
                  Başlangıç Tarihi
                </label>
                <input
                  type="datetime-local"
                  id="startDate"
                  {...formik.getFieldProps('startDate')}
                  className={`event-edit__input ${
                    formik.touched.startDate && formik.errors.startDate ? 'event-edit__input--error' : ''
                  }`}
                />
                {formik.touched.startDate && formik.errors.startDate && (
                  <span className="event-edit__error">{getErrorMessage(formik.errors.startDate)}</span>
                )}
              </div>

              <div className="event-edit__field">
                <label htmlFor="endDate" className="event-edit__label">
                  Bitiş Tarihi
                </label>
                <input
                  type="datetime-local"
                  id="endDate"
                  {...formik.getFieldProps('endDate')}
                  className={`event-edit__input ${
                    formik.touched.endDate && formik.errors.endDate ? 'event-edit__input--error' : ''
                  }`}
                />
                {formik.touched.endDate && formik.errors.endDate && (
                  <span className="event-edit__error">{getErrorMessage(formik.errors.endDate)}</span>
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
              <div className="event-create__field" style={{ position: 'relative' }}>
                <label htmlFor="venue" className="event-create__label">
                  Etkinlik Yeri
                </label>
                <input
                  type="text"
                  id="venue"
                  value={formik.values.venue}
                  onChange={handleVenueInputChange}
                  onKeyDown={handleVenueKeyDown}
                  onFocus={() => {
                    if (venueSuggestions.length > 0) setIsVenueDropdownOpen(true);
                  }}
                  onBlur={handleVenueBlur}
                  className={`event-create__input ${
                    formik.touched.venue && formik.errors.venue ? 'event-create__input--error' : ''
                  }`}
                  placeholder="Örn: Zorlu PSM"
                  aria-autocomplete="list"
                  aria-expanded={isVenueDropdownOpen}
                  aria-haspopup="listbox"
                  autoComplete="off"
                />
                {formik.touched.venue && formik.errors.venue && (
                  <span className="event-create__error">{formik.errors.venue}</span>
                )}

                {isVenueDropdownOpen && venueSuggestions.length > 0 && (
                  <ul
                    role="listbox"
                    className="event-create__venue-suggestions"
                    style={{
                      position: 'absolute',
                      zIndex: 30,
                      left: 0,
                      right: 0,
                      marginTop: 32,
                      maxHeight: 220,
                      overflowY: 'auto',
                      background: '#111', // tweak to match your UI
                      borderRadius: 8,
                      boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
                      padding: 8,
                    }}
                  >
                    {venueSuggestions.map((v, idx) => (
                      <li
                        key={v.id ?? `${v.name}-${idx}`}
                        role="option"
                        aria-selected={highlightedIndex === idx}
                        onMouseDown={(ev) => {
                          // mouseDown because blur happens before click; prevents losing the selection
                          ev.preventDefault();
                          handleSelectVenue(v);
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`event-create__venue-suggestion ${
                          highlightedIndex === idx ? 'event-create__venue-suggestion--highlighted' : ''
                        }`}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          borderRadius: 6,
                          background: highlightedIndex === idx ? 'rgba(255,255,255,0.04)' : 'transparent',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{v.name ?? v.title ?? '—'}</span>
                        {v.city && <small style={{ opacity: 0.7 }}>{v.city}</small>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              

              <div className="event-edit__field">
                <label htmlFor="city" className="event-edit__label">
                  Şehir
                </label>
                <select
                  id="city"
                  {...formik.getFieldProps('city')}
                  className={`event-edit__select ${
                    formik.touched.city && formik.errors.city ? 'event-edit__select--error' : ''
                  }`}
                >
                  <option value="">Seçin</option>
                  <option value="İstanbul">İstanbul</option>
                  <option value="Ankara">Ankara</option>
                  <option value="İzmir">İzmir</option>
                </select>
                {formik.touched.city && formik.errors.city && (
                  <span className="event-edit__error">{getErrorMessage(formik.errors.city)}</span>
                )}
              </div>
            </div>

            <div className="event-edit__grid event-edit__grid--full">
              <div className="event-edit__field">
                <label htmlFor="address" className="event-edit__label">
                  Açık Adres
                </label>
                <textarea
                  id="address"
                  rows={3}
                  {...formik.getFieldProps('address')}
                  value={safeRender(formik.values.address, '')}
                  className={`event-edit__textarea ${
                    formik.touched.address && formik.errors.address ? 'event-edit__textarea--error' : ''
                  }`}
                  placeholder="Detaylı adres bilgisini giriniz"
                />
                {formik.touched.address && formik.errors.address && (
                  <span className="event-edit__error">{getErrorMessage(formik.errors.address)}</span>
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
                <label className="event-edit__label">
                  Etkinlik Banner'ı
                </label>
                
                {/* File Upload Area */}
                <div className="event-edit__banner-upload">
                  <input
                    type="file"
                    id="bannerFile"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    className="event-edit__file-input"
                    style={{ display: 'none' }}
                  />
                  
                  {!bannerPreview ? (
                    <label
                      htmlFor="bannerFile"
                      className="event-edit__upload-area"
                    >
                      <div className="event-edit__upload-content">
                        <svg className="event-edit__upload-icon" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        <p className="event-edit__upload-text">
                          Banner resmi yüklemek için tıklayın
                        </p>
                        <p className="event-edit__upload-hint">
                          PNG, JPG veya GIF (Max. 5MB)
                        </p>
                      </div>
                    </label>
                  ) : (
                    <div className="event-edit__banner-preview">
                      <img
                        src={bannerPreview}
                        alt="Banner Preview"
                        className="event-edit__preview-image"
                      />
                      <div className="event-edit__preview-overlay">
                        <button
                          type="button"
                          onClick={removeBannerFile}
                          className="event-edit__remove-button"
                        >
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <label
                          htmlFor="bannerFile"
                          className="event-edit__change-button"
                        >
                          <svg fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {uploadingBanner && (
                    <div className="event-edit__upload-loading">
                      <div className="event-edit__spinner"></div>
                      <p>Banner yükleniyor...</p>
                    </div>
                  )}
                </div>

                {/* Alternative URL Input */}
                <div className="event-edit__banner-url-section">
                  <label htmlFor="banner" className="event-edit__url-label">
                    Veya Banner URL'si:
                  </label>
                  <input
                    type="url"
                    id="banner"
                    {...formik.getFieldProps('banner')}
                    className={`event-edit__input ${
                      formik.touched.banner && formik.errors.banner ? 'event-edit__input--error' : ''
                    }`}
                    placeholder="https://example.com/banner.jpg"
                    onChange={(e) => {
                      formik.handleChange(e);
                      if (e.target.value) {
                        setBannerPreview(e.target.value);
                        setBannerFile(null);
                      }
                    }}
                  />
                  {formik.touched.banner && formik.errors.banner && (
                    <span className="event-edit__error">{getErrorMessage(formik.errors.banner)}</span>
                  )}
                </div>
              </div>

              <div className="event-edit__field">
                <label htmlFor="description" className="event-edit__label">
                  Açıklama
                </label>
                <textarea
                  id="description"
                  rows={5}
                  {...formik.getFieldProps('description')}
                  value={safeRender(formik.values.description, '')}
                  className="event-edit__textarea"
                  placeholder="Etkinlik hakkında detaylı bilgi verin..."
                />
              </div>

              <div className="event-edit__field">
                <label htmlFor="capacity" className="event-edit__label">
                  Toplam Kapasite
                </label>
                <input
                  type="number"
                  id="capacity"
                  {...formik.getFieldProps('capacity')}
                  className={`event-edit__input ${
                    formik.touched.capacity && formik.errors.capacity ? 'event-edit__input--error' : ''
                  }`}
                  placeholder="1000"
                />
                {formik.touched.capacity && formik.errors.capacity && (
                  <span className="event-edit__error">{getErrorMessage(formik.errors.capacity)}</span>
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
                    {...formik.getFieldProps('socialMedia.instagram')}
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
                    {...formik.getFieldProps('socialMedia.twitter')}
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
                    {...formik.getFieldProps('socialMedia.facebook')}
                    className="event-edit__input"
                    placeholder="https://facebook.com/..."
                  />
                </div>
              </div>
            </div>

            {/* Category Details Section */}
            <div className="event-edit__category-section">
              <h3 className="event-edit__section-subtitle">Kategori Detayları</h3>
              {renderCategoryDetails()}
            </div>
          </div>

          {/* Bilet Türleri */}
          <div
            ref={el => (moduleRefs.current['biletler'] = el)}
            id="biletler"
            className="event-edit__section"
          >
            <h2 className="event-edit__section-title">
              Bilet Türleri 
              {/* {!loading && formik.values.ticketTypes && formik.values.ticketTypes.length > 0 && (
                <span className="event-edit__section-count">({formik.values.ticketTypes.length})</span>
              )} */}
            </h2>
            
            <div className="event-edit__ticket-types">
              {/* Capacity Summary */}
              <div className="event-edit__capacity-summary">
                <div className="event-edit__capacity-info">
                  <span className="event-edit__capacity-label">Toplam Etkinlik Kapasitesi:</span>
                  <span className="event-edit__capacity-value">{String(formik.values.capacity || 0)}</span>
                </div>
                <div className="event-edit__capacity-info">
                  <span className="event-edit__capacity-label">Bilet Kapasiteleri Toplamı:</span>
                  <span className={`event-edit__capacity-value ${isCapacityExceeded() ? 'event-edit__capacity-exceeded' : ''}`}>
                    {getTotalTicketCapacity()}
                  </span>
                </div>
                {isCapacityExceeded() && (
                  <div className="event-edit__capacity-warning">
                    ⚠️ Bilet kapasiteleri toplamı etkinlik kapasitesini aşıyor!
                  </div>
                )}
              </div>

              {/* Loading State for Ticket Types */}
              {loading && (
                <div className="event-edit__ticket-loading">
                  <div className="event-edit__spinner"></div>
                  <p>Bilet türleri yükleniyor...</p>
                </div>
              )}

              {/* Ticket Types List */}
              {!loading && (
                <div className="event-edit__ticket-list">
                  {(formik.values.ticketTypes || []).map((ticket, index) => (
                  <div key={index} className="event-edit__ticket-item">
                    <div className="event-edit__ticket-header">
                      <h4 className="event-edit__ticket-title">
                        Bilet Türü {index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeTicketType(index)}
                        className="event-edit__ticket-remove"
                        title="Bilet türünü sil"
                      >
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="event-edit__ticket-fields">
                      <div className="event-edit__field">
                        <label className="event-edit__label">
                          Bilet Türü Adı
                        </label>
                        <input
                          type="text"
                          value={safeRender(ticket.type, '')}
                          onChange={(e) => updateTicketType(index, 'type', e.target.value)}
                          className="event-edit__input"
                          placeholder="Örn: Erken Kuş, VIP, Normal"
                        />
                      </div>
                      
                      <div className="event-edit__field">
                        <label className="event-edit__label">
                          Fiyat (₺)
                        </label>
                        <input
                          type="number"
                          value={String(ticket.price || '')}
                          onChange={(e) => updateTicketType(index, 'price', Number(e.target.value))}
                          className="event-edit__input"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div className="event-edit__field">
                        <label className="event-edit__label">
                          Kapasite
                        </label>
                        <input
                          type="number"
                          value={String(ticket.capacity || '')}
                          onChange={(e) => updateTicketType(index, 'capacity', Number(e.target.value))}
                          className="event-edit__input"
                          placeholder="0"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add New Ticket Type Button */}
                <button
                  type="button"
                  onClick={addTicketType}
                  className="event-edit__add-ticket-button"
                >
                  <svg className="event-edit__add-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Yeni Bilet Türü Ekle
                </button>
                </div>
              )}

              {/* Empty State */}
              {(!formik.values.ticketTypes || formik.values.ticketTypes.length === 0) && !loading && (
                <div className="event-edit__ticket-empty">
                  <div className="event-edit__empty-icon">🎫</div>
                  <h3 className="event-edit__empty-title">Henüz bilet türü yok</h3>
                  <p className="event-edit__empty-description">
                    Etkinliğiniz için farklı fiyat ve kapasitelerde bilet türleri oluşturun.
                  </p>
                </div>
              )}

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
              <label htmlFor="status" className="event-edit__label">
                Etkinlik Durumu
              </label>
              <select
                id="status"
                {...formik.getFieldProps('status')}
                className={`event-edit__select ${
                  formik.touched.status && formik.errors.status ? 'event-edit__select--error' : ''
                }`}
              >
                <option value="DRAFT">Taslak</option>
                <option value="ACTIVE">Yayında</option>
                <option value="CANCELLED">İptal</option>
                <option value="COMPLETED">Tamamlandı</option>
              </select>
              {formik.touched.status && formik.errors.status && (
                <span className="event-edit__error">{getErrorMessage(formik.errors.status)}</span>
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
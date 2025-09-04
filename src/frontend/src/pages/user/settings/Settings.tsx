import React, { useState, useEffect } from 'react';
import './Settings.css';
import PageHeader from 'components/layouts/PageHeader';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export interface SettingsProps {
  onLogout?: () => void;
}
import {
  Tickets,
  FavoriteEvents,
  Evaluations,
  Blocked,
  Privacy,
  Notification,
  Message,
  SocialMedia,
  Language,
  AppInfo,
  Faq,
  Support,
  Exit
} from './SettingsIcon';

// Language options constant
export const LANGUAGE_OPTIONS: ('TR' | 'EN')[] = ['TR', 'EN'];

interface SettingItem {
  key: string;
  inputType: 'SELECT' | 'TOGGLE' | 'BUTTON' | 'MULTISELECT';
  titleTR: string;
  titleEN: string;
  descriptionTR: string;
  descriptionEN: string;
  defaultValue: string | boolean;
  options?: string[];
  value?: unknown; // Kullanıcı değeri
}

interface SettingSection {
  key: string;
  titleTR: string;
  titleEN: string;
  items: SettingItem[];
}

const Settings: React.FC<SettingsProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [settings, setSettings] = useState<SettingSection[]>([]);

  // Helper function to get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };
  const [userSettings, setUserSettings] = useState<any[]>([]);
  const [notificationPrefs, setNotificationPrefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('TR');
  const [selectedSection, setSelectedSection] = useState<SettingSection | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      // Check authentication before fetching
      if (!isAuthenticated) {
        setError('Oturum açmanız gerekiyor.');
        navigate('/login');
        return;
      }

      const headers = getAuthHeaders();
      if (!headers) {
        setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        navigate('/login');
        return;
      }

      setLoading(true);
      try {
        // Hem definitions, kullanıcı ayarlarını hem de notification preferences'leri çek
        const [definitionsResponse, userSettingsResponse, notificationResponse] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/settings/definitions`, { headers }),
          axios.get(`${process.env.REACT_APP_API_URL}/settings/me`, { headers }),
          axios.get(`${process.env.REACT_APP_API_URL}/settings/me/notifications`, { headers })
        ]);

        let definitionsData = definitionsResponse.data;
        let userSettingsData = userSettingsResponse.data;
        let notificationData = notificationResponse.data;

        if (typeof definitionsData === 'string') {
          try {
            definitionsData = JSON.parse(definitionsData);
          } catch (e) {
            setError('Ayar tanımları JSON formatında değil.');
            setLoading(false);
            return;
          }
        }

        if (typeof userSettingsData === 'string') {
          try {
            userSettingsData = JSON.parse(userSettingsData);
          } catch (e) {
            setError('Kullanıcı ayarları JSON formatında değil.');
            setLoading(false);
            return;
          }
        }

        if (typeof notificationData === 'string') {
          try {
            notificationData = JSON.parse(notificationData);
          } catch (e) {
            setError('Bildirim tercihleri JSON formatında değil.');
            setLoading(false);
            return;
          }
        }

        let sectionsArray = [];
        if (Array.isArray(definitionsData)) {
          sectionsArray = definitionsData;
        } else if (definitionsData && typeof definitionsData === 'object') {
          if (Array.isArray(definitionsData.sections)) {
            sectionsArray = definitionsData.sections;
          } else if (Array.isArray(definitionsData.data)) {
            sectionsArray = definitionsData.data;
          } else if (Array.isArray(definitionsData.definitions)) {
            sectionsArray = definitionsData.definitions;
          } else if (Array.isArray(definitionsData.items)) {
            sectionsArray = [definitionsData];
          }
        }

        let userSettingsArray = [];
        if (Array.isArray(userSettingsData)) {
          userSettingsArray = userSettingsData;
        } else if (userSettingsData && typeof userSettingsData === 'object') {
          if (Array.isArray(userSettingsData.data)) {
            userSettingsArray = userSettingsData.data;
          }
        }

        let notificationArray = [];
        if (Array.isArray(notificationData)) {
          notificationArray = notificationData;
        } else if (notificationData && typeof notificationData === 'object') {
          if (Array.isArray(notificationData.data)) {
            notificationArray = notificationData.data;
          }
        }

        // Kullanıcı ayarlarını sections ile birleştir
        const mergedSections = mergeUserSettingsWithDefinitions(sectionsArray, userSettingsArray);

        setSettings(mergedSections);
        setUserSettings(userSettingsArray);
        setNotificationPrefs(notificationArray);

      } catch (err) {
        setError('Ayarlar yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Kullanıcı ayarlarını definitions ile birleştiren fonksiyon
  const mergeUserSettingsWithDefinitions = (sections: any[], userSettings: any[]) => {
    return sections.map(section => ({
      ...section,
      items: section.items.map((item: any) => {
        const userSetting = userSettings.find(us => us.itemId === item.id || us.itemKey === item.key);
        return {
          ...item,
          value: userSetting ? userSetting.value : item.defaultValue
        };
      })
    }));
  };

  const renderInput = (item: SettingItem) => {
    switch (item.inputType) {
      case 'SELECT':
        return (
          <div className="settings-item__control">
            {item.options?.map((option) => (
              <button
                key={option}
                className={`settings-item__button ${item.value === option ? 'active' : ''}`}
                onClick={() => handleSettingChange(item.key, option)}
              >
                {option}
              </button>
            ))}
          </div>
        );
      case 'TOGGLE':
        return (
          <div className="settings-item__toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={Boolean(item.value)}
                onChange={(e) => handleSettingChange(item.key, e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        );
      case 'BUTTON':
        return (
          <button
            className="settings-item__button"
            onClick={() => handleButtonClick(item.key)}
          >
            &gt;
          </button>
        );
      case 'MULTISELECT':
        return (
          <div className="settings-item__control">
            {item.options?.map((option) => (
              <button
                key={option}
                className={`settings-item__button ${Array.isArray(item.value) && item.value.includes(option) ? 'active' : ''}`}
                onClick={() => handleMultiSelectChange(item.key, option)}
              >
                {option}
              </button>
            ))}
          </div>
        );
      default:
        return <div className="settings-item__arrow">&gt;</div>;
    }
  };

  const handleSectionClick = (section: SettingSection) => {
    setSelectedSection(section);
  };

  const handleBackClick = () => {
    setSelectedSection(null);
  };

  // Ayar değişikliğini handle eden fonksiyon
  const handleSettingChange = async (itemKey: string, value: any) => {
    // Check authentication before making the request
    if (!isAuthenticated) {
      setError('Oturum açmanız gerekiyor.');
      navigate('/login');
      return;
    }

    const headers = getAuthHeaders();
    if (!headers) {
      setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      navigate('/login');
      return;
    }

    setSaving(true);
    try {
      // Önce local state'i güncelle
      setSettings(prevSettings =>
        prevSettings.map(section => ({
          ...section,
          items: section.items.map(item =>
            item.key === itemKey ? { ...item, value } : item
          )
        }))
      );

      // Backend'e kaydet
      await axios.patch(`${process.env.REACT_APP_API_URL}/settings/me`, {
        updates: [{
          itemKey,
          value
        }]
      }, { headers });

    } catch (err) {
      setError('Ayar kaydedilemedi.');
      // Hata durumunda eski ayarları geri yükle
      await fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  // Multiselect değişikliğini handle eden fonksiyon
  const handleMultiSelectChange = async (itemKey: string, option: string) => {
    const currentItem = settings.flatMap(s => s.items).find(item => item.key === itemKey);
    if (!currentItem) return;

    const currentValue = Array.isArray(currentItem.value) ? currentItem.value : [];
    const isSelected = currentValue.includes(option);

    let newValue;
    if (isSelected) {
      newValue = currentValue.filter((val: string) => val !== option);
    } else {
      newValue = [...currentValue, option];
    }

    await handleSettingChange(itemKey, newValue);
  };

  // Notification toggle render fonksiyonu
  const renderNotificationToggle = (itemKey: string) => {
    // Notification key'inden category çıkar (örn: "event_time_change" -> "event_time_change")
    const category = itemKey;

    // İlgili notification preference'i bul
    const notificationPref = notificationPrefs.find(pref => pref.category === category);

    if (!notificationPref) {
      return (
        <div className="settings-item__toggle">
          <label className="toggle-switch">
            <input type="checkbox" disabled />
            <span className="toggle-slider"></span>
          </label>
        </div>
      );
    }

    return (
      <div className="settings-item__toggle">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={notificationPref.enabled}
            onChange={(e) => handleNotificationChange(category, { enabled: e.target.checked })}
            disabled={saving}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
    );
  };

  // Dil değişikliğini handle eden fonksiyon
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    // Dil ayarını da backend'e kaydet
    handleSettingChange('language', newLanguage);
  };

  // Notification değişikliğini handle eden fonksiyon
  const handleNotificationChange = async (category: string, updates: any) => {
    // Check authentication before making the request
    if (!isAuthenticated) {
      setError('Oturum açmanız gerekiyor.');
      navigate('/login');
      return;
    }

    // Get token from localStorage as backup
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      navigate('/login');
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/settings/me/notifications/${category}`, updates, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Local state'i güncelle
      setNotificationPrefs(prev =>
        prev.map(pref =>
          pref.category === category ? { ...pref, ...updates } : pref
        )
      );

    } catch (err) {
      setError('Bildirim ayarı kaydedilemedi.');
      // Hata durumunda notification preferences'leri yeniden yükle
      await fetchNotificationPrefs();
    } finally {
      setSaving(false);
    }
  };

  // Notification preferences'leri yeniden yükleme fonksiyonu
  const fetchNotificationPrefs = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/settings/me/notifications`, { headers });
      let data = response.data;

      if (typeof data === 'string') {
        data = JSON.parse(data);
      }

      let notificationArray = [];
      if (Array.isArray(data)) {
        notificationArray = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) {
          notificationArray = data.data;
        }
      }

      setNotificationPrefs(notificationArray);

    } catch (err) {
      setError('Bildirim tercihleri yeniden yüklenemedi.');
    }
  };

  // Ayarları yeniden yükleme fonksiyonu
  const fetchSettings = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      const [definitionsResponse, userSettingsResponse, notificationResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/settings/definitions`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/settings/me`, { headers }),
        axios.get(`${process.env.REACT_APP_API_URL}/settings/me/notifications`, { headers })
      ]);

      let definitionsData = definitionsResponse.data;
      let userSettingsData = userSettingsResponse.data;
      let notificationData = notificationResponse.data;

      if (typeof definitionsData === 'string') {
        definitionsData = JSON.parse(definitionsData);
      }

      if (typeof userSettingsData === 'string') {
        userSettingsData = JSON.parse(userSettingsData);
      }

      if (typeof notificationData === 'string') {
        notificationData = JSON.parse(notificationData);
      }

      let sectionsArray = [];
      if (Array.isArray(definitionsData)) {
        sectionsArray = definitionsData;
      } else if (definitionsData && typeof definitionsData === 'object') {
        if (Array.isArray(definitionsData.sections)) {
          sectionsArray = definitionsData.sections;
        } else if (Array.isArray(definitionsData.data)) {
          sectionsArray = definitionsData.data;
        } else if (Array.isArray(definitionsData.definitions)) {
          sectionsArray = definitionsData.definitions;
        } else if (Array.isArray(definitionsData.items)) {
          sectionsArray = [definitionsData];
        }
      }

      let userSettingsArray = [];
      if (Array.isArray(userSettingsData)) {
        userSettingsArray = userSettingsData;
      } else if (userSettingsData && typeof userSettingsData === 'object') {
        if (Array.isArray(userSettingsData.data)) {
          userSettingsArray = userSettingsData.data;
        }
      }

      let notificationArray = [];
      if (Array.isArray(notificationData)) {
        notificationArray = notificationData;
      } else if (notificationData && typeof notificationData === 'object') {
        if (Array.isArray(notificationData.data)) {
          notificationArray = notificationData.data;
        }
      }

      const mergedSections = mergeUserSettingsWithDefinitions(sectionsArray, userSettingsArray);

      setSettings(mergedSections);
      setUserSettings(userSettingsArray);
      setNotificationPrefs(notificationArray);

    } catch (err) {
      setError('Ayarlar yeniden yüklenemedi.');
    }
  };

  const handleButtonClick = (key: string) => {
    switch (key) {
      case 'my_tickets':
        navigate('/user/tickets');
        break;
      case 'favorite_events':
        navigate('/user/favorites');
        break;
      case 'my_reviews':
        navigate('/user/reviews');
        break;
      case 'blocked_profiles':
        navigate('/user/blocked');
        break;
      case 'faq':
        navigate('/help/faq');
        break;
      case 'about_app':
        navigate('/help/about');
        break;
      case 'support':
        navigate('/help/support');
        break;
      case 'logout':
        // Perform logout using AuthContext
        logout();

        // Call parent onLogout callback if provided
        if (onLogout) {
          onLogout();
        }

        // Navigate to login page
        navigate('/login');
        break;
      default:
        break;
    }
  };

  return (
    <div className="settings-page">
      <PageHeader 
        title={selectedSection ? (language === 'TR' ? selectedSection.titleTR : selectedSection.titleEN) : 'Menü'}
        onBackClick={selectedSection ? handleBackClick : undefined}
      />
      <div className="settings-container">
        {loading && (
          <div className="settings-loading">
            Yükleniyor...
          </div>
        )}

        {error && (
          <div className="settings-error">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {saving && (
              <div className="settings-saving">
                Kaydediliyor...
              </div>
            )}
        {selectedSection ? (
              <div className={`settings-section ${selectedSection.key}-section`}>
                {selectedSection.key === 'notifications' ? (
                  // Bildirim section'ı için özel düzenleme
                  <>
                    {/* Etkinlik Bildirimleri */}
                    <div className="settings-subsection">
                      <div className="settings-subsection-title">
                        {language === 'TR' ? 'Etkinlik Bildirimleri' : 'Event Notifications'}
                      </div>
                      {selectedSection.items.filter(item =>
                        ['EVENT_TIME_CHANGE', 'EVENT_VENUE_CHANGE'].includes(item.key)
                      ).map((item) => (
                        <div key={item.key} className="settings-item">
                          <div className="settings-item__info">
                            <span className="settings-item__title">{language === 'TR' ? item.titleTR : item.titleEN}</span>
                          </div>
                          {renderNotificationToggle(item.key)}
                        </div>
                      ))}
                    </div>

                    {/* Bilet İşlemleri */}
                    <div className="settings-subsection">
                      <div className="settings-subsection-title">
                        {language === 'TR' ? 'Bilet İşlemleri' : 'Ticket Operations'}
                      </div>
                      {selectedSection.items.filter(item =>
                        ['TICKET_PURCHASED', 'TICKET_QR'].includes(item.key)
                      ).map((item) => (
                        <div key={item.key} className="settings-item">
                          <div className="settings-item__info">
                            <span className="settings-item__title">{language === 'TR' ? item.titleTR : item.titleEN}</span>
                          </div>
                          {renderNotificationToggle(item.key)}
                        </div>
                      ))}
                    </div>

                    {/* Genel Bildirimler */}
                    <div className="settings-subsection">
                      <div className="settings-subsection-title">
                        {language === 'TR' ? 'Genel Bildirimler' : 'General Notifications'}
                      </div>
                      {selectedSection.items.filter(item =>
                        ['FRIEND_JOINED_EVENT', 'FOLLOWED_VENUE_UPDATE', 'FOLLOWED_ARTIST_UPDATE'].includes(item.key)
                      ).map((item) => (
                        <div key={item.key} className="settings-item">
                          <div className="settings-item__info">
                            <span className="settings-item__title">{language === 'TR' ? item.titleTR : item.titleEN}</span>
                          </div>
                          {renderNotificationToggle(item.key)}
                        </div>
                      ))}
                    </div>

                    {/* Bildirim Kanalları */}
                    <div className="settings-subsection">
                      <div className="settings-subsection-title">
                        {language === 'TR' ? 'Bildirim Kanalları' : 'Notification Channels'}
                      </div>
                      {selectedSection.items.filter(item =>
                        ['in_app_notifications', 'email_notifications', 'sms_notifications'].includes(item.key)
                      ).map((item) => (
              <div key={item.key} className="settings-item">
                <div className="settings-item__info">
                  <span className="settings-item__title">{language === 'TR' ? item.titleTR : item.titleEN}</span>
                </div>
                {renderNotificationToggle(item.key)}
              </div>
            ))}
                    </div>
                  </>
                ) : (
                  // Diğer section'lar için normal düzenleme
                  selectedSection.items.map((item) => (
                    <div key={item.key} className="settings-item">
                      <div className="settings-item__info">
                        <span className="settings-item__title">{language === 'TR' ? item.titleTR : item.titleEN}</span>
                      </div>
                      {renderInput(item)}
                    </div>
                  ))
                )}
          </div>
        ) : (
          <>
                {/* Dil Seçimi - En Üstte */}
                <div className="settings-section language-direct-section">
                <div className="settings-item">
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Language className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Dil Seçimi' : 'Language Selection'}</span>
                    </div>
                    <div className="settings-item__control">
                      {LANGUAGE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          className={`settings-item__button ${language === option ? 'active' : ''}`}
                          onClick={() => handleLanguageChange(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Kişisel Ayarlar - Direkt Görüntülenen */}
                <div className="settings-section personal-direct-section">
                  <div className="settings-item">
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Tickets className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Biletlerim' : 'My Tickets'}</span>
                    </div>
                    <button
                      className="settings-item__button"
                      onClick={() => handleButtonClick('my_tickets')}
                    >
                      &gt;
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <FavoriteEvents className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Favori Etkinliklerim' : 'My Favorite Events'}</span>
                    </div>
                    <button
                      className="settings-item__button"
                      onClick={() => handleButtonClick('favorite_events')}
                    >
                      &gt;
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Evaluations className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Değerlendirmelerim' : 'My Reviews'}</span>
                    </div>
                    <button
                      className="settings-item__button"
                      onClick={() => handleButtonClick('my_reviews')}
                    >
                      &gt;
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Blocked className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Engelli Profiller' : 'Blocked Profiles'}</span>
                    </div>
                    <button
                      className="settings-item__button"
                      onClick={() => handleButtonClick('blocked_profiles')}
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Ayarlar Bölümü - Gizlilik, Bildirimler, Mesajlaşma, Sosyal Medya */}
                <div className="settings-section settings-group-section">
                  <div className="settings-item" onClick={() => {
                    const section = settings.find(s => s.key === 'privacy');
                    if (section) {
                      handleSectionClick(section);
                    }
                  }}>
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Privacy className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Gizlilik Ayarları' : 'Privacy Settings'}</span>
                    </div>
                    <div className="settings-item__arrow">&gt;</div>
                  </div>

                  <div className="settings-item" onClick={() => {
                    const section = settings.find(s => s.key === 'notifications');
                    if (section) {
                      handleSectionClick(section);
                    }
                  }}>
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Notification className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Bildirim Ayarları' : 'Notification Settings'}</span>
                    </div>
                    <div className="settings-item__arrow">&gt;</div>
                </div>

                  <div className="settings-item" onClick={() => {
                    const section = settings.find(s => s.key === 'messaging');
                    if (section) {
                      handleSectionClick(section);
                    }
                  }}>
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Message className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Mesajlaşma Ayarları' : 'Messaging Settings'}</span>
                    </div>
                    <div className="settings-item__arrow">&gt;</div>
              </div>

                  <div className="settings-item" onClick={() => {
                    const section = settings.find(s => s.key === 'social');
                    if (section) {
                      handleSectionClick(section);
                    }
                  }}>
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <SocialMedia className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Sosyal Medya Entegrasyonları' : 'Social Media Integrations'}</span>
                    </div>
                    <div className="settings-item__arrow">&gt;</div>
                </div>
            </div>

                {/* Yardım Bölümü - Direkt Görüntülenen */}
                <div className="settings-section help-direct-section">
                  <div className="settings-item">
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Faq className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'}</span>
                    </div>
                    <button
                      className="settings-item__button"
                      onClick={() => handleButtonClick('faq')}
                    >
                      &gt;
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <AppInfo className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'App Hakkında' : 'About App'}</span>
                    </div>
                    <button
                      className="settings-item__button"
                      onClick={() => handleButtonClick('about_app')}
                    >
                      &gt;
                    </button>
                  </div>

                  <div className="settings-item">
                    <div className="settings-item__info">
                      <div className="settings-item__icon-container">
                        <Support className="settings-item__icon" />
                      </div>
                      <span className="settings-item__title">{language === 'TR' ? 'Destek' : 'Support'}</span>
                    </div>
                    <button
                      className="settings-item__button"
                      onClick={() => handleButtonClick('support')}
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Çıkış Yap */}
                <div className="settings-section">
                    <div className="settings-item">
                        <div className="settings-item__info">
                            <div className="settings-item__icon-container">
                                <Exit className="settings-item__icon" />
                            </div>
                            <span className="settings-item__title">{language === 'TR' ? 'Çıkış Yap' : 'Logout'}</span>
                        </div>
                        <div className="settings-item__arrow">&gt;</div>
                    </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
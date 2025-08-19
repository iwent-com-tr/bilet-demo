import React, { useState, useEffect } from 'react';
import './Settings.css';
import PageHeader from 'components/layouts/PageHeader';
import axios from 'axios';

interface SettingItem {
  key: string;
  inputType: 'SELECT' | 'TOGGLE' | 'BUTTON';
  titleTR: string;
  titleEN: string;
  descriptionTR: string;
  descriptionEN: string;
  defaultValue: string;
  options?: string[];
}

interface SettingSection {
  titleTR: string;
  titleEN: string;
  items: SettingItem[];
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('TR');
  const [selectedSection, setSelectedSection] = useState<SettingSection | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/v1/settings/definitions');
        let data = response.data;

        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            setError('Ayarlar verisi JSON formatında değil.');
            setLoading(false);
            return;
          }
        }

        let sectionsArray = [];
        if (Array.isArray(data)) {
          sectionsArray = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.sections)) {
            sectionsArray = data.sections;
          } else if (Array.isArray(data.data)) {
            sectionsArray = data.data;
          } else if (Array.isArray(data.definitions)) {
            sectionsArray = data.definitions;
          } else if (Array.isArray(data.items)) {
            sectionsArray = [data];
          }
        }

        setSettings(sectionsArray);

      } catch (err) {
        setError('Ayarlar yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const renderInput = (item: SettingItem) => {
    switch (item.inputType) {
      case 'SELECT':
        return (
          <div className="settings-item__control">
            {item.options?.map((option) => (
              <button
                key={option}
                className={`settings-item__button ${language === option ? 'active' : ''}`}
                onClick={() => setLanguage(option)}
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

  if (loading) {
    return <div>Yükleniyor...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="settings-page">
      <PageHeader 
        title={selectedSection ? (language === 'TR' ? selectedSection.titleTR : selectedSection.titleEN) : 'Menü'}
        onBackClick={selectedSection ? handleBackClick : undefined}
      />
      <div className="settings-container">
        {selectedSection ? (
          <div className="settings-section">
            {selectedSection.items.map((item) => (
              <div key={item.key} className="settings-item">
                <div className="settings-item__info">
                  <span className="settings-item__title">{language === 'TR' ? item.titleTR : item.titleEN}</span>
                </div>
                {renderInput(item)}
              </div>
            ))}
          </div>
        ) : (
          <>
            {Array.isArray(settings) && settings.map((section, sectionIndex) => (
              <div key={sectionIndex} className="settings-section" onClick={() => handleSectionClick(section)}>
                <div className="settings-item">
                    <div className="settings-item__info">
                        <span className="settings-item__title">{language === 'TR' ? section.titleTR : section.titleEN}</span>
                    </div>
                    <div className="settings-item__arrow">&gt;</div>
                </div>
              </div>
            ))}
            <div className="settings-section">
                <div className="settings-item">
                    <div className="settings-item__info">
                        <span className="settings-item__title">Çıkış Yap</span>
                    </div>
                    <div className="settings-item__arrow">&gt;</div>
                </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
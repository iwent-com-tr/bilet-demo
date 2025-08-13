import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layouts/PageHeader';
import './ParticipantInfo.css';

interface Event {
  id: string;
  name: string;
  banner?: string;
  organizerId: string;
  ticketTypes: Array<{
    type: string;
    price: number;
    capacity: number;
  }>;
}

interface SelectedTicket {
  type: string;
  price: number;
  capacity: number;
}

interface Participant {
  email: string;
  phone: string;
}

const ParticipantInfo: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const initialized = useRef(false);

  // Get event and ticket info from location.state or sessionStorage
  const eventData = useMemo(() => {
    if (location.state?.event && location.state?.selectedTicket && location.state?.ticketCount) {
      return {
        event: location.state.event,
        selectedTicket: location.state.selectedTicket,
        ticketCount: location.state.ticketCount
      };
    }
    
    // Try to get from sessionStorage
    const savedEvent = sessionStorage.getItem(`event_${slug}`);
    const savedTicket = sessionStorage.getItem(`selectedTicket_${slug}`);
    const savedCount = sessionStorage.getItem(`ticketCount_${slug}`);
    
    if (savedEvent && savedTicket && savedCount) {
      return {
        event: JSON.parse(savedEvent),
        selectedTicket: JSON.parse(savedTicket),
        ticketCount: parseInt(savedCount)
      };
    }
    
    return null;
  }, [slug, location.state]);

  useEffect(() => {
    if (!slug) {
      navigate('/');
      return;
    }

    if (!eventData) {
      navigate(`/events/${slug}/event-ticket-categories`);
      return;
    }

    if (eventData.ticketCount <= 1) {
      // If only 1 ticket, go directly to purchase
      navigate(`/events/${slug}/purchase`, {
        state: {
          event: eventData.event,
          selectedTicket: eventData.selectedTicket,
          ticketCount: eventData.ticketCount
        }
      });
      return;
    }

    // Only initialize once
    if (!initialized.current) {
      setEvent(eventData.event);
      
      // Initialize participants array (excluding the current user)
      const additionalParticipants = eventData.ticketCount - 1;
      const initialParticipants = Array(additionalParticipants).fill(null).map(() => ({
        email: '',
        phone: ''
      }));
      setParticipants(initialParticipants);
      initialized.current = true;
    }
    
    setLoading(false);
  }, [slug, eventData, navigate]);



  const handleParticipantChange = (index: number, field: keyof Participant, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = {
      ...newParticipants[index],
      [field]: value
    };
    setParticipants(newParticipants);
  };

  const validateParticipants = () => {
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      if (!participant.email || !participant.phone) {
        toast.error(`Bilet ${i + 2} için tüm alanlar doldurulmalıdır`);
        return false;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(participant.email)) {
        toast.error(`Bilet ${i + 2} için geçerli bir e-posta adresi giriniz`);
        return false;
      }
      
      // Basic phone validation (Turkish format)
      const phoneRegex = /^(\+90|0)?[0-9]{10}$/;
      if (!phoneRegex.test(participant.phone.replace(/\s/g, ''))) {
        toast.error(`Bilet ${i + 2} için geçerli bir telefon numarası giriniz`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateParticipants()) return;

    try {
      setSubmitLoading(true);
      const token = localStorage.getItem('token');
      
      // Save participant data to sessionStorage
      sessionStorage.setItem(`participants_${slug}`, JSON.stringify(participants));
      
      // First, create ticket for the registered user (purchaser)
      await axios.post(
        `${process.env.REACT_APP_API_URL}/tickets`,
        {
          eventId: event?.id,
          ticketType: eventData?.selectedTicket.type,
          price: eventData?.selectedTicket.price
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Then, send tickets to unregistered participants
      for (const participant of participants) {
        console.log(`Bilet bilgileri ${participant.email} adresine gönderildi`);
        await axios.post(
          `${process.env.REACT_APP_API_URL}/tickets/send-unregistered`,
          {
            participantEmail: participant.email,
            eventId: event?.id,
            ticketType: eventData?.selectedTicket.type,
            price: eventData?.selectedTicket.price,
            purchaserUserId: user?.id
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
      
      // Show success message
      toast.success(`${participants.length + 1} bilet başarıyla alındı! QR kodlar e-posta adreslerine gönderildi.`);
      
      // Navigate to EventDetail with success state
      navigate(`/events/${slug}`, {
        state: { 
          purchaseSuccess: true,
          ticketCount: participants.length + 1,
          participants: participants
        }
      });
    } catch (error) {
      console.error('Error saving participant data:', error);
      toast.error('Katılımcı bilgileri kaydedilirken bir hata oluştu');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="participant-info">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!event || !eventData) {
    return null;
  }

  return (
    <div className="participant-info">
      <PageHeader title="Katılımcı Bilgileri" />
      
      <div className="participant-info__container">
        <div className="participant-info__content">
          {/* Current user's ticket (Ticket 1) */}
          <div className="participant-info__ticket-section">
            <h2 className="participant-info__ticket-title">
              Bilet <span className="participant-info__ticket-number">1</span>
            </h2>
            <div className="participant-info__current-user">
              <div className="participant-info__user-info">
                <span className="participant-info__user-name">{user?.isim} {user?.soyisim}</span>
                <span className="participant-info__user-email">{user?.email}</span>
                <span className="participant-info__user-phone">{user?.phone}</span>
              </div>

            </div>
          </div>

          {/* Additional participants */}
          {participants.map((participant, index) => (
            <div key={index} className="participant-info__ticket-section">
              <h2 className="participant-info__ticket-title">
                Bilet <span className="participant-info__ticket-number">{index + 2}</span>
              </h2>
              <div className="participant-info__participant-form">
                <div className="participant-info__form-group">
                  <label className="participant-info__form-label">
                    <svg className="participant-info__form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    E-Mail Adresi
                  </label>
                  <input
                    type="email"
                    value={participant.email}
                    onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                    placeholder="ornek@email.com"
                    className="participant-info__form-input"
                    autoComplete="email"
                  />
                </div>
                
                <div className="participant-info__form-group">
                  <label className="participant-info__form-label">
                    <svg className="participant-info__form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    İletişim Numarası
                  </label>
                  <input
                    type="tel"
                    value={participant.phone}
                    onChange={(e) => handleParticipantChange(index, 'phone', e.target.value)}
                    placeholder="+90 XXX XXX XX XX"
                    className="participant-info__form-input"
                    autoComplete="tel"
                  />
                </div>
                
                <button className="participant-info__save-button">
                  Kaydet
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleSubmit}
            disabled={submitLoading}
            className="participant-info__submit-button"
          >
            {submitLoading ? 'İşleniyor...' : 'Ödemeye Geç'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantInfo;

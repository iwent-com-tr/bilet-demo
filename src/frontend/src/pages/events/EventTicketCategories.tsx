import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import PageHeader from '../../components/layouts/PageHeader';
import './EventTicketCategories.css';

interface TicketCategory {
  tip: string;
  fiyat: number;
  kapasite: number;
  kategori: string;
  sold_out: boolean;
}

interface Event {
  id: string;
  ad: string;
  banner: string;
  organizator: string;
  bilet_tipleri: TicketCategory[];
}

const EventTicketCategories: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/event/${id}`);
      setEvent(response.data.event);
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      navigate('/');
    }
  };

  const handlePurchase = (ticket: TicketCategory) => {
    navigate(`/events/${id}/purchase`, {
      state: {
        selectedTicket: ticket,
        eventId: id
      }
    });
  };

  // Group tickets by category
  const groupedTickets = event?.bilet_tipleri.reduce((acc, ticket) => {
    const category = ticket.kategori || 'Standard Tickets';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ticket);
    return acc;
  }, {} as Record<string, TicketCategory[]>);

  if (loading || !event) {
    return (
      <div className="ticket-categories">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="ticket-categories">
      <PageHeader title="Bilet Kategorileri" />
      
      <div className="ticket-categories__container">
        {Object.entries(groupedTickets || {}).map(([category, tickets]) => (
          <div key={category} className="ticket-categories__group">
            <h2 className="ticket-categories__group-title">{category}</h2>
            
            <div className="ticket-categories__list">
              {tickets.map((ticket, index) => (
                <div key={index} className="ticket-categories__item">
                  <div className="ticket-categories__item-info">
                    <h3 className="ticket-categories__item-title">{ticket.tip}</h3>
                    <span className="ticket-categories__item-price">{ticket.fiyat} TL</span>
                  </div>
                  
                  {ticket.sold_out ? (
                    <span className="ticket-categories__sold-out">Sold Out</span>
                  ) : (
                    <button
                      onClick={() => handlePurchase(ticket)}
                      className="ticket-categories__buy-button"
                    >
                      Bilet Al
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventTicketCategories; 
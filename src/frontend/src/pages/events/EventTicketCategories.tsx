import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import PageHeader from '../../components/layouts/PageHeader';
import './EventTicketCategories.css';

interface TicketCategory {
  type: string;
  price: number;
  capacity: number;
  category: string;
  sold_out: boolean;
}

interface Event {
  id: string;
  name: string;
  banner?: string;
  organizerId: string;
  ticketTypes: TicketCategory[];
}

const EventTicketCategories: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventDetails();
  }, [slug]);

  const fetchEventDetails = async () => {
    try {
      // Use the new backendN API endpoint with slug
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/events/slug/${slug}`);
      setEvent(response.data);
      setLoading(false);
    } catch (error) {
      toast.error('Etkinlik bilgileri yüklenirken bir hata oluştu');
      navigate('/');
    }
  };

  const handlePurchase = (ticket: TicketCategory) => {
    navigate(`/events/${slug}/purchase`, {
      state: {
        selectedTicket: ticket,
        eventId: event?.id
      }
    });
  };

  // Group tickets by category
  const groupedTickets = event?.ticketTypes?.reduce((acc, ticket) => {
    const category = ticket.category || 'Standard Tickets';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ticket);
    return acc;
  }, {} as Record<string, TicketCategory[]>) || {};

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
        {Object.entries(groupedTickets).map(([category, tickets]) => (
          <div key={category} className="ticket-categories__group">
            <h2 className="ticket-categories__group-title">{category}</h2>
            
            <div className="ticket-categories__list">
              {tickets.map((ticket, index) => (
                <div key={index} className="ticket-categories__item">
                  <div className="ticket-categories__item-info">
                    <h3 className="ticket-categories__item-title">{ticket.type}</h3>
                    <span className="ticket-categories__item-price">{ticket.price} TL</span>
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
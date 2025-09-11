import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";


const OrganizerEventList: React.FC<{ eventIds: string[] }> = ({ eventIds }: { eventIds: string[] }) => {

    const [events, setEvents] = useState<any>([]);
    const [eventsPage, setEventsPage] = useState(1);
    const [eventsLoading, setEventsLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await Promise.all(
                    eventIds.slice(0, 6 * eventsPage).map(async (eventId) => {
                        const event = await axios.get(`${process.env.REACT_APP_API_URL}/events/${eventId}`);
                        return event;
                    })
                );
                setEvents(response.map((event) => event.data.event));
                setEventsLoading(false);
                console.log(response);
            } catch (error) {
                setEventsLoading(false);
            }
        };
        fetchEvents();
    }, [eventIds, eventsPage]);

    const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  if (eventsLoading) {
    return <div>Loading...</div>;
  }

  if (events.length === 0) {
    return (
      <div className="event-list__grid-container search__grid-container">
        <h1 className="search__title venue-event-list-title">
          Organizatörün yaklaşan etkinliği bulunmamakta.
        </h1>
      </div>
    );
  }

    return (
        <div className="event-list__grid-container search__grid-container">
                        <h1 className="search__title venue-event-list-title">
                            Organizatörün yayınladığı etkinlikler...
                        </h1>
                    <div className="event-list__grid search__grid">
                        {events.map((event: any) => (
                        <Link
                            key={event.id}
                            to={`/events/${event.slug}`}
                            className="event-list__card search__card"
                        >
                            <div className="event-list__image-container">
                            <img
                                src={event.banner || '/placeholder-event.jpg'}
                                alt={event.name}
                                className="event-list__image"
                            />
                            </div>
                            <div className="event-list__content">
                            <p className="event-list__date">{formatDate(event.startDate)}</p>
                            <h3 className="event-list__title">{event.name}</h3>
                            <div className="event-list__venue">
                                {event.venue}, {event.city}
                            </div>
                            </div>
                        </Link>
                        ))}
                    </div>
                    <div>
                        <button className="load-more" onClick={() => setEventsPage(eventsPage + 1)}>Daha fazla etkinlik</button>
                    </div>
                    </div>
    );
};

export default OrganizerEventList;
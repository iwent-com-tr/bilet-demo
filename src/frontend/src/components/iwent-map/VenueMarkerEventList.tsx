import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./VenueMarkerEventList.css";

const VenueMarkerEventListCompact: React.FC<{ eventIds: string[] }> = ({ eventIds }) => {
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
        return <div className="marker marker-root">Loading...</div>;
    }

    return (
        <div className="marker marker-root">
            <h1 className="marker marker-title">
                Bu mekanda bulunan etkinlikler...
            </h1>

            <div className="marker marker-grid">
                {events.map((event: any) => (
                    <Link
                        key={event.id}
                        to={`/events/${event.slug}`}
                        className="marker marker-card"
                    >
                        <div className="marker marker-image-container">
                            <img
                                src={event.banner || '/placeholder-event.jpg'}
                                alt={event.name}
                                className="marker marker-image"
                            />
                        </div>

                        <div className="marker marker-content">
                            <p className="marker marker-date">{formatDate(event.startDate)}</p>
                            <h3 className="marker marker-event-title">{event.name}</h3>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="marker marker-loadwrap">
                <button
                    className="marker marker-loadmore"
                    onClick={() => setEventsPage(eventsPage + 1)}
                >
                    Daha fazla etkinlik
                </button>
            </div>
        </div>
    );
};

export default VenueMarkerEventListCompact;

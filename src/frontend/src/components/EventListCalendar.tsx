import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MapPinIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface CalendarEvent {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  category: string;
  status?: string;
  banner?: string;
  isStartDate?: boolean;
  isEndDate?: boolean;
}

interface EventListCalendarProps {
  date: Date;
  events: CalendarEvent[];
}

const EventListCalendar: React.FC<EventListCalendarProps> = ({ date, events }) => {
  const navigate = useNavigate();

  // Category colors
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      CONCERT: 'bg-purple-100 text-purple-800',
      FESTIVAL: 'bg-pink-100 text-pink-800',
      UNIVERSITY: 'bg-blue-100 text-blue-800',
      WORKSHOP: 'bg-green-100 text-green-800',
      CONFERENCE: 'bg-yellow-100 text-yellow-800',
      SPORT: 'bg-red-100 text-red-800',
      PERFORMANCE: 'bg-indigo-100 text-indigo-800',
      EDUCATION: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Category names in Turkish
  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      CONCERT: 'Konser',
      FESTIVAL: 'Festival',
      UNIVERSITY: 'Üniversite',
      WORKSHOP: 'Atölye',
      CONFERENCE: 'Konferans',
      SPORT: 'Spor',
      PERFORMANCE: 'Performans',
      EDUCATION: 'Eğitim',
    };
    return names[category] || category;
  };

  const handleEventClick = (slug: string) => {
    navigate(`/events/${slug}`);
  };

  if (events.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {format(date, 'd MMMM yyyy, EEEE', { locale: tr })}
        </h3>
        <div className="text-center py-8">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-600" />
          <p className="mt-2 text-sm text-gray-400">Bu tarihte etkinlik bulunmuyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
      <div className="bg-[#05EF7E] text-black p-4">
        <h3 className="text-lg font-bold">
          {format(date, 'd MMMM yyyy, EEEE', { locale: tr })}
        </h3>
        <p className="text-black opacity-80 text-sm font-medium">
          {events.length} etkinlik
        </p>
      </div>

      <div className="divide-y divide-gray-800">
        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => handleEventClick(event.slug)}
            className="p-3 sm:p-4 hover:bg-gray-800 active:bg-gray-700 cursor-pointer transition-colors duration-200 touch-manipulation"
          >
            <div className="flex items-start space-x-3 sm:space-x-4">
              {/* Event Banner */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-800 rounded-lg overflow-hidden">
                  {event.banner ? (
                    <img
                      src={event.banner}
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#05EF7E] to-green-400 flex items-center justify-center">
                      <span className="text-black font-bold text-sm sm:text-lg">
                        {event.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm sm:text-base font-semibold text-white line-clamp-2 leading-tight">
                      {event.name}
                      {event.status === 'DRAFT' && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Taslak
                        </span>
                      )}
                    </h4>
                    
                    {/* Category Badge */}
                    <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 rounded-full text-xs font-bold mt-1 bg-[#05EF7E] text-black">
                      {getCategoryName(event.category)}
                    </span>
                  </div>
                </div>

                {/* Event Info */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-xs text-[#05EF7E]">
                    <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                    <span>
                      {format(new Date(event.startDate), 'HH:mm')}
                      {new Date(event.startDate).toDateString() !== new Date(event.endDate).toDateString() && 
                        ` - ${format(new Date(event.endDate), 'HH:mm')}`
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center text-xs text-[#05EF7E]">
                    <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {event.venue}, {event.city}
                    </span>
                  </div>
                </div>

                {/* Multi-day indicator */}
                {new Date(event.startDate).toDateString() !== new Date(event.endDate).toDateString() && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-gray-800 text-[#05EF7E] border border-gray-700">
                      {event.isStartDate ? 'Başlangıç' : event.isEndDate ? 'Bitiş' : 'Devam ediyor'}
                    </span>
                  </div>
                )}
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#05EF7E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventListCalendar;

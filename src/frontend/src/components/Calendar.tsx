import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import axios from 'axios';

interface CalendarEvent {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  category: string;
  banner?: string;
  isStartDate?: boolean;
  isEndDate?: boolean;
}

interface CalendarProps {
  onDateSelect: (date: Date, events: CalendarEvent[]) => void;
  selectedDate?: Date;
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect, selectedDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventsByDate, setEventsByDate] = useState<{ [key: string]: CalendarEvent[] }>({});
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL;

  // Turkish day names
  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  // Turkish month names
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  // Fetch events for the current month
  const fetchMonthEvents = async (date: Date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const response = await axios.get(`${API_BASE_URL}/events/calendar/events`, {
        params: { year, month }
      });
      
      setEventsByDate(response.data.eventsByDate || {});
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setEventsByDate({});
    } finally {
      setLoading(false);
    }
  };

  // Fetch events when month changes
  useEffect(() => {
    fetchMonthEvents(currentMonth);
  }, [currentMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const events = eventsByDate[dateKey] || [];
    onDateSelect(date, events);
  };

  // Get calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = new Date(monthStart);
  
  // Adjust to start from Monday
  const dayOfWeek = monthStart.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  calendarStart.setDate(monthStart.getDate() - daysToSubtract);

  const calendarEnd = new Date(calendarStart);
  calendarEnd.setDate(calendarStart.getDate() + 41); // 6 weeks

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 overflow-hidden">
      {/* Calendar Header */}
      <div className="bg-[#05EF7E] text-black p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-green-400 rounded-lg transition-colors touch-manipulation"
            aria-label="Önceki ay"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          
          <h2 className="text-lg sm:text-xl font-bold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-green-400 rounded-lg transition-colors touch-manipulation"
            aria-label="Sonraki ay"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs sm:text-sm font-bold py-1 sm:py-2 text-black">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Body */}
      <div className="p-2 sm:p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#05EF7E]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const events = eventsByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const hasEvents = events.length > 0;

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={`
                    relative aspect-square p-1 text-xs sm:text-sm rounded-lg transition-all duration-200 touch-manipulation min-h-[40px] sm:min-h-[44px]
                    ${isCurrentMonth 
                      ? 'bg-white text-black hover:bg-gray-100 active:bg-gray-200' 
                      : 'bg-gray-300 text-gray-500 hover:bg-gray-200'
                    }
                    ${isSelected 
                      ? 'bg-[#05EF7E] text-black border-2 border-[#05EF7E]' 
                      : ''
                    }
                    ${isToday && !isSelected 
                      ? 'bg-white border-2 border-[#05EF7E] text-black' 
                      : ''
                    }
                    ${hasEvents && isCurrentMonth
                      ? 'font-semibold'
                      : ''
                    }
                  `}
                >
                  <span className="block">
                    {format(day, 'd')}
                  </span>
                  
                  {/* Event indicator */}
                  {hasEvents && isCurrentMonth && (
                    <div className="absolute bottom-0.5 sm:bottom-1 left-1/2 transform -translate-x-1/2">
                      <div className={`
                        w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full
                        ${events.length > 3 
                          ? 'bg-red-500' 
                          : events.length > 1 
                            ? 'bg-yellow-500' 
                            : 'bg-green-500'
                        }
                      `} />
                      {events.length > 1 && (
                        <span className="absolute -top-0.5 sm:-top-1 -right-0.5 sm:-right-1 text-xs bg-[#05EF7E] text-black rounded-full w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                          {events.length > 9 ? '9+' : events.length}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;

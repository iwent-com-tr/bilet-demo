import React, { useState } from 'react';
import Calendar from '../components/Calendar';
import EventListCalendar from '../components/EventListCalendar';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

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

const CalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);

  const handleDateSelect = (date: Date, events: CalendarEvent[]) => {
    setSelectedDate(date);
    setSelectedEvents(events);
  };

  const handleBackToCalendar = () => {
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Page Header */}
      <div className="bg-black border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Takvim</h1>
            <p className="mt-2 text-gray-400">
              Etkinlikleri tarihlerine göre görüntüleyin
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          {/* Calendar Component */}
          <div className="lg:sticky lg:top-8">
            <Calendar 
              onDateSelect={handleDateSelect}
              selectedDate={selectedDate || undefined}
            />
            
            {/* Quick Info - Hidden on mobile when date is selected */}
            <div className={`mt-4 bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-4 ${selectedDate ? 'hidden lg:block' : ''}`}>
              <h3 className="text-sm font-medium text-white mb-2">Nasıl kullanılır?</h3>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Takvimde bir tarihe tıklayarak o gündeki etkinlikleri görün</li>
                <li>• Renkli noktalar etkinlik sayısını belirtir</li>
                <li>• Etkinliğe tıklayarak detay sayfasına gidin</li>
              </ul>
            </div>
          </div>

          {/* Events List */}
          <div className={`${selectedDate ? '' : 'hidden lg:block'}`}>
            {selectedDate ? (
              <div>
                {/* Mobile Back Button */}
                <div className="lg:hidden mb-4">
                  <button
                    onClick={handleBackToCalendar}
                    className="flex items-center text-[#05EF7E] hover:text-green-400 transition-colors touch-manipulation"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Takvime Dön
                  </button>
                </div>
                <EventListCalendar 
                  date={selectedDate} 
                  events={selectedEvents} 
                />
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg shadow-lg border border-gray-800 p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-[#05EF7E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">
                  Bir tarih seçin
                </h3>
                <p className="text-gray-400 text-sm">
                  Takvimden bir tarihe tıklayarak o gündeki etkinlikleri görüntüleyebilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;

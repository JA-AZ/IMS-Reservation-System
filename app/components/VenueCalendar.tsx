'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FiCalendar, FiClock, FiUser, FiMail, FiMapPin } from 'react-icons/fi';
import { getReservations, getVenues } from '../firebase/services';
import { Reservation, VenueType } from '../types';

// Generate a color for each venue
const generateVenueColor = (index: number) => {
  const colors = [
    'rgb(239 68 68)', // red
    'rgb(34 197 94)', // green
    'rgb(59 130 246)', // blue
    'rgb(168 85 247)', // purple
    'rgb(234 179 8)', // yellow
    'rgb(249 115 22)', // orange
    'rgb(236 72 153)', // pink
  ];
  return colors[index % colors.length];
};

export default function VenueCalendar() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [venueColors, setVenueColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reservationsData, venuesData] = await Promise.all([
          getReservations(),
          getVenues()
        ]);
        
        // Generate colors for venues
        const colors = venuesData.reduce((acc, venue, index) => {
          acc[venue.name] = generateVenueColor(index);
          return acc;
        }, {} as Record<string, string>);

        setReservations(reservationsData);
        setVenues(venuesData);
        setVenueColors(colors);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDateClick = (dateStr: string) => {
    const reservationsOnDate = reservations.filter(res => 
      dateStr >= res.startDate && dateStr <= res.endDate
    );
    
    if (reservationsOnDate.length > 0) {
      setSelectedDate(dateStr);
      setShowModal(true);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  const getDatesInRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    
    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date).toISOString().split('T')[0]);
    }
    
    return dates;
  };
  
  const getReservationsForDate = (dateStr: string | null) => {
    if (!dateStr) return [];
    return reservations.filter(res => {
      // Exclude cancelled
      if (res.status === 'Cancelled') return false;
      // Check if the date is within the reservation period
      return dateStr >= res.startDate && dateStr <= res.endDate;
    });
  };
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const getMonthDates = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i).toISOString().split('T')[0]);
    }
    
    return dates;
  };
  
  const monthDates = getMonthDates(currentMonth, currentYear);

  const formatTime = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(Number(hours));
    date.setMinutes(Number(minutes));
    date.setSeconds(0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-900">Loading calendar...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900">
        <FiCalendar className="mr-2" />
        Venue Bookings Calendar
      </h2>

      {/* Venue Legend */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
        {venues.map((venue) => (
          <div
            key={venue.id}
            className="flex items-center px-3 py-1 rounded-full text-sm whitespace-nowrap"
            style={{ backgroundColor: `${venueColors[venue.name]}20`, color: venueColors[venue.name] }}
          >
            <span className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: venueColors[venue.name] }}></span>
            {venue.name}
          </div>
        ))}
      </div>
      
      <div className="min-w-full overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 text-center font-medium mb-2">
          <div className="text-gray-900 text-sm md:text-base">Sun</div>
          <div className="text-gray-900 text-sm md:text-base">Mon</div>
          <div className="text-gray-900 text-sm md:text-base">Tue</div>
          <div className="text-gray-900 text-sm md:text-base">Wed</div>
          <div className="text-gray-900 text-sm md:text-base">Thu</div>
          <div className="text-gray-900 text-sm md:text-base">Fri</div>
          <div className="text-gray-900 text-sm md:text-base">Sat</div>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
            <div key={`empty-start-${i}`} className="h-8 md:h-12 rounded border border-gray-200 bg-gray-50"></div>
          ))}
          
          {monthDates.map((dateStr) => {
            const reservationsOnDate = getReservationsForDate(dateStr);
            const hasReservations = reservationsOnDate.length > 0;
            const date = new Date(dateStr);
            const day = date.getDate();
            
            return (
              <div
                key={dateStr}
                onClick={() => hasReservations && handleDateClick(dateStr)}
                className={`h-8 md:h-12 rounded border flex flex-col items-center justify-center cursor-pointer relative ${
                  hasReservations ? 'hover:bg-gray-50' : 'border-gray-200 bg-white'
                }`}
              >
                <span className="text-sm md:text-base text-gray-900">{day}</span>
                {hasReservations && (
                  <div className="flex gap-0.5 mt-1">
                    {reservationsOnDate.map((res, index) => (
                      <div
                        key={`${res.id}-${index}`}
                        className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full"
                        style={{ backgroundColor: venueColors[res.venueName] }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for date details */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => { setShowModal(false); setSelectedDate(null); }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 md:p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                Reservations for {formatDate(selectedDate)}
              </h3>
              
              <div className="space-y-4">
                {getReservationsForDate(selectedDate).map(res => (
                  <div 
                    key={res.id} 
                    className="border-l-4 pl-4 py-3 bg-gray-50 rounded-r-lg" 
                    style={{ borderColor: venueColors[res.venueName] }}
                  >
                    <h4 className="font-semibold text-gray-900 text-base md:text-lg">
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: venueColors[res.venueName] }}></span>
                      {res.venueName} - {res.eventTitle}
                    </h4>
                    <div className="text-gray-700 mt-2 space-y-1 text-sm md:text-base">
                      <p className="flex items-center">
                        <FiClock className="mr-2" size={14} />
                        {formatTime(res.startTime)} - {formatTime(res.endTime)}
                      </p>
                      <p className="flex items-center">
                        <FiUser className="mr-2" size={14} />
                        {res.reservedBy}
                      </p>
                      <p className="flex items-center">
                        <FiMail className="mr-2" size={14} />
                        {res.contactNo}
                      </p>
                      <p className="flex items-center">
                        <span className="font-medium mr-2">Received by:</span>
                        {res.receivedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedDate(null);
                  }}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
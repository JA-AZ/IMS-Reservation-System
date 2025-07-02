'use client';

import { useState, useEffect, useRef } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { format, addMonths, subMonths } from 'date-fns';
import { getReservations, getVenues } from '../firebase/services';
import { Reservation, VenueType } from '../types';

interface ReservationCalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  venueId?: string;
}

export default function ReservationCalendar({ selectedDate, onDateSelect, venueId }: ReservationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize with the 1st day of the current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [allReservations, venuesData] = await Promise.all([
          getReservations(),
          getVenues()
        ]);
        setReservations(allReservations);
        setVenues(venuesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate unique colors for each venue
  const venueColors = venues.reduce((acc, venue, index) => {
    const hue = (index * 137.5) % 360; // Golden ratio to distribute colors
    acc[venue.id] = `hsl(${hue}, 70%, 50%)`;
    return acc;
  }, {} as { [key: string]: string });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = direction === 'prev' ? subMonths(prevDate, 1) : addMonths(prevDate, 1);
      return new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    });
  };

  // Generate calendar grid data
  const generateCalendarGrid = () => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    // Get the number of days in the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Create an array for the calendar grid
    const calendarGrid = [];
    
    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarGrid.push({ day: null, dateStr: null });
    }
    
    // Add cells for days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      calendarGrid.push({ day: i, dateStr });
    }
    
    return calendarGrid;
  };

  const calendarGrid = generateCalendarGrid();
  const currentMonthName = format(currentDate, 'MMMM yyyy');

  // Get reservations for a specific date
  const getReservationsForDate = (dateStr: string | null) => {
    if (!dateStr) return [];
    
    return reservations.filter(res => {
      // If venueId is provided, only include reservations for that venue
      if (venueId && res.venueId !== venueId) return false;
      
      // Check if the date is within the reservation period
      return dateStr >= res.startDate && dateStr <= res.endDate;
    });
  };

  // Group reservations by venue for a specific date
  const getVenueReservationsForDate = (dateStr: string | null) => {
    if (!dateStr) return {};
    
    const dateReservations = getReservationsForDate(dateStr);
    const venueReservations: { [venueId: string]: Reservation[] } = {};
    
    dateReservations.forEach(res => {
      if (!venueReservations[res.venueId]) {
        venueReservations[res.venueId] = [];
      }
      venueReservations[res.venueId].push(res);
    });
    
    return venueReservations;
  };

  // Check if a date is the selected date
  const isSelectedDate = (dateStr: string | null) => {
    return dateStr === selectedDate;
  };

  // Format time to 12-hour with AM/PM
  const formatTime = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(Number(hours));
    date.setMinutes(Number(minutes));
    date.setSeconds(0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div ref={calendarRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Select Date</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-full hover:bg-blue-100 focus:outline-none text-blue-600"
            aria-label="Previous month"
            type="button"
          >
            <FiChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-gray-900">{currentMonthName}</span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-full hover:bg-blue-100 focus:outline-none text-blue-600"
            aria-label="Next month"
            type="button"
          >
            <FiChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-1">
        <div className="text-gray-500">Su</div>
        <div className="text-gray-500">Mo</div>
        <div className="text-gray-500">Tu</div>
        <div className="text-gray-500">We</div>
        <div className="text-gray-500">Th</div>
        <div className="text-gray-500">Fr</div>
        <div className="text-gray-500">Sa</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map((cell, index) => {
          if (cell.day === null) {
            return (
              <div 
                key={`empty-${index}`} 
                className="h-8 rounded bg-gray-50"
              ></div>
            );
          }

          const venueReservations = getVenueReservationsForDate(cell.dateStr);
          const hasReservations = Object.keys(venueReservations).length > 0;
          const isSelected = isSelectedDate(cell.dateStr);
          const allReservationsForDate = getReservationsForDate(cell.dateStr);

          return (
            <div key={`day-wrap-${cell.day}`} className="relative">
              <button
                key={`day-${cell.day}`}
                onClick={() => cell.dateStr && onDateSelect(cell.dateStr)}
                className={`h-8 rounded flex items-center justify-center relative w-full z-10 ${
                  isSelected 
                    ? 'bg-blue-500 hover:bg-blue-600' 
                    : 'bg-white hover:bg-gray-100'
                }`}
                aria-label={cell.dateStr || ''}
                type="button"
                onMouseEnter={e => {
                  setHoveredDate(cell.dateStr);
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  if (calendarRef.current) {
                    const parentRect = calendarRef.current.getBoundingClientRect();
                    setTooltipPos({ x: rect.left - parentRect.left + rect.width / 2, y: rect.top - parentRect.top });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredDate(null);
                  setTooltipPos(null);
                }}
              >
                <span className={`text-xs ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {cell.day}
                </span>
                {/* Show venue dots */}
                {hasReservations && (
                  <div className="absolute bottom-0.5 flex justify-center gap-0.5 left-0 right-0">
                    {Object.keys(venueReservations).map((vId, i) => (
                      <span 
                        key={`dot-${vId}-${i}`} 
                        className="w-1 h-1 rounded-full" 
                        style={{ backgroundColor: venueColors[vId] }}
                      />
                    ))}
                  </div>
                )}
              </button>
              {/* Tooltip for events on this date */}
              {hoveredDate === cell.dateStr && allReservationsForDate.length > 0 && tooltipPos && (
                <div
                  className="absolute z-50 bg-white border border-gray-300 rounded shadow-lg p-2 text-xs min-w-[180px] max-w-xs left-1/2 -translate-x-1/2 -top-2 translate-y-[-100%] pointer-events-none"
                  style={{ minWidth: '180px' }}
                >
                  <div className="font-semibold text-gray-800 mb-1">Events:</div>
                  <ul className="space-y-1">
                    {allReservationsForDate.map((res, idx) => (
                      <li key={res.id || idx} className="flex flex-col">
                        <span className="font-medium text-gray-900 truncate">{res.eventTitle}</span>
                        <span className="text-gray-600">{formatTime(res.startTime)} - {formatTime(res.endTime)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {venues.length > 0 && (
        <div className="mt-4 text-xs text-gray-500">
          <div className="font-medium mb-1">Venues:</div>
          <div className="flex flex-wrap gap-2">
            {venues.map((venue) => (
              <div key={venue.id} className="flex items-center">
                <span 
                  className="w-2 h-2 rounded-full mr-1" 
                  style={{ backgroundColor: venueColors[venue.id] }}
                />
                <span className="truncate max-w-[80px]">{venue.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
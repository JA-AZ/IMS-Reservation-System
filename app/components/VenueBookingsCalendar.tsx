'use client';

import { useState, useEffect, useRef } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiUser, FiMail } from 'react-icons/fi';
import { getVenues, getReservations } from '../firebase/services';
import { VenueType, Reservation } from '../types';
import { format, addMonths, subMonths } from 'date-fns';
import Link from 'next/link';

// CSS for hiding scrollbars
const hideScrollbarStyles = {
  '&::-webkit-scrollbar': {
    display: 'none'
  }
};

// Global styles for the component
const globalStyles = `
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

export default function VenueBookingsCalendar() {
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ 
    x: 0, 
    y: 0, 
    showBelow: false,
    cellElement: null as HTMLElement | null
  });
  const [isHoveringTooltip, setIsHoveringTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const currentHoverDateRef = useRef<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(() => {
    // Always initialize with the 1st day of the current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Create a debounced version of setHoverDate
  const debouncedSetHoverDateRef = useRef<NodeJS.Timeout | null>(null);
  const setHoverDateDebounced = (dateStr: string | null) => {
    if (debouncedSetHoverDateRef.current) {
      clearTimeout(debouncedSetHoverDateRef.current);
    }
    
    if (dateStr === null) {
      // Small delay before hiding to allow moving between cells
      debouncedSetHoverDateRef.current = setTimeout(() => {
        if (!isHoveringTooltip && currentHoverDateRef.current !== hoverDate) {
          setHoverDate(null);
        }
      }, 50);
    } else {
      // No delay when showing
      setHoverDate(dateStr);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [venuesData, reservationsData] = await Promise.all([
          getVenues(),
          getReservations()
        ]);
        
        setVenues(venuesData);
        setAllReservations(reservationsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Close hover tooltip when clicking outside or moving mouse away
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node) && !isHoveringTooltip) {
        setHoverDate(null);
      }
    };
    
    // Global mouse move handler to detect when mouse is far from the tooltip
    const handleMouseMove = (e: MouseEvent) => {
      if (tooltipRef.current && hoverDate) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const buffer = 50; // Buffer distance in pixels
        
        // If mouse is far from tooltip and we're not hovering the tooltip itself
        if (
          !isHoveringTooltip && 
          (e.clientX < tooltipRect.left - buffer || 
           e.clientX > tooltipRect.right + buffer || 
           e.clientY < tooltipRect.top - buffer || 
           e.clientY > tooltipRect.bottom + buffer)
        ) {
          // Check if we're hovering the current cell
          if (hoverPosition.cellElement) {
            const cellRect = hoverPosition.cellElement.getBoundingClientRect();
            if (
              e.clientX >= cellRect.left &&
              e.clientX <= cellRect.right &&
              e.clientY >= cellRect.top &&
              e.clientY <= cellRect.bottom
            ) {
              // Still on the cell, don't hide tooltip
              return;
            }
          }
          
          // Check if we're hovering any calendar cell
          const calendarCells = document.querySelectorAll('.calendar-day-cell');
          for (const cell of calendarCells) {
            const cellRect = cell.getBoundingClientRect();
            if (
              e.clientX >= cellRect.left &&
              e.clientX <= cellRect.right &&
              e.clientY >= cellRect.top &&
              e.clientY <= cellRect.bottom
            ) {
              // On another calendar cell, don't hide tooltip as it will be updated
              return;
            }
          }
          
          // Only hide if we're not on any calendar cell
          setHoverDate(null);
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [hoverDate, isHoveringTooltip, hoverPosition.cellElement]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = direction === 'prev' ? subMonths(prevDate, 1) : addMonths(prevDate, 1);
      // Always set to the 1st of the month
      return new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    });
  };
  
  // Get current month and year from currentDate
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentMonthName = format(currentDate, 'MMMM yyyy');
  
  // Generate calendar grid data
  const generateCalendarGrid = () => {
    // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    // Get the number of days in the month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Create an array of day numbers for the current month
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    // Create an array for the calendar grid (6 weeks x 7 days)
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

  const getReservationsForDate = (dateStr: string | null) => {
    if (!dateStr) return [];
    return allReservations.filter(res => 
      dateStr >= res.startDate && dateStr <= res.endDate && res.status !== 'Cancelled'
    );
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const formatTime = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(Number(hours));
    date.setMinutes(Number(minutes));
    date.setSeconds(0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Generate unique colors for each venue
  const venueColors = venues.reduce((acc, venue, index) => {
    const hue = (index * 137.5) % 360; // Golden ratio to distribute colors
    acc[venue.name] = `hsl(${hue}, 70%, 50%)`;
    return acc;
  }, {} as { [key: string]: string });

  const handleDateClick = (dateStr: string | null) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
    setShowModal(true);
  };

  // Calculate tooltip height dynamically based on content
  const calculateTooltipHeight = (dateStr: string | null): number => {
    if (!dateStr) return 0;
    
    const reservations = getReservationsForDate(dateStr);
    if (reservations.length === 0) return 80; // Height for "No reservations" message
    
    // Base height for the title + padding
    let height = 50; 
    
    // Add height for each reservation (more compact)
    reservations.forEach(() => {
      height += 80; // Reduced height per reservation
    });
    
    return height;
  };

  const handleMouseEnter = (e: React.MouseEvent, dateStr: string | null) => {
    if (!dateStr) return;
    
    // Cancel any pending hide operations
    if (debouncedSetHoverDateRef.current) {
      clearTimeout(debouncedSetHoverDateRef.current);
      debouncedSetHoverDateRef.current = null;
    }
    
    // Get position for the hover tooltip
    const rect = e.currentTarget.getBoundingClientRect();
    const tooltipHeight = calculateTooltipHeight(dateStr);
    
    // Check if there's enough space above the cell
    const spaceAbove = rect.top;
    const shouldShowBelow = spaceAbove < tooltipHeight;
    
    // Calculate position relative to the viewport
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: shouldShowBelow ? rect.bottom : rect.top, // Position at top or bottom based on available space
      showBelow: shouldShowBelow,
      cellElement: e.currentTarget as HTMLElement
    });
    
    setHoverDate(dateStr);
    currentHoverDateRef.current = dateStr;
  };

  const handleMouseLeave = (dateStr: string | null, e: React.MouseEvent) => {
    // Check if we're moving to the tooltip
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      if (
        e.clientX >= tooltipRect.left &&
        e.clientX <= tooltipRect.right &&
        e.clientY >= tooltipRect.top &&
        e.clientY <= tooltipRect.bottom
      ) {
        // Moving to tooltip, don't hide it
        return;
      }
    }
    
    // Update current hover date ref
    if (currentHoverDateRef.current === dateStr) {
      currentHoverDateRef.current = null;
    }
    
    // Only hide the tooltip if we're not hovering over the tooltip itself
    if (!isHoveringTooltip) {
      // Use the debounced version to hide after a small delay
      setHoverDateDebounced(null);
    }
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
    <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 border border-gray-200">
      {/* Add global styles */}
      <style jsx global>{globalStyles}</style>
      
      {/* Heading and Month Selection */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
          <FiCalendar className="mr-2" />
          Venue Bookings Calendar
        </h2>
        <div className="flex items-center space-x-4 mt-2 md:mt-0">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-full hover:bg-blue-100 focus:outline-none text-blue-600"
            aria-label="Previous month"
          >
            <FiChevronLeft size={20} />
          </button>
          <span className="text-lg font-medium text-gray-900">{currentMonthName}</span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-full hover:bg-blue-100 focus:outline-none text-blue-600"
            aria-label="Next month"
          >
            <FiChevronRight size={20} />
          </button>
        </div>
      </div>
      
      <div className="mb-6 bg-gray-50 p-4 rounded-lg overflow-x-auto">
        <div className="flex flex-wrap gap-3">
          {venues.map((venue) => (
            <div 
              key={venue.id} 
              className="flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 whitespace-nowrap"
            >
              <div 
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                style={{ backgroundColor: venueColors[venue.name] }}
              />
              <span className="text-gray-900 font-medium">{venue.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-7 gap-1 text-center font-semibold mb-2">
          <div className="text-gray-900 text-sm md:text-base">Sun</div>
          <div className="text-gray-900 text-sm md:text-base">Mon</div>
          <div className="text-gray-900 text-sm md:text-base">Tue</div>
          <div className="text-gray-900 text-sm md:text-base">Wed</div>
          <div className="text-gray-900 text-sm md:text-base">Thu</div>
          <div className="text-gray-900 text-sm md:text-base">Fri</div>
          <div className="text-gray-900 text-sm md:text-base">Sat</div>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {calendarGrid.map((cell, index) => {
            if (cell.day === null) {
              // Empty cell for days before the 1st of the month
              return (
                <div 
                  key={`empty-${index}`} 
                  className="h-16 md:h-20 rounded-lg border border-gray-200 bg-gray-50"
                ></div>
              );
            }
            
            const reservations = getReservationsForDate(cell.dateStr);
            
            return (
              <div
                key={`day-${cell.day}`}
                onClick={() => handleDateClick(cell.dateStr)}
                onMouseEnter={(e) => handleMouseEnter(e, cell.dateStr)}
                onMouseLeave={(e) => handleMouseLeave(cell.dateStr, e)}
                className={`calendar-day-cell h-16 md:h-20 rounded-lg border ${
                  reservations.length > 0 
                    ? 'border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer' 
                    : 'border-gray-200 bg-white hover:bg-gray-50 cursor-pointer'
                } p-2 relative`}
              >
                <div className="text-gray-900 font-medium mb-2">{cell.day}</div>
                <div className="flex flex-wrap gap-1">
                  {reservations.map((res, idx) => (
                    <div
                      key={`${res.id}-${idx}`}
                      className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full"
                      style={{ backgroundColor: venueColors[res.venueName] }}
                      title={`${res.venueName}: ${res.eventTitle}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverDate && (
        <div 
          ref={tooltipRef}
          className="hover-tooltip fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 no-scrollbar"
          style={{ 
            left: `${hoverPosition.x}px`, 
            top: hoverPosition.showBelow 
              ? `${hoverPosition.y + 10}px` // Show below with a small gap
              : `${hoverPosition.y - 10}px`, // Show above with a small gap
            transform: hoverPosition.showBelow 
              ? 'translateX(-50%)' // Center horizontally when below
              : 'translate(-50%, -100%)', // Center horizontally and position above
            width: '280px',
            maxWidth: '90vw',
            padding: '10px 14px', // Further reduced padding
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
          onMouseEnter={() => setIsHoveringTooltip(true)}
          onMouseLeave={() => {
            setIsHoveringTooltip(false);
            setHoverDate(null);
          }}
        >
          {/* Add a small arrow pointing to the date cell */}
          <div 
            className="absolute w-3.5 h-3.5 bg-white border-b border-r border-gray-200 transform rotate-45"
            style={hoverPosition.showBelow ? {
              top: '-7px',
              left: '50%',
              marginLeft: '-7px',
              borderTop: '1px solid #e5e7eb',
              borderLeft: '1px solid #e5e7eb',
              borderBottom: 'none',
              borderRight: 'none'
            } : {
              bottom: '-7px',
              left: '50%',
              marginLeft: '-7px'
            }}
          ></div>
          
          <h4 className="text-base font-semibold mb-1.5">{formatDate(hoverDate)}</h4>
          
          {getReservationsForDate(hoverDate).length > 0 ? (
            <div className="space-y-1.5">
              {getReservationsForDate(hoverDate).map((res) => (
                <div 
                  key={res.id} 
                  className="border-l-2 pl-2 py-1"
                  style={{ borderColor: venueColors[res.venueName] }}
                >
                  <div className="font-medium text-gray-900 text-sm leading-tight">{res.venueName}: {res.eventTitle}</div>
                  <div className="text-xs text-gray-600 mt-0.5 space-y-0.5">
                    <div className="flex items-center">
                      <FiClock className="mr-1 flex-shrink-0" size={10} />
                      <span className="truncate">{formatTime(res.startTime)} - {formatTime(res.endTime)}</span>
                    </div>
                    <div className="flex items-center">
                      <FiUser className="mr-1 flex-shrink-0" size={10} />
                      <span className="truncate">{res.department}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 italic text-xs">No reservations for this date</div>
          )}
        </div>
      )}

      {/* Modal for date details */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => { setShowModal(false); setSelectedDate(null); }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 md:p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Reservations for {formatDate(selectedDate)}
              </h3>
              
              <div className="space-y-4">
                {getReservationsForDate(selectedDate).map(res => (
                  <div 
                    key={res.id} 
                    className="border-l-4 pl-4 py-3 bg-gray-50 rounded-r-lg" 
                    style={{ borderColor: venueColors[res.venueName] }}
                  >
                    <h4 className="font-semibold text-gray-900 text-lg">{res.venueName} - {res.eventTitle}</h4>
                    <div className="text-gray-700 mt-2 space-y-1">
                      <p className="flex items-center text-gray-800">
                        <span className="font-medium mr-2">Time:</span>
                        {formatTime(res.startTime)} - {formatTime(res.endTime)}
                      </p>
                      <p className="flex items-center text-gray-800">
                        <span className="font-medium mr-2">Reserved by:</span>
                        {res.reservedBy}
                      </p>
                      <p className="flex items-center text-gray-800">
                        <span className="font-medium mr-2">Received by:</span>
                        {res.receivedBy}
                      </p>
                      <p className="flex items-center text-gray-800">
                        <span className="font-medium mr-2">Contact No.:</span>
                        {res.contactNo}
                      </p>
                      {res.notes && (
                        <p className="flex items-start text-gray-800">
                          <span className="font-medium mr-2">Notes:</span>
                          <span className="whitespace-pre-wrap">{res.notes}</span>
                        </p>
                      )}
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
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none"
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
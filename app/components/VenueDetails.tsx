'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { FiCalendar, FiMapPin, FiClock, FiUser, FiMail, FiEdit, FiArrowLeft, FiPlus, FiChevronLeft, FiChevronRight, FiFilter } from 'react-icons/fi';
import { getVenueById, getReservationsByVenue } from '../firebase/services';
import { VenueType, Reservation } from '../types';
import Link from 'next/link';

interface VenueDetailsProps {
  venueId: string;
}

export default function VenueDetails({ venueId }: VenueDetailsProps) {
  const [venue, setVenue] = useState<VenueType | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize with the 1st day of the current month
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  
  // Filtering state
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const venueData = await getVenueById(venueId);
        if (!venueData) {
          setError('Venue not found');
          return;
        }
        
        const reservationsData = await getReservationsByVenue(venueId);
        
        setVenue(venueData);
        setReservations(reservationsData);
        setFilteredReservations(reservationsData);
        setTotalPages(Math.ceil(reservationsData.length / rowsPerPage));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load venue details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [venueId]);
  
  // Apply filters when they change
  useEffect(() => {
    // Apply filters
    let filtered = [...reservations];
    
    // Filter by month
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      const endDate = endOfMonth(new Date(parseInt(year), parseInt(month) - 1));
      
      filtered = filtered.filter(res => {
        const resStartDate = new Date(res.startDate);
        const resEndDate = new Date(res.endDate);
        
        // Check if any part of the reservation falls within the selected month
        return (
          (resStartDate >= startDate && resStartDate <= endDate) || 
          (resEndDate >= startDate && resEndDate <= endDate) ||
          (resStartDate <= startDate && resEndDate >= endDate)
        );
      });
    }
    
    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(res => res.status === selectedStatus);
    }
    
    setFilteredReservations(filtered);
    setTotalPages(Math.ceil(filtered.length / rowsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedMonth, selectedStatus, reservations]);

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
  
  const getAllReservationDates = () => {
    const allDates = new Set<string>();
    
    reservations.forEach(reservation => {
      const dates = getDatesInRange(reservation.startDate, reservation.endDate);
      dates.forEach(date => allDates.add(date));
    });
    
    return Array.from(allDates);
  };
  
  const reservedDates = getAllReservationDates();
  
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
  
  // Get current page of reservations
  const getCurrentPageReservations = () => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredReservations.slice(startIndex, endIndex);
  };
  
  // Get available months from reservations
  const getAvailableMonths = () => {
    const months = new Set<string>();
    
    reservations.forEach(res => {
      // Add start date month
      const startDate = new Date(res.startDate);
      months.add(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`);
      
      // Add end date month if different
      const endDate = new Date(res.endDate);
      months.add(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`);
    });
    
    return Array.from(months).sort();
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Get reservations for a specific date (excluding cancelled)
  const getReservationsForDate = (dateStr: string | null) => {
    if (!dateStr) return [];
    return reservations.filter(res => {
      // Exclude cancelled
      if (res.status === 'Cancelled') return false;
      // Check if the date is within the reservation period
      return dateStr >= res.startDate && dateStr <= res.endDate;
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading venue details...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!venue) {
    return <div className="text-center py-8">Venue not found</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <h1 className="text-2xl font-bold flex items-center text-gray-900">
            <FiMapPin className="mr-2" />
            {venue.name}
          </h1>
          <div className="flex flex-col gap-2 md:flex-row md:space-x-2">
            <Link
              href={`/new-reservation?venue=${venueId}`}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus className="mr-2" />
              Add Reservation
            </Link>
            <Link
              href={`/venues/edit/${venueId}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiEdit className="mr-2" />
              Edit Venue
            </Link>
            <Link
              href="/venues"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiArrowLeft className="mr-2" />
              Back to Venues
            </Link>
          </div>
        </div>
        
        {venue.capacity && (
          <p className="text-gray-900 flex items-center mb-2">
            <FiUser className="mr-2" />
            Capacity: {venue.capacity}
          </p>
        )}
        
        {venue.description && (
          <p className="text-gray-700 mb-4">{venue.description}</p>
        )}
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-900">Total Reservations</p>
            <p className="text-2xl font-bold text-blue-900">{reservations.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-900">Days Reserved</p>
            <p className="text-2xl font-bold text-green-900">{reservedDates.length}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center text-gray-900">
            <FiCalendar className="mr-2" />
            Venue Calendar
          </h2>
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
        
        <div className="mb-8">
          <div className="grid grid-cols-7 gap-1 text-center font-medium mb-2">
            <div className="text-gray-900">Sun</div>
            <div className="text-gray-900">Mon</div>
            <div className="text-gray-900">Tue</div>
            <div className="text-gray-900">Wed</div>
            <div className="text-gray-900">Thu</div>
            <div className="text-gray-900">Fri</div>
            <div className="text-gray-900">Sat</div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarGrid.map((cell, index) => {
              if (cell.day === null) {
                return (
                  <div 
                    key={`empty-${index}`} 
                    className="h-12 rounded border border-gray-200 bg-gray-50"
                  ></div>
                );
              }

              const isReserved = cell.dateStr && reservedDates.includes(cell.dateStr);
              
              return (
                <div
                  key={`day-${cell.day}`}
                  onClick={() => cell.dateStr && isReserved && handleDateClick(cell.dateStr)}
                  className={`h-12 rounded border flex items-center justify-center ${
                    isReserved 
                      ? 'border-blue-300 bg-blue-100 hover:bg-blue-200 text-blue-800 cursor-pointer' 
                      : 'border-gray-200 bg-white text-gray-900'
                  }`}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Reservations</h2>
        
        {reservations.length > 0 ? (
          <>
            {/* Filters */}
            <div className="mb-4 border-b border-gray-200 pb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FiFilter className="inline mr-1" /> Filter by Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">All Months</option>
                    {getAvailableMonths().map(month => {
                      const [year, monthNum] = month.split('-');
                      const monthName = format(new Date(parseInt(year), parseInt(monthNum) - 1), 'MMMM yyyy');
                      return (
                        <option key={month} value={month}>
                          {monthName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FiFilter className="inline mr-1" /> Filter by Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">All Statuses</option>
                    <option value="Processing">Processing</option>
                    <option value="Reserved">Reserved</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date(s)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reserved By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCurrentPageReservations().map((reservation) => (
                    <tr key={reservation.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{reservation.eventTitle}</div>
                        <div className="text-sm text-gray-500">{reservation.department}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reservation.startDate === reservation.endDate
                          ? formatDate(reservation.startDate)
                          : `${formatDate(reservation.startDate)} - ${formatDate(reservation.endDate)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reservation.startTime} - {reservation.endTime}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{reservation.reservedBy}</div>
                        <div className="text-sm text-gray-500">{reservation.contactNo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          reservation.status === 'Confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : reservation.status === 'Cancelled' 
                              ? 'bg-red-100 text-red-800'
                              : reservation.status === 'Processing'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}>
                          {reservation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <button 
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <FiEdit />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredReservations.length > rowsPerPage && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between mt-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{filteredReservations.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * rowsPerPage, filteredReservations.length)}</span> of <span className="font-medium">{filteredReservations.length}</span> reservations
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-gray-500">No reservations for this venue yet.</p>
        )}
      </div>
      
      {/* Modal for reservation details */}
      {showModal && (selectedDate || selectedReservation) && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => { setShowModal(false); setSelectedDate(null); setSelectedReservation(null); }}>
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                {selectedDate 
                  ? `Reservations for ${formatDate(selectedDate)}`
                  : 'Reservation Details'}
              </h3>
              
              {selectedDate && (
                <div className="space-y-4">
                  {getReservationsForDate(selectedDate).map(res => (
                    <div key={res.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-medium text-gray-900">{res.eventTitle}</h4>
                      <div className="text-gray-700 mt-1 space-y-1">
                        <p className="flex items-center text-gray-800">
                          <FiClock className="mr-2" size={14} />
                          {res.startTime} - {res.endTime}
                        </p>
                        <p className="flex items-center text-gray-800">
                          <FiUser className="mr-2" size={14} />
                          {res.reservedBy}
                        </p>
                        <p className="flex items-center text-gray-800">
                          <FiMail className="mr-2" size={14} />
                          {res.contactNo}
                        </p>
                        <p className="flex items-center text-gray-800">
                          <span className="font-medium mr-2">Received by:</span>
                          {res.receivedBy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedReservation && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Event</p>
                      <p className="font-medium text-gray-900">{selectedReservation.eventTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-medium text-gray-900">{selectedReservation.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Reserved By</p>
                      <p className="font-medium text-gray-900">{selectedReservation.reservedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact No</p>
                      <p className="font-medium text-gray-900">{selectedReservation.contactNo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date(s)</p>
                      <p className="font-medium text-gray-900">
                        {selectedReservation.startDate === selectedReservation.endDate
                          ? formatDate(selectedReservation.startDate)
                          : `${formatDate(selectedReservation.startDate)} - ${formatDate(selectedReservation.endDate)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium text-gray-900">{selectedReservation.startTime} - {selectedReservation.endTime}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedReservation.status === 'Confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : selectedReservation.status === 'Cancelled' 
                              ? 'bg-red-100 text-red-800'
                              : selectedReservation.status === 'Processing'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-blue-100 text-blue-800'
                        }`}>
                          {selectedReservation.status}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Link
                      href={{
                        pathname: `/reservations/edit/${selectedReservation.id}`
                      }}
                      className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
                    >
                      Edit Reservation
                    </Link>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedDate(null);
                    setSelectedReservation(null);
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
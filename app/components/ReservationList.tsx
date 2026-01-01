'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { FiEdit, FiTrash2, FiFilter, FiChevronLeft, FiChevronRight, FiChevronDown, FiChevronUp, FiEye, FiClock, FiMapPin, FiUser, FiMail, FiFileText, FiCalendar } from 'react-icons/fi';
import Link from 'next/link';
import { getReservations, getVenues, deleteReservation } from '../firebase/services';
import { Reservation, VenueType } from '../types';

export default function ReservationList() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  // Filtering state
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const rowsPerPage = 10;

  // Helper function to get timestamp value for sorting
  const getTimestamp = (createdAt: any): number => {
    if (!createdAt) return 0;
    if (createdAt.toDate) {
      return createdAt.toDate().getTime();
    }
    if (createdAt instanceof Date) {
      return createdAt.getTime();
    }
    if (typeof createdAt === 'string') {
      return new Date(createdAt).getTime();
    }
    return 0;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reservationsData, venuesData] = await Promise.all([
          getReservations(),
          getVenues()
        ]);
        
        // Sort by createdAt descending (most recent first)
        const sortedReservations = [...reservationsData].sort((a, b) => {
          const timeA = getTimestamp(a.createdAt);
          const timeB = getTimestamp(b.createdAt);
          return timeB - timeA; // Descending order (newest first)
        });
        
        setAllReservations(sortedReservations);
        setReservations(sortedReservations);
        setVenues(venuesData);
        setTotalPages(Math.ceil(sortedReservations.length / rowsPerPage));
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load reservations');
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

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    // Apply filters
    let filtered = [...allReservations];
    
    // Filter by venue
    if (selectedVenue) {
      filtered = filtered.filter(res => res.venueId === selectedVenue);
    }
    
    // Filter by date range
    if (dateRangeStart || dateRangeEnd) {
      filtered = filtered.filter(res => {
        const resStartDate = new Date(res.startDate);
        const resEndDate = new Date(res.endDate);
        
        // Normalize dates to start of day for comparison
        resStartDate.setHours(0, 0, 0, 0);
        resEndDate.setHours(23, 59, 59, 999);
        
        let matchesStart = true;
        let matchesEnd = true;
        
        if (dateRangeStart) {
          const filterStart = new Date(dateRangeStart);
          filterStart.setHours(0, 0, 0, 0);
          // Reservation overlaps if it starts before or on the filter end, and ends after or on the filter start
          matchesStart = resEndDate >= filterStart;
        }
        
        if (dateRangeEnd) {
          const filterEnd = new Date(dateRangeEnd);
          filterEnd.setHours(23, 59, 59, 999);
          // Reservation overlaps if it starts before or on the filter end, and ends after or on the filter start
          matchesEnd = resStartDate <= filterEnd;
        }
        
        // If only one date is selected, check if reservation falls on that date
        if (dateRangeStart && !dateRangeEnd) {
          const filterStart = new Date(dateRangeStart);
          filterStart.setHours(0, 0, 0, 0);
          const filterEnd = new Date(dateRangeStart);
          filterEnd.setHours(23, 59, 59, 999);
          return (resStartDate <= filterEnd && resEndDate >= filterStart);
        }
        
        if (!dateRangeStart && dateRangeEnd) {
          const filterEnd = new Date(dateRangeEnd);
          filterEnd.setHours(23, 59, 59, 999);
          return resStartDate <= filterEnd;
        }
        
        // Both dates selected - check if reservation overlaps with the range
        return matchesStart && matchesEnd;
      });
    }
    
    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(res => res.status === selectedStatus);
    }
    
    // Filter by event title (case-insensitive, debounced)
    if (debouncedSearchTerm.trim() !== '') {
      filtered = filtered.filter(res =>
        res.eventTitle.toLowerCase().includes(debouncedSearchTerm.trim().toLowerCase())
      );
    }
    
    // Sort by createdAt descending (most recent first)
    filtered.sort((a, b) => {
      const timeA = getTimestamp(a.createdAt);
      const timeB = getTimestamp(b.createdAt);
      return timeB - timeA; // Descending order (newest first)
    });
    
    setReservations(filtered);
    setTotalPages(Math.ceil(filtered.length / rowsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [dateRangeStart, dateRangeEnd, selectedVenue, selectedStatus, allReservations, debouncedSearchTerm]);

  const handleDelete = async () => {
    if (!reservationToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deleteReservation(reservationToDelete);
      
      // Update both the filtered and all reservations lists
      const updatedReservations = allReservations.filter(res => res.id !== reservationToDelete);
      setAllReservations(updatedReservations);
      setReservations(prev => prev.filter(res => res.id !== reservationToDelete));
      
      setShowDeleteModal(false);
      setReservationToDelete(null);
      
      // Update total pages
      setTotalPages(Math.ceil(reservations.length / rowsPerPage));
      if (currentPage > Math.ceil(reservations.length / rowsPerPage) && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error('Error deleting reservation:', error);
      setError('Failed to delete reservation');
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
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
  
  // Get current page of reservations
  const getCurrentPageReservations = () => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return reservations.slice(startIndex, endIndex);
  };
  
  // Get min and max dates from reservations for date picker limits
  const getDateRange = () => {
    if (allReservations.length === 0) {
      return { min: '', max: '' };
    }
    
    const dates = allReservations.flatMap(res => [
      new Date(res.startDate),
      new Date(res.endDate)
    ]);
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return {
      min: format(minDate, 'yyyy-MM-dd'),
      max: format(maxDate, 'yyyy-MM-dd')
    };
  };

  const dateRange = getDateRange();

  const handleClearDateRange = () => {
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  const handleTodayRange = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setDateRangeStart(today);
    setDateRangeEnd(today);
  };

  const hasActiveDateRange = Boolean(dateRangeStart || dateRangeEnd);

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
    return <div className="text-center py-8 text-gray-900">Loading reservations...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (allReservations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-700">
        No reservations found. Create a new reservation to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters & Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search by Event Title</label>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Enter event title..."
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              style={{ top: '50%' }}
              aria-label="Clear search"
            >
              &#10005;
            </button>
          )}
        </div>
        
        {/* Mobile: Toggle Filters Button */}
        <button
          type="button"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="md:hidden w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-4 p-2 -mx-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="flex items-center">
            <FiFilter className="mr-2" size={16} />
            Filters
            {(dateRangeStart || dateRangeEnd || selectedVenue || selectedStatus) && (
              <span className="ml-2 text-xs text-blue-600 font-normal">
                (Active)
              </span>
            )}
          </span>
          {filtersExpanded ? (
            <FiChevronUp className="text-gray-500" size={16} />
          ) : (
            <FiChevronDown className="text-gray-500" size={16} />
          )}
        </button>
        
        {/* Filters Section - Hidden on mobile by default, visible on desktop */}
        <div className={`md:block ${filtersExpanded ? 'block' : 'hidden'}`}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-2" size={16} /> Filter by Date Range
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleTodayRange}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
              >
                Today
              </button>
              <div className="flex-1">
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  min={dateRange.min}
                  max={dateRangeEnd || dateRange.max}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  placeholder="Start date"
                />
              </div>
              <div className="flex items-center justify-center text-gray-500 text-sm py-2 sm:py-0">
                to
              </div>
              <div className="flex-1">
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  min={dateRangeStart || dateRange.min}
                  max={dateRange.max}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  placeholder="End date"
                />
              </div>
              <button
                type="button"
                onClick={handleClearDateRange}
                disabled={!hasActiveDateRange}
                className={`px-3 py-2 text-sm rounded-md border whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasActiveDateRange
                    ? 'text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50 bg-white'
                    : 'text-gray-400 border-gray-200 bg-gray-50 cursor-not-allowed'
                }`}
              >
                Clear
              </button>
            </div>
            {(dateRangeStart || dateRangeEnd) && (
              <p className="mt-1 text-xs text-gray-500">
                {dateRangeStart && dateRangeEnd
                  ? `Showing reservations from ${format(new Date(dateRangeStart), 'MMM d, yyyy')} to ${format(new Date(dateRangeEnd), 'MMM d, yyyy')}`
                  : dateRangeStart
                  ? `Showing reservations from ${format(new Date(dateRangeStart), 'MMM d, yyyy')} onwards`
                  : `Showing reservations up to ${format(new Date(dateRangeEnd), 'MMM d, yyyy')}`}
              </p>
            )}
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiFilter className="inline mr-2" size={16} /> Filter by Venue
            </label>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            >
              <option value="">All Venues</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiFilter className="inline mr-2" size={16} /> Filter by Status
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
      </div>

      <div className="w-full" style={{ minHeight: '540px' }}>
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/4">Event</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/4">Venue</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/5 hidden md:table-cell">Date(s)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/5 hidden md:table-cell">Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/5 hidden md:table-cell">Reserved By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-1/6 hidden md:table-cell">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider text-center w-1/6">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {getCurrentPageReservations().map((reservation) => (
              <tr key={reservation.id}>
                <td className="px-4 py-4 align-top max-w-[180px]">
                  <div className="text-sm font-medium text-gray-900 truncate" title={reservation.eventTitle}>{reservation.eventTitle}</div>
                  <div className="text-sm text-gray-700 whitespace-normal break-words">{reservation.department}</div>
                </td>
                <td className="px-4 py-4 align-top max-w-[140px]">
                  <div className="flex items-center">
                    <span 
                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                      style={{ backgroundColor: venueColors[reservation.venueId] }}
                    />
                    <span className="text-sm text-gray-700 truncate" title={reservation.venueName}>{reservation.venueName}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 hidden md:table-cell align-top max-w-[120px] truncate">
                  {reservation.startDate === reservation.endDate
                    ? formatDate(reservation.startDate)
                    : `${formatDate(reservation.startDate)} - ${formatDate(reservation.endDate)}`}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 hidden md:table-cell align-top">
                  {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}
                </td>
                <td className="px-4 py-4 hidden md:table-cell align-top max-w-[120px]">
                  <div className="text-sm text-gray-900 truncate" title={reservation.reservedBy}>{reservation.reservedBy}</div>
                  <div className="text-sm text-gray-700 truncate" title={reservation.contactNo}>{reservation.contactNo}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap hidden md:table-cell align-top">
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
                <td className="px-4 py-4 whitespace-nowrap text-center text-sm align-top">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedReservation(reservation);
                        setShowDetailsModal(true);
                      }}
                      className="text-gray-600 hover:text-gray-900"
                      title="View Details"
                    >
                      <FiEye />
                    </button>
                    <Link href={`/reservations/edit/${reservation.id}`} className="text-blue-600 hover:text-blue-900" title="Edit">
                      <FiEdit />
                    </Link>
                    <button 
                      onClick={() => {
                        setReservationToDelete(reservation.id);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Delete"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{reservations.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * rowsPerPage, reservations.length)}</span> of <span className="font-medium">{reservations.length}</span> reservations
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => { setShowDeleteModal(false); setReservationToDelete(null); }}>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-900">Confirm Deletion</h3>
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this reservation? This action cannot be undone.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setReservationToDelete(null);
                  }}
                  className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Details Modal */}
      {showDetailsModal && selectedReservation && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-900">
                Reservation Details
              </h3>
              
              <div className="space-y-6">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-200">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{selectedReservation.eventTitle}</h4>
                    <p className="text-gray-600">{selectedReservation.department}</p>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
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
                  </div>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center mb-2">
                      <FiMapPin className="text-gray-500 mr-2" size={16} />
                      <p className="text-sm font-medium text-gray-700">Venue</p>
                    </div>
                    <p className="text-gray-900 ml-6">{selectedReservation.venueName}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <FiClock className="text-gray-500 mr-2" size={16} />
                      <p className="text-sm font-medium text-gray-700">Time</p>
                    </div>
                    <p className="text-gray-900 ml-6">{formatTime(selectedReservation.startTime)} - {formatTime(selectedReservation.endTime)}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <FiCalendar className="text-gray-500 mr-2" size={16} />
                      <p className="text-sm font-medium text-gray-700">Date(s)</p>
                    </div>
                    <p className="text-gray-900 ml-6">
                      {selectedReservation.startDate === selectedReservation.endDate
                        ? formatDate(selectedReservation.startDate)
                        : `${formatDate(selectedReservation.startDate)} - ${formatDate(selectedReservation.endDate)}`}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <FiUser className="text-gray-500 mr-2" size={16} />
                      <p className="text-sm font-medium text-gray-700">Reserved By</p>
                    </div>
                    <p className="text-gray-900 ml-6">{selectedReservation.reservedBy}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <FiMail className="text-gray-500 mr-2" size={16} />
                      <p className="text-sm font-medium text-gray-700">Contact No</p>
                    </div>
                    <p className="text-gray-900 ml-6">{selectedReservation.contactNo}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <FiUser className="text-gray-500 mr-2" size={16} />
                      <p className="text-sm font-medium text-gray-700">Received By</p>
                    </div>
                    <p className="text-gray-900 ml-6">{selectedReservation.receivedBy}</p>
                  </div>
                </div>
                
                {/* Created At */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center mb-2">
                    <FiCalendar className="text-gray-500 mr-2" size={16} />
                    <p className="text-sm font-medium text-gray-700">Added on</p>
                  </div>
                  <p className="text-gray-900 ml-6">
                    {selectedReservation.createdAt &&
                      (typeof selectedReservation.createdAt === 'string'
                        ? formatDate(selectedReservation.createdAt)
                        : formatDate(selectedReservation.createdAt.toDate ? selectedReservation.createdAt.toDate() : selectedReservation.createdAt))}
                  </p>
                </div>
                
                {/* Notes Section */}
                {selectedReservation.notes && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center mb-2">
                      <FiFileText className="text-gray-500 mr-2" size={16} />
                      <p className="text-sm font-medium text-gray-700">Notes / Details</p>
                    </div>
                    <p className="text-gray-900 ml-6 whitespace-pre-wrap">{selectedReservation.notes}</p>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4">
                  <Link
                    href={`/reservations/edit/${selectedReservation.id}`}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Reservation
                  </Link>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
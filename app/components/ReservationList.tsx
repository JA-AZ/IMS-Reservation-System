'use client';

import { useState, useEffect, useRef } from 'react';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';
import { FiEdit, FiTrash2, FiFilter, FiChevronLeft, FiChevronRight, FiEye, FiClock, FiMapPin, FiUser, FiMail, FiFileText, FiCalendar } from 'react-icons/fi';
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
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reservationsData, venuesData] = await Promise.all([
          getReservations(),
          getVenues()
        ]);
        setAllReservations(reservationsData);
        setReservations(reservationsData);
        setVenues(venuesData);
        setTotalPages(Math.ceil(reservationsData.length / rowsPerPage));
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
    
    // Filter by event title (case-insensitive, debounced)
    if (debouncedSearchTerm.trim() !== '') {
      filtered = filtered.filter(res =>
        res.eventTitle.toLowerCase().includes(debouncedSearchTerm.trim().toLowerCase())
      );
    }
    
    setReservations(filtered);
    setTotalPages(Math.ceil(filtered.length / rowsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedMonth, selectedVenue, selectedStatus, allReservations, debouncedSearchTerm]);

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
  
  // Get available months from reservations
  const getAvailableMonths = () => {
    const months = new Set<string>();
    
    allReservations.forEach(res => {
      // Add start date month
      const startDate = new Date(res.startDate);
      months.add(`${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`);
      
      // Add end date month if different
      const endDate = new Date(res.endDate);
      months.add(`${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`);
    });
    
    return Array.from(months).sort();
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
              <FiFilter className="inline mr-1" /> Filter by Venue
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
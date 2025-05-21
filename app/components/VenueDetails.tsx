'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FiCalendar, FiMapPin, FiClock, FiUser, FiMail, FiEdit } from 'react-icons/fi';
import { getVenueById, getReservationsByVenue } from '../firebase/services';
import { VenueType, Reservation } from '../types';
import Link from 'next/link';

interface VenueDetailsProps {
  venueId: string;
}

export default function VenueDetails({ venueId }: VenueDetailsProps) {
  const [venue, setVenue] = useState<VenueType | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

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
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load venue details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [venueId]);

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
        <h1 className="text-2xl font-bold mb-4 flex items-center">
          <FiMapPin className="mr-2" />
          {venue.name}
        </h1>
        
        {venue.capacity && (
          <p className="text-gray-700 flex items-center mb-2">
            <FiUser className="mr-2" />
            Capacity: {venue.capacity}
          </p>
        )}
        
        {venue.description && (
          <p className="text-gray-600 mb-4">{venue.description}</p>
        )}
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">Total Reservations</p>
            <p className="text-2xl font-bold text-blue-600">{reservations.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">Days Reserved</p>
            <p className="text-2xl font-bold text-green-600">{reservedDates.length}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FiCalendar className="mr-2" />
          Venue Calendar
        </h2>
        
        <div className="mb-8">
          <div className="grid grid-cols-7 gap-1 text-center font-medium mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Add empty cells for days before the 1st of the month */}
            {Array.from({ length: new Date(currentYear, currentMonth, 1).getDay() }).map((_, i) => (
              <div key={`empty-start-${i}`} className="h-12 rounded border border-gray-200 bg-gray-50"></div>
            ))}
            
            {monthDates.map((dateStr) => {
              const isReserved = reservedDates.includes(dateStr);
              const date = new Date(dateStr);
              const day = date.getDate();
              
              return (
                <div
                  key={dateStr}
                  onClick={() => isReserved && handleDateClick(dateStr)}
                  className={`h-12 rounded border flex items-center justify-center cursor-pointer ${
                    isReserved 
                      ? 'border-blue-300 bg-blue-100 hover:bg-blue-200 text-blue-800' 
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">Reservations</h2>
        
        {reservations.length > 0 ? (
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
                {reservations.map((reservation) => (
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
                      <div className="text-sm text-gray-500">{reservation.email}</div>
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
        ) : (
          <p className="text-gray-500">No reservations for this venue yet.</p>
        )}
      </div>
      
      {/* Modal for reservation details */}
      {showModal && (selectedDate || selectedReservation) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {selectedDate 
                  ? `Reservations for ${formatDate(selectedDate)}`
                  : 'Reservation Details'}
              </h3>
              
              {selectedDate && (
                <div className="space-y-4">
                  {reservations
                    .filter(res => selectedDate >= res.startDate && selectedDate <= res.endDate)
                    .map(res => (
                      <div key={res.id} className="border-l-4 border-blue-500 pl-4 py-2">
                        <h4 className="font-medium">{res.eventTitle}</h4>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <p className="flex items-center">
                            <FiClock className="mr-2" size={14} />
                            {res.startTime} - {res.endTime}
                          </p>
                          <p className="flex items-center">
                            <FiUser className="mr-2" size={14} />
                            {res.reservedBy}
                          </p>
                          <p className="flex items-center">
                            <FiMail className="mr-2" size={14} />
                            {res.email}
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
                      <p className="font-medium">{selectedReservation.eventTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-medium">{selectedReservation.department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Reserved By</p>
                      <p className="font-medium">{selectedReservation.reservedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{selectedReservation.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date(s)</p>
                      <p className="font-medium">
                        {selectedReservation.startDate === selectedReservation.endDate
                          ? formatDate(selectedReservation.startDate)
                          : `${formatDate(selectedReservation.startDate)} - ${formatDate(selectedReservation.endDate)}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">{selectedReservation.startTime} - {selectedReservation.endTime}</p>
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
                      href={`/reservations/edit/${selectedReservation.id}`}
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
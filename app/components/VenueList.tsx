'use client';

import { useState, useEffect } from 'react';
import { FiMapPin, FiUsers, FiCalendar, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import { getVenues, getReservationsByVenue } from '../firebase/services';
import { VenueType, Reservation } from '../types';
import { format, subMonths, addMonths } from 'date-fns';

export default function VenueList() {
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [allReservations, setAllReservations] = useState<(Reservation & { venueName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const venuesData = await getVenues();
        setVenues(venuesData);

        // Fetch reservations for all venues
        const allReservationsPromises = venuesData.map(async (venue) => {
          const reservations = await getReservationsByVenue(venue.id);
          return reservations.map(res => ({ ...res, venueName: venue.name }));
        });
        
        const reservationsData = await Promise.all(allReservationsPromises);
        setAllReservations(reservationsData.flat());
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load venues');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const getReservationsForDate = (dateStr: string) => {
    return allReservations.filter(res => 
      dateStr >= res.startDate && dateStr <= res.endDate
    );
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Generate unique colors for each venue
  const venueColors = venues.reduce((acc, venue, index) => {
    const hue = (index * 137.5) % 360; // Golden ratio to distribute colors
    acc[venue.name] = `hsl(${hue}, 70%, 50%)`;
    return acc;
  }, {} as { [key: string]: string });

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setShowModal(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = direction === 'prev' ? subMonths(prevDate, 1) : addMonths(prevDate, 1);
      // Always set to the 1st of the month
      return new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-900">Loading venues...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-900">
        No venues found. Add a new venue to get started.
      </div>
    );
  }

  return (
    <div className="space-y-8">
           

      {/* Venue Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {venues.map((venue) => (
          <div key={venue.id} className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-blue-600 text-white p-4">
              <h3 className="font-bold text-lg flex items-center">
                <FiMapPin className="mr-2" />
                {venue.name}
              </h3>
            </div>
            
            <div className="p-6">
              {venue.capacity && (
                <p className="text-gray-900 flex items-center mb-3 text-lg">
                  <FiUsers className="mr-2 text-blue-600" />
                  <span className="font-medium">Capacity:</span> 
                  <span className="ml-2">{venue.capacity}</span>
                </p>
              )}
              
              {venue.description && (
                <p className="text-gray-700 mb-4 leading-relaxed">{venue.description}</p>
              )}
              
              <Link
                href={`/venues/${venue.id}`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>View Details</span>
                <FiArrowRight className="ml-2" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for date details */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
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
                      <p className="flex items-center">
                        <span className="font-medium mr-2">Time:</span>
                        {res.startTime} - {res.endTime}
                      </p>
                      <p className="flex items-center">
                        <span className="font-medium mr-2">Reserved by:</span>
                        {res.reservedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedDate(null);
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-medium"
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
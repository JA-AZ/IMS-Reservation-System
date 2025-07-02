'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiActivity, FiPieChart, FiBarChart2, FiAlertCircle } from 'react-icons/fi';
import { getTodayReservations, getUpcomingReservations, getReservations, getVenues } from '../firebase/services';
import { Reservation, VenueType } from '../types';
import Link from 'next/link';

export default function DashboardContent() {
  const [todayEvents, setTodayEvents] = useState<Reservation[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('week');
  const [selectedEvent, setSelectedEvent] = useState<Reservation | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [todayRes, upcomingRes, allRes, venuesData] = await Promise.all([
          getTodayReservations(),
          getUpcomingReservations(),
          getReservations(),
          getVenues()
        ]);
        
        setTodayEvents(todayRes);
        setUpcomingEvents(upcomingRes);
        setAllReservations(allRes);
        setVenues(venuesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    // Assume timeString is 'HH:mm' or 'HH:mm:ss'
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(Number(hours));
    date.setMinutes(Number(minutes));
    date.setSeconds(0);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Calculate statistics
  const getStatsByStatus = () => {
    const stats = {
      Confirmed: 0,
      Reserved: 0,
      Processing: 0,
      Cancelled: 0
    };
    
    allReservations.forEach(res => {
      if (stats[res.status as keyof typeof stats] !== undefined) {
        stats[res.status as keyof typeof stats]++;
      }
    });
    
    return stats;
  };
  
  const getVenueUsage = () => {
    const usage: Record<string, number> = {};
    
    venues.forEach(venue => {
      usage[venue.id] = 0;
    });
    
    allReservations.forEach(res => {
      if (usage[res.venueId] !== undefined) {
        usage[res.venueId]++;
      }
    });
    
    return usage;
  };
  
  const getMostUsedVenues = () => {
    const usage = getVenueUsage();
    return Object.entries(usage)
      .map(([id, count]) => ({
        id,
        name: venues.find(v => v.id === id)?.name || 'Unknown',
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };
  
  const getFilteredEvents = () => {
    const now = new Date();
    const filtered = allReservations.filter(res => {
      const startDate = parseISO(res.startDate);
      const endDate = parseISO(res.endDate);
      if (timeframe === 'today') return isToday(startDate);
      if (timeframe === 'week') {
        // Only include if event is this week and not fully in the past
        return isThisWeek(startDate) && (endDate >= now);
      }
      if (timeframe === 'month') return isThisMonth(startDate);
      return true;
    });
    // Sort by startDate and startTime ascending
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startDate + 'T' + a.startTime);
      const dateB = new Date(b.startDate + 'T' + b.startTime);
      return dateA.getTime() - dateB.getTime();
    });
  };
  
  const getStatusCounts = () => {
    const stats = getStatsByStatus();
    return [
      { name: 'Confirmed', value: stats.Confirmed, color: 'bg-green-500' },
      { name: 'Reserved', value: stats.Reserved, color: 'bg-blue-500' },
      { name: 'Processing', value: stats.Processing, color: 'bg-yellow-500' },
      { name: 'Cancelled', value: stats.Cancelled, color: 'bg-red-500' }
    ];
  };
  
  const getTotalBookings = () => allReservations.length;
  const getActiveBookings = () => allReservations.filter(res => res.status !== 'Cancelled').length;
  const getCancellationRate = () => {
    const total = getTotalBookings();
    if (total === 0) return 0;
    const cancelled = allReservations.filter(res => res.status === 'Cancelled').length;
    return Math.round((cancelled / total) * 100);
  };
  
  // Generate unique colors for each venue
  const venueColors = venues.reduce((acc, venue, index) => {
    const hue = (index * 137.5) % 360; // Golden ratio to distribute colors
    acc[venue.id] = `hsl(${hue}, 70%, 50%)`;
    return acc;
  }, {} as { [key: string]: string });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-2 md:mt-0 flex space-x-1">
          <button 
            onClick={() => setTimeframe('today')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'today' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Today
          </button>
          <button 
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Week
          </button>
          <button 
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 text-sm rounded-md ${
              timeframe === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <FiCalendar size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{getTotalBookings()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <FiActivity size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{getActiveBookings()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <FiMapPin size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Venues</p>
              <p className="text-2xl font-bold text-gray-900">{venues.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 text-red-600">
              <FiAlertCircle size={20} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Cancellation Rate</p>
              <p className="text-2xl font-bold text-gray-900">{getCancellationRate()}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* This Week's Events */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center text-gray-900">
              <FiCalendar className="mr-2" /> This Week's Events
            </h2>
            <Link href="/reservations" className="text-sm text-blue-600 hover:text-blue-800">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
          ) : getFilteredEvents().length > 0 ? (
            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2">
              {getFilteredEvents().map((event) => (
                <div
                  key={event.id}
                  className="border-l-4 pl-4 py-3 bg-gray-50 rounded-r-lg cursor-pointer hover:bg-gray-100 transition"
                  style={{ borderColor: venueColors[event.venueId] }}
                  onClick={() => { setSelectedEvent(event); setShowEventModal(true); }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{event.eventTitle}</h3>
                      <div className="text-sm text-gray-700 mt-1 space-y-1">
                        <p className="flex items-center">
                          <FiClock className="mr-2" size={14} />
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </p>
                        <p className="flex items-center">
                          <FiMapPin className="mr-2" size={14} />
                          {event.venueName}
                        </p>
                        <p className="flex items-center">
                          <FiCalendar className="mr-2" size={14} />
                          {event.startDate === event.endDate ? formatDate(event.startDate) : `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        event.status === 'Confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : event.status === 'Cancelled' 
                            ? 'bg-red-100 text-red-800'
                            : event.status === 'Processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No events scheduled for this week.
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
            <FiPieChart className="mr-2" /> Reservation Status
          </h2>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {getStatusCounts().map((status) => (
                <div key={status.name} className="flex items-center">
                  <div className="w-full">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{status.name}</span>
                      <span className="text-sm font-medium text-gray-700">{status.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${status.color} h-2 rounded-full`} 
                        style={{ 
                          width: `${getTotalBookings() > 0 ? (status.value / getTotalBookings()) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <h2 className="text-lg font-semibold mt-8 mb-4 flex items-center text-gray-900">
            <FiBarChart2 className="mr-2" /> Most Used Venues
          </h2>
          
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
          ) : (
            <div className="space-y-3">
              {getMostUsedVenues().map((venue) => (
                <div key={venue.id} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: venueColors[venue.id] }}
                  ></div>
                  <div className="w-full">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">
                        {venue.name}
                      </span>
                      <span className="text-sm font-medium text-gray-700">{venue.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(venue.count / Math.max(...getMostUsedVenues().map(v => v.count)) * 100, 5)}%`,
                          backgroundColor: venueColors[venue.id]
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
          <Link href="/reservations" className="text-sm text-blue-600 hover:text-blue-800">
            View All
          </Link>
        </div>
        
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-pulse text-gray-500">Loading...</div>
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <tr key={event.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{event.eventTitle}</div>
                      <div className="text-sm text-gray-500">{event.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: venueColors[event.venueId] }}
                        ></span>
                        <span className="text-sm text-gray-700">{event.venueName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(event.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.startTime} - {event.endTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        event.status === 'Confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : event.status === 'Cancelled' 
                            ? 'bg-red-100 text-red-800'
                            : event.status === 'Processing'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-gray-500">
            No upcoming events scheduled.
          </div>
        )}
      </div>
      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowEventModal(false)}>
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Event Details</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Event Title</p>
                    <p className="font-medium text-gray-900">{selectedEvent.eventTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Venue</p>
                    <p className="font-medium text-gray-900">{selectedEvent.venueName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date(s)</p>
                    <p className="font-medium text-gray-900">{selectedEvent.startDate === selectedEvent.endDate ? formatDate(selectedEvent.startDate) : `${formatDate(selectedEvent.startDate)} - ${formatDate(selectedEvent.endDate)}`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reserved By</p>
                    <p className="font-medium text-gray-900">{selectedEvent.reservedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Received By</p>
                    <p className="font-medium text-gray-900">{selectedEvent.receivedBy}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contact No.</p>
                    <p className="font-medium text-gray-900">{selectedEvent.contactNo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedEvent.status === 'Confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : selectedEvent.status === 'Cancelled' 
                          ? 'bg-red-100 text-red-800'
                          : selectedEvent.status === 'Processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>
                {selectedEvent.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="font-medium text-gray-900 whitespace-pre-wrap">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowEventModal(false)}
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
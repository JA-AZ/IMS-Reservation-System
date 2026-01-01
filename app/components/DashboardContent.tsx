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

  // Check if venue has a reservation today
  const venueHasReservationToday = (venueId: string): boolean => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return allReservations.some(res => {
      if (res.status === 'Cancelled') return false;
      if (res.venueId !== venueId) return false;
      return today >= res.startDate && today <= res.endDate;
    });
  };

  // Get venue status for today
  const getVenueStatus = (venue: VenueType) => {
    const hasReservation = venueHasReservationToday(venue.id);
    return {
      hasReservation,
      status: hasReservation ? 'Has Reservation' : 'Available',
      statusColor: hasReservation ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800',
      dotColor: hasReservation ? 'bg-red-500' : 'bg-green-500'
    };
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

  const todayLabel = format(new Date(), 'EEEE, MMM d, yyyy');
  const totalBookings = getTotalBookings();
  const totalToday = todayEvents.length;
  const totalUpcoming = upcomingEvents.length;
  const venuesInUse = new Set(allReservations.map(res => res.venueId)).size;

  return (
    <div className="space-y-6">
      {/* Top banner & actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            High‑level view of reservations, venue usage, and upcoming events.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {todayLabel} &middot; {totalBookings} total bookings across {venues.length} venue
            {venues.length === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 justify-start md:justify-end">
          {/* Timeframe toggle */}
          <div className="inline-flex rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 whitespace-nowrap ${
                timeframe === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('week')}
              className={`px-3 py-1.5 border-l border-gray-200 whitespace-nowrap ${
                timeframe === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 border-l border-gray-200 whitespace-nowrap ${
                timeframe === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              This month
            </button>
          </div>

          {/* Quick actions */}
          <Link
            href="/new-reservation"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            + New reservation
          </Link>
          <Link
            href="/new-item-borrowing"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            + New item borrowing
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Total bookings
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{totalBookings}</p>
            <p className="mt-1 text-xs text-gray-500">
              {getActiveBookings()} active, {getCancellationRate()}% cancelled
            </p>
          </div>
          <div className="p-3 rounded-full bg-blue-50 text-blue-600 flex-shrink-0">
            <FiCalendar size={22} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Today&apos;s events
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{totalToday}</p>
            <p className="mt-1 text-xs text-gray-500">
              {totalToday === 0 ? 'No bookings today' : 'Booked for today'}
            </p>
          </div>
          <div className="p-3 rounded-full bg-green-50 text-green-600 flex-shrink-0">
            <FiActivity size={22} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Upcoming events
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{totalUpcoming}</p>
            <p className="mt-1 text-xs text-gray-500">
              Next 5 are shown below in Upcoming Events.
            </p>
          </div>
          <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 flex-shrink-0">
            <FiClock size={22} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              Venues in use
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {venuesInUse}/{venues.length || 0}
            </p>
            <p className="mt-1 text-xs text-gray-500">Distinct venues with at least one booking.</p>
          </div>
          <div className="p-3 rounded-full bg-yellow-50 text-yellow-600 flex-shrink-0">
            <FiMapPin size={22} />
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

        {/* Venue Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-900">
            <FiMapPin className="mr-2" /> Venue Status Today
          </h2>
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
          ) : venues.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No venues available
            </div>
          ) : (
            <div className="space-y-3">
              {venues.map((venue) => {
                const status = getVenueStatus(venue);
                return (
                  <Link
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {venue.name}
                        </div>
                        {venue.capacity && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Cap: {venue.capacity}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center ml-4 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${status.dotColor} mr-2`}></div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.statusColor}`}>
                        {status.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
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
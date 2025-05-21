'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FiCalendar, FiClock, FiMapPin } from 'react-icons/fi';
import { getTodayReservations, getUpcomingReservations } from '../firebase/services';
import { Reservation } from '../types';

export default function DashboardContent() {
  const [todayEvents, setTodayEvents] = useState<Reservation[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const todayRes = await getTodayReservations();
        const upcomingRes = await getUpcomingReservations();
        
        setTodayEvents(todayRes);
        setUpcomingEvents(upcomingRes);
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FiCalendar className="mr-2" /> Today's Events
          </h2>
          {loading ? (
            <p>Loading...</p>
          ) : todayEvents.length > 0 ? (
            <div className="space-y-4">
              {todayEvents.map((event) => (
                <div key={event.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-medium">{event.eventTitle}</h3>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <p className="flex items-center">
                      <FiClock className="mr-2" size={14} />
                      {event.startTime} - {event.endTime}
                    </p>
                    <p className="flex items-center">
                      <FiMapPin className="mr-2" size={14} />
                      {event.venueName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No events scheduled for today.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">Today's Events</p>
              <p className="text-2xl font-bold text-blue-600">{todayEvents.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">Upcoming Events</p>
              <p className="text-2xl font-bold text-green-600">{upcomingEvents.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
        {loading ? (
          <p>Loading...</p>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.venueName}
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
          <p className="text-gray-500">No upcoming events scheduled.</p>
        )}
      </div>
    </div>
  );
} 
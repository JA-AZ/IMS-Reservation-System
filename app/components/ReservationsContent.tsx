'use client';

import ReservationList from './ReservationList';
import VenueBookingsCalendar from './VenueBookingsCalendar';

export default function ReservationsContent() {
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
      
      {/* Calendar Section */}
      <VenueBookingsCalendar />
      
      {/* All Reservations Section */}
      <div>
        <h2 className="text-xl font-semibold mb-6 text-gray-900">All Reservations</h2>
        <ReservationList />
      </div>
    </div>
  );
}
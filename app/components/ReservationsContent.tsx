'use client';

import ReservationList from './ReservationList';
import VenueBookingsCalendar from './VenueBookingsCalendar';
import Link from 'next/link';

export default function ReservationsContent() {
  return (
    <div className="relative space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
        <Link href="/new-reservation" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition">
          New Reservation
        </Link>
      </div>
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
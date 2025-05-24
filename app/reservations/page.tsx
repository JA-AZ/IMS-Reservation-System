import AdminLayout from '../components/AdminLayout';
import ReservationList from '../components/ReservationList';
import VenueBookingsCalendar from '../components/VenueBookingsCalendar';

export default function ReservationsPage() {
  return (
    <AdminLayout>
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
    </AdminLayout>
  );
} 
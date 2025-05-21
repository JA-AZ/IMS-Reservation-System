import AdminLayout from '../components/AdminLayout';
import ReservationList from '../components/ReservationList';

export default function ReservationsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold mb-6">All Reservations</h1>
        <ReservationList />
      </div>
    </AdminLayout>
  );
} 
import AdminLayout from '../components/AdminLayout';
import ReservationForm from '../components/ReservationForm';
import { Suspense } from 'react';

export default function NewReservationPage() {
  return (
    <AdminLayout>
      <Suspense fallback={<div className="text-center py-8">Loading reservation form...</div>}>
        <ReservationForm />
      </Suspense>
    </AdminLayout>
  );
} 
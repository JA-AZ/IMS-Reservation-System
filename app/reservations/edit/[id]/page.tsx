'use client';

import AdminLayout from '../../../components/AdminLayout';
import EditReservationForm from '../../../components/EditReservationForm';
import { useParams } from 'next/navigation';

export default function EditReservationPage() {
  const params = useParams();
  const id = params?.id as string;
  
  if (!id) {
    return (
      <AdminLayout>
        <div className="text-center py-8">Reservation not found</div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <EditReservationForm reservationId={id} />
    </AdminLayout>
  );
} 
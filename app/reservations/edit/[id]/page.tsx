import AdminLayout from '../../../components/AdminLayout';
import EditReservationForm from '../../../components/EditReservationForm';

export default function EditReservationPage({ params }: { params: { id: string } }) {
  return (
    <AdminLayout>
      <EditReservationForm reservationId={params.id} />
    </AdminLayout>
  );
} 
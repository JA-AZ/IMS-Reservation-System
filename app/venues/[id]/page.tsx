import AdminLayout from '../../components/AdminLayout';
import VenueDetails from '../../components/VenueDetails';

export default function VenuePage({ params }: { params: any }) {
  return (
    <AdminLayout>
      <VenueDetails venueId={params.id} />
    </AdminLayout>
  );
} 
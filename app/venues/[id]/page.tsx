import AdminLayout from '../../components/AdminLayout';
import VenueDetails from '../../components/VenueDetails';

type Props = {
  params: {
    id: string
  }
}

export default async function VenuePage({ params }: Props) {
  return (
    <AdminLayout>
      <VenueDetails venueId={params.id} />
    </AdminLayout>
  );
} 
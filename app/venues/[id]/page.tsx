import AdminLayout from '../../components/AdminLayout';
import VenueDetails from '../../components/VenueDetails';

interface PageProps {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function VenuePage({ params }: PageProps) {
  return (
    <AdminLayout>
      <VenueDetails venueId={params.id} />
    </AdminLayout>
  );
} 
'use client';

import AdminLayout from '../../components/AdminLayout';
import VenueDetails from '../../components/VenueDetails';
import { useParams } from 'next/navigation';

export default function VenuePage() {
  const params = useParams();
  const venueId = params?.id as string;

  if (!venueId) {
    return (
      <AdminLayout>
        <div className="text-center py-8">Venue not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <VenueDetails venueId={venueId} />
    </AdminLayout>
  );
} 
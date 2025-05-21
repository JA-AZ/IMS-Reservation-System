import AdminLayout from '../components/AdminLayout';
import VenueForm from '../components/VenueForm';
import VenueList from '../components/VenueList';

export default function VenuesPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold mb-6">Venue Management</h1>
        
        <VenueForm />
        
        <h2 className="text-xl font-semibold mt-8 mb-4">All Venues</h2>
        <VenueList />
      </div>
    </AdminLayout>
  );
} 
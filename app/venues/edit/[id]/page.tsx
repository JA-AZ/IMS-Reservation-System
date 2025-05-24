'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '../../../components/AdminLayout';
import { getVenueById, updateVenue } from '../../../firebase/services';
import { FiSave, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';

export default function EditVenuePage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params?.id as string;
  
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    description: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    const fetchVenue = async () => {
      if (!venueId) return;
      
      try {
        setLoading(true);
        const venue = await getVenueById(venueId);
        
        if (!venue) {
          setError('Venue not found');
          return;
        }
        
        setFormData({
          name: venue.name || '',
          capacity: venue.capacity ? String(venue.capacity) : '',
          description: venue.description || '',
        });
      } catch (error) {
        console.error('Error fetching venue:', error);
        setError('Failed to load venue details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVenue();
  }, [venueId]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!venueId) {
      setError('Venue ID is missing');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      await updateVenue(venueId, {
        name: formData.name,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        description: formData.description,
      });
      
      setSuccess(true);
      
      // Redirect back to venue details after a short delay
      setTimeout(() => {
        router.push(`/venues/${venueId}`);
      }, 1500);
    } catch (error) {
      console.error('Error updating venue:', error);
      setError('Failed to update venue');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <AdminLayout>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Venue</h1>
          <Link
            href={`/venues/${venueId}`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FiArrowLeft className="mr-2" />
            Back to Venue
          </Link>
        </div>
        
        {loading ? (
          <div className="text-center py-8">Loading venue details...</div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : (
          <>
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                Venue updated successfully! Redirecting...
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Venue Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Enter venue name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Enter venue capacity"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="Enter venue description"
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    saving ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  <FiSave className="mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </AdminLayout>
  );
} 
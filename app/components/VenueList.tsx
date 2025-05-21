'use client';

import { useState, useEffect } from 'react';
import { FiMapPin, FiUsers, FiCalendar, FiArrowRight } from 'react-icons/fi';
import Link from 'next/link';
import { getVenues } from '../firebase/services';
import { VenueType } from '../types';

export default function VenueList() {
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venuesData = await getVenues();
        setVenues(venuesData);
      } catch (error) {
        console.error('Error fetching venues:', error);
        setError('Failed to load venues');
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading venues...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No venues found. Add a new venue to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {venues.map((venue) => (
        <div key={venue.id} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="bg-gray-800 text-white p-4">
            <h3 className="font-bold text-lg flex items-center">
              <FiMapPin className="mr-2" />
              {venue.name}
            </h3>
          </div>
          
          <div className="p-4">
            {venue.capacity && (
              <p className="text-gray-700 flex items-center mb-2">
                <FiUsers className="mr-2" />
                Capacity: {venue.capacity}
              </p>
            )}
            
            {venue.description && (
              <p className="text-gray-600 mb-4">{venue.description}</p>
            )}
            
            <Link
              href={`/venues/${venue.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center mt-4"
            >
              <span>View Details</span>
              <FiArrowRight className="ml-1" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
} 
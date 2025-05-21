'use client';

import { useState } from 'react';
import { FiMapPin, FiUsers, FiInfo } from 'react-icons/fi';
import { addVenue } from '../firebase/services';

export default function VenueForm() {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    description: '',
    imageUrl: ''
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Prepare the venue data
      const venueData = {
        name: formData.name,
        ...(formData.capacity ? { capacity: parseInt(formData.capacity) } : {}),
        ...(formData.description ? { description: formData.description } : {}),
        ...(formData.imageUrl ? { imageUrl: formData.imageUrl } : {})
      };
      
      // Add the venue to Firestore
      await addVenue(venueData);
      
      // Show success message and reset form
      setSuccess(true);
      setFormData({
        name: '',
        capacity: '',
        description: '',
        imageUrl: ''
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error creating venue:', error);
      setError(error.message || 'Failed to create venue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Add New Venue</h2>
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Venue created successfully!
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Venue Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiMapPin className="inline mr-2" />
            Venue Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Capacity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiUsers className="inline mr-2" />
            Capacity
          </label>
          <input
            type="number"
            name="capacity"
            value={formData.capacity}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiInfo className="inline mr-2" />
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL
          </label>
          <input
            type="url"
            name="imageUrl"
            value={formData.imageUrl}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Add Venue'}
          </button>
        </div>
      </form>
    </div>
  );
} 
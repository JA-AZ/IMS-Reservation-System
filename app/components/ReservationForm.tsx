'use client';

import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiUser } from 'react-icons/fi';
import { getVenues, getStaffMembers, addReservation } from '../firebase/services';
import { VenueType, StaffMember, ReservationStatus } from '../types';

export default function ReservationForm() {
  // Form state
  const [formData, setFormData] = useState({
    venueId: '',
    department: '',
    eventTitle: '',
    reservedBy: '',
    email: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    status: 'Reserved' as ReservationStatus,
    receivedBy: ''
  });

  // Options for select inputs
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Fetch venues and staff on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const venuesData = await getVenues();
        const staffData = await getStaffMembers();
        
        setVenues(venuesData);
        setStaff(staffData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load form data. Please try again.');
      }
    };

    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If this is a start date change, also update end date to match (for single date selection default)
    if (name === 'startDate') {
      setFormData(prev => ({
        ...prev,
        endDate: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      // Get the venue name for the selected venue
      const selectedVenue = venues.find(venue => venue.id === formData.venueId);
      if (!selectedVenue) {
        throw new Error('Please select a valid venue');
      }
      
      // Prepare the reservation data
      const reservationData = {
        ...formData,
        venueName: selectedVenue.name
      };
      
      // Add the reservation to Firestore
      await addReservation(reservationData);
      
      // Show success message and reset form
      setSuccess(true);
      setFormData({
        venueId: '',
        department: '',
        eventTitle: '',
        reservedBy: '',
        email: '',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        status: 'Reserved' as ReservationStatus,
        receivedBy: ''
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      setError(error.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-6">New Reservation</h1>
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Reservation created successfully!
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Venue Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiMapPin className="inline mr-2" />
              Venue
            </label>
            <select
              name="venueId"
              value={formData.venueId}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a venue</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiUsers className="inline mr-2" />
              Department
            </label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              name="eventTitle"
              value={formData.eventTitle}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Reserved By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiUser className="inline mr-2" />
              Reserved By
            </label>
            <input
              type="text"
              name="reservedBy"
              value={formData.reservedBy}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Received By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Received By
            </label>
            <select
              name="receivedBy"
              value={formData.receivedBy}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select staff member</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Date(s) of Event */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-2" />
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-2" />
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              min={formData.startDate}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiClock className="inline mr-2" />
              Start Time
            </label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FiClock className="inline mr-2" />
              End Time
            </label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Reserved">Reserved</option>
              <option value="Processing">Processing</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiUser } from 'react-icons/fi';
import { getVenues, getStaffMembers, getReservation, updateReservation } from '../firebase/services';
import { VenueType, StaffMember, ReservationStatus, Reservation } from '../types';
import { useRouter } from 'next/navigation';
import ReservationCalendar from './ReservationCalendar';

interface EditReservationFormProps {
  reservationId: string;
}

export default function EditReservationForm({ reservationId }: EditReservationFormProps) {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<Partial<Reservation>>({
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
    receivedBy: '',
    notes: ''
  });

  // Options for select inputs
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  // Fetch reservation, venues, and staff on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the reservation data
        const reservationData = await getReservation(reservationId);
        
        if (!reservationData) {
          setNotFound(true);
          setError('Reservation not found');
          setLoading(false);
          return;
        }
        
        // Fetch venues and staff
        const [venuesData, staffData] = await Promise.all([
          getVenues(),
          getStaffMembers()
        ]);
        
        // Set form data from reservation
        setFormData({
          venueId: reservationData.venueId,
          department: reservationData.department,
          eventTitle: reservationData.eventTitle,
          reservedBy: reservationData.reservedBy,
          email: reservationData.email,
          startDate: reservationData.startDate,
          endDate: reservationData.endDate,
          startTime: reservationData.startTime,
          endTime: reservationData.endTime,
          status: reservationData.status,
          receivedBy: reservationData.receivedBy,
          notes: reservationData.notes || ''
        });
        
        setVenues(venuesData);
        setStaff(staffData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load reservation data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reservationId]);

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

  const handleDateSelect = (date: string) => {
    setFormData(prev => ({
      ...prev,
      startDate: date,
      endDate: date
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
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
      
      // Update the reservation in Firestore
      await updateReservation(reservationId, reservationData);
      
      // Show success message
      setSuccess(true);
      
      // Navigate back to reservations list after a short delay
      setTimeout(() => {
        router.push('/reservations');
      }, 1500);
      
    } catch (error: any) {
      console.error('Error updating reservation:', error);
      setError(error.message || 'Failed to update reservation');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-6 py-1">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Edit Reservation</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Reservation not found. It may have been deleted.
        </div>
        <button
          onClick={() => router.push('/reservations')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to Reservations
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Edit Reservation</h1>
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Reservation updated successfully! Redirecting...
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="flex flex-col md:flex-row md:space-x-6">
        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Venue Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                <FiMapPin className="inline mr-2" />
                Venue
              </label>
              <select
                name="venueId"
                value={formData.venueId}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select a venue</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id} className="text-gray-900">
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                <FiUsers className="inline mr-2" />
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter department"
              />
            </div>
            
            {/* Event Title */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Event Title
              </label>
              <input
                type="text"
                name="eventTitle"
                value={formData.eventTitle}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter event title"
              />
            </div>
            
            {/* Reserved By */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                <FiUser className="inline mr-2" />
                Reserved By
              </label>
              <input
                type="text"
                name="reservedBy"
                value={formData.reservedBy}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter name of reserver"
              />
            </div>
            
            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                placeholder="Enter email address"
              />
            </div>
            
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="Processing">Processing</option>
                <option value="Reserved">Reserved</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            
            {/* Received By */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Received By
              </label>
              <select
                name="receivedBy"
                value={formData.receivedBy}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select staff member</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id} className="text-gray-900">
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                <FiCalendar className="inline mr-2" />
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                <FiCalendar className="inline mr-2" />
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                <FiClock className="inline mr-2" />
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            
            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                <FiClock className="inline mr-2" />
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>
          
          {/* Notes/Details */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Notes / Details
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              placeholder="Enter any additional details or notes about this reservation"
            />
          </div>
          
          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={() => router.push('/reservations')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveLoading}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                saveLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        
        {/* Calendar */}
        <div className="mt-6 md:mt-0 md:w-64">
          <ReservationCalendar 
            selectedDate={formData.startDate?.toString() || ''} 
            onDateSelect={handleDateSelect} 
            venueId={formData.venueId}
          />
        </div>
      </div>
    </div>
  );
} 
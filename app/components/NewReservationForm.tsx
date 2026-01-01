'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getVenues, addReservation, getReservationsByVenue } from '../firebase/services';
import { VenueType, ReservationStatus, Reservation } from '../types';
import ReservationCalendar from './ReservationCalendar';
import { addDays, format, isAfter } from 'date-fns';

export default function NewReservationForm() {
  const router = useRouter();
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [venueId, setVenueId] = useState('');
  const [department, setDepartment] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [reservedBy, setReservedBy] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<ReservationStatus>('Processing');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');

  // Multi-date selection within range
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [venueReservations, setVenueReservations] = useState<Reservation[]>([]);
  const [conflictsByDate, setConflictsByDate] = useState<Record<string, Reservation[]>>({});
  const [chipHoveredDate, setChipHoveredDate] = useState<string | null>(null);
  const [chipTooltipPos, setChipTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const formatTimeForTooltip = (timeString: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(Number(hours));
    date.setMinutes(Number(minutes));
    date.setSeconds(0);
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venuesData = await getVenues();
        setVenues(venuesData);
      } catch (error) {
        console.error('Error fetching venues:', error);
        setError('Failed to load venues. Please try again later.');
      }
    };
    
    fetchVenues();
  }, []);

  // Load existing reservations for the selected venue
  useEffect(() => {
    const fetchReservations = async () => {
      if (!venueId) {
        setVenueReservations([]);
        setConflictsByDate({});
        return;
      }
      try {
        const reservations = await getReservationsByVenue(venueId);
        setVenueReservations(reservations);
      } catch (err) {
        console.error('Error loading venue reservations:', err);
      }
    };

    fetchReservations();
  }, [venueId]);
  
  // Set end date to match start date by default
  useEffect(() => {
    if (startDate && !endDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  // Helper to generate all dates in range [startDate, endDate]
  const allDatesInRange = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return [];
    const dates: string[] = [];
    let current = new Date(startDate);
    const last = new Date(endDate);

    while (!isAfter(current, last)) {
      dates.push(format(current, 'yyyy-MM-dd'));
      current = addDays(current, 1);
    }
    return dates;
  }, [startDate, endDate]);

  // Compute per-day conflicts for the selected venue/time within the range
  useEffect(() => {
    if (!venueId || !startTime || !endTime || allDatesInRange.length === 0) {
      setConflictsByDate({});
      return;
    }

    const conflicts: Record<string, Reservation[]> = {};

    for (const date of allDatesInRange) {
      const conflicting = venueReservations.filter(existing => {
        // Ignore cancelled reservations
        if (existing.status === 'Cancelled') return false;

        // Date must fall within existing reservation span
        if (date < existing.startDate || date > existing.endDate) return false;

        // Time overlap check (same logic as backend)
        const existingStartTime = existing.startTime;
        const existingEndTime = existing.endTime;
        const newStartTime = startTime;
        const newEndTime = endTime;

        return !(newEndTime <= existingStartTime || newStartTime >= existingEndTime);
      });

      if (conflicting.length > 0) {
        conflicts[date] = conflicting;
      }
    }

    setConflictsByDate(conflicts);
  }, [venueId, startTime, endTime, allDatesInRange, venueReservations]);

  // When the range or conflicts change, keep selections in sync
  useEffect(() => {
    if (allDatesInRange.length === 0) {
      setSelectedDates([]);
      return;
    }

    setSelectedDates(prev => {
      // Start from previous selections that are still in the range,
      // or all non-Sunday dates if nothing selected yet
      const base =
        prev.length > 0
          ? prev.filter(d => allDatesInRange.includes(d))
          : allDatesInRange.filter(d => {
              const day = new Date(d).getDay(); // 0 = Sunday
              return day !== 0;
            });

      // Remove any dates that are now conflicting
      return base.filter(d => !conflictsByDate[d]);
    });
  }, [allDatesInRange, conflictsByDate]);

  const toggleSelectedDate = (date: string) => {
    // Do not allow toggling dates that are already booked for this venue/time
    if (conflictsByDate[date]) return;

    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date].sort()
    );
  };

  const hasValidRange = startDate && endDate && endDate >= startDate;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!startDate || !endDate) {
      setError('Please select a start and end date.');
      return;
    }

    if (selectedDates.length === 0) {
      setError('Please keep at least one day selected in the date range.');
      return;
    }

    setLoading(true);
    
    try {
      // Find venue name from selected venue ID
      const selectedVenue = venues.find(venue => venue.id === venueId);
      if (!selectedVenue) {
        throw new Error('Selected venue not found');
      }

      // Sort selected dates and group into contiguous ranges
      const sortedDates = [...selectedDates].sort();

      type DateRange = { start: string; end: string };
      const ranges: DateRange[] = [];

      let rangeStart = sortedDates[0];
      let previous = sortedDates[0];

      for (let i = 1; i < sortedDates.length; i++) {
        const current = sortedDates[i];
        const prevDate = new Date(previous);
        const nextExpected = format(addDays(prevDate, 1), 'yyyy-MM-dd');

        if (current === nextExpected) {
          // still contiguous
          previous = current;
        } else {
          // close previous range
          ranges.push({ start: rangeStart, end: previous });
          rangeStart = current;
          previous = current;
        }
      }
      // push final range
      ranges.push({ start: rangeStart, end: previous });

      // Create one reservation per contiguous range
      for (const range of ranges) {
        const newReservation = {
          venueId,
          venueName: selectedVenue.name,
          department,
          eventTitle,
          reservedBy,
          contactNo,
          startDate: range.start,
          endDate: range.end,
          startTime,
          endTime,
          status,
          receivedBy,
          notes
        };

        await addReservation(newReservation);
      }

      setSuccess(true);
      
      // Reset form or redirect
      setTimeout(() => {
        router.push('/reservations');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error creating multi-day reservation:', error);
      setError(
        error.message ||
          'Failed to create reservation(s). Some dates may have been created; please review the reservations list.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      {success ? (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">Reservation created successfully! Redirecting...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:space-x-6">
          <form onSubmit={handleSubmit} className="space-y-6 flex-1">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Venue Selection */}
              <div>
                <label htmlFor="venue" className="block text-sm font-medium text-gray-700">Venue</label>
                <select
                  id="venue"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a venue</option>
                  {venues.map(venue => (
                    <option key={venue.id} value={venue.id}>{venue.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Event Title */}
              <div>
                <label htmlFor="eventTitle" className="block text-sm font-medium text-gray-700">Event Title</label>
                <input
                  type="text"
                  id="eventTitle"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Reserved By */}
              <div>
                <label htmlFor="reservedBy" className="block text-sm font-medium text-gray-700">Reserved By</label>
                <input
                  type="text"
                  id="reservedBy"
                  value={reservedBy}
                  onChange={(e) => setReservedBy(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Contact No */}
              <div>
                <label htmlFor="contactNo" className="block text-sm font-medium text-gray-700">Contact No</label>
                <input
                  type="text"
                  id="contactNo"
                  value={contactNo}
                  onChange={(e) => setContactNo(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Received By */}
              <div>
                <label htmlFor="receivedBy" className="block text-sm font-medium text-gray-700">Received By</label>
                <input
                  type="text"
                  id="receivedBy"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Processing">Processing</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              
              {/* Start Date */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* End Date */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  min={startDate}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Date selections within range */}
              {hasValidRange && allDatesInRange.length > 1 && (
                <div className="md:col-span-2 border border-gray-200 rounded-md bg-gray-50 p-3 mt-2">
                  <p className="text-xs text-gray-600 mb-2">
                    By default, every non-Sunday between the start and end dates is included.
                    Uncheck any days you want to skip. Separate reservations will be created
                    for each continuous block of selected days.
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                    {allDatesInRange.map(date => {
                      const d = new Date(date);
                      const label = format(d, 'EEE, MMM d');
                      const checked = selectedDates.includes(date);
                      const conflicts = conflictsByDate[date];
                      const hasConflict = conflicts && conflicts.length > 0;

                      return (
                        <label
                          key={date}
                          className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${
                            hasConflict
                              ? 'bg-red-100 border-red-300 text-red-700 cursor-not-allowed'
                              : checked
                              ? 'bg-blue-600 border-blue-600 text-white cursor-pointer'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleSelectedDate(date)}
                            disabled={hasConflict}
                          />
                          <span
                            onMouseEnter={(e) => {
                              if (!hasConflict) return;
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setChipHoveredDate(date);
                              setChipTooltipPos({
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => {
                              setChipHoveredDate(null);
                              setChipTooltipPos(null);
                            }}
                          >
                            {label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {selectedDates.length} day{selectedDates.length === 1 ? '' : 's'} selected.
                  </p>
                </div>
              )}
              
              {/* Start Time */}
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* End Time */}
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push('/reservations')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {loading ? 'Creating...' : 'Create Reservation'}
              </button>
            </div>
          </form>
          {/* Calendar */}
          <div className="mt-6 md:mt-0 md:w-64">
            <ReservationCalendar
              selectedDate={startDate}
              onDateSelect={(date) => { setStartDate(date); setEndDate(date); }}
              venueId={venueId}
            />
          </div>
        </div>
      )}

      {/* Tooltip for conflicting day chips */}
      {chipHoveredDate && chipTooltipPos && conflictsByDate[chipHoveredDate] && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded shadow-lg p-2 text-xs min-w-[180px] max-w-xs"
          style={{
            left: chipTooltipPos.x,
            top: chipTooltipPos.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-semibold text-gray-800 mb-1">Events:</div>
          <ul className="space-y-1">
            {conflictsByDate[chipHoveredDate].map((res) => (
              <li key={res.id} className="flex flex-col">
                <span className="font-medium text-gray-900 truncate">
                  {res.eventTitle}
                </span>
                <span className="text-gray-600">
                  {formatTimeForTooltip(res.startTime)} - {formatTimeForTooltip(res.endTime)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}  
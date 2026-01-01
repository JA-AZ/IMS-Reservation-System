'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiFilter, FiMapPin, FiCalendar } from 'react-icons/fi';
import { getVenues, getReservationsByVenue } from '../firebase/services';
import { VenueType, Reservation } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

type StatusFilter = '' | 'Processing' | 'Reserved' | 'Confirmed' | 'Cancelled';

export default function VenueExport() {
  const [venues, setVenues] = useState<VenueType[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [singleMonth, setSingleMonth] = useState<{ month: string; year: string }>({
    month: '',
    year: '',
  });
  const [range1, setRange1] = useState<{ month: string; year: string }>({
    month: '',
    year: '',
  });
  const [range2, setRange2] = useState<{ month: string; year: string }>({
    month: '',
    year: '',
  });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch venues on mount
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const venuesData = await getVenues();
        setVenues(venuesData);
      } catch (err) {
        console.error('Error loading venues for export:', err);
        setError('Failed to load venues. Please try again.');
      } finally {
        setLoadingVenues(false);
      }
    };

    fetchVenues();
  }, []);

  // When venue changes, load its reservations
  useEffect(() => {
    const fetchReservations = async () => {
      if (!selectedVenueId) {
        setReservations([]);
        return;
      }
      try {
        setLoadingReservations(true);
        setError('');
        const data = await getReservationsByVenue(selectedVenueId);

        // Sort by createdAt descending (most recent first)
        const sorted = [...data].sort((a, b) => {
          const timeA = getTimestamp(a.createdAt);
          const timeB = getTimestamp(b.createdAt);
          return timeB - timeA;
        });

        setReservations(sorted);
      } catch (err) {
        console.error('Error loading reservations for export:', err);
        setError('Failed to load reservations for selected venue.');
      } finally {
        setLoadingReservations(false);
      }
    };

    fetchReservations();
  }, [selectedVenueId]);

  const getTimestamp = (createdAt: any): number => {
    if (!createdAt) return 0;
    if (createdAt.toDate) {
      return createdAt.toDate().getTime();
    }
    if (createdAt instanceof Date) {
      return createdAt.getTime();
    }
    if (typeof createdAt === 'string') {
      return new Date(createdAt).getTime();
    }
    return 0;
  };

  const formatTimeForExport = (timeString: string): string => {
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

  const monthOptions = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Available years based on reservations for the selected venue,
  // with a sensible fallback range if there are no reservations yet.
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    reservations.forEach((res) => {
      years.add(new Date(res.startDate).getFullYear());
      years.add(new Date(res.endDate).getFullYear());
    });

    if (years.size === 0) {
      const current = new Date().getFullYear();
      for (let y = current - 2; y <= current + 2; y++) {
        years.add(y);
      }
    }

    return Array.from(years).sort((a, b) => a - b);
  }, [reservations]);

  // Build selected month keys from the dropdowns
  const selectedMonthKeys = useMemo(() => {
    const keys = new Set<string>();
    const add = (my: { month: string; year: string }) => {
      if (my.month && my.year) {
        keys.add(`${my.year}-${my.month}`);
      }
    };
    add(singleMonth);
    add(range1);
    add(range2);
    return Array.from(keys);
  }, [singleMonth, range1, range2]);

  // Filter reservations based on selections
  const filteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((res) => res.status === statusFilter);
    }

    // Months filter (based on month/year dropdown selections)
    if (selectedMonthKeys.length > 0) {
      filtered = filtered.filter((res) => {
        const start = new Date(res.startDate);
        const end = new Date(res.endDate);
        const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
        const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
        return selectedMonthKeys.includes(startKey) || selectedMonthKeys.includes(endKey);
      });
    }

    // Always keep most recent first
    return filtered;
  }, [reservations, statusFilter, selectedMonthKeys]);

  const handleExport = () => {
    if (!selectedVenueId) {
      setError('Please select a venue to export.');
      return;
    }
    if (filteredReservations.length === 0) {
      setError('No reservations match the selected filters.');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const venueName =
        venues.find((v) => v.id === selectedVenueId)?.name || 'Venue';

      const wb = XLSX.utils.book_new();

      const allStatusesSelected = statusFilter === '';
      const statuses: StatusFilter[] = ['Confirmed', 'Reserved', 'Processing', 'Cancelled'];

      const getMonthKey = (dateStr: string) => {
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      };

      const getMonthLabelFromDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return format(d, 'MMMM yyyy');
      };

      if (allStatusesSelected) {
        // Separate sheet per status (only for statuses that have data)
        statuses.forEach((status) => {
          const group = filteredReservations.filter((res) => res.status === status);
          if (group.length === 0) return;

          // Sort by start date/time ascending
          const sortedGroup = [...group].sort((a, b) => {
            if (a.startDate !== b.startDate) {
              return a.startDate.localeCompare(b.startDate);
            }
            return a.startTime.localeCompare(b.startTime);
          });

          const rows: (string | number)[][] = [];
          rows.push([
            'Event Title',
            'Department',
            'Start Date',
            'End Date',
            'Start Time',
            'End Time',
            'Reserved By',
            'Contact No',
            'Status',
          ]);

          let currentMonthKey: string | null = null;

          sortedGroup.forEach((res) => {
            const monthKey = getMonthKey(res.startDate);
            if (monthKey !== currentMonthKey) {
              currentMonthKey = monthKey;
              rows.push([]);
              rows.push([getMonthLabelFromDate(res.startDate)]);
            }

            rows.push([
              res.eventTitle,
              res.department,
              res.startDate,
              res.endDate,
              formatTimeForExport(res.startTime),
              formatTimeForExport(res.endTime),
              res.reservedBy,
              res.contactNo,
              res.status,
            ]);
          });

          const ws = XLSX.utils.aoa_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, status || 'Status');
        });

        // Additional "All Reservations" sheet, grouped by month regardless of status
        const allSorted = [...filteredReservations].sort((a, b) => {
          if (a.startDate !== b.startDate) {
            return a.startDate.localeCompare(b.startDate);
          }
          return a.startTime.localeCompare(b.startTime);
        });

        const allRows: (string | number)[][] = [];
        allRows.push([
          'Event Title',
          'Department',
          'Start Date',
          'End Date',
          'Start Time',
          'End Time',
          'Reserved By',
          'Contact No',
          'Status',
        ]);

        let allCurrentMonthKey: string | null = null;

        allSorted.forEach((res) => {
          const monthKey = getMonthKey(res.startDate);
          if (monthKey !== allCurrentMonthKey) {
            allCurrentMonthKey = monthKey;
            allRows.push([]);
            allRows.push([getMonthLabelFromDate(res.startDate)]);
          }

          allRows.push([
            res.eventTitle,
            res.department,
            res.startDate,
            res.endDate,
            formatTimeForExport(res.startTime),
            formatTimeForExport(res.endTime),
            res.reservedBy,
            res.contactNo,
            res.status,
          ]);
        });

        const wsAll = XLSX.utils.aoa_to_sheet(allRows);
        XLSX.utils.book_append_sheet(wb, wsAll, 'All Reservations');
      } else {
        // Single status or filtered status only
        // Sort by start date/time ascending
        const sorted = [...filteredReservations].sort((a, b) => {
          if (a.startDate !== b.startDate) {
            return a.startDate.localeCompare(b.startDate);
          }
          return a.startTime.localeCompare(b.startTime);
        });

        const rows: (string | number)[][] = [];
        rows.push([
          'Event Title',
          'Department',
          'Start Date',
          'End Date',
          'Start Time',
          'End Time',
          'Reserved By',
          'Contact No',
          'Status',
        ]);

        let currentMonthKey: string | null = null;

        sorted.forEach((res) => {
          const monthKey = getMonthKey(res.startDate);
          if (monthKey !== currentMonthKey) {
            currentMonthKey = monthKey;
            rows.push([]);
            rows.push([getMonthLabelFromDate(res.startDate)]);
          }

          rows.push([
            res.eventTitle,
            res.department,
            res.startDate,
            res.endDate,
            formatTimeForExport(res.startTime),
            formatTimeForExport(res.endTime),
            res.reservedBy,
            res.contactNo,
            res.status,
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Reservations');
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const safeVenue = venueName.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      const fileName = `venue_reservations_${safeVenue}_${timestamp}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting reservations:', err);
      setError('Failed to generate export file.');
    } finally {
      setExporting(false);
    }
  };

  const selectedVenueName =
    venues.find((v) => v.id === selectedVenueId)?.name || 'Select a venue';

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FiDownload className="mr-2" /> Export Reservations
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Generate an Excel file of reservations for a specific venue with optional filters.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={!selectedVenueId || filteredReservations.length === 0 || exporting}
          className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm ${
            !selectedVenueId || filteredReservations.length === 0 || exporting
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1`}
        >
          <FiDownload className="mr-2" />
          {exporting ? 'Generating...' : 'Export XLSX'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Filters block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Venue selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiMapPin className="inline mr-2" /> Venue
          </label>
          <select
            value={selectedVenueId}
            onChange={(e) => {
              setSelectedVenueId(e.target.value);
              setSingleMonth({ month: '', year: '' });
              setRange1({ month: '', year: '' });
              setRange2({ month: '', year: '' });
            }}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
          >
            <option value="">Select a venue</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
          {selectedVenueId && (
            <p className="mt-1 text-xs text-gray-500">
              Selected: <span className="font-semibold">{selectedVenueName}</span>
            </p>
          )}
        </div>

        {/* Status selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiFilter className="inline mr-2" size={14} /> Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="Processing">Processing</option>
            <option value="Reserved">Reserved</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            When &quot;All Statuses&quot; is selected, the exported file creates a separate sheet per status.
          </p>
        </div>

        {/* Month / Year selectors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <FiCalendar className="inline mr-2" size={14} /> Month (optional)
          </label>
          <div className="space-y-2">
            {/* Single month */}
            <div className="flex gap-2">
              <div className="flex-1">
                <select
                  value={singleMonth.month}
                  onChange={(e) => setSingleMonth({ ...singleMonth, month: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Month</option>
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <select
                  value={singleMonth.year}
                  onChange={(e) => setSingleMonth({ ...singleMonth, year: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-2 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Year</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Multiple month ranges */}
            <p className="text-xs text-gray-600 mt-1">Export multiple months:</p>
            {/* Range 1 */}
            <div className="flex gap-2">
              <span className="text-xs text-gray-500 w-12 pt-2">range 1:</span>
              <div className="flex-1">
                <select
                  value={range1.month}
                  onChange={(e) => setRange1({ ...range1, month: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Month</option>
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <select
                  value={range1.year}
                  onChange={(e) => setRange1({ ...range1, year: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-2 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Year</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Range 2 */}
            <div className="flex gap-2">
              <span className="text-xs text-gray-500 w-12 pt-2">range 2:</span>
              <div className="flex-1">
                <select
                  value={range2.month}
                  onChange={(e) => setRange2({ ...range2, month: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Month</option>
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <select
                  value={range2.year}
                  onChange={(e) => setRange2({ ...range2, year: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-2 bg-white text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="">Year</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Leave all month/year fields empty to include reservations from all months.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-600">
        <span className="font-medium">Matching reservations:</span>{' '}
        {filteredReservations.length}
      </div>
    </div>
  );
}



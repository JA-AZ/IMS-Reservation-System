'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiDownload, FiFilter, FiCalendar, FiPackage } from 'react-icons/fi';
import { getItemBorrowings } from '../firebase/services';
import { ItemBorrowing, ItemBorrowingStatus } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

type StatusFilter = '' | ItemBorrowingStatus;

export default function ItemBorrowingExport() {
  const [borrowings, setBorrowings] = useState<ItemBorrowing[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch all borrowings on mount
  useEffect(() => {
    const fetchBorrowings = async () => {
      try {
        setLoading(true);
        const borrowingsData = await getItemBorrowings();
        
        // Sort by createdAt or bookedOn descending (most recent first)
        const sorted = [...borrowingsData].sort((a, b) => {
          const timeA = getTimestamp(a.createdAt || a.bookedOn);
          const timeB = getTimestamp(b.createdAt || b.bookedOn);
          return timeB - timeA;
        });
        
        setBorrowings(sorted);
      } catch (err) {
        console.error('Error loading borrowings for export:', err);
        setError('Failed to load borrowings. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowings();
  }, []);

  const getTimestamp = (timestamp: any): number => {
    if (!timestamp) return 0;
    if (timestamp.toDate) {
      return timestamp.toDate().getTime();
    }
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp).getTime();
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

  // Available years based on borrowings, with a sensible fallback range if there are no borrowings yet.
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    borrowings.forEach((borrowing) => {
      years.add(new Date(borrowing.date).getFullYear());
    });

    if (years.size === 0) {
      const current = new Date().getFullYear();
      for (let y = current - 2; y <= current + 2; y++) {
        years.add(y);
      }
    }

    return Array.from(years).sort((a, b) => a - b);
  }, [borrowings]);

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

  // Filter borrowings based on selections
  const filteredBorrowings = useMemo(() => {
    let filtered = [...borrowings];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((borrowing) => borrowing.status === statusFilter);
    }

    // Months filter (based on month/year dropdown selections)
    if (selectedMonthKeys.length > 0) {
      filtered = filtered.filter((borrowing) => {
        const date = new Date(borrowing.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return selectedMonthKeys.includes(monthKey);
      });
    }

    // Sort by date/time ascending for export
    return filtered.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  }, [borrowings, statusFilter, selectedMonthKeys]);

  const handleExport = () => {
    if (filteredBorrowings.length === 0) {
      setError('No borrowings match the selected filters.');
      return;
    }

    setExporting(true);
    setError('');

    try {
      const wb = XLSX.utils.book_new();

      const allStatusesSelected = statusFilter === '';
      const statuses: ItemBorrowingStatus[] = ['Reserved', 'Confirmed', 'Cancelled'];

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
          const group = filteredBorrowings.filter((borrowing) => borrowing.status === status);
          if (group.length === 0) return;

          const rows: (string | number)[][] = [];
          rows.push([
            'Borrower Name',
            'Teacher/Adviser',
            'Department',
            'Items',
            'Item Serial Numbers',
            'Date',
            'Start Time',
            'End Time',
            'Room/Location',
            'Received By',
            'Status',
          ]);

          let currentMonthKey: string | null = null;

          group.forEach((borrowing) => {
            const monthKey = getMonthKey(borrowing.date);
            if (monthKey !== currentMonthKey) {
              currentMonthKey = monthKey;
              rows.push([]);
              rows.push([getMonthLabelFromDate(borrowing.date)]);
            }

            const itemNames = borrowing.items.map((item) => item.name).join(', ');
            const itemSerials = borrowing.items.map((item) => item.serialNumber || '-').join(', ');

            rows.push([
              borrowing.borrowerName,
              borrowing.teacherAdviserName,
              borrowing.department,
              itemNames,
              itemSerials,
              borrowing.date,
              formatTimeForExport(borrowing.startTime),
              formatTimeForExport(borrowing.endTime),
              borrowing.roomLocation,
              borrowing.receivedBy,
              borrowing.status,
            ]);
          });

          const ws = XLSX.utils.aoa_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, status || 'Status');
        });

        // Additional "All Borrowings" sheet, grouped by month regardless of status
        const allRows: (string | number)[][] = [];
        allRows.push([
          'Borrower Name',
          'Teacher/Adviser',
          'Department',
          'Items',
          'Item Serial Numbers',
          'Date',
          'Start Time',
          'End Time',
          'Room/Location',
          'Received By',
          'Status',
        ]);

        let allCurrentMonthKey: string | null = null;

        filteredBorrowings.forEach((borrowing) => {
          const monthKey = getMonthKey(borrowing.date);
          if (monthKey !== allCurrentMonthKey) {
            allCurrentMonthKey = monthKey;
            allRows.push([]);
            allRows.push([getMonthLabelFromDate(borrowing.date)]);
          }

          const itemNames = borrowing.items.map((item) => item.name).join(', ');
          const itemSerials = borrowing.items.map((item) => item.serialNumber || '-').join(', ');

          allRows.push([
            borrowing.borrowerName,
            borrowing.teacherAdviserName,
            borrowing.department,
            itemNames,
            itemSerials,
            borrowing.date,
            formatTimeForExport(borrowing.startTime),
            formatTimeForExport(borrowing.endTime),
            borrowing.roomLocation,
            borrowing.receivedBy,
            borrowing.status,
          ]);
        });

        const wsAll = XLSX.utils.aoa_to_sheet(allRows);
        XLSX.utils.book_append_sheet(wb, wsAll, 'All Borrowings');
      } else {
        // Single status or filtered status only
        const rows: (string | number)[][] = [];
        rows.push([
          'Borrower Name',
          'Teacher/Adviser',
          'Department',
          'Items',
          'Item Serial Numbers',
          'Date',
          'Start Time',
          'End Time',
          'Room/Location',
          'Received By',
          'Status',
        ]);

        let currentMonthKey: string | null = null;

        filteredBorrowings.forEach((borrowing) => {
          const monthKey = getMonthKey(borrowing.date);
          if (monthKey !== currentMonthKey) {
            currentMonthKey = monthKey;
            rows.push([]);
            rows.push([getMonthLabelFromDate(borrowing.date)]);
          }

          const itemNames = borrowing.items.map((item) => item.name).join(', ');
          const itemSerials = borrowing.items.map((item) => item.serialNumber || '-').join(', ');

          rows.push([
            borrowing.borrowerName,
            borrowing.teacherAdviserName,
            borrowing.department,
            itemNames,
            itemSerials,
            borrowing.date,
            formatTimeForExport(borrowing.startTime),
            formatTimeForExport(borrowing.endTime),
            borrowing.roomLocation,
            borrowing.receivedBy,
            borrowing.status,
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Borrowings');
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const fileName = `item_borrowings_${timestamp}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Error exporting borrowings:', err);
      setError('Failed to generate export file.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-600">Loading borrowings...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FiDownload className="mr-2" /> Export Item Borrowings
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Generate an Excel file of item borrowings with optional filters.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={filteredBorrowings.length === 0 || exporting}
          className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white shadow-sm ${
            filteredBorrowings.length === 0 || exporting
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Leave all month/year fields empty to include borrowings from all months.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-600">
        <span className="font-medium">Matching borrowings:</span>{' '}
        {filteredBorrowings.length}
      </div>
    </div>
  );
}


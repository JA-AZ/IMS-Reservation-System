'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { ProtectedRoute } from '../context/AuthContext';
import { getItemBorrowings, deleteItemBorrowing } from '../firebase/services';
import { ItemBorrowing, ItemBorrowingStatus } from '../types';
import Link from 'next/link';
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiClock,
  FiPackage,
  FiEdit,
  FiTrash2,
} from 'react-icons/fi';
import { addMonths, format, subMonths } from 'date-fns';

export default function ItemBorrowingCalendarPage() {
  const [allBorrowings, setAllBorrowings] = useState<ItemBorrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedBorrowing, setSelectedBorrowing] = useState<ItemBorrowing | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const borrowings = await getItemBorrowings();
        setAllBorrowings(borrowings);
      } catch (err) {
        console.error('Error loading item borrowings for calendar:', err);
        setError('Failed to load item borrowings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatTime = (timeString: string): string => {
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

  const getStatusColor = (status: ItemBorrowingStatus) => {
    switch (status) {
      case 'Reserved':
        return 'bg-yellow-100 text-yellow-800';
      case 'Confirmed':
        return 'bg-green-100 text-green-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const generateCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid: { day: number | null; dateStr: string | null }[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      grid.push({ day: null, dateStr: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = format(date, 'yyyy-MM-dd');
      grid.push({ day, dateStr });
    }

    return grid;
  };

  const calendarGrid = useMemo(generateCalendarGrid, [currentMonth]);
  const currentMonthLabel = format(currentMonth, 'MMMM yyyy');

  const isBorrowingOnDate = (borrowing: ItemBorrowing, dateStr: string) => {
    // New multi-date support
    if (borrowing.selectedDates && borrowing.selectedDates.length > 0) {
      return borrowing.selectedDates.includes(dateStr);
    }

    if (borrowing.startDate && borrowing.endDate) {
      return dateStr >= borrowing.startDate && dateStr <= borrowing.endDate;
    }

    // Legacy single-date field
    return borrowing.date === dateStr;
  };

  const getBorrowingsForDate = (dateStr: string | null) => {
    if (!dateStr) return [];
    return allBorrowings
      .filter((b) => isBorrowingOnDate(b, dateStr))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const borrowingsForSelectedDate = useMemo(
    () => getBorrowingsForDate(selectedDate),
    [allBorrowings, selectedDate]
  );

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleDateClick = (dateStr: string | null) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
  };

  const handleBorrowingClick = (borrowing: ItemBorrowing) => {
    setSelectedBorrowing(borrowing);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setSelectedBorrowing(null);
    setShowModal(false);
  };

  const handleDeleteBorrowing = async (borrowingId: string) => {
    if (!confirm('Are you sure you want to delete this borrowing request?')) return;

    try {
      await deleteItemBorrowing(borrowingId);
      setAllBorrowings((prev) => prev.filter((b) => b.id !== borrowingId));
      handleCloseModal();
    } catch (err) {
      console.error('Error deleting borrowing:', err);
      alert('Failed to delete borrowing request.');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Item Borrowing Calendar</h1>
              <p className="text-gray-600 mt-2">
                View item borrowing reservations by day and time. Click a date to see all
                borrowings for that day.
              </p>
            </div>
            <Link
              href="/new-item-borrowing"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm font-medium"
            >
              <FiPackage className="mr-2" size={18} />
              New Borrowing Request
            </Link>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Layout: calendar (left) and day details (right). On large screens, calendar gets ~40% width. */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Month calendar */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 rounded-full hover:bg-blue-50 text-blue-600 focus:outline-none"
                    aria-label="Previous month"
                  >
                    <FiChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-blue-600" size={18} />
                    <span className="text-sm font-medium text-gray-900">
                      {currentMonthLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 rounded-full hover:bg-blue-50 text-blue-600 focus:outline-none"
                    aria-label="Next month"
                  >
                    <FiChevronRight size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-1">
                  <div>Su</div>
                  <div>Mo</div>
                  <div>Tu</div>
                  <div>We</div>
                  <div>Th</div>
                  <div>Fr</div>
                  <div>Sa</div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-[0.95rem]">
                  {calendarGrid.map((cell, index) => {
                    if (cell.day === null) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="h-10 rounded bg-gray-50"
                        ></div>
                      );
                    }

                    const dateStr = cell.dateStr as string;
                    const dayBorrowings = getBorrowingsForDate(dateStr);
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === todayStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => handleDateClick(dateStr)}
                        className={`h-20 rounded-md border text-left px-1.5 py-1.5 flex flex-col justify-between transition-colors
                          ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm font-medium ${
                              isSelected ? 'text-blue-700' : 'text-gray-800'
                            }`}
                          >
                            {cell.day}
                          </span>
                          {isToday && (
                            <span className="text-[11px] text-green-600 font-semibold">
                              Today
                            </span>
                          )}
                        </div>
                        {dayBorrowings.length > 0 && (
                          <div className="mt-1 flex w-full items-center justify-center">
                            <span className="text-[11px] text-blue-700 font-medium">
                              {dayBorrowings.length} booking
                              {dayBorrowings.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected date details */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <FiCalendar className="text-blue-600" />
                      {selectedDate
                        ? format(new Date(selectedDate), 'EEEE, MMM d, yyyy')
                        : 'Select a date'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {borrowingsForSelectedDate.length === 0
                        ? 'No item borrowings for this date.'
                        : `Showing ${borrowingsForSelectedDate.length} borrowing${
                            borrowingsForSelectedDate.length > 1 ? 's' : ''
                          }.`}
                    </p>
                  </div>
                </div>

                {borrowingsForSelectedDate.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                    <FiPackage className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm">No item borrowing reservations for this day.</p>
                    <p className="text-xs mt-1">
                      Choose a different date in the calendar or create a new borrowing
                      request.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    <div className="space-y-3">
                      {borrowingsForSelectedDate.map((borrowing) => (
                        <button
                          key={borrowing.id}
                          type="button"
                          onClick={() => handleBorrowingClick(borrowing)}
                          className="w-full text-left border border-gray-200 rounded-md px-3 py-2 hover:border-blue-400 hover:bg-blue-50/40 transition-colors flex items-start gap-3"
                        >
                          <div className="mt-1 flex-shrink-0">
                            <div className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                              {formatTime(borrowing.startTime)} -{' '}
                              {formatTime(borrowing.endTime)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {borrowing.borrowerName}
                              </p>
                              <span className="text-xs text-gray-500">
                                ({borrowing.teacherAdviserName})
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1">
                              Dept: {borrowing.department} • Room: {borrowing.roomLocation}
                            </p>
                            <p className="text-xs text-gray-700 line-clamp-1">
                              Items:{' '}
                              {borrowing.items.map((item) => item.name).join(', ')}{' '}
                              <span className="text-gray-500">
                                ({borrowing.items.length} item
                                {borrowing.items.length !== 1 ? 's' : ''})
                              </span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusColor(
                                borrowing.status
                              )}`}
                            >
                              {borrowing.status}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              Booked:{' '}
                              {borrowing.bookedOn?.toDate?.()?.toLocaleDateString() ||
                                'N/A'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Borrowing Details Modal */}
          {showModal && selectedBorrowing && (
            <div
              className="fixed inset-0 flex items-center justify-center p-4 z-50"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={handleCloseModal}
            >
              <div
                className="bg-white rounded-lg shadow-lg p-5 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Borrowing Details
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Borrower</p>
                    <p className="text-gray-900">{selectedBorrowing.borrowerName}</p>
                    <p className="text-gray-600">
                      Teacher/Adviser: {selectedBorrowing.teacherAdviserName}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Department</p>
                    <p className="text-gray-900">{selectedBorrowing.department}</p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Date & Time</p>
                    <p className="text-gray-900">
                      {format(new Date(selectedDate), 'EEEE, MMM d, yyyy')}
                    </p>
                    <p className="text-gray-900">
                      {formatTime(selectedBorrowing.startTime)} -{' '}
                      {formatTime(selectedBorrowing.endTime)}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Room/Location</p>
                    <p className="text-gray-900">{selectedBorrowing.roomLocation}</p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Items</p>
                    <ul className="mt-1 space-y-1">
                      {selectedBorrowing.items.map((item, index) => (
                        <li key={index} className="text-gray-900">
                          • {item.name} ({item.serialNumber})
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Status</p>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                        selectedBorrowing.status
                      )}`}
                    >
                      {selectedBorrowing.status}
                    </span>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Received By</p>
                    <p className="text-gray-900">{selectedBorrowing.receivedBy}</p>
                  </div>

                  <div>
                    <p className="font-medium text-gray-700">Booked On</p>
                    <p className="text-gray-900">
                      {selectedBorrowing.bookedOn?.toDate?.()?.toLocaleString() ||
                        'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <Link
                    href={`/item-borrowings/edit/${selectedBorrowing.id}`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiEdit className="mr-2" size={16} />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDeleteBorrowing(selectedBorrowing.id)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <FiTrash2 className="mr-2" size={16} />
                    Delete
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

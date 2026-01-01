'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import { ProtectedRoute } from '../context/AuthContext';
import { getItems, addItemBorrowing, getItemBorrowingsByDate } from '../firebase/services';
import { Item, ItemBorrowingStatus, ItemBorrowing } from '../types';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiPackage, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import { addDays, format, isAfter } from 'date-fns';

export default function NewItemBorrowingPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [borrowerName, setBorrowerName] = useState('');
  const [teacherAdviserName, setTeacherAdviserName] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [status, setStatus] = useState<ItemBorrowingStatus>('Reserved');
  
  // Multi-date selection within range
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [existingBorrowings, setExistingBorrowings] = useState<ItemBorrowing[]>([]);
  const [conflictsByDate, setConflictsByDate] = useState<Record<string, ItemBorrowing[]>>({});
  
  // Availability state
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  
  useEffect(() => {
    fetchItems();
  }, []);
  
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

  // Load existing borrowings for conflict checking
  useEffect(() => {
    const fetchBorrowings = async () => {
      if (allDatesInRange.length === 0 || !startTime || !endTime || selectedItemIds.length === 0) {
        setExistingBorrowings([]);
        setConflictsByDate({});
        return;
      }
      
      try {
        // Fetch borrowings for all dates in range
        const allBorrowings: ItemBorrowing[] = [];
        for (const date of allDatesInRange) {
          const borrowings = await getItemBorrowingsByDate(date);
          allBorrowings.push(...borrowings);
        }
        setExistingBorrowings(allBorrowings);
      } catch (err) {
        console.error('Error loading borrowings for conflict check:', err);
      }
    };

    fetchBorrowings();
  }, [allDatesInRange, startTime, endTime, selectedItemIds]);

  // Compute per-day conflicts for the selected items/time within the range
  useEffect(() => {
    if (!startTime || !endTime || allDatesInRange.length === 0 || selectedItemIds.length === 0) {
      setConflictsByDate({});
      return;
    }

    const conflicts: Record<string, ItemBorrowing[]> = {};

    for (const date of allDatesInRange) {
      const conflicting = existingBorrowings.filter(existing => {
        // Ignore cancelled borrowings
        if (existing.status === 'Cancelled') return false;

        // Date must match
        if (existing.date !== date && 
            (!existing.startDate || existing.startDate > date || 
             !existing.endDate || existing.endDate < date)) {
          return false;
        }

        // Check if any selected item is in the existing borrowing
        const hasItemConflict = existing.itemIds.some(itemId => selectedItemIds.includes(itemId));
        if (!hasItemConflict) return false;

        // Time overlap check
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
  }, [startTime, endTime, allDatesInRange, existingBorrowings, selectedItemIds]);

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
    // Do not allow toggling dates that are already booked for these items/time
    if (conflictsByDate[date]) return;

    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date].sort()
    );
  };

  useEffect(() => {
    if (allDatesInRange.length > 0 && startTime && endTime && selectedItemIds.length > 0) {
      checkItemAvailability();
    }
  }, [allDatesInRange, startTime, endTime, selectedItemIds]);
  
  // Filter items based on search term and category
  useEffect(() => {
    let filtered = availableItems;
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    setFilteredItems(filtered);
  }, [availableItems, searchTerm, selectedCategory]);
  
  const fetchItems = async () => {
    try {
      const itemsData = await getItems();
      // Only show available items
      const availableItems = itemsData.filter(item => item.status === 'Available');
      setItems(availableItems);
      setAvailableItems(availableItems); // Initialize available items
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Failed to load available items. Please try again later.');
    }
  };
  
  const checkItemAvailability = async () => {
    if (allDatesInRange.length === 0 || !startTime || !endTime) {
      setAvailableItems(items);
      return;
    }
    
    setCheckingAvailability(true);
    try {
      // Helper function to check time overlap
      const hasTimeOverlap = (existingStart: string, existingEnd: string, newStart: string, newEnd: string) => {
        return newStart < existingEnd && newEnd > existingStart;
      };
      
      // Filter out items that are already booked during the selected time on any selected date
      const availableForTime = items.filter(item => {
        // Check if item is booked on any of the selected dates
        const isBooked = existingBorrowings.some(borrowing => {
          // Skip cancelled borrowings
          if (borrowing.status === 'Cancelled') return false;
          
          // Check if this item is in the existing borrowing
          if (!borrowing.itemIds.includes(item.id)) return false;
          
          // Check if borrowing date is in selected dates
          const borrowingDate = borrowing.date || borrowing.startDate;
          if (!borrowingDate || !selectedDates.includes(borrowingDate)) return false;
          
          // Check for time overlap
          return hasTimeOverlap(borrowing.startTime, borrowing.endTime, startTime, endTime);
        });
        
        return !isBooked;
      });
      
      setAvailableItems(availableForTime);
      
      // Clear selected items that are no longer available
      const stillAvailable = selectedItemIds.filter(id => 
        availableForTime.some(item => item.id === id)
      );
      if (stillAvailable.length !== selectedItemIds.length) {
        setSelectedItemIds(stillAvailable);
        setError('Some selected items are no longer available for the selected time. They have been removed from your selection.');
      }
      
    } catch (error) {
      console.error('Error checking availability:', error);
      setError('Failed to check item availability. Please try again.');
    } finally {
      setCheckingAvailability(false);
    }
  };
  
  const handleItemSelection = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItemIds([...selectedItemIds, itemId]);
    } else {
      setSelectedItemIds(selectedItemIds.filter(id => id !== itemId));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    if (selectedItemIds.length === 0) {
      setError('Please select at least one item to borrow');
      setLoading(false);
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select a start and end date.');
      setLoading(false);
      return;
    }

    if (selectedDates.length === 0) {
      setError('Please keep at least one day selected in the date range.');
      setLoading(false);
      return;
    }
    
    try {
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

      // Create one borrowing per contiguous range
      for (const range of ranges) {
        const newBorrowing = {
          borrowerName,
          teacherAdviserName,
          department,
          itemIds: selectedItemIds,
          date: range.start, // Keep for backward compatibility
          startDate: range.start,
          endDate: range.end,
          selectedDates: sortedDates.filter(d => d >= range.start && d <= range.end),
          startTime,
          endTime,
          roomLocation,
          receivedBy,
          status
        };

        await addItemBorrowing(newBorrowing);
      }

      setSuccess(true);
      
      // Reset form or redirect
      setTimeout(() => {
        router.push('/item-borrowings');
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || 'Failed to create borrowing request(s). Some dates may have been created; please review the borrowings list.');
    } finally {
      setLoading(false);
    }
  };
  
  // Get unique categories from available items
  const getUniqueCategories = () => {
    const categories = availableItems
      .map(item => item.category)
      .filter((category, index, self) => category && self.indexOf(category) === index)
      .sort();
    return categories;
  };
  
  // Clear search and filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
  };
  
  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link
              href="/item-borrowings"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <FiArrowLeft className="mr-2" size={16} />
              Back to Item Borrowings
            </Link>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6 lg:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">New Item Borrowing Request</h1>
              <p className="text-gray-600 mt-2">Create a new borrowing request for items</p>
            </div>
            
            {success ? (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">Borrowing request created successfully! Redirecting...</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
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
                
                {/* Two-column layout: left = details, right = items */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left column: borrower & schedule details */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Borrower's Name */}
                  <div>
                    <label htmlFor="borrowerName" className="block text-sm font-medium text-gray-700">
                      Borrower's Name *
                    </label>
                    <input
                      type="text"
                      id="borrowerName"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter borrower's name"
                    />
                  </div>
                  
                  {/* Teacher/Adviser Name */}
                  <div>
                    <label htmlFor="teacherAdviserName" className="block text-sm font-medium text-gray-700">
                      Teacher/Adviser Name *
                    </label>
                    <input
                      type="text"
                      id="teacherAdviserName"
                      value={teacherAdviserName}
                      onChange={(e) => setTeacherAdviserName(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter teacher/adviser name"
                    />
                  </div>
                  
                  {/* Department */}
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                      Department *
                    </label>
                    <input
                      type="text"
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter department"
                    />
                  </div>
                  
                  {/* Room/Location */}
                  <div>
                    <label htmlFor="roomLocation" className="block text-sm font-medium text-gray-700">
                      Room/Location *
                    </label>
                    <input
                      type="text"
                      id="roomLocation"
                      value={roomLocation}
                      onChange={(e) => setRoomLocation(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter room or location"
                    />
                  </div>
                  
                  {/* Start Date */}
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* End Date */}
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date *
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Date selections within range */}
                  {startDate && endDate && endDate >= startDate && allDatesInRange.length > 1 && (
                    <div className="md:col-span-2 border border-gray-200 rounded-md bg-gray-50 p-3 mt-2">
                      <p className="text-xs text-gray-600 mb-2">
                        By default, every non-Sunday between the start and end dates is included.
                        Uncheck any days you want to skip. Separate borrowings will be created
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
                              <span>{label}</span>
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
                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      id="startTime"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      min="07:00"
                      max="22:00"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* End Time */}
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                      End Time *
                    </label>
                    <input
                      type="time"
                      id="endTime"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      min="07:00"
                      max="22:00"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Received By */}
                  <div>
                    <label htmlFor="receivedBy" className="block text-sm font-medium text-gray-700">
                      Received By *
                    </label>
                    <input
                      type="text"
                      id="receivedBy"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter staff member name"
                    />
                  </div>
                  
                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status *
                    </label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ItemBorrowingStatus)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Reserved">Reserved</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                    
                    {/* Items Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Select Items to Borrow *
                      </label>
                      
                      {checkingAvailability ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-gray-600">Checking item availability...</p>
                        </div>
                      ) : availableItems.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No available items</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {selectedDates.length > 0 && startTime && endTime 
                              ? 'No items are available for the selected date range and time. Please try a different time slot or adjust the dates.'
                              : 'All items are currently unavailable for borrowing.'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Search and Filter Controls */}
                          <div className="mb-4 space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                              {/* Search Input */}
                              <div className="flex-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <FiSearch className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                  type="text"
                                  placeholder="Search items by name, description, or serial number..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              
                              {/* Category Filter */}
                              <div className="sm:w-48">
                                <select
                                  value={selectedCategory}
                                  onChange={(e) => setSelectedCategory(e.target.value)}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="">All Categories</option>
                                  {getUniqueCategories().map((category) => (
                                    <option key={category} value={category}>
                                      {category}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              
                              {/* Clear Filters Button */}
                              {(searchTerm || selectedCategory) && (
                                <button
                                  type="button"
                                  onClick={clearFilters}
                                  className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  Clear Filters
                                </button>
                              )}
                            </div>
                            
                            {/* Results Summary */}
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>
                                Showing {filteredItems.length} of {availableItems.length} available items
                              </span>
                              {(searchTerm || selectedCategory) && (
                                <span className="text-blue-600">
                                  Filtered results
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Items Grid */}
                          {filteredItems.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                              <FiPackage className="mx-auto h-8 w-8 text-gray-400" />
                              <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                              <p className="mt-1 text-sm text-gray-500">
                                {searchTerm || selectedCategory 
                                  ? 'Try adjusting your search terms or category filter.'
                                  : 'No items are currently available.'
                                }
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-4">
                              {filteredItems.map((item) => (
                                <label key={item.id} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedItemIds.includes(item.id)}
                                    onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                    <p className="text-sm text-gray-500">{item.description}</p>
                                    <p className="text-xs text-gray-400">SN: {item.serialNumber}</p>
                                    {item.category && (
                                      <p className="text-xs text-gray-400">Category: {item.category}</p>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right column: selected items list only */}
                  <div className="lg:col-span-1">
                    {/* Selected Items Section */}
                    {selectedItemIds.length > 0 ? (
                      <div className="sticky top-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            Selected Items ({selectedItemIds.length})
                          </h3>
                          <button
                            type="button"
                            onClick={() => setSelectedItemIds([])}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                          {selectedItemIds.map((itemId) => {
                            const item = availableItems.find(i => i.id === itemId) || items.find(i => i.id === itemId);
                            if (!item) return null;
                            
                            return (
                              <div
                                key={itemId}
                                className="flex items-center justify-between py-2 px-3 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                    <span className="text-xs text-gray-500">SN: {item.serialNumber}</span>
                                    {item.category && (
                                      <span className="text-xs text-gray-500">• {item.category}</span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">{item.description}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleItemSelection(itemId, false)}
                                  className="ml-4 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                                  title="Remove item"
                                >
                                  <FiX size={18} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No items selected</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Select items from the list to add them here
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <Link
                    href="/item-borrowings"
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading || selectedItemIds.length === 0}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    <FiSave className="mr-2" size={16} />
                    {loading ? 'Creating...' : 'Create Borrowing Request'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

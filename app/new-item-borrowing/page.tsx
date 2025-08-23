'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';
import { ProtectedRoute } from '../context/AuthContext';
import { getItems, addItemBorrowing, getItemBorrowingsByDate } from '../firebase/services';
import { Item, ItemBorrowingStatus } from '../types';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiPackage, FiSearch, FiFilter } from 'react-icons/fi';

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
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [status, setStatus] = useState<ItemBorrowingStatus>('Reserved');
  
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
  
  useEffect(() => {
    if (date && startTime && endTime) {
      checkItemAvailability();
    }
  }, [date, startTime, endTime]);
  
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
    if (!date || !startTime || !endTime) return;
    
    setCheckingAvailability(true);
    try {
      // Get existing borrowings for the selected date
      const existingBorrowings = await getItemBorrowingsByDate(date);
      
      // Helper function to check time overlap
      const hasTimeOverlap = (existingStart: string, existingEnd: string, newStart: string, newEnd: string) => {
        return newStart < existingEnd && newEnd > existingStart;
      };
      
      // Filter out items that are already booked during the selected time
      const availableForTime = items.filter(item => {
        const isBooked = existingBorrowings.some(borrowing => {
          // Skip cancelled borrowings
          if (borrowing.status === 'Cancelled') return false;
          
          // Check if this item is in the borrowing
          if (!borrowing.itemIds.includes(item.id)) return false;
          
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
    
    try {
      const newBorrowing = {
        borrowerName,
        teacherAdviserName,
        department,
        itemIds: selectedItemIds,
        date,
        startTime,
        endTime,
        roomLocation,
        receivedBy,
        status
      };
      
      await addItemBorrowing(newBorrowing);
      setSuccess(true);
      
      // Reset form or redirect
      setTimeout(() => {
        router.push('/item-borrowings');
      }, 2000);
      
    } catch (error: any) {
      setError(error.message || 'Failed to create borrowing request');
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
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/item-borrowings"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <FiArrowLeft className="mr-2" size={16} />
              Back to Item Borrowings
            </Link>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
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
                  <div className="bg-red-50 border-l-4 border-red-500 p-4">
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
                  
                  {/* Date */}
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      Date *
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
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
                        {date && startTime && endTime 
                          ? 'No items are available for the selected date and time. Please try a different time slot.'
                          : 'All items are currently unavailable for borrowing.'
                        }
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
                  
                  {selectedItemIds.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected {selectedItemIds.length} item(s)
                    </p>
                  )}
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

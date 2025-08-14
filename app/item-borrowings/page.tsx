'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { ProtectedRoute } from '../context/AuthContext';
import { getItemBorrowings, deleteItemBorrowing } from '../firebase/services';
import { ItemBorrowing, ItemBorrowingStatus } from '../types';
import Link from 'next/link';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiClipboard, FiFilter, FiSearch } from 'react-icons/fi';

export default function ItemBorrowingsPage() {
  const [borrowings, setBorrowings] = useState<ItemBorrowing[]>([]);
  const [filteredBorrowings, setFilteredBorrowings] = useState<ItemBorrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemBorrowingStatus | 'All'>('All');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<ItemBorrowing | null>(null);
  
  useEffect(() => {
    fetchBorrowings();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [borrowings, searchTerm, statusFilter, departmentFilter, dateRangeFilter]);
  
  const fetchBorrowings = async () => {
    try {
      setLoading(true);
      const borrowingsData = await getItemBorrowings();
      setBorrowings(borrowingsData);
    } catch (error) {
      console.error('Error fetching borrowings:', error);
      setError('Failed to load borrowings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFilters = () => {
    let filtered = [...borrowings];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(borrowing => 
        borrowing.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        borrowing.teacherAdviserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        borrowing.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        borrowing.items.some(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(borrowing => borrowing.status === statusFilter);
    }
    
    // Department filter
    if (departmentFilter) {
      filtered = filtered.filter(borrowing => 
        borrowing.department.toLowerCase().includes(departmentFilter.toLowerCase())
      );
    }
    
    // Date range filter
    if (dateRangeFilter) {
      const today = new Date();
      const filterDate = new Date(dateRangeFilter);
      
      switch (dateRangeFilter) {
        case 'today':
          filtered = filtered.filter(borrowing => borrowing.date === today.toISOString().split('T')[0]);
          break;
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          filtered = filtered.filter(borrowing => borrowing.date === tomorrow.toISOString().split('T')[0]);
          break;
        case 'this-week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          filtered = filtered.filter(borrowing => {
            const borrowingDate = new Date(borrowing.date);
            return borrowingDate >= startOfWeek && borrowingDate <= endOfWeek;
          });
          break;
        case 'next-week':
          const nextWeekStart = new Date(today);
          nextWeekStart.setDate(today.getDate() + (7 - today.getDay()));
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
          filtered = filtered.filter(borrowing => {
            const borrowingDate = new Date(borrowing.date);
            return borrowingDate >= nextWeekStart && borrowingDate <= nextWeekEnd;
          });
          break;
      }
    }
    
    setFilteredBorrowings(filtered);
  };
  
  const handleDeleteBorrowing = async (borrowingId: string) => {
    if (window.confirm('Are you sure you want to delete this borrowing request? This action cannot be undone.')) {
      try {
        await deleteItemBorrowing(borrowingId);
        setBorrowings(borrowings.filter(borrowing => borrowing.id !== borrowingId));
      } catch (error) {
        console.error('Error deleting borrowing:', error);
        setError('Failed to delete borrowing request. Please try again.');
      }
    }
  };
  
  const handleViewDetails = (borrowing: ItemBorrowing) => {
    setSelectedBorrowing(borrowing);
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBorrowing(null);
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
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatTime = (timeString: string) => {
    return timeString;
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Item Borrowings</h1>
              <p className="text-gray-600 mt-2">Manage all item borrowing requests</p>
            </div>
            <Link
              href="/new-item-borrowing"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus className="mr-2" size={20} />
              New Borrowing Request
            </Link>
          </div>
          
          {/* Error Message */}
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
          
          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <FiFilter className="text-gray-400" size={20} />
              <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search borrowings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ItemBorrowingStatus | 'All')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Reserved">Reserved</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              
              {/* Department Filter */}
              <input
                type="text"
                placeholder="Filter by department..."
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              
              {/* Date Range Filter */}
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="this-week">This Week</option>
                <option value="next-week">Next Week</option>
              </select>
            </div>
          </div>
          
          {/* Borrowings Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                All Borrowings ({filteredBorrowings.length})
              </h3>
            </div>
            
            {filteredBorrowings.length === 0 ? (
              <div className="text-center py-12">
                <FiClipboard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No borrowings found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {borrowings.length === 0 
                    ? 'Get started by creating a new borrowing request.' 
                    : 'Try adjusting your filters to see more results.'
                  }
                </p>
                {borrowings.length === 0 && (
                  <div className="mt-6">
                    <Link
                      href="/new-item-borrowing"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FiPlus className="mr-2" size={16} />
                      Create Borrowing Request
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Borrower
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBorrowings.map((borrowing) => (
                      <tr key={borrowing.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{formatDate(borrowing.date)}</div>
                            <div className="text-sm text-gray-500">
                              {formatTime(borrowing.startTime)} - {formatTime(borrowing.endTime)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{borrowing.borrowerName}</div>
                            <div className="text-sm text-gray-500">{borrowing.teacherAdviserName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {borrowing.department}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {borrowing.items.map(item => item.name).join(', ')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {borrowing.items.length} item(s)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(borrowing.status)}`}>
                            {borrowing.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetails(borrowing)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="View Details"
                            >
                              <FiEye size={16} />
                            </button>
                            <Link
                              href={`/item-borrowings/edit/${borrowing.id}`}
                              className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                              title="Edit"
                            >
                              <FiEdit size={16} />
                            </Link>
                            <button
                              onClick={() => handleDeleteBorrowing(borrowing.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Delete"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        {/* Borrowing Details Modal */}
        {showModal && selectedBorrowing && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }} onClick={handleCloseModal}>
            <div className="bg-white rounded-lg shadow-lg p-6" style={{ width: '90vw', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Borrowing Details</h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Borrower Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.borrowerName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Teacher/Adviser</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.teacherAdviserName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.department}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Items</label>
                  <div className="mt-1 space-y-1">
                    {selectedBorrowing.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-900">
                        • {item.name} ({item.serialNumber})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedBorrowing.date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatTime(selectedBorrowing.startTime)} - {formatTime(selectedBorrowing.endTime)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Room/Location</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.roomLocation}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Received By</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedBorrowing.receivedBy}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedBorrowing.status)}`}>
                    {selectedBorrowing.status}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Booked On</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedBorrowing.bookedOn?.toDate?.()?.toLocaleString() || 'N/A'}
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
                  onClick={handleCloseModal}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}

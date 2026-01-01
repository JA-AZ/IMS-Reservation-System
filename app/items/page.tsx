'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '../components/AdminLayout';
import { ProtectedRoute } from '../context/AuthContext';
import { getItems, deleteItem } from '../firebase/services';
import { Item, ItemStatus } from '../types';
import Link from 'next/link';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiPackage,
  FiFilter,
  FiSearch,
} from 'react-icons/fi';

type ItemStatusFilter = ItemStatus | 'All';
type CategoryFilterValue = 'All' | string;

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatusFilter>('All');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const itemsData = await getItems();
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching items:', error);
      setError('Failed to load items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await deleteItem(itemId);
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      } catch (error) {
        console.error('Error deleting item:', error);
        setError('Failed to delete item. Please try again.');
      }
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setCurrentPage(1);
  };

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'Borrowed':
        return 'bg-blue-100 text-blue-800';
      case 'Out of Service':
        return 'bg-red-100 text-red-800';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = useMemo(() => {
    const total = items.length;
    const available = items.filter((item) => item.status === 'Available').length;
    const borrowed = items.filter((item) => item.status === 'Borrowed').length;
    const unavailable = items.filter(
      (item) => item.status === 'Out of Service' || item.status === 'Maintenance'
    ).length;

    return { total, available, borrowed, unavailable };
  }, [items]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          items
            .map((item) => (item.category ?? '').trim())
            .filter((category) => category.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        [item.name, item.description, item.serialNumber, item.category]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(normalizedSearch));

      const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'All' ||
        (item.category ?? '').trim().toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [items, searchTerm, statusFilter, categoryFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  // Ensure current page is within bounds when data size changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredItems.slice(start, end);
  }, [filteredItems, currentPage]);

  const startIndex =
    filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex =
    filteredItems.length === 0
      ? 0
      : Math.min(startIndex + paginatedItems.length, filteredItems.length);

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
              <h1 className="text-3xl font-bold text-gray-900">Items Management</h1>
              <p className="text-gray-600 mt-2">
                Manage and track the availability of items for borrowing.
              </p>
            </div>
            <Link
              href="/items/new"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiPlus className="mr-2" size={20} />
              Add New Item
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
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

          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-lg px-4 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Items</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                <FiPackage className="text-blue-600" />
              </div>
            </div>

            <div className="bg-white shadow rounded-lg px-4 py-4">
              <p className="text-sm font-medium text-gray-500">Available</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">
                {stats.available}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Items currently ready to be borrowed.
              </p>
            </div>

            <div className="bg-white shadow rounded-lg px-4 py-4">
              <p className="text-sm font-medium text-gray-500">Borrowed</p>
              <p className="mt-1 text-2xl font-semibold text-blue-700">
                {stats.borrowed}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Items that are out and should be monitored.
              </p>
            </div>

            <div className="bg-white shadow rounded-lg px-4 py-4">
              <p className="text-sm font-medium text-gray-500">Unavailable</p>
              <p className="mt-1 text-2xl font-semibold text-red-700">
                {stats.unavailable}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                In maintenance or marked out of service.
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <FiFilter className="text-gray-400" size={18} />
                <h3 className="text-lg font-medium text-gray-900">Filters</h3>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all filters
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Search
                </label>
                <div className="relative">
                  <FiSearch
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Search by name, description, or serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as ItemStatusFilter)
                  }
                  className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="All">All statuses</option>
                  <option value="Available">Available</option>
                  <option value="Borrowed">Borrowed</option>
                  <option value="Out of Service">Out of Service</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as CategoryFilterValue)
                  }
                  className="px-3 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="All">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                All Items{' '}
                <span className="text-sm font-normal text-gray-500">
                  ({filteredItems.length}{' '}
                  {filteredItems.length === 1 ? 'result' : 'results'})
                </span>
              </h3>
            </div>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {items.length === 0 ? 'No items' : 'No items match your filters'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {items.length === 0
                    ? 'Get started by creating a new item.'
                    : 'Try adjusting or clearing your filters to see more items.'}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/items/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiPlus className="mr-2" size={16} />
                    Add Item
                  </Link>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Serial Number
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
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
                      {paginatedItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 md:px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.name}
                              </div>
                              <div className="hidden md:block text-sm text-gray-500 line-clamp-2">
                                {item.description}
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.serialNumber}
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.category || '-'}
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                item.status
                              )}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link
                                href={`/items/edit/${item.id}`}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                aria-label={`Edit ${item.name}`}
                              >
                                <FiEdit size={16} />
                              </Link>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                                aria-label={`Delete ${item.name}`}
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

                {filteredItems.length > 0 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500">
                      Showing{' '}
                      {startIndex + 1}-{endIndex} of {filteredItems.length} items
                    </p>
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((page) => Math.max(1, page - 1))
                          }
                          disabled={currentPage === 1}
                          className={`px-3 py-1 text-xs rounded-md border ${
                            currentPage === 1
                              ? 'text-gray-300 border-gray-200 cursor-not-allowed bg-gray-50'
                              : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, index) => {
                            const page = index + 1;
                            const isActive = page === currentPage;
                            return (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`min-w-[2rem] px-2 py-1 text-xs rounded-md border ${
                                  isActive
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.min(totalPages, page + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 text-xs rounded-md border ${
                            currentPage === totalPages
                              ? 'text-gray-300 border-gray-200 cursor-not-allowed bg-gray-50'
                              : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

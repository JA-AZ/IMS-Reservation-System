'use client';

import { useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import VenueForm from './VenueForm';
import VenueList from './VenueList';
import VenueExport from './VenueExport';

export default function VenuesContent() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'venues' | 'export'>('venues');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Venue Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage and analyze venues and their reservations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="mt-3 sm:mt-0 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          <FiPlus className="mr-2" size={16} />
          Add New Venue
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 pt-4 pb-2">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('venues')}
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === 'venues'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            All Venues
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Export
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      {activeTab === 'venues' ? (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">All Venues</h2>
          <VenueList />
        </div>
      ) : (
        <VenueExport />
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Venue</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="p-4">
              <VenueForm showTitle={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
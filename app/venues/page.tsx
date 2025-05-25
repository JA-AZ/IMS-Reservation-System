'use client';

import AdminLayout from '../components/AdminLayout';
import VenuesContent from '../components/VenuesContent';
import { ProtectedRoute } from '../context/AuthContext';

export default function VenuesPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <VenuesContent />
      </AdminLayout>
    </ProtectedRoute>
  );
} 
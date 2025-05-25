'use client';

import AdminLayout from '../components/AdminLayout';
import ReservationsContent from '../components/ReservationsContent';
import { ProtectedRoute } from '../context/AuthContext';

export default function ReservationsPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <ReservationsContent />
      </AdminLayout>
    </ProtectedRoute>
  );
} 
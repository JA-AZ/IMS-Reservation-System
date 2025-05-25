'use client';

import AdminLayout from '../components/AdminLayout';
import NewReservationForm from '../components/NewReservationForm';
import { ProtectedRoute } from '../context/AuthContext';

export default function NewReservationPage() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">New Reservation</h1>
          <NewReservationForm />
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
} 
'use client';

import AdminLayout from './components/AdminLayout';
import DashboardContent from './components/DashboardContent';
import { ProtectedRoute } from './context/AuthContext';

export default function Home() {
  return (
    <ProtectedRoute>
      <AdminLayout>
        <DashboardContent />
      </AdminLayout>
    </ProtectedRoute>
  );
}

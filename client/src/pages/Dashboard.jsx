import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import DonorDashboard from './DonorDashboard';
import NgoDashboard from './NgoDashboard';
import VolunteerDashboard from './VolunteerDashboard';
import AdminDashboard from './AdminDashboard';
import { Loader } from 'lucide-react';

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-red-500 animate-spin" />
          <span className="text-gray-400 text-sm">Validating role profile...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render dashboard based on role profile mapping
  switch (user.role) {
    case 'donor':
      return <DonorDashboard />;
    case 'ngo':
      return <NgoDashboard />;
    case 'volunteer':
      return <VolunteerDashboard />;
    case 'admin':
    case 'super-admin':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default Dashboard;

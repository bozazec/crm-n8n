import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { session, loading } = useAuth();

  if (loading) {
    // Optional: Show a loading spinner or a blank page while checking auth state
    return <div>Loading...</div>; 
  }

  if (!session) {
    // Redirect to the login page if there is no active session
    return <Navigate to="/login" replace />;
  }

  // Render the child routes/components if the user is authenticated
  return <Outlet />;
};

export default ProtectedRoute; 
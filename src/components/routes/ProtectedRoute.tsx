import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { role, loading, currentUser, isSimulated, userProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#52796F]"></div>
      </div>
    );
  }

  // If not logged in and not simulating a role, redirect to login
  if (!currentUser && !isSimulated && !role) {
    return <Navigate to="/login" replace />;
  }

  // Enforce linking child code for parent accounts with 0 linked children
  const linkedIds = userProfile?.linkedChildIds || [];
  if (
    role === 'parent' && 
    linkedIds.length === 0 && 
    location.pathname !== '/vincular-hijo'
  ) {
    return <Navigate to="/vincular-hijo" replace />;
  }

  // If role is not allowed for this route, redirect to unauthorized
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return <Outlet />;
};

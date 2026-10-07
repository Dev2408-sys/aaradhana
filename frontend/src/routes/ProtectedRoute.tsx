import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import type { UserRole } from '../types/auth';

interface ProtectedRouteProps {
  roles?: UserRole[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-navy-700">
        Loading session…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

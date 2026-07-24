import { Navigate, Outlet } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';

// Wraps a set of routes that require a specific permission — used inside a
// feature's own route definitions, nested under ProtectedRoute. A user who
// is authenticated but lacks the permission is bounced to the dashboard
// rather than shown a raw 403 page (the server still enforces the real gate).
export default function PermissionRoute({ permission }) {
  const hasPermission = usePermission(permission);
  if (!hasPermission) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

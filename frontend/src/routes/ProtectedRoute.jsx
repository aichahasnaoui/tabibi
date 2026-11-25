import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/auth.js';

export default function ProtectedRoute({ roles }) {
  const { user, ready } = useAuth();
  if (!ready) return <p className="center">Chargement…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

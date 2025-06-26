import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, role } = useAuth();

  if (!user) {
    // not logged in
    return <Navigate to="/" replace />;
  }

  // admin can see everything
  if (role === 'admin') {
    return children;
  }

  // otherwise only allow the specified roles
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/not-authorized" replace />;
  }

  return children;
}
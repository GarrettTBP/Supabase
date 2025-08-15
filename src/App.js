import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import HideableNavbar from './components/HideableNavbar';
import ProtectedRoute from './components/ProtectedRoute';
import QuickExportPage from './pages/QuickExportPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PropertyListPage from './pages/PropertyListPage';
import PropertyFilterPage from './pages/PropertyFilterPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import OwnedPropertiesPage from './pages/OwnedPropertiesPage';
import OwnedPropertyDetailPage from './pages/OwnedPropertyDetailPage';
import MappingPage from './pages/MappingPage';
import MapPage from './pages/MapPage';

function RootGate() {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <HideableNavbar />
        <Routes>
          {/* If logged in, bounce to dashboard; otherwise show login */}
          <Route path="/" element={<RootGate />} />

          {/* everyone (all roles) sees the dashboard after login */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["acquisitions", "asset_management"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* admin-only */}
          <Route
            path="/mapping"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MappingPage />
              </ProtectedRoute>
            }
          />

          {/* acquisitions-only */}
          <Route
            path="/properties"
            element={
              <ProtectedRoute allowedRoles={['acquisitions']}>
                <PropertyListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/filter"
            element={
              <ProtectedRoute allowedRoles={['acquisitions']}>
                <PropertyFilterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/property/:id"
            element={
              <ProtectedRoute allowedRoles={['acquisitions']}>
                <PropertyDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute allowedRoles={['acquisitions']}>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quick-export"
            element={
               <ProtectedRoute allowedRoles={['admin', 'acquisitions']}>
               <QuickExportPage />
              </ProtectedRoute>
         }
          />

          {/* asset-management-only */}
          <Route
            path="/owned-properties"
            element={
              <ProtectedRoute allowedRoles={['asset_management']}>
                <OwnedPropertiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owned-property/:id"
            element={
              <ProtectedRoute allowedRoles={['asset_management']}>
                <OwnedPropertyDetailPage />
              </ProtectedRoute>
            }
          />

          <Route path="/not-authorized" element={<div>Not authorized</div>} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
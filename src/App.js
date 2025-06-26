import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HideableNavbar from './components/HideableNavbar';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import PropertyListPage from './pages/PropertyListPage';
import PropertyFilterPage from './pages/PropertyFilterPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import OwnedPropertiesPage from './pages/OwnedPropertiesPage';
import OwnedPropertyDetailPage from './pages/OwnedPropertyDetailPage';
import MappingPage from './pages/MappingPage';
import MapPage from './pages/MapPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <HideableNavbar />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
  path="/mapping"
  element={
    <ProtectedRoute allowed={['admin']}>
      <MappingPage />
    </ProtectedRoute>
  }
/>

          {/* acquisitions-only */}
          <Route
            path="/properties"
            element={
              <ProtectedRoute allowedRoles={[ 'acquisitions' ]}>
                <PropertyListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/filter"
            element={
              <ProtectedRoute allowedRoles={[ 'acquisitions' ]}>
                <PropertyFilterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/map"
            element={
              <ProtectedRoute allowed={['acquisitions']}>
                <MapPage />
              </ProtectedRoute>
          }
         />
          <Route
            path="/property/:id"
            element={
              <ProtectedRoute allowedRoles={[ 'acquisitions' ]}>
                <PropertyDetailPage />
              </ProtectedRoute>
            }
          />

          {/* asset-management-only */}
          <Route
            path="/owned-properties"
            element={
              <ProtectedRoute allowedRoles={[ 'asset_management' ]}>
                <OwnedPropertiesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owned-property/:id"
            element={
              <ProtectedRoute allowedRoles={[ 'asset_management' ]}>
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
// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HideableNavbar from './components/HideableNavbar'

import LoginPage from './pages/LoginPage'
import PropertyListPage from './pages/PropertyListPage'
import PropertyDetailPage from './pages/PropertyDetailPage'
import PropertyFilterPage from './pages/PropertyFilterPage'

function App() {
  return (
    <Router>
      {/* only show navbar once unlocked? if you want it hidden on login, move this inside the protected routes below */}
      <HideableNavbar />

      <Routes>
        {/* 1) root shows the login gate */}
        <Route path="/" element={<LoginPage />} />

        {/* 2) once password is correct you navigate to /properties */}
        <Route path="/properties" element={<PropertyListPage />} />
        <Route path="/filter"      element={<PropertyFilterPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />

        {/* (optional) catch-all redirect back to login */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </Router>
  )
}

export default App

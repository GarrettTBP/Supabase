import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PropertyListPage from './pages/PropertyListPage'
import PropertyDetailPage from './pages/PropertyDetailPage'
import PropertyFilterPage from './pages/PropertyFilterPage'
import Navbar from './components/Navbar' 
function App() {
  return (
    <Router>
       <Navbar />
      <Routes>
        <Route path="/filter" element={<PropertyFilterPage />} />
        <Route path="/" element={<PropertyListPage />} />
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </Router>
  )
}

export default App

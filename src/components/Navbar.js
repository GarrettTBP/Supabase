import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav style={{
      display: 'flex',
      padding: '12px 24px',
      backgroundColor: '#333',
      color: 'white',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '20px' }}>Database Project</div>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Link to="/properties" style={{ color: 'white', textDecoration: 'none' }}>Property List</Link>
        <Link to="/filter" style={{ color: 'white', textDecoration: 'none' }}>Filter Properties</Link>
      </div>
    </nav>
  )
}

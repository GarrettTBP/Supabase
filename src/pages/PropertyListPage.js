import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'



export default function PropertyListPage() {
  const [properties, setProperties] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    fetchProperties()
  }, [])

  async function fetchProperties() {
    const { data, error } = await supabase.from('properties').select('*')
    if (error) console.error('Error fetching properties:', error)
    else setProperties(data)
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>Properties</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
        {properties.map((property) => (
          <div
  key={property.id}
  onClick={() => navigate(`/property/${property.id}`)}
  style={{
    width: '200px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '10px',
    overflow: 'hidden',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    backgroundColor: '#fff'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'scale(1.03)'
    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'scale(1)'
    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
  }}
>

            <img
              src={property.image_url || 'https://via.placeholder.com/200x120.png?text=No+Image'}
              alt={property.name}
              style={{ width: '100%', height: '120px', objectFit: 'cover' }}
            />
            <div style={{ padding: '10px', fontWeight: 'bold' }}>{property.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

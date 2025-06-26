import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './PropertyListPage.css';

export default function OwnedPropertiesPage() {
  const [properties, setProperties] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    const { data, error } = await supabase
      .from('owned_properties')
      .select('id, name, image_url, property_type');
    if (error) {
      console.error('Error fetching owned properties:', error);
    } else {
      setProperties(data);
    }
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Owned Properties</h1>
      <div className="property-grid">
        {properties.map((property) => (
          <div
            key={property.id}
            className="property-card"
            onClick={() => navigate(`/owned-property/${property.id}`)}
          >
            <img
              src={property.image_url || 'https://via.placeholder.com/200x120.png?text=No+Image'}
              alt={property.name}
              className="property-image"
            />
            <div className="property-name">{property.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Select from 'react-select';
import './PropertyListPage.css';



export default function PropertyListPage() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [vintages, setVintages] = useState([]);
  const [locations, setLocations] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedVintages, setSelectedVintages] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    const { data, error } = await supabase.from('properties').select('*');
    if (error) console.error('Error fetching properties:', error);
    else {
      setProperties(data);
      setFilteredProperties(data);

      const allVintages = Array.from(new Set(data.map(row => Math.floor(row.vintage_year / 10) * 10)));
      const allLocations = Array.from(new Set(data.map(row => row.location)));
      const allTypes = Array.from(new Set(data.map(row => row.property_type)));

      setVintages(allVintages);
      setLocations(allLocations);
      setTypes(allTypes);
    }
  }

  useEffect(() => {
    let data = properties.filter(row => {
      const vintageDecade = Math.floor(row.vintage_year / 10) * 10;
      const inVintage = selectedVintages.length === 0 || selectedVintages.includes(vintageDecade);
      const inLocation = selectedLocations.length === 0 || selectedLocations.includes(row.location);
      const inType = selectedTypes.length === 0 || selectedTypes.includes(row.property_type);
      return inVintage && inLocation && inType;
    });
    setFilteredProperties(data);
  }, [selectedVintages, selectedLocations, selectedTypes, properties]);

  return (
    <div className="page-container">
      <h1 className="page-title">Properties</h1>

      <div className="filter-bar">
        <div className="filter-group">
          <label>Vintage Decade:</label>
          <Select
            isMulti
            options={vintages.map(v => ({ value: v, label: `${v}s` }))}
            onChange={vals => setSelectedVintages(vals.map(v => v.value))}
          />
        </div>
        <div className="filter-group">
          <label>Location:</label>
          <Select
            isMulti
            options={locations.map(l => ({ value: l, label: l }))}
            onChange={vals => setSelectedLocations(vals.map(v => v.value))}
          />
        </div>
        <div className="filter-group">
          <label>Property Type:</label>
          <Select
            isMulti
            options={types.map(t => ({ value: t, label: t }))}
            onChange={vals => setSelectedTypes(vals.map(v => v.value))}
          />
        </div>
      </div>

      <div className="property-grid">
        {filteredProperties.map((property) => (
          <div
            key={property.id}
            className="property-card"
            onClick={() => navigate(`/property/${property.id}`)}
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

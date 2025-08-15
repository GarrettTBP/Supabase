import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import Select from 'react-select';
import './PropertyListPage.css';

export default function PropertyListPage() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [vintages, setVintages] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedVintages, setSelectedVintages] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);

  // NEW: State → City cascading filters
  const [states, setStates] = useState([]);                // e.g. ["AZ","CO","TX"]
  const [stateCities, setStateCities] = useState({});       // e.g. { CO: ["Denver","Lakewood"], ... }
  const [selectedState, setSelectedState] = useState(null); // e.g. "CO"
  const [selectedCities, setSelectedCities] = useState([]); // e.g. ["Denver","Lakewood"]

  const [showAddForm, setShowAddForm] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newProperty, setNewProperty] = useState({
    name: '',
    property_type: '',
    location: '',
    number_of_units: '',
    vintage_year: '',
    avg_sqft_per_unit: '',
    image_url: ''
  });

  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    async function loadAvatar() {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('username', user)
        .single();
      if (!error && data) setAvatarUrl(data.avatar_url || '');
    }
    loadAvatar();
  }, [user]);

  async function fetchProperties() {
    const { data, error } = await supabase.from('properties').select('*');
    if (error) {
      console.error('Error fetching properties:', error);
      return;
    }

    setProperties(data);
    setFilteredProperties(data);

    // Vintages / Types
    const allVintages = Array.from(
      new Set(data.map(row => Math.floor((row.vintage_year || 0) / 10) * 10))
    ).filter(v => !Number.isNaN(v));
    const allTypes = Array.from(new Set(data.map(row => row.property_type).filter(Boolean)));
    setVintages(allVintages);
    setTypes(allTypes);

    // Build State → Cities map from "City, ST"
    const stateSet = new Set();
    const scMap = {};
    data.forEach(row => {
      const loc = row.location || '';
      const [cityRaw, stateRaw] = loc.split(',');
      const city = (cityRaw || '').trim();
      const state = (stateRaw || '').trim();
      if (!state) return;
      stateSet.add(state);
      if (!scMap[state]) scMap[state] = new Set();
      if (city) scMap[state].add(city);
    });

    const statesArr = Array.from(stateSet).sort();
    const mapObj = Object.fromEntries(
      Object.entries(scMap).map(([st, cities]) => [st, Array.from(cities).sort()])
    );

    setStates(statesArr);
    setStateCities(mapObj);
  }

  // Filtering logic, now includes State → City
  useEffect(() => {
    const data = properties.filter(row => {
      const vintageDecade = Math.floor((row.vintage_year || 0) / 10) * 10;
      const inVintage = selectedVintages.length === 0 || selectedVintages.includes(vintageDecade);
      const inType = selectedTypes.length === 0 || selectedTypes.includes(row.property_type);

      const [cityRaw, stateRaw] = (row.location || '').split(',');
      const rowCity = (cityRaw || '').trim();
      const rowState = (stateRaw || '').trim();

      const stateOK = !selectedState || rowState === selectedState;
      const cityOK = selectedCities.length === 0 || selectedCities.includes(rowCity);

      return inVintage && inType && stateOK && cityOK;
    });
    setFilteredProperties(data);
  }, [selectedVintages, selectedTypes, selectedState, selectedCities, properties]);

  async function handleAddProperty() {
    try {
      const response = await fetch('https://garretttbp.app.n8n.cloud/webhook/200b04cd-79b5-49c5-adad-40cf9d51347e', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty)
      });

      await response.json();
      fetchProperties();
      setShowAddForm(false);
      setNewProperty({
        name: '',
        property_type: '',
        location: '',
        number_of_units: '',
        vintage_year: '',
        avg_sqft_per_unit: '',
        image_url: ''
      });
    } catch (error) {
      console.error('Error adding property:', error);
    }
  }

  // Sidebar nav items based on role
  const sideLinks = [];
  sideLinks.push({ label: 'Dashboard', to: '/dashboard' });
  if (role === 'acquisitions' || role === 'admin') {
    sideLinks.push(
      { label: 'Property List', to: '/properties' },
      { label: 'Filter Properties', to: '/filter' },
      { label: 'All Properties Map', to: '/map' },
    );
  }
  if (role === 'asset_management' || role === 'admin') {
    sideLinks.push({ label: 'Owned Properties', to: '/owned-properties' });
  }
  if (role === 'admin') {
    sideLinks.push({ label: 'Mapping Page', to: '/mapping' });
  }

  // Options for selects
  const stateOptions = states.map(st => ({ value: st, label: st }));
  const cityOptions = (selectedState ? stateCities[selectedState] || [] : []).map(c => ({ value: c, label: c }));

  return (
    <div className="pl-wrap">
      {/* Sidebar */}
      <aside className="pl-sidebar">
        <div className="pl-brand">
          <img src="/logo.png" className="pl-logo" alt="Trailbreak" />
        </div>

        <div className="pl-user">
          {avatarUrl ? (
            <img src={avatarUrl} className="pl-avatar" alt="Profile" />
          ) : (
            <div className="pl-avatar placeholder" />
          )}
          <div className="pl-role">{role?.replace('_', ' ') || ''}</div>
        </div>

        <nav className="pl-nav">
          {sideLinks.map((l) => (
            <button
              key={l.to}
              className={`pl-nav-item ${pathname === l.to ? 'active' : ''}`}
              onClick={() => navigate(l.to)}
            >
              {l.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="pl-content">
        <div className="pl-header">
          <h1 className="pl-title">Properties</h1>
          <button className="add-property-btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Close' : '➕ Add Property'}
          </button>
        </div>

        {showAddForm && (
          <div className="card add-form">
            <input
              type="text"
              placeholder="Property Name"
              value={newProperty.name}
              onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Property Type"
              value={newProperty.property_type}
              onChange={(e) => setNewProperty({ ...newProperty, property_type: e.target.value })}
            />
            <input
              type="text"
              placeholder="Location (City, ST)"
              value={newProperty.location}
              onChange={(e) => setNewProperty({ ...newProperty, location: e.target.value })}
            />
            <input
              type="number"
              placeholder="Number of Units"
              value={newProperty.number_of_units}
              onChange={(e) => setNewProperty({ ...newProperty, number_of_units: e.target.value })}
            />
            <input
              type="number"
              placeholder="Vintage Year"
              value={newProperty.vintage_year}
              onChange={(e) => setNewProperty({ ...newProperty, vintage_year: e.target.value })}
            />
            <input
              type="number"
              placeholder="Avg SqFt Per Unit"
              value={newProperty.avg_sqft_per_unit}
              onChange={(e) => setNewProperty({ ...newProperty, avg_sqft_per_unit: e.target.value })}
            />
            <input
              type="text"
              placeholder="Image URL (optional)"
              value={newProperty.image_url}
              onChange={(e) => setNewProperty({ ...newProperty, image_url: e.target.value })}
            />
            <button className="save-btn" onClick={handleAddProperty}>Save</button>
          </div>
        )}

        <div className="card filter-card">
          <div className="filter-grid">
            <div className="filter-group">
              <label>Vintage Decade</label>
              <Select
                isMulti
                options={vintages.map(v => ({ value: v, label: `${v}s` }))}
                onChange={vals => setSelectedVintages(vals.map(v => v.value))}
              />
            </div>

            {/* State then City */}
            <div className="filter-group">
              <label>State</label>
              <Select
                classNamePrefix="rs"
                isClearable
                options={stateOptions}
                value={selectedState ? { value: selectedState, label: selectedState } : null}
                onChange={(val) => {
                  setSelectedState(val ? val.value : null);
                  setSelectedCities([]); // reset cities when state changes
                }}
                placeholder="Select a state…"
              />
            </div>

            <div className="filter-group">
              <label>City</label>
              <Select
                classNamePrefix="rs"
                isMulti
                isDisabled={!selectedState}
                options={cityOptions}
                value={selectedCities.map(c => ({ value: c, label: c }))}
                onChange={(vals) => setSelectedCities(vals.map(v => v.value))}
                placeholder={selectedState ? 'Select city…' : 'Select state first…'}
              />
            </div>

            <div className="filter-group">
              <label>Property Type</label>
              <Select
                isMulti
                options={types.map(t => ({ value: t, label: t }))}
                onChange={vals => setSelectedTypes(vals.map(v => v.value))}
              />
            </div>
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
      </main>
    </div>
    
  );
}
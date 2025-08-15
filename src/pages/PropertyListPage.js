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
  const [states, setStates] = useState([]);
  const [stateCities, setStateCities] = useState({});
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCities, setSelectedCities] = useState([]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false); // NEW
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newProperty, setNewProperty] = useState({
    name: '',
    property_type: '',
    location: '',
    number_of_units: '',
    vintage_year: '',
    avg_sqft_per_unit: '',
    image_url: '',
    // NEW: optional link to T12 file
    t12_url: ''
  });

  // NEW: upload form state
  const [uploadForm, setUploadForm] = useState({
    propertyId: '', // optional (choose from list)
    propertyName: '', // optional (type a name if not in list)
    file: null,
  });

  // POINT THIS AT YOUR n8n FLOW that parses the file & inserts monthly_expenses
  // Expecting multipart/form-data with fields: property_name, property_id (optional), uploader, file
  // Use CRA dev proxy to avoid CORS locally: add to package.json →  "proxy": "https://garretttbp.app.n8n.cloud"
  // Then this relative path will be proxied to n8n (and you can override via REACT_APP_FINANCIAL_UPLOAD_URL)
  // Prefer active workflow URL via CRA proxy. In dev, set package.json → "proxy": "https://garretttbp.app.n8n.cloud"
  // Optionally override with REACT_APP_FINANCIAL_UPLOAD_URL
  const FINANCIAL_UPLOAD_URL = process.env.REACT_APP_FINANCIAL_UPLOAD_URL || '/webhook/upload-financials';

  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => { fetchProperties(); }, []);

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
        image_url: '',
        t12_url: ''
      });
    } catch (error) {
      console.error('Error adding property:', error);
    }
  }

  // NEW: upload handler via Supabase Storage + JSON to n8n
  async function uploadToStorage(file, property_name, propertyId){
    const slug = (s) => (s || 'file').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    const folder = propertyId || slug(property_name);
    const path = `uploads/${folder}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('financials').upload(path, file, {
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    });
    if (upErr) throw upErr;
    // Try public URL first, fallback to signed URL
    let file_url = null;
    const pub = supabase.storage.from('financials').getPublicUrl(path);
    if (pub?.data?.publicUrl) {
      file_url = pub.data.publicUrl;
    } else {
      const { data: signed, error: signErr } = await supabase.storage.from('financials').createSignedUrl(path, 3600);
      if (signErr) throw signErr;
      file_url = signed.signedUrl;
    }
    return { path, file_url };
  }

  async function handleUploadFinancials(e) {
    e.preventDefault();
    try {
      const nameFromId = properties.find(p => p.id === uploadForm.propertyId)?.name || '';
      const property_name = uploadForm.propertyName?.trim() || nameFromId;
      if (!property_name) {
        alert('Please select a property or type a property name.');
        return;
      }
      if (!uploadForm.file) {
        alert('Please choose a file to upload.');
        return;
      }

      // 1) Upload file to Supabase Storage (bucket: financials)
      const { path, file_url } = await uploadToStorage(uploadForm.file, property_name, uploadForm.propertyId);

      // 2) Notify n8n with a simple JSON payload (avoids multipart CORS issues)
      const res = await fetch(FINANCIAL_UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_name,
          property_id: uploadForm.propertyId || null,
          uploader: user || null,
          file_url,
          storage_path: path,
        })
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0,300)}`);

      alert('Financials uploaded successfully.');
      setShowUploadForm(false);
      setUploadForm({ propertyId: '', propertyName: '', file: null });
    } catch (err) {
      console.error('Upload error:', err);
      alert(`There was a problem uploading the file.\n${String(err)}`);
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
  const propertyOptions = properties.map(p => ({ value: p.id, label: p.name })); // NEW

  // Categories expected in the Excel template (first column)
  const CATEGORIES = ['payroll','admin','marketing','repairs_maintenance','turnover','utilities','taxes','insurance','management_fees'];

  function monthLabel(date){
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }
  function recentMonthHeaders(n=12){
    const headers = [];
    const end = new Date();
    end.setDate(1); // start of current month
    end.setMonth(end.getMonth() - 1); // last full month
    for (let i = n-1; i >= 0; i--) {
      const d = new Date(end);
      d.setMonth(end.getMonth() - i);
      headers.push(monthLabel(d));
    }
    return headers;
  }

  async function handleDownloadTemplate(){
    // dynamic import keeps bundle light; run: npm i xlsx
    const mod = await import('xlsx');
    const XLSX = mod.default || mod;
    const headers = ['category', ...Array.from({ length: 12 }, () => 'MM/DD/YYYY')];
    const rows = CATEGORIES.map(k => [k]);
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Financials');
    XLSX.writeFile(wb, 'financials_template.xlsx');
  }

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
          <div className="header-actions">{/* NEW button group */}
            <button
              className="template-btn"
              type="button"
              onClick={handleDownloadTemplate}
              title="Download Excel template (rows = categories, columns = dates)"
            >
              ⬇ Download Template (.xlsx)
            </button>
            <button
              className="upload-btn"
              onClick={() => { setShowUploadForm((s) => !s); if (!showUploadForm) setShowAddForm(false); }}
            >
              ⬆ Upload Financials
            </button>
            <button
              className="add-property-btn"
              onClick={() => { setShowAddForm((s) => !s); if (!showAddForm) setShowUploadForm(false); }}
            >
              {showAddForm ? 'Close' : '➕ Add Property'}
            </button>
          </div>
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
            {/* NEW: T12 URL input */}
            <input
              type="text"
              placeholder="T12 URL (optional)"
              value={newProperty.t12_url}
              onChange={(e) => setNewProperty({ ...newProperty, t12_url: e.target.value })}
            />
            <button className="save-btn" onClick={handleAddProperty}>Save</button>
          </div>
        )}

        {/* NEW: Upload financials form */}
        {showUploadForm && (
          <form className="card upload-form" onSubmit={handleUploadFinancials}>
            <div className="field">
              <label>Property (choose existing)</label>
              <Select
                classNamePrefix="rs"
                isClearable
                options={propertyOptions}
                value={uploadForm.propertyId ? { value: uploadForm.propertyId, label: properties.find(p => p.id === uploadForm.propertyId)?.name } : null}
                onChange={(val) => setUploadForm((f) => ({ ...f, propertyId: val ? val.value : '', propertyName: '' }))}
                placeholder="Select a property…"
              />
            </div>

            <div className="field">
              <label>Or type property name</label>
              <input
                type="text"
                placeholder="e.g., Park Point"
                value={uploadForm.propertyName}
                onChange={(e) => setUploadForm((f) => ({ ...f, propertyName: e.target.value, propertyId: '' }))}
              />
            </div>

            <div className="field">
              <label>Financials file (.xlsx, .csv)</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setUploadForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                required
              />
            </div>

            <div className="upload-actions">
              <button type="submit" className="save-btn">Upload</button>
            </div>
          </form>
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
                  setSelectedCities([]);
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

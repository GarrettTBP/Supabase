import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap
} from 'react-leaflet';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import {
  Box,
  Drawer,
  Toolbar,
  List,
  ListItem,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  TextField
} from '@mui/material';
import './MapPage.css';

// initial map fit only once
function InitialFitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
  }, []);
  return null;
}

export default function MapPage() {
  const [allProps, setAllProps] = useState([]);
  const [filteredProps, setFilteredProps] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zipCode, setZipCode] = useState('');

  // map instance
  const [mapInstance, setMapInstance] = useState(null);

  // load properties
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('properties')
        .select(
          'id, name, property_type, location, number_of_units, vintage_year, image_url, t12_url, latitude, longitude'
        );
      if (error) return console.error(error);
      const cleaned = data
        .filter(p => p.latitude && p.longitude)
        .map(p => ({
          ...p,
          latitude: +p.latitude,
          longitude: +p.longitude
        }));
      setAllProps(cleaned);
      setFilteredProps(cleaned);
      setTypes([...new Set(cleaned.map(p => p.property_type))]);
    }
    load();
  }, []);

  // filter by property type
  useEffect(() => {
    setFilteredProps(
      selectedTypes.length
        ? allProps.filter(p => selectedTypes.includes(p.property_type))
        : allProps
    );
  }, [allProps, selectedTypes]);

  // toggle selection
  const toggleSelect = id => {
    setSelectedIds(prev => {
      const next = prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id];
      setDrawerOpen(next.length > 0);
      return next;
    });
  };

  // search by ZIP code and zoom map
  const handleZipSearch = async () => {
    const zip = zipCode.trim();
    if (!/^\d{5}$/.test(zip)) {
      alert('Please enter a valid 5-digit ZIP code.');
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&postalcode=${zip}&countrycodes=us&limit=1`
      );
      const results = await res.json();
      if (results.length > 0 && mapInstance) {
        const { lat, lon } = results[0];
        mapInstance.setView([parseFloat(lat), parseFloat(lon)], 12);
      } else {
        alert('ZIP code location not found.');
      }
    } catch (err) {
      console.error('ZIP search error:', err);
      alert('Error searching ZIP code.');
    }
  };

  // export to Excel
  const exportExcel = async () => {
    if (!selectedIds.length) return;
    const wb = XLSX.utils.book_new();

    // Property Info sheet
    const infoData = filteredProps
      .filter(p => selectedIds.includes(p.id))
      .map(p => ({
        Name: p.name,
        Type: p.property_type,
        Location: p.location,
        Units: p.number_of_units,
        T12_Link: p.t12_url
      }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(infoData),
      'Property Info'
    );

    // consolidated pivot logic (unchanged)...
    // [existing consolidated code here]

    XLSX.writeFile(wb, 'Selected_Properties.xlsx');
  };

  const bounds = filteredProps.map(p => [p.latitude, p.longitude]);

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 200, boxSizing: 'border-box' } }}
      >
        <Toolbar>
          <Button onClick={() => setDrawerOpen(false)}>Close</Button>
        </Toolbar>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Selected Properties</Typography>
          <List>
            {selectedIds.map(id => {
              const p = allProps.find(x => x.id === id);
              return <ListItem key={id}>{p?.name}</ListItem>;
            })}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, ml: drawerOpen ? '200px' : 0, transition: 'margin 0.3s' }}>
        <Toolbar />
        <Box sx={{ display: 'flex', gap: 2, p: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="type-filter-label">Property Type</InputLabel>
            <Select
              labelId="type-filter-label"
              multiple
              value={selectedTypes}
              onChange={e => setSelectedTypes(e.target.value)}
              input={<OutlinedInput label="Property Type" />}
              renderValue={selected => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map(val => <Chip key={val} label={val} />)}
                </Box>
              )}
            >
              {types.map(type => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ position: 'relative', zIndex: 2000, display: 'flex', gap: 1 }}>
            <TextField
              label="ZIP Code"
              variant="outlined"
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleZipSearch()}
              sx={{ width: 120 }}
            />
            <Button variant="contained" onClick={handleZipSearch}>
              Search
            </Button>
          </Box>

          <Button
            variant="contained"
            color="primary"
            disabled={!selectedIds.length}
            onClick={exportExcel}
          >
            Export Selected ({selectedIds.length})
          </Button>
        </Box>

        <MapContainer
          center={[39.0, -105.5]}
          zoom={7}
          scrollWheelZoom
          whenCreated={setMapInstance}
          style={{ height: '75vh', width: '100%' }}
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredProps.map(prop => (
            <CircleMarker
              key={prop.id}
              center={[prop.latitude, prop.longitude]}
              radius={6}
              pathOptions={{
                color: 'darkred',
                fillColor: selectedIds.includes(prop.id) ? 'blue' : 'red',
                fillOpacity: 0.8
              }}
              eventHandlers={{
                click: () => toggleSelect(prop.id),
                mouseover: e => e.target.openPopup(),
                mouseout: e => e.target.closePopup()
              }}
            >
              <Popup closeButton={false}>
                <Box sx={{ p: 1, textAlign: 'center' }}>
                  {prop.image_url && (
                    <Box
                      component="img"
                      src={prop.image_url}
                      alt={prop.name}
                      sx={{
                        width: 120,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 1,
                        mb: 1
                      }}
                    />
                  )}
                  <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>
                    {prop.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'secondary.main' }}>
                    Units: {prop.number_of_units}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Vintage Year: {prop.vintage_year}
                  </Typography>
                </Box>
              </Popup>
            </CircleMarker>
          ))}
          <InitialFitBounds bounds={bounds} />
        </MapContainer>
      </Box>
    </Box>
  );
}

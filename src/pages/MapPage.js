import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import './MapPage.css';

// optional: fit map to bounds of all markers
function FitBounds({ bounds }) {
  const map = useMap();
  if (bounds.length) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return null;
}

export default function MapPage() {
  const [properties, setProperties] = useState([]);
  

  useEffect(() => {
    // 1) fetch all properties with lat/lng
    supabase
      .from('properties')
      .select('id, name, latitude, longitude, property_type, units')
      .then(({ data, error }) => {
        if (error) console.error(error);
        else setProperties(data.filter(p => p.latitude && p.longitude));
      });

    
  }, []);

  // compute bounds array [[lat, lng], ...]
  const bounds = properties.map(p => [p.latitude, p.longitude]);

  return (
    <div className="map-page">
      <h1>All Properties Map</h1>
      <MapContainer 
        className="leaflet-map" 
        center={[37.8, -96]} 
        zoom={4} 
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        

        {properties.map(prop => (
          <CircleMarker
            key={prop.id}
            center={[prop.latitude, prop.longitude]}
            radius={6}
            color="#007bff"
            fillOpacity={0.8}
            eventHandlers={{
              mouseover: e => e.target.openPopup(),
              mouseout:  e => e.target.closePopup()
            }}
          >
            <Popup>
              <strong>{prop.name}</strong><br/>
              Type: {prop.property_type}<br/>
              Units: {prop.units}
            </Popup>
          </CircleMarker>
        ))}

        <FitBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}

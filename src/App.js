import React, { useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '80vh'
};

const defaultCenter = { lat: 40.712776, lng: -74.005974 };

function App() {
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/process-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      const { locations } = await response.json();
      if (locations.length > 0) {
        setMapCenter({ lat: locations[0].lat, lng: locations[0].lng });
        setMarkers(locations.map(loc => ({
          lat: loc.lat,
          lng: loc.lng,
          name: loc.name,
          description: loc.address
        })));
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="App">
      <div style={{ padding: '20px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter complex query (e.g., '3 museums and 2 cafes in Paris')"
          style={{ width: '500px', marginRight: '10px', padding: '8px' }}
        />
        <button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Search'}
        </button>
      </div>

      <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={mapCenter}
          zoom={12}
        >
          {markers.map((marker, index) => (
            <Marker
              key={index}
              position={{ lat: marker.lat, lng: marker.lng }}
              onClick={() => setSelectedMarker(marker)}
              label={(index + 1).toString()}
            />
          ))}

          {selectedMarker && (
            <InfoWindow
              position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div>
                <h3>{selectedMarker.name}</h3>
                <p>{selectedMarker.description}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}

export default App;
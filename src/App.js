import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

// ==============================================
// Constants & Configuration
// ==============================================
const MAP_CONFIG = {
  containerStyle: {
    width: '100%',
    height: '80vh',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  defaultCenter: { lat: 30, lng: 0 },
  defaultZoom: 2,
  mapStyles: [
    { elementType: "geometry", stylers: [{ color: "#1d1f21" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1d1f21" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#404040" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#a0a0a0" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#2d2d2d" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#142438" }] },
    { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#82b1ff" }] }
  ]
};

const STYLES = {
  appContainer: {
    backgroundColor: '#0a0a0a',
    minHeight: '100vh',
    padding: '40px 24px',
    color: '#ffffff',
    fontFamily: 'Inter, sans-serif',
    backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(33,150,243,0.15) 0%, transparent 55%)'
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    gap: '32px',
    position: 'relative'
  },
  searchContainer: {
    padding: '24px',
    marginBottom: '32px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
  },
  input: {
    flex: 1,
    padding: '16px 24px',
    fontSize: '16px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    color: '#ffffff',
    outline: 'none',
    transition: 'all 0.2s ease',
    ':focus': {
      borderColor: '#2196F3',
      boxShadow: '0 0 0 3px rgba(33,150,243,0.2)'
    }
  },
  button: {
    padding: '16px 32px',
    fontSize: '16px',
    background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '600',
    letterSpacing: '0.5px',
    ':hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 16px rgba(33,150,243,0.3)'
    }
  },
  aiPanel: {
    flex: 1,
    maxWidth: '400px',
    height: 'calc(100vh - 160px)',
    overflowY: 'auto',
    padding: '24px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    '::-webkit-scrollbar': {
      width: '8px'
    },
    '::-webkit-scrollbar-track': {
      background: 'rgba(0,0,0,0.1)'
    },
    '::-webkit-scrollbar-thumb': {
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '4px'
    }
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    borderRadius: '16px',
    backdropFilter: 'blur(4px)'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: '#fff',
    fontSize: '18px',
    margin: 0,
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
  infoWindow: {
    padding: '16px',
    background: '#1d1f21',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    minWidth: '250px'
  },
  rationaleItem: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },
  indexBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #FF4757 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
    boxShadow: '0 2px 8px rgba(255,107,107,0.3)'
  },
  rawResponse: {
    margin: 0,
    fontSize: '12px',
    lineHeight: 1.4,
    opacity: 0.7,
    fontFamily: 'IBM Plex Mono, monospace',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    color: '#e0e0e0',
    padding: '16px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px'
  }
};

// ==============================================
// Sub-Components
// ==============================================
const LoadingOverlay = () => (
  <div style={STYLES.loadingOverlay}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
      <div style={STYLES.spinner}></div>
      <p style={STYLES.loadingText}>Searching the globe...</p>
    </div>
  </div>
);

const InfoWindowContent = ({ marker }) => (
  <div style={STYLES.infoWindow}>
    <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#FF6B6B' }}>
      {marker.name}
    </h3>
    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffffff', opacity: 0.9 }}>
      {marker.description}
    </p>
    {marker.elevation && (
      <p style={{ margin: 0, fontSize: '14px', color: '#82b1ff' }}>
        Elevation: {marker.elevation}m
      </p>
    )}
  </div>
);

const RationaleItem = ({ item, index }) => (
  <div style={STYLES.rationaleItem}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
      <div style={STYLES.indexBadge}>
        {index + 1}
      </div>
      <h4 style={{ margin: 0, fontSize: '16px', color: '#ffffff', fontWeight: '500' }}>
        {item.query}
      </h4>
    </div>
    <div style={{ paddingLeft: '48px', fontSize: '14px', lineHeight: '1.6', color: '#e0e0e0' }}>
      {item.reason || 'This location was selected based on your query requirements.'}
    </div>
  </div>
);

// ==============================================
// Main Component
// ==============================================
function App() {
  const [mapCenter, setMapCenter] = useState(MAP_CONFIG.defaultCenter);
  const [zoom, setZoom] = useState(MAP_CONFIG.defaultZoom);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rationale, setRationale] = useState([]);
  const [rawResponse, setRawResponse] = useState('');
  const [loadingPosition, setLoadingPosition] = useState(null);
  const [exampleQueries, setExampleQueries] = useState([]);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  
  const mapRef = useRef(null);
  const inputRef = useRef(null);
  const prevSearchQueryRef = useRef('');

  useEffect(() => {
    const fetchExamples = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/example-query');
        const { examples } = await response.json();
        setExampleQueries(examples);
      } catch (error) {
        console.error('Failed to load examples:', error);
        setExampleQueries([
          "Famous landmarks in Europe",
          "Active volcanoes worldwide",
          "UNESCO World Heritage Sites",
          "Major tech company HQs",
          "Deepest ocean trenches"
        ]);
      }
    };
    fetchExamples();
  }, []);

  useEffect(() => {
    if (prevSearchQueryRef.current !== '' && 
        searchQuery === '' && 
        exampleQueries.length > 0) {
      setCurrentExampleIndex(prev => (prev + 1) % exampleQueries.length);
    }
    prevSearchQueryRef.current = searchQuery;
  }, [searchQuery, exampleQueries.length]);

  const fitBounds = useCallback(() => {
    if (!mapRef.current || markers.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    markers.forEach(marker => bounds.extend(new window.google.maps.LatLng(marker.lat, marker.lng)));
    
    markers.length === 1 
      ? mapRef.current.panTo(markers[0]) 
      : mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }, [markers]);

  const resetMap = useCallback(() => {
    setMapCenter(MAP_CONFIG.defaultCenter);
    setZoom(MAP_CONFIG.defaultZoom);
    setMarkers([]);
    setRationale([]);
    setRawResponse('');
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim() || isLoading) return;

    const currentCenter = mapRef.current?.getCenter()?.toJSON() || MAP_CONFIG.defaultCenter;
    const currentZoom = mapRef.current?.getZoom() || MAP_CONFIG.defaultZoom;
    
    setIsLoading(true);
    setLoadingPosition({ center: currentCenter, zoom: currentZoom });
    resetMap();

    try {
      const response = await fetch('http://localhost:5001/api/process-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      const { locations, rationale, rawResponse } = await response.json();
      setRationale(rationale);
      setRawResponse(rawResponse);

      if (locations.length > 0) {
        const newMarkers = locations.map(loc => ({
          lat: loc.lat,
          lng: loc.lng,
          name: loc.name,
          description: loc.address,
          elevation: loc.elevation,
          reason: loc.reason
        }));
        setMarkers(newMarkers);
        setMapCenter(newMarkers[0]);
      } else {
        alert('No locations found. Resetting to world view.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      resetMap();
    }
    setIsLoading(false);
    setLoadingPosition(null);
  };

  const handleKeyPress = (e) => e.key === 'Enter' && !isLoading && handleSearch();
  const placeholderText = searchQuery 
    ? 'Search places...' 
    : exampleQueries[currentExampleIndex] 
    ? `e.g. "${exampleQueries[currentExampleIndex]}"` 
    : 'Search places...';

  return (
    <div style={STYLES.appContainer}>
      <div style={STYLES.mainContent}>
        <div style={{ flex: 3 }}>
          <div style={STYLES.searchContainer}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={placeholderText}
                style={STYLES.input}
              />
              <button 
                onClick={handleSearch} 
                disabled={isLoading}
                style={{ 
                  ...STYLES.button,
                  background: isLoading ? 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)' : STYLES.button.background,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? 'Searching...' : 'Explore'}
              </button>
            </div>
          </div>

          <LoadScript googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={MAP_CONFIG.containerStyle}
              center={loadingPosition?.center || mapCenter}
              zoom={loadingPosition?.zoom || zoom}
              onLoad={map => {
                mapRef.current = map;
                markers.length > 0 && fitBounds();
              }}
              options={{
                minZoom: 2,
                maxZoom: 18,
                streetViewControl: false,
                fullscreenControl: false,
                mapTypeControlOptions: { mapTypeIds: ['roadmap', 'hybrid'] },
                styles: MAP_CONFIG.mapStyles
              }}
            >
              <style>{`
                @keyframes spin { 
                  0% { transform: rotate(0deg); } 
                  100% { transform: rotate(360deg); } 
                }
              `}</style>

              {isLoading && <LoadingOverlay />}

              {markers.map((marker, index) => (
                <Marker
                  key={index}
                  position={{ lat: marker.lat, lng: marker.lng }}
                  onClick={() => setSelectedMarker(marker)}
                  label={{
                    text: (index + 1).toString(),
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#FF6B6B',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                  }}
                  animation={window.google.maps.Animation.DROP}
                />
              ))}

              {selectedMarker && (
                <InfoWindow
                  position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                  onCloseClick={() => setSelectedMarker(null)}
                  options={{ pixelOffset: new window.google.maps.Size(0, -40) }}
                >
                  <InfoWindowContent marker={selectedMarker} />
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        </div>

        <div style={STYLES.aiPanel}>
          <h3 style={{ 
            margin: '0 0 24px 0',
            fontSize: '20px',
            color: '#FF6B6B',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            AI Selection Reasoning
          </h3>

          {rationale.length > 0 ? (
            rationale.map((item, index) => (
              <RationaleItem key={index} item={item} index={index} />
            ))
          ) : (
            <div style={{ 
              padding: '24px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              textAlign: 'center',
              margin: '24px 0'
            }}>
              <p style={{ 
                margin: 0, 
                color: '#888', 
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                Enter a search query to see the AI's geographical analysis and location selection rationale.
              </p>
            </div>
          )}

          {rawResponse && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ 
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: '#FF6B6B',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Raw AI Response
              </h4>
              <pre style={STYLES.rawResponse}>
                {rawResponse}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Tour } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Volume2 } from 'lucide-react';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const userLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const tourIcon = L.divIcon({
  html: `<div style="background-color: #00BCD4; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const tourStopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedLocationIcon = L.divIcon({
  html: `<div style="background-color: #00BCD4; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

interface TourStop {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  order: number;
}

interface InteractiveMapProps {
  tours: Tour[];
  tourStops?: TourStop[];
  userLocation?: UserLocation;
  activeLocation?: UserLocation;
  selectedLocation?: UserLocation;
  onLocationRequest: () => void;
  onTourSelect?: (tour: Tour) => void;
  onMapClick?: (location: UserLocation) => void;
  showRoute?: boolean;
}

// Component to update map view when any location changes
function MapUpdater({ activeLocation, tourStops }: { activeLocation?: UserLocation; tourStops?: TourStop[] }) {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    // Only update once to prevent infinite loops
    if (hasInitialized) return;
    
    if (tourStops && tourStops.length > 0) {
      // If we have tour stops, fit the map to show all stops
      const bounds = L.latLngBounds(tourStops.map(stop => [stop.latitude, stop.longitude]));
      map.fitBounds(bounds, { padding: [20, 20] });
      setHasInitialized(true);
    } else if (activeLocation) {
      map.setView([activeLocation.latitude, activeLocation.longitude], 13);
      setHasInitialized(true);
    }
  }, [activeLocation, tourStops, map]);
  
  return null;
}

// Component to handle map clicks for location selection
function MapClickHandler({ onMapClick }: { onMapClick?: (location: UserLocation) => void }) {
  useMapEvents({
    click: (e) => {
      try {
        if (onMapClick) {
          onMapClick({
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
          });
        }
      } catch (error) {
        console.error('Map click error:', error);
      }
    },
  });
  
  return null;
}

// Decode Google's polyline encoding
const decodePolyline = (encoded: string): [number, number][] => {
  const poly: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }
  return poly;
};

// Create numbered stop icons
const createNumberedIcon = (number: number) => {
  return L.divIcon({
    html: `<div style="background-color: #00BCD4; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

export function InteractiveMap({ tours, tourStops = [], userLocation, activeLocation, selectedLocation, onLocationRequest, onTourSelect, onMapClick, showRoute = false }: InteractiveMapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [walkingRoute, setWalkingRoute] = useState<[number, number][]>([]);
  const mapRef = useRef<L.Map>(null);

  // Default to San Francisco if no location available
  const defaultCenter: [number, number] = [37.7749, -122.4194];
  const currentLocation = activeLocation || userLocation;
  
  // If we have tour stops, center on the first stop
  let center: [number, number];
  if (tourStops.length > 0) {
    center = [tourStops[0].latitude, tourStops[0].longitude];
  } else if (currentLocation) {
    center = [currentLocation.latitude, currentLocation.longitude];
  } else {
    center = defaultCenter;
  }

  const handleGetLocation = async () => {
    setIsLoading(true);
    try {
      onLocationRequest();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch walking route between stops using Google Directions API
  useEffect(() => {
    const fetchWalkingRoute = async () => {
      if (!showRoute || tourStops.length < 2) {
        setWalkingRoute([]);
        return;
      }

      try {
        const sortedStops = [...tourStops].sort((a, b) => a.order - b.order);
        
        // Create waypoints for Google Directions API
        const waypoints = sortedStops.slice(1, -1).map(stop => 
          `${stop.latitude},${stop.longitude}`
        ).join('|');
        
        const origin = `${sortedStops[0].latitude},${sortedStops[0].longitude}`;
        const destination = `${sortedStops[sortedStops.length - 1].latitude},${sortedStops[sortedStops.length - 1].longitude}`;
        
        // Build the directions API URL
        let directionsUrl = `/api/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=walking`;
        if (waypoints) {
          directionsUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
        }
        
        const response = await fetch(directionsUrl);

        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes[0] && data.routes[0].overview_polyline) {
            // Decode the polyline from Google Directions API
            const encoded = data.routes[0].overview_polyline.points;
            const decodedRoute = decodePolyline(encoded);
            setWalkingRoute(decodedRoute);
          } else {
            // Fallback to straight lines if routing fails
            const fallbackRoute = sortedStops.map(stop => [stop.latitude, stop.longitude] as [number, number]);
            setWalkingRoute(fallbackRoute);
          }
        } else {
          // Fallback to straight lines if API fails
          const fallbackRoute = sortedStops.map(stop => [stop.latitude, stop.longitude] as [number, number]);
          setWalkingRoute(fallbackRoute);
        }
      } catch (error) {
        console.error('Error fetching walking route:', error);
        // Fallback to straight lines
        const sortedStops = [...tourStops].sort((a, b) => a.order - b.order);
        const fallbackRoute = sortedStops.map(stop => [stop.latitude, stop.longitude] as [number, number]);
        setWalkingRoute(fallbackRoute);
      }
    };

    fetchWalkingRoute();
  }, [tourStops, showRoute]);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'history':
        return '🏛️';
      case 'culture':
        return '🎭';
      case 'food':
        return '🍕';
      case 'nature':
        return '🌳';
      case 'architecture':
        return '🏗️';
      default:
        return '📍';
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Location Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2">
        <Button
          onClick={handleGetLocation}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-walkable-cyan hover:bg-walkable-cyan-dark text-white"
        >
          <Navigation className="h-4 w-4" />
          <span>{isLoading ? 'Getting Location...' : 'My Location'}</span>
        </Button>
      </div>

      {/* Tour Count Display */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3">
        <div className="flex items-center space-x-2">
          <MapPin className="h-5 w-5 text-walkable-cyan" />
          <span className="font-medium text-gray-700">
            {tours.length} {tours.length === 1 ? 'Tour' : 'Tours'} Found
          </span>
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        className="rounded-lg"
      >
        <MapUpdater activeLocation={activeLocation || userLocation} tourStops={tourStops} />
        <MapClickHandler onMapClick={onMapClick} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location Marker - only show if no selected location (search result) */}
        {userLocation && !selectedLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={userLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="flex items-center space-x-2 mb-2">
                  <Navigation className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold">Your Location</span>
                </div>
                <p className="text-sm text-gray-600">
                  You are here
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Tour Stops (numbered markers) */}
        {tourStops.map((stop) => (
          <Marker 
            key={stop.id} 
            position={[stop.latitude, stop.longitude]} 
            icon={createNumberedIcon(stop.order)}
          >
            <Popup>
              <div className="text-center">
                <div className="flex items-center space-x-2 mb-2">
                  <Volume2 className="h-4 w-4 text-walkable-cyan" />
                  <span className="font-semibold">{stop.title}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Stop {stop.order}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Walking Route between stops */}
        {showRoute && walkingRoute.length > 1 && (
          <Polyline
            positions={walkingRoute}
            color="#007acc"
            weight={4}
            opacity={0.8}
            smoothFactor={1}
          />
        )}

        {/* Selected Location Marker (for new stop placement) */}
        {selectedLocation && (
          <Marker 
            position={[selectedLocation.latitude, selectedLocation.longitude]} 
            icon={selectedLocationIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const marker = e.target;
                const position = marker.getLatLng();
                if (onMapClick) {
                  onMapClick({
                    latitude: position.lat,
                    longitude: position.lng
                  });
                }
              }
            }}
          >
            <Popup>
              <div className="p-2">
                <h4 className="font-semibold">Tour Starting Point</h4>
                <p className="text-sm text-gray-600">Drag to reposition or click map to place elsewhere</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Active Location Marker (for searches) - Removed to hide search location waypoints */}

        {/* Tour Markers */}
        {tours.map((tour) => (
          <Marker
            key={tour.id}
            position={[parseFloat(tour.latitude), parseFloat(tour.longitude)]}
            icon={tourIcon}
          >
            <Popup className="tour-popup" closeOnEscapeKey={true} closeOnClick={false} autoClose={true}>
              <div className="max-w-xs">
                <div className="flex items-start space-x-2 mb-3">
                  <span className="text-2xl">{getCategoryIcon(tour.category)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-800 leading-tight">
                      {tour.title}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {tour.category}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                  {tour.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  {tour.duration && (
                    <span className="flex items-center space-x-1">
                      <Volume2 className="h-3 w-3" />
                      <span>{tour.duration} min</span>
                    </span>
                  )}
                  {tour.distance && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{tour.distance}</span>
                    </span>
                  )}
                </div>
                
                <Button
                  onClick={() => onTourSelect?.(tour)}
                  className="w-full bg-walkable-cyan hover:bg-walkable-cyan-dark text-white text-sm"
                >
                  View Tour Details
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Selected Location Marker (for tour creation) */}
        {activeLocation && onMapClick && (
          <Marker
            position={[activeLocation.latitude, activeLocation.longitude]}
            icon={selectedLocationIcon}
          >
            <Popup>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800 mb-2">Tour Starting Point</div>
                <p className="text-sm text-gray-600">
                  {activeLocation.address || `${activeLocation.latitude.toFixed(4)}, ${activeLocation.longitude.toFixed(4)}`}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
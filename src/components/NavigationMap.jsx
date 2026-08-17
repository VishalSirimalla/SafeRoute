import { MapContainer, Marker, Polyline, TileLayer, Tooltip, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapPin, Loader2, AlertCircle, Navigation } from 'lucide-react';
import { getMapTileConfig } from '../services/mapService';

// Custom User GPS Location Pin
const userDivIcon = L.divIcon({
  className: 'user-nav-custom-pin',
  html: `<div style="
    width: 28px;
    height: 28px;
    background-color: #3b82f6;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 18px rgba(59, 130, 246, 0.9), 0 4px 10px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="width: 10px; height: 10px; background-color: #ffffff; border-radius: 50%;"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

// Destination Pin
const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapAutoCenter({ center, recenterTrigger }) {
  const map = useMap();

  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, map.getZoom() || 15);
      map.invalidateSize();
    }
  }, [center, recenterTrigger, map]);

  return null;
}

function FitNavBounds({ userLocation, destination, geometry }) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    if (userLocation && Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude)) {
      points.push([userLocation.latitude, userLocation.longitude]);
    }

    if (destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lon ?? destination.lng)) {
      points.push([destination.lat, destination.lon ?? destination.lng]);
    }

    if (Array.isArray(geometry)) {
      geometry.forEach(([lat, lng]) => {
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          points.push([lat, lng]);
        }
      });
    }

    if (points.length >= 2) {
      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.2));
      }
    }
  }, [map, userLocation, destination, geometry]);

  return null;
}

export default function NavigationMap({
  userLocation,
  destination,
  geometry = [],
  pois = [],
  isLoading,
  error,
  recenterTrigger,
  isNavigating,
  onSelectPoiAsDestination,
}) {
  if (isLoading && !destination && (!geometry || geometry.length === 0)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950/80 text-slate-300 p-6 text-center rounded-[1.2rem] border border-white/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Acquiring live browser GPS position...</p>
      </div>
    );
  }

  const hasUserLoc = userLocation && Number.isFinite(userLocation.latitude) && Number.isFinite(userLocation.longitude);
  const hasDest = destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lon ?? destination.lng);
  const hasGeometry = Array.isArray(geometry) && geometry.length > 0 && Number.isFinite(geometry[0][0]) && Number.isFinite(geometry[0][1]);

  if (!hasUserLoc && !hasDest && !hasGeometry) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950/80 text-slate-400 p-6 text-center rounded-[1.2rem] border border-white/10">
        <MapPin className="h-8 w-8 text-slate-500 mb-2" />
        <p className="text-sm font-medium">No active location or destination set</p>
        <p className="text-xs text-slate-500 mt-1">Search a destination or select a route in the Route Planner.</p>
      </div>
    );
  }

  const mapCenter = hasUserLoc
    ? [userLocation.latitude, userLocation.longitude]
    : hasDest
    ? [destination.lat, destination.lon ?? destination.lng]
    : [geometry[0][0], geometry[0][1]];

  const destinationPoint = hasDest
    ? [destination.lat, destination.lon ?? destination.lng]
    : hasGeometry
    ? [geometry[geometry.length - 1][0], geometry[geometry.length - 1][1]]
    : null;

  const tileConfig = getMapTileConfig();

  return (
    <div className="h-full w-full relative z-0 overflow-hidden rounded-[1.2rem]">
      <MapContainer
        center={mapCenter}
        zoom={15}
        maxZoom={20}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          maxZoom={tileConfig.maxZoom}
          eventHandlers={{
            tileerror: (e) => {
              if (tileConfig.fallbackUrl && e.target._url !== tileConfig.fallbackUrl) {
                e.target.setUrl(tileConfig.fallbackUrl);
              }
            },
          }}
        />

        <MapAutoCenter center={mapCenter} recenterTrigger={recenterTrigger} />
        <FitNavBounds userLocation={userLocation} destination={destination} geometry={geometry} />

        {/* User Live Position Marker */}
        {hasUserLoc && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userDivIcon}>
            <Tooltip permanent={isNavigating}>
              <span className="font-bold text-xs">{isNavigating ? '🔵 Navigating Live' : 'Your Position'}</span>
            </Tooltip>
          </Marker>
        )}

        {/* User GPS Accuracy Radius Circle */}
        {hasUserLoc && Number.isFinite(userLocation.accuracy) && userLocation.accuracy > 0 && (
          <Circle
            center={[userLocation.latitude, userLocation.longitude]}
            radius={userLocation.accuracy}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', opacity: 0.35, fillOpacity: 0.1 }}
          />
        )}

        {/* Destination Marker */}
        {destinationPoint && (
          <Marker position={destinationPoint} icon={destinationIcon}>
            <Tooltip>
              <span className="font-bold text-xs">📍 {destination?.name || destination?.display_name || 'Destination'}</span>
            </Tooltip>
          </Marker>
        )}

        {/* OSRM Route Polyline */}
        {hasGeometry && (
          <Polyline
            positions={geometry.map(([lat, lng]) => [lat, lng])}
            pathOptions={{
              color: '#10b981',
              weight: 6,
              opacity: 0.9,
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getMapTileConfig } from '../services/mapService';

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function routeColor(route) {
  if (!route || typeof route.risk_score !== 'number') return '#4ee0a3';
  if (route.risk_score < 0.33) return '#3ddc97';
  if (route.risk_score < 0.66) return '#f4c95d';
  return '#f86d6d';
}

function FitRouteBounds({ routes = [], start, destination }) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    routes.forEach((route) => {
      if (Array.isArray(route.geometry)) {
        route.geometry.forEach(([lat, lng]) => {
          if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
            points.push([lat, lng]);
          }
        });
      }
    });

    if (start && typeof start.lat === 'number' && Number.isFinite(start.lat)) {
      points.push([start.lat, start.lon ?? start.lng ?? 0]);
    }

    if (destination && typeof destination.lat === 'number' && Number.isFinite(destination.lat)) {
      points.push([destination.lat, destination.lon ?? destination.lng ?? 0]);
    }

    if (!points.length) {
      return;
    }

    const bounds = L.latLngBounds(points);
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.25));
    }
  }, [map, routes, start, destination]);

  return null;
}

export default function RouteMap({ routes = [], recommendedRouteId, selectedRouteId, start, destination, center }) {
  const primaryRoutes = routes.filter((route) => Array.isArray(route.geometry) && route.geometry.length > 0);
  const routeCenter = Array.isArray(center) && center.length === 2 && Number.isFinite(center[0]) && Number.isFinite(center[1])
    ? center
    : [19.076, 72.8777];

  const startPoint = start && typeof start.lat === 'number' && Number.isFinite(start.lat)
    ? [start.lat, start.lon ?? start.lng]
    : routeCenter;

  const destinationPoint = destination && typeof destination.lat === 'number' && Number.isFinite(destination.lat)
    ? [destination.lat, destination.lon ?? destination.lng]
    : routeCenter;

  const tileConfig = getMapTileConfig();

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#071d17]/80">
      <MapContainer center={routeCenter} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
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

        <FitRouteBounds routes={primaryRoutes} start={start} destination={destination} />

        <Marker position={startPoint} icon={startIcon}>
          <Tooltip>Start</Tooltip>
        </Marker>

        <Marker position={destinationPoint} icon={destinationIcon}>
          <Tooltip>Destination</Tooltip>
        </Marker>

        {primaryRoutes.map((route) => {
          const isSelected = route.id === selectedRouteId || (!selectedRouteId && route.id === recommendedRouteId);
          return (
            <Polyline
              key={route.id}
              positions={route.geometry.map(([lat, lng]) => [lat, lng])}
              pathOptions={{
                color: route.id === recommendedRouteId || isSelected ? '#4ee0a3' : routeColor(route),
                weight: isSelected ? 6 : 4,
                opacity: isSelected ? 1 : 0.45,
                dashArray: isSelected ? undefined : '8 8',
              }}
            >
              <Tooltip>
                {route.title || route.label || route.id} · {route.risk_category || 'Risk'} · {route.distance} km · {route.duration} min
              </Tooltip>
            </Polyline>
          );
        })}
      </MapContainer>
    </div>
  );
}

import { MapContainer, Marker, Popup, TileLayer, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { getMapTileConfig } from '../services/mapService';

const reportDivIcon = L.divIcon({
  className: 'report-custom-pin',
  html: `<div style="
    width: 28px;
    height: 28px;
    background-color: #059669;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.9), 0 4px 8px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%;"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

function MapCenter({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
      map.setView([location.latitude, location.longitude], 15);
      map.invalidateSize();
    }
  }, [location, map]);

  return null;
}

export default function ReportMap({ location, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950/80 text-slate-300 p-6 text-center rounded-[1rem] border border-white/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Acquiring live browser GPS position...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950/80 text-rose-200 p-6 text-center rounded-[1rem] border border-rose-500/30">
        <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950/80 text-slate-400 p-6 text-center rounded-[1rem] border border-white/10">
        <MapPin className="h-8 w-8 text-slate-500 mb-2" />
        <p className="text-sm font-medium">No location captured yet</p>
      </div>
    );
  }

  const defaultCenter = [location.latitude, location.longitude];

  return (
    <div className="h-full w-full relative z-0 overflow-hidden rounded-[1rem]">
      <MapContainer center={defaultCenter} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url={getMapTileConfig().url}
          attribution={getMapTileConfig().attribution}
          maxZoom={getMapTileConfig().maxZoom}
        />
        <MapCenter location={location} />
        <Marker position={[location.latitude, location.longitude]} icon={reportDivIcon}>
          <Popup>
            <div className="text-sm p-1 text-slate-900">
              <strong className="text-emerald-700 block mb-1">📍 Incident Location</strong>
              <span>Lat: {location.latitude.toFixed(6)}°</span>
              <br />
              <span>Lng: {location.longitude.toFixed(6)}°</span>
              <br />
              <span className="text-slate-600 text-xs mt-1 block">
                {Number.isFinite(location.accuracy) ? `Accuracy: ±${Math.round(location.accuracy)}m` : 'Accuracy: unknown'}
              </span>
            </div>
          </Popup>
        </Marker>
        {Number.isFinite(location.accuracy) && location.accuracy > 0 ? (
          <Circle
            center={[location.latitude, location.longitude]}
            radius={location.accuracy}
            pathOptions={{ color: '#10b981', fillColor: '#10b981', opacity: 0.5, fillOpacity: 0.15 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

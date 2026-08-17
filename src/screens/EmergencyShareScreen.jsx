import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Clock, MapPin, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';
import { getSharedIncident } from '../services/apiClient';
import EmergencyMap from '../components/EmergencyMap';

export default function EmergencyShareScreen() {
  const { token } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function fetchSharedData() {
      if (!token) {
        setError('No emergency share token provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await getSharedIncident(token);
        if (isMounted) {
          if (res?.success && res?.data) {
            setIncident(res.data);
            setError('');
          } else {
            setError(res?.message || 'Emergency share link is invalid or expired.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load shared emergency incident.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchSharedData();
    // Poll every 10 seconds while page is open for live recipient tracking
    const interval = setInterval(fetchSharedData, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  if (loading && !incident) {
    return (
      <div className="surface-grid">
        <div className="panel flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500 mb-4" />
          <h3 className="text-xl font-bold text-white">Loading Emergency Location...</h3>
          <p className="text-sm text-slate-400 mt-2">Connecting to live emergency share feed</p>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="surface-grid">
        <div className="panel text-center py-12">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-slate-400 border border-white/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Emergency Link Ended or Expired</h2>
          <p className="text-slate-300 max-w-md mx-auto mt-2 text-sm">{error || 'This emergency share link is no longer active.'}</p>
        </div>
      </div>
    );
  }

  const locationData = {
    latitude: incident.latitude,
    longitude: incident.longitude,
    accuracy: incident.accuracy,
    timestamp: new Date(incident.incidentDate || Date.now()),
  };

  return (
    <div className="surface-grid">
      <div className="panel">
        <div className="flex items-center justify-between gap-4 mb-4">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
            <ShieldAlert className="h-4 w-4" />
            Shared Emergency Alert
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            Status: {incident.status}
          </span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">Live Emergency Location</h1>
        <p className="text-slate-300 text-sm mt-1">Shared by Saarthi SOS user in real-time.</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <MapPin className="h-4 w-4 text-primary" />
              GPS Coordinates
            </div>
            <div className="mt-2 text-lg font-bold text-white font-mono">
              {incident.latitude.toFixed(6)}°, {incident.longitude.toFixed(6)}°
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Accuracy: {Number.isFinite(incident.accuracy) ? `±${Math.round(incident.accuracy)}m` : 'Unavailable'}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Clock className="h-4 w-4 text-primary" />
              Alert Timestamp
            </div>
            <div className="mt-2 text-base font-bold text-white">
              {new Date(incident.incidentDate).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">Updating live every 10s</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3 className="text-xl font-bold text-white mb-4">Emergency Map</h3>
        <div className="h-80 w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
          <EmergencyMap location={locationData} />
        </div>
      </div>
    </div>
  );
}

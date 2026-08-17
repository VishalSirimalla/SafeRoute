import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Clock, MapPin, Shield, CheckCircle2, Loader2 } from 'lucide-react';
import { getIncident } from '../services/apiClient';
import EmergencyMap from '../components/EmergencyMap';

export default function EmergencyDetailScreen() {
  const { incidentId } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function fetchIncident() {
      if (!incidentId) {
        setError('No incident ID provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await getIncident(incidentId);
        if (isMounted) {
          if (res?.success && res?.data) {
            setIncident(res.data);
            setError('');
          } else {
            setError(res?.message || 'Incident not found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to retrieve emergency incident record.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchIncident();
    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  if (loading) {
    return (
      <div className="surface-grid">
        <div className="panel flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <h3 className="text-xl font-bold text-white">Loading Incident Record...</h3>
          <p className="text-sm text-slate-400 mt-2">Retrieving verified MongoDB record for ID {incidentId}</p>
        </div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="surface-grid">
        <div className="panel text-center py-12">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Incident Record Unavailable</h2>
          <p className="text-slate-300 max-w-md mx-auto mt-2 text-sm">{error || 'Incident details could not be found.'}</p>
          <div className="mt-6">
            <Link
              to="/emergency"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Emergency Assistance
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const locationData = {
    latitude: incident.latitude,
    longitude: incident.longitude,
    accuracy: incident.accuracy,
    timestamp: new Date(incident.incidentDate || incident.createdAt),
  };

  const isResolved = incident.status === 'resolved';

  return (
    <div className="surface-grid">
      <div className="panel">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            to="/emergency"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Emergency Center
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isResolved
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
            }`}
          >
            {isResolved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            Status: {incident.status}
          </span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">Emergency Incident Record</h1>
        <p className="text-slate-300 text-sm mt-1 font-mono">ID: {incident._id}</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <MapPin className="h-4 w-4 text-primary" />
              Coordinates
            </div>
            <div className="mt-2 text-lg font-bold text-white">
              {incident.latitude.toFixed(6)}°, {incident.longitude.toFixed(6)}°
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Accuracy: {Number.isFinite(incident.accuracy) ? `±${Math.round(incident.accuracy)}m` : 'Unavailable'}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Clock className="h-4 w-4 text-primary" />
              Timestamp
            </div>
            <div className="mt-2 text-base font-bold text-white">
              {new Date(incident.incidentDate || incident.createdAt).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">Source: {incident.source || 'SOS'}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Shield className="h-4 w-4 text-primary" />
              Severity & Type
            </div>
            <div className="mt-2 text-lg font-bold text-white capitalize">{incident.type || 'SOS Alert'}</div>
            <div className="text-xs text-slate-400 mt-1 capitalize">Severity: {incident.severity || 'High'}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3 className="text-xl font-bold text-white mb-4">Location Map</h3>
        <div className="h-80 w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
          <EmergencyMap location={locationData} />
        </div>
      </div>

      <div className="panel">
        <h3 className="text-xl font-bold text-white mb-2">Description</h3>
        <p className="text-slate-300 text-sm leading-relaxed">{incident.description}</p>
      </div>
    </div>
  );
}

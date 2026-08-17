import {
  CircleAlert,
  MapPinned,
  ShieldCheck,
  Siren,
  PlusCircle,
  Compass,
  UserRound,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, Tooltip, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, useScroll, useSpring } from 'framer-motion';
import { getCommunityReports, getReportStats } from '../services/apiClient';
import { getMapTileConfig } from '../services/mapService';
import AnimatedNumber from '../components/AnimatedNumber';

// Custom User Location Pin
const userLocationIcon = L.divIcon({
  className: 'user-home-pin',
  html: `<div style="
    width: 26px;
    height: 26px;
    background-color: #e11d48;
    border: 3px solid #ffffff;
    border-radius: 50%;
    box-shadow: 0 0 16px rgba(225, 29, 72, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="width: 8px; height: 8px; background-color: #ffffff; border-radius: 50%;"></div>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

// Community Incident Pin
const reportPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const formatDate = (val) => {
  if (!val) return 'Recently';
  const d = new Date(val);
  return Number.isNaN(d.getTime())
    ? 'Recently'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatType = (str) => {
  if (!str) return 'Safety Report';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function HomeScreen() {
  const navigate = useNavigate();

  // Scroll Progress Indicator
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Location state
  const [userCoords, setUserCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');

  // Data state
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, highSeverity: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');

  const acquireGps = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationLoading(false);
      },
      (err) => {
        let msg = 'Unable to acquire current GPS position.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. Map preview will default to central area.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal unavailable. Please check device location settings.';
        }
        setLocationError(msg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  useEffect(() => {
    acquireGps();

    let isMounted = true;
    Promise.all([getCommunityReports(), getReportStats()])
      .then(([repRes, statRes]) => {
        if (!isMounted) return;

        if (repRes?.success && Array.isArray(repRes.data)) {
          setReports(repRes.data);
        }

        if (statRes?.success && statRes.data) {
          setStats({
            total: Number(statRes.data.total || 0),
            active: Number(statRes.data.active || 0),
            resolved: Number(statRes.data.resolved || 0),
            highSeverity: Number(statRes.data.highSeverity || 0),
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Unable to load live community safety updates.');
        }
      })
      .finally(() => {
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const mapCenter = userCoords
    ? [userCoords.latitude, userCoords.longitude]
    : [19.076, 72.8777];

  const tileConfig = getMapTileConfig();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="surface-grid"
    >
      {/* Scroll Progress Indicator */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-1 bg-rose-600 origin-left z-50 pointer-events-none"
      />

      {/* Light Hero Section */}
      <motion.div
        variants={itemVariants}
        className="rounded-[28px] border border-rose-100 bg-gradient-to-br from-rose-50/60 via-white to-purple-50/40 p-6 md:p-8 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-100/60 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-800">
              <Shield className="h-3.5 w-3.5 fill-current" /> Women Safety & Intelligence Platform
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Navigating safely with confidence & real-time community intelligence.
            </h1>

            <p className="text-base text-slate-600 leading-relaxed">
              Saarthi combines verified community hazard reporting, OSRM safe geometry, and ML accident-risk scoring to empower secure journeys everywhere.
            </p>
          </div>

          {/* Quick SOS Action Card with Breathing Pulse */}
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ duration: 0.2 }}
            className="panel bg-white border border-rose-200/80 shadow-md p-6 rounded-[24px] flex flex-col items-center text-center space-y-4 shrink-0 lg:w-80"
          >
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="h-20 w-20 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 sos-pulse-ring cursor-pointer"
                onClick={() => navigate('/emergency')}
              >
                <Siren className="h-10 w-10 fill-current" />
              </motion.div>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900">Immediate Assistance</div>
              <div className="text-xs text-slate-500 mt-0.5">Instant emergency location broadcast</div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => navigate('/emergency')}
              className="w-full rounded-full bg-rose-600 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition shadow-sm"
            >
              Trigger SOS Alert
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Safety Actions Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* SOS Card */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => navigate('/emergency')}
          className="panel panel-interactive text-left flex flex-col justify-between p-6 rounded-[24px] border-rose-200/60 bg-gradient-to-br from-white to-rose-50/40"
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Siren className="h-6 w-6" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-bold text-slate-900">Emergency SOS</h3>
            <p className="text-xs text-slate-500 mt-1">Broadcast live GPS alert to emergency contacts & helplines.</p>
          </div>

          <div className="mt-4 text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <span>Get Emergency Help</span> →
          </div>
        </motion.button>

        {/* Report Incident Card */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => navigate('/report')}
          className="panel panel-interactive text-left flex flex-col justify-between p-6 rounded-[24px]"
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <PlusCircle className="h-6 w-6" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-bold text-slate-900">Report Hazard</h3>
            <p className="text-xs text-slate-500 mt-1">Flag poor lighting, harassment, or road hazards to warn others.</p>
          </div>

          <div className="mt-4 text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <span>Submit Safety Report</span> →
          </div>
        </motion.button>

        {/* Plan Safe Route Card */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => navigate('/routes')}
          className="panel panel-interactive text-left flex flex-col justify-between p-6 rounded-[24px]"
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Compass className="h-6 w-6" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-bold text-slate-900">Plan Safe Route</h3>
            <p className="text-xs text-slate-500 mt-1">Generate ML safety-scored navigation alternatives.</p>
          </div>

          <div className="mt-4 text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <span>Find Safe Routes</span> →
          </div>
        </motion.button>

        {/* Profile Card */}
        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => navigate('/profile')}
          className="panel panel-interactive text-left flex flex-col justify-between p-6 rounded-[24px]"
        >
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <UserRound className="h-6 w-6" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-bold text-slate-900">User Profile</h3>
            <p className="text-xs text-slate-500 mt-1">Manage trusted emergency contacts & medical information.</p>
          </div>

          <div className="mt-4 text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1">
            <span>View Safety Profile</span> →
          </div>
        </motion.button>
      </motion.div>

      {/* Live Statistics Cards with Count-Up Animation */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <MapPinned className="h-6 w-6" />
          </div>
          <div>
            <div className="muted-label text-[10px]">Total Community Reports</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              <AnimatedNumber value={stats.total} />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <CircleAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="muted-label text-[10px]">Active Area Incidents</div>
            <div className="text-2xl font-black text-amber-700 mt-0.5">
              <AnimatedNumber value={stats.active} />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="muted-label text-[10px]">Resolved Safety Alerts</div>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">
              <AnimatedNumber value={stats.resolved} />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Community Report Preview Map Container Entrance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 25 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="panel space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="muted-label">Live Map</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">Community Hazard Intelligence</h3>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={acquireGps}
            disabled={locationLoading}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-rose-600 ${locationLoading ? 'animate-spin' : ''}`} />
            <span>Recenter GPS</span>
          </motion.button>
        </div>

        {locationError && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{locationError}</span>
          </motion.div>
        )}

        <div className="h-[400px] w-full rounded-[20px] overflow-hidden border border-slate-200 relative shadow-inner">
          <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
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

            {userCoords && (
              <Marker position={[userCoords.latitude, userCoords.longitude]} icon={userLocationIcon}>
                <Tooltip permanent={false}>
                  <span className="font-bold text-xs">Your Current GPS Position</span>
                </Tooltip>
              </Marker>
            )}

            {userCoords && Number.isFinite(userCoords.accuracy) && userCoords.accuracy > 0 && (
              <Circle
                center={[userCoords.latitude, userCoords.longitude]}
                radius={userCoords.accuracy}
                pathOptions={{ color: '#e11d48', fillColor: '#e11d48', opacity: 0.35, fillOpacity: 0.08 }}
              />
            )}

            {reports.map((rpt) => {
              const lat = Number(rpt.location?.latitude ?? rpt.latitude);
              const lon = Number(rpt.location?.longitude ?? rpt.longitude);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

              return (
                <Marker key={rpt._id || `${lat}-${lon}`} position={[lat, lon]} icon={reportPinIcon}>
                  <Tooltip>
                    <div className="text-xs p-1 text-slate-900">
                      <strong className="block text-slate-900">{formatType(rpt.incidentType)}</strong>
                      <span className="text-slate-500">{formatDate(rpt.createdAt)}</span>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </motion.div>
    </motion.div>
  );
}

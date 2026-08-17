import {
  MapPinned,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ListFilter,
  Activity,
  PieChart,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, useScroll, useSpring } from 'framer-motion';
import { getCommunityReports, getReportStats } from '../services/apiClient';
import { getMapTileConfig } from '../services/mapService';
import AnimatedNumber from '../components/AnimatedNumber';

// Report Pin Icon
const reportMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const formatDate = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function DashboardScreen() {
  const navigate = useNavigate();

  // Scroll Progress Indicator
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Data state
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, resolved: 0, highSeverity: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const fetchDashboardData = async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');
      const [reportsRes, statsRes] = await Promise.all([
        getCommunityReports(),
        getReportStats(),
      ]);

      if (reportsRes?.data) {
        setReports(reportsRes.data);
      }
      if (statsRes?.stats) {
        setStats(statsRes.stats);
      }
    } catch (fetchError) {
      setReports([]);
      setError(fetchError?.message || 'Unable to load area intelligence data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData({ showLoader: true });
  }, []);

  const handleRefresh = () => {
    fetchDashboardData({ showLoader: false });
  };

  const filteredReports = reports.filter((rpt) => {
    if (filterSeverity === 'all') return true;
    return rpt.severity === filterSeverity;
  });

  const mapCenter = reports.length > 0 && reports[0].location
    ? [reports[0].location.latitude, reports[0].location.longitude]
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

      {/* Top Controls Bar */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-100/60 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-purple-800">
            <Activity className="h-3.5 w-3.5" /> Community Analytics
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Area Safety Intelligence</h2>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-rose-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => navigate('/report')}
            className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition shadow-sm"
          >
            + Report Hazard
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Metrics Row: Cleaned to focus on Total Reports & Active Reports */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card">
          <div className="flex items-center justify-between text-slate-500">
            <span className="muted-label text-[10px]">Total Incidents</span>
            <MapPinned className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            <AnimatedNumber value={stats.total} />
          </div>
          <div className="text-xs text-slate-500 mt-1">Community reports recorded</div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card">
          <div className="flex items-center justify-between text-amber-600">
            <span className="muted-label text-[10px]">Active Reports</span>
            <Activity className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-700 mt-2">
            <AnimatedNumber value={stats.active} />
          </div>
          <div className="text-xs text-slate-500 mt-1">Requires user awareness</div>
        </motion.div>
      </motion.div>

      {/* Severity Breakdown Bar */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        className="panel space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <PieChart className="h-4 w-4 text-purple-700" /> Live Severity Distribution
          </h3>
          <span className="text-xs font-semibold text-slate-500">{reports.length} total reports</span>
        </div>

        <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
              width: `${stats.total > 0 ? (stats.highSeverity / stats.total) * 100 : 0}%`,
              transformOrigin: 'left',
            }}
            className="bg-rose-500 h-full"
            title="High Severity"
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            style={{
              width: `${stats.total > 0 ? ((stats.total - stats.highSeverity - stats.resolved) / stats.total) * 100 : 0}%`,
              transformOrigin: 'left',
            }}
            className="bg-amber-400 h-full"
            title="Moderate Severity"
          />
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            style={{
              width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%`,
              transformOrigin: 'left',
            }}
            className="bg-emerald-400 h-full"
            title="Resolved"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />High ({stats.highSeverity})</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Moderate ({Math.max(0, stats.total - stats.highSeverity - stats.resolved)})</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />Resolved ({stats.resolved})</span>
        </div>
      </motion.div>

      {/* Interactive Map & Reports List Split View */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="panel space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Incident Distribution Map</h3>
            <span className="badge-pill rose">Live Feed</span>
          </div>

          <div className="h-[480px] w-full rounded-[20px] overflow-hidden border border-slate-200 relative shadow-inner">
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

              {filteredReports.map((rpt) => {
                const lat = Number(rpt.location?.latitude ?? rpt.latitude);
                const lon = Number(rpt.location?.longitude ?? rpt.longitude);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

                return (
                  <Marker key={rpt._id || `${lat}-${lon}`} position={[lat, lon]} icon={reportMarkerIcon}>
                    <Popup>
                      <div className="text-xs p-1 text-slate-900">
                        <strong className="block text-rose-700 font-bold text-sm mb-1">{formatType(rpt.incidentType)}</strong>
                        <p className="text-slate-600 mb-1">{rpt.description}</p>
                        <span className="text-slate-500 block">{formatDate(rpt.createdAt)}</span>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </motion.div>

        {/* Filterable Incident Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="panel space-y-4 flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Incident Stream</h3>

            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ListFilter className="h-3.5 w-3.5" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none transition focus:border-rose-300 focus:bg-white"
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[420px] pr-1">
            {filteredReports.length > 0 ? (
              filteredReports.map((rpt, idx) => (
                <motion.div
                  key={rpt._id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01, x: 2 }}
                  onClick={() => navigate(`/report/${rpt._id}`)}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/60 transition cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        rpt.severity === 'high' ? 'bg-rose-100 text-rose-800' : rpt.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rpt.severity || 'Medium'}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{formatType(rpt.incidentType)}</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">{rpt.description || 'No description details provided.'}</p>
                    <div className="text-[10px] text-slate-400">{formatDate(rpt.createdAt)}</div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 self-center" />
                </motion.div>
              ))
            ) : (
              <div className="text-center p-8 text-xs text-slate-500">
                No incidents match the selected severity filter.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Siren,
  MapPinned,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Users,
  LogOut,
  Mail,
  Phone,
} from 'lucide-react';
import { MapContainer, Marker, TileLayer, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  getCommunityReports,
  getReportStats,
  getIncidents,
  getAllUsers,
  updateReportStatus,
  updateIncidentStatus,
} from '../services/apiClient';
import { getMapTileConfig } from '../services/mapService';
import AnimatedNumber from '../components/AnimatedNumber';

// Custom Colored Leaflet Markers for Admin Map
const redPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const goldPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const greenPinIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const getMarkerIcon = (severity) => {
  if (severity === 'high') return redPinIcon;
  if (severity === 'medium' || severity === 'moderate') return goldPinIcon;
  return greenPinIcon;
};

const formatDate = (value) => {
  if (!value) return 'Recently';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatType = (str) => {
  if (!str) return 'Safety Incident';
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

export default function AdminDashboardScreen() {
  const navigate = useNavigate();

  // Scroll Progress Indicator
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Data State
  const [reports, setReports] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [sosIncidents, setSosIncidents] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, total: 0, active: 0, resolved: 0, highSeverity: 0, activeSos: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleLogout = () => {
    localStorage.removeItem('saferoute_admin_token');
    localStorage.removeItem('saferoute_admin_authenticated');
    navigate('/admin/login', { replace: true });
  };

  const fetchAdminData = async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);

      setError('');
      const [reportsRes, statsRes, incidentsRes, usersRes] = await Promise.all([
        getCommunityReports(),
        getReportStats(),
        getIncidents().catch(() => ({ success: false, data: [] })),
        getAllUsers().catch((err) => {
          if (err?.message?.includes('401') || err?.message?.includes('403') || err?.message?.includes('Admin access required')) {
            handleLogout();
          }
          return { success: false, data: [] };
        }),
      ]);

      if (reportsRes?.data) {
        setReports(reportsRes.data);
      }
      if (statsRes?.stats) {
        setStats(statsRes.stats);
      }
      if (incidentsRes?.data && Array.isArray(incidentsRes.data)) {
        setSosIncidents(incidentsRes.data.filter((inc) => inc.source === 'sos' || inc.type === 'sos'));
      }
      if (usersRes?.data && Array.isArray(usersRes.data)) {
        setUsersList(usersRes.data);
      }
    } catch (err) {
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        handleLogout();
        return;
      }
      setError(err?.message || 'Failed to load administrator data from MongoDB.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const adminToken = localStorage.getItem('saferoute_admin_token');
    const isAdminAuthed = localStorage.getItem('saferoute_admin_authenticated') === 'true';
    if (!adminToken || !isAdminAuthed) {
      handleLogout();
      return;
    }

    fetchAdminData({ showLoader: true });
  }, []);

  const handleRefresh = () => {
    fetchAdminData({ showLoader: false });
  };

  const handleStatusChange = async (reportId, newStatus) => {
    try {
      setStatusMessage({ type: '', message: '' });
      const res = await updateReportStatus(reportId, newStatus);
      if (res?.success && res?.data) {
        setReports((prev) =>
          prev.map((item) => (item._id === reportId ? { ...item, status: newStatus } : item))
        );
        setStatusMessage({
          type: 'success',
          message: `Report status updated to '${newStatus.replace('_', ' ')}'.`,
        });
        getReportStats().then((statRes) => {
          if (statRes?.stats) setStats(statRes.stats);
        });
      } else {
        throw new Error(res?.message || 'Status update failed.');
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err?.message || 'Failed to update report status.',
      });
    }
  };

  const handleSosStatusChange = async (incidentId, newStatus) => {
    try {
      const res = await updateIncidentStatus(incidentId, newStatus);
      if (res?.success && res?.data) {
        setSosIncidents((prev) =>
          prev.map((item) => (item._id === incidentId ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err) {
      console.error('SOS status update error:', err);
    }
  };

  // Filtered reports calculation
  const filteredReports = reports.filter((rpt) => {
    if (severityFilter !== 'all' && rpt.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && rpt.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchType = (rpt.type || '').toLowerCase().includes(q);
      const matchDesc = (rpt.description || '').toLowerCase().includes(q);
      const matchStatus = (rpt.status || '').toLowerCase().includes(q);
      return matchType || matchDesc || matchStatus;
    }
    return true;
  });

  // Filtered users calculation
  const filteredUsers = usersList.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase().trim();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });

  const highSeverityAlerts = reports.filter((rpt) => rpt.severity === 'high');

  const mapCenter = reports.length > 0 && reports[0].location
    ? [reports[0].location.latitude, reports[0].location.longitude]
    : [19.076, 72.8777];

  const tileConfig = getMapTileConfig();

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="surface-grid">
      {/* Scroll Progress Indicator */}
      <motion.div style={{ scaleX }} className="fixed top-0 left-0 right-0 h-1 bg-rose-600 origin-left z-50 pointer-events-none" />

      {/* Admin Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-100/60 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-rose-800">
            <Shield className="h-3.5 w-3.5 fill-current" /> Saarthi Command Center
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1.5 tracking-tight">Executive Safety Control Portal</h1>
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
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Admin Sign Out</span>
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </motion.div>
      )}

      {statusMessage.message && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl border px-4 py-3 text-xs flex items-center gap-2 ${
          statusMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
        }`}>
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage.message}</span>
        </motion.div>
      )}

      {/* Top Overview Metrics Row (All Real Sourced Sockets) */}
      <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="muted-label text-[10px]">Total Users</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-950 mt-1">
            <AnimatedNumber value={stats.totalUsers || usersList.length} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">MongoDB registered</div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card">
          <div className="flex items-center justify-between text-slate-500">
            <span className="muted-label text-[10px]">Total Reports</span>
            <MapPinned className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            <AnimatedNumber value={stats.total} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Safety reports</div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card">
          <div className="flex items-center justify-between text-amber-600">
            <span className="muted-label text-[10px]">Active Reports</span>
            <Activity className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-1">
            <AnimatedNumber value={stats.active} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Pending review</div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card">
          <div className="flex items-center justify-between text-rose-600">
            <span className="muted-label text-[10px]">High Severity</span>
            <Siren className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            <AnimatedNumber value={stats.highSeverity} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Critical alerts</div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="muted-label text-[10px]">Resolved Cases</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            <AnimatedNumber value={stats.resolved} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Verified safe</div>
        </motion.div>

        <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} className="metric-card">
          <div className="flex items-center justify-between text-rose-600">
            <span className="muted-label text-[10px]">Active SOS</span>
            <Siren className="h-4 w-4 text-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-800 mt-1">
            <AnimatedNumber value={stats.activeSos || sosIncidents.length} />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Live emergencies</div>
        </motion.div>
      </motion.div>

      {/* Main Admin GIS Safety Map */}
      <motion.div initial={{ opacity: 0, scale: 0.98, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5 }} className="panel space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="muted-label text-[10px]">Administrative GIS Control</p>
            <h3 className="text-lg font-bold text-slate-900">Real Incident & Hazard Distribution Map</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <Filter className="h-3 w-3 text-slate-400" />
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="bg-transparent text-slate-700 font-semibold outline-none text-xs">
                <option value="all">All Severities</option>
                <option value="high">High (Red)</option>
                <option value="medium">Medium (Orange)</option>
                <option value="low">Low (Green)</option>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-slate-700 font-semibold outline-none text-xs">
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="under_review">Under Review</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        <div className="h-[460px] w-full rounded-[20px] overflow-hidden border border-slate-200 relative shadow-inner">
          <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} maxZoom={tileConfig.maxZoom} />

            {filteredReports.map((rpt) => {
              const lat = Number(rpt.location?.latitude ?? rpt.latitude);
              const lon = Number(rpt.location?.longitude ?? rpt.longitude);
              if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

              return (
                <Marker key={rpt._id || `${lat}-${lon}`} position={[lat, lon]} icon={getMarkerIcon(rpt.severity)}>
                  <Popup>
                    <div className="text-xs p-1 text-slate-900 space-y-1.5 max-w-[200px]">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="block text-slate-900 font-bold text-sm">{formatType(rpt.type || rpt.incidentType)}</strong>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          rpt.severity === 'high' ? 'bg-rose-100 text-rose-800' : rpt.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {rpt.severity || 'Medium'}
                        </span>
                      </div>

                      <p className="text-slate-600 text-xs line-clamp-2">{rpt.description}</p>
                      <div className="text-[10px] text-slate-400">{formatDate(rpt.createdAt || rpt.incidentDate)}</div>

                      <button
                        type="button"
                        onClick={() => navigate(`/report/${rpt._id}`)}
                        className="w-full mt-2 rounded-lg bg-rose-600 py-1.5 text-center text-xs font-bold text-white hover:bg-rose-700 transition"
                      >
                        View Details
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </motion.div>

      {/* High-Risk Alerts & Active SOS Split Section */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* High-Risk Alert Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5 }} className="panel space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Siren className="h-5 w-5 text-rose-600" /> High-Risk Priority Alerts
            </h3>
            <span className="badge-pill rose">{highSeverityAlerts.length} Critical</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
            {highSeverityAlerts.length > 0 ? (
              highSeverityAlerts.map((rpt) => (
                <div key={rpt._id} className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        {rpt.severity} severity
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{formatType(rpt.type || rpt.incidentType)}</h4>
                    </div>

                    <span className="text-[10px] font-mono text-slate-400">{formatDate(rpt.createdAt || rpt.incidentDate)}</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{rpt.description}</p>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-semibold text-slate-500">Status: <strong className="text-slate-900">{rpt.status || 'active'}</strong></span>
                    <button
                      type="button"
                      onClick={() => navigate(`/report/${rpt._id}`)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
                    >
                      <span>View Report</span> →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-xs text-slate-500">
                No high-risk incidents currently reported.
              </div>
            )}
          </div>
        </motion.div>

        {/* Active SOS Monitoring Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.5, delay: 0.1 }} className="panel space-y-4 flex flex-col border-rose-200 bg-gradient-to-br from-white via-rose-50/10 to-white">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Siren className="h-5 w-5 text-rose-600 animate-pulse" /> Active SOS Emergency Monitoring
              </h3>
            </div>
            <span className="badge-pill rose">{sosIncidents.length} Emergency Triggers</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
            {sosIncidents.length > 0 ? (
              sosIncidents.map((sos) => (
                <div key={sos._id} className="p-3.5 rounded-2xl border border-rose-200 bg-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white">
                      {sos.status || 'active'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDate(sos.incidentDate || sos.createdAt)}</span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">{sos.description || 'Emergency SOS Alert Triggered'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">GPS: {sos.latitude?.toFixed(4)}°, {sos.longitude?.toFixed(4)}°</div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => navigate(`/emergency/${sos._id}`)}
                      className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" /> View SOS Detail
                    </button>

                    <select
                      value={sos.status || 'active'}
                      onChange={(e) => handleSosStatusChange(sos._id, e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="under_review">Under Review</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-xs text-slate-500">
                No active SOS emergency alerts currently recorded.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* All Reports Management Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="muted-label text-[10px]">Incident Lifecycle</p>
            <h3 className="text-lg font-bold text-slate-900">Safety Reports Management</h3>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by type, description..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-rose-300 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Incident Type</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Coordinates</th>
                <th className="px-4 py-3">Reported Time</th>
                <th className="px-4 py-3 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredReports.length > 0 ? (
                filteredReports.map((rpt) => (
                  <tr key={rpt._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900">
                      <div>{formatType(rpt.type || rpt.incidentType)}</div>
                      <div className="text-[10px] text-slate-400 font-normal line-clamp-1 max-w-xs">{rpt.description}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        rpt.severity === 'high' ? 'bg-rose-100 text-rose-800' : rpt.severity === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rpt.severity || 'Medium'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <select
                        value={rpt.status || 'active'}
                        onChange={(e) => handleStatusChange(rpt._id, e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none focus:border-rose-300 transition"
                      >
                        <option value="active">Active</option>
                        <option value="under_review">Under Review</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-500">
                      {Number.isFinite(rpt.latitude) ? `${rpt.latitude.toFixed(4)}°, ${rpt.longitude?.toFixed(4)}°` : 'N/A'}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {formatDate(rpt.createdAt || rpt.incidentDate)}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/report/${rpt._id}`)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                    No safety incidents match the selected search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Admin User Management Section ("All Users") */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} className="panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <p className="muted-label text-[10px]">User Directory</p>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" /> All Registered MongoDB Users
            </h3>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search users by name, email, phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-rose-300 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">User Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Phone Number</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 rounded-r-xl text-right">Registered Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <span>{u.name || 'Saarthi User'}</span>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{u.email}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-mono text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{u.phone || 'N/A'}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right font-mono text-slate-500 text-[11px]">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                    No registered users match the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

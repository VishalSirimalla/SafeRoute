import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, AlertTriangle, Loader2, UserCheck, ExternalLink, Camera, ShieldCheck } from 'lucide-react';
import { getReport, updateReportStatus } from '../services/apiClient';
import ReportMap from '../components/ReportMap';

const typeLabels = {
  poor_lighting: 'Poor Lighting',
  suspicious_activity: 'Suspicious Activity',
  harassment: 'Harassment',
  path_blocked: 'Path Blocked',
  other: 'Other Safety Concern',
};

const statusBadges = {
  active: { label: 'Active', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  open: { label: 'Open', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  under_review: { label: 'Under Review', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  acknowledged: { label: 'Acknowledged', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  resolved: { label: 'Resolved', style: 'bg-sky-100 text-sky-800 border-sky-200' },
};

const severityBadges = {
  low: { label: 'Low Severity', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  medium: { label: 'Moderate Severity', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  moderate: { label: 'Moderate Severity', style: 'bg-amber-100 text-amber-800 border-amber-200' },
  high: { label: 'High Severity', style: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const formatDate = (val) => {
  if (!val) return 'Unknown date';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

class ReportDetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ReportDetailScreen error boundary caught exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="surface-grid">
          <div className="panel border-rose-200 bg-rose-50/50 text-center py-10 rounded-[28px]">
            <div className="flex justify-center mb-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle className="h-7 w-7" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Display Report Detail</h2>
            <p className="text-slate-600 text-xs max-w-md mx-auto mb-6">
              {this.state.error?.message || 'A render error occurred while opening this safety report.'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/dashboard';
              }}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ReportDetailContent() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });

  useEffect(() => {
    let isMounted = true;

    async function fetchReportDetail() {
      if (!reportId || reportId === 'undefined' || reportId === 'null') {
        if (isMounted) {
          setError('Invalid report ID format.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');

      try {
        const res = await getReport(reportId);
        if (isMounted) {
          if (res?.success && res?.data) {
            setReport(res.data);
          } else {
            setError(res?.message || 'Report not found.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'Unable to fetch report details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchReportDetail();

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const handleStatusChange = async (newStatus) => {
    if (updatingStatus || !report || !report._id) return;

    setUpdatingStatus(true);
    setStatusMessage({ type: '', message: '' });

    try {
      const res = await updateReportStatus(report._id, newStatus);
      if (res?.success && res?.data) {
        setReport(res.data);
        setStatusMessage({
          type: 'success',
          message: `Report status updated to ${newStatus.replace('_', ' ')}.`,
        });
      } else {
        throw new Error(res?.message || 'Failed to update status.');
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        message: err?.message || 'Error updating report status.',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="panel flex flex-col items-center justify-center min-h-[350px] text-center">
        <Loader2 className="h-10 w-10 animate-spin text-rose-600 mb-3" />
        <p className="text-xs text-slate-600 font-medium">Fetching report details from MongoDB...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="surface-grid">
        <div className="panel border-rose-200 bg-rose-50/40 text-center py-10 rounded-[28px]">
          <div className="flex justify-center mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Report Record Unavailable</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto mb-6">{error || 'Report details could not be found.'}</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentStatusBadge = statusBadges[report.status] || {
    label: report.status || 'Active',
    style: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const currentSeverityBadge = severityBadges[report.severity] || {
    label: report.severity || 'Moderate',
    style: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const displayType = typeLabels[report.type] || report.type || 'Safety Incident';

  const hasValidCoords = Number.isFinite(report.latitude) && Number.isFinite(report.longitude);
  const formattedCoords = hasValidCoords
    ? `${report.latitude.toFixed(6)}°, ${report.longitude.toFixed(6)}°`
    : 'Coordinates unavailable';

  const mapLocation = hasValidCoords
    ? { latitude: report.latitude, longitude: report.longitude, accuracy: report.accuracy }
    : null;

  return (
    <div className="surface-grid">
      {/* Top Header Card */}
      <div className="panel">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="muted-label text-[10px]">Incident Report</span>
                <span className="text-xs text-slate-500 font-mono">ID: {report._id}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">{displayType}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${currentSeverityBadge.style}`}>
              {currentSeverityBadge.label}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${currentStatusBadge.style}`}>
              {currentStatusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Map Preview */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Left Column: Report Information & Status Update */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="panel space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Report Summary</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Calendar className="h-4 w-4 text-rose-600" />
                  <span>Submitted Date</span>
                </div>
                <div className="text-xs font-bold text-slate-900">{formatDate(report.incidentDate || report.createdAt)}</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <UserCheck className="h-4 w-4 text-rose-600" />
                  <span>Source</span>
                </div>
                <div className="text-xs font-bold text-slate-900 capitalize">{report.source || 'Community User'}</div>
              </div>
            </div>

            {/* Description Text */}
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Description / Situation Details</div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {report.description || 'No description provided.'}
              </div>
            </div>
          </div>

          {/* Status Update Control Panel */}
          <div className="panel space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Update Report Status</h3>
              <span className="text-xs font-mono text-slate-500">Current: {report.status || 'active'}</span>
            </div>

            <p className="text-xs text-slate-500">
              Select a lifecycle status to update this record in MongoDB:
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'active', label: 'Active', color: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
                { key: 'under_review', label: 'Under Review', color: 'border-amber-300 text-amber-800 bg-amber-50' },
                { key: 'resolved', label: 'Resolved', color: 'border-sky-300 text-sky-800 bg-sky-50' },
              ].map(({ key, label, color }) => {
                const isActive = report.status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={updatingStatus || isActive}
                    onClick={() => handleStatusChange(key)}
                    className={`py-3 px-3 rounded-2xl border text-xs font-bold uppercase tracking-wider transition ${
                      isActive ? `${color} ring-2 ring-rose-500/30` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {statusMessage.message && (
              <div className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                statusMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}>
                {statusMessage.message}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Map Preview & Evidence Photo */}
        <div className="space-y-6">
          {/* Map Preview */}
          <div className="panel space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <MapPin className="h-4 w-4 text-rose-600" />
                <span>Incident Location</span>
              </div>
              <span className="text-xs font-mono text-slate-500">{formattedCoords}</span>
            </div>

            <div className="h-56 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
              <ReportMap location={mapLocation} />
            </div>

            {Number.isFinite(report.accuracy) && (
              <div className="text-[10px] text-slate-400 font-mono text-right">
                GPS Accuracy Radius: ±{Math.round(report.accuracy)}m
              </div>
            )}
          </div>

          {/* Evidence Photo Card */}
          <div className="panel space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Camera className="h-4 w-4 text-rose-600" />
              <span>Evidence Photo</span>
            </div>

            {report.evidenceUrl ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 relative group">
                <img
                  src={report.evidenceUrl}
                  alt="Report evidence"
                  className="w-full max-h-72 object-contain bg-black/40"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
                  <span className="truncate max-w-[220px] font-mono">{report.evidenceUrl}</span>
                  <a
                    href={report.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-rose-600 hover:underline font-bold"
                  >
                    <span>Open Image</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-400 text-xs">
                No evidence photo was attached to this report.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportDetailScreen() {
  return (
    <ReportDetailErrorBoundary>
      <ReportDetailContent />
    </ReportDetailErrorBoundary>
  );
}

import { AlertTriangle, Camera, LocateFixed, RefreshCw, X, ShieldAlert, CheckCircle2, Shield } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitSafetyReport, uploadReportEvidence, getReports } from '../services/apiClient';
import ReportMap from '../components/ReportMap';

const issues = [
  { label: 'Poor Lighting', key: 'poor_lighting', icon: AlertTriangle },
  { label: 'Suspicious Activity', key: 'suspicious_activity', icon: ShieldAlert },
  { label: 'Harassment', key: 'harassment', icon: AlertTriangle },
  { label: 'Path Blocked', key: 'path_blocked', icon: LocateFixed },
];

const severityOptions = [
  { label: 'Low', value: 'low', badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { label: 'Moderate', value: 'medium', badgeStyle: 'bg-amber-100 text-amber-800 border-amber-200' },
  { label: 'High', value: 'high', badgeStyle: 'bg-rose-100 text-rose-800 border-rose-200' },
];

const typeLabels = {
  poor_lighting: 'Poor Lighting',
  suspicious_activity: 'Suspicious Activity',
  harassment: 'Harassment',
  path_blocked: 'Path Blocked',
  other: 'Other Safety Concern',
};

const formatDate = (val) => {
  if (!val) return 'Unknown date';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ReportScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('new');

  // Form state
  const [selectedIssue, setSelectedIssue] = useState('poor_lighting');
  const [severity, setSeverity] = useState('medium');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState({ type: '', message: '', reportId: null });

  // History state
  const [myReports, setMyReports] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Location state
  const [locationState, setLocationState] = useState({
    coords: null,
    loading: true,
    error: null,
  });

  // Evidence photo state
  const [evidencePhoto, setEvidencePhoto] = useState(null);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationState({
        coords: null,
        loading: false,
        error: 'Geolocation is not supported by your browser.',
      });
      return;
    }

    setLocationState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationState({
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          loading: false,
          error: null,
        });
      },
      (err) => {
        let msg = 'Unable to access your current position.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow GPS access to record report coordinates.';
        }
        setLocationState({ coords: null, loading: false, error: msg });
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const loadReportHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await getReports();
      if (res?.data && Array.isArray(res.data)) {
        setMyReports(res.data);
      }
    } catch (err) {
      setHistoryError(err?.message || 'Unable to load report history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadReportHistory();
    }
  }, [activeTab]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    setImageError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Only image files (JPG, PNG, WebP) are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEvidencePhoto({
        file,
        previewUrl: event.target?.result,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setEvidencePhoto(null);
    setImageError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitState({ type: '', message: '', reportId: null });

    if (!locationState.coords) {
      setSubmitState({
        type: 'error',
        message: 'A valid GPS location is required to file a report. Click "Refresh GPS" to try again.',
      });
      return;
    }

    if (!details.trim()) {
      setSubmitState({
        type: 'error',
        message: 'Please provide brief description details of the safety concern.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reportPayload = {
        type: selectedIssue,
        incidentType: selectedIssue,
        severity,
        description: details.trim(),
        latitude: locationState.coords.latitude,
        longitude: locationState.coords.longitude,
        accuracy: locationState.coords.accuracy,
      };

      const res = await submitSafetyReport(reportPayload);
      if (!res?.success || !res?.data?._id) {
        throw new Error(res?.message || 'Failed to submit safety report.');
      }

      const reportId = res.data._id;

      if (evidencePhoto?.previewUrl) {
        try {
          await uploadReportEvidence(evidencePhoto.previewUrl, evidencePhoto.name);
        } catch (uploadErr) {
          console.warn('Evidence upload warning:', uploadErr.message);
        }
      }

      setSubmitState({
        type: 'success',
        message: 'Safety report submitted successfully to live community feed.',
        reportId,
      });

      // Reset form
      setDetails('');
      setEvidencePhoto(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setSubmitState({
        type: 'error',
        message: err?.message || 'Unable to submit safety report. Please check details and retry.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="surface-grid">
      {/* Header Tabs Navigation */}
      <div className="panel border-rose-200/80 bg-gradient-to-r from-rose-50/60 via-white to-purple-50/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-100/60 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-800">
              <Shield className="h-3.5 w-3.5" /> Community Vigilance
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Submit Safety Incident</h2>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('new')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'new' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Submit Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'history' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Report History
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'new' ? (
        <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="panel space-y-6">
            {/* Incident Type Selector */}
            <div>
              <label className="muted-label text-slate-500 block mb-2">1. Select Incident Type</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {issues.map(({ label, key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedIssue(key)}
                    className={`p-4 rounded-2xl border text-left flex items-center gap-3 transition ${
                      selectedIssue === key
                        ? 'border-rose-300 bg-rose-50/60 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      selectedIssue === key ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Selector */}
            <div>
              <label className="muted-label text-slate-500 block mb-2">2. Severity Level</label>
              <div className="grid gap-3 grid-cols-3">
                {severityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSeverity(opt.value)}
                    className={`py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition ${
                      severity === opt.value
                        ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="muted-label text-slate-500 block mb-2">3. Description Details</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe safety concern, specific landmarks, or observed issues..."
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition placeholder:text-slate-400"
              />
            </div>

            {/* Photo Evidence Upload */}
            <div>
              <label className="muted-label text-slate-500 block mb-2">4. Photo Evidence (Optional)</label>

              {!evidencePhoto ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-rose-300 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-rose-50/30 transition flex flex-col items-center gap-2"
                >
                  <Camera className="h-8 w-8 text-rose-600" />
                  <span className="text-xs font-semibold text-slate-700">Click to upload photo evidence</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WebP up to 5MB</span>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2 flex items-center gap-4">
                  <img src={evidencePhoto.previewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{evidencePhoto.name}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Photo ready for submission</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
              {imageError && <p className="text-xs text-rose-600 mt-1">{imageError}</p>}
            </div>

            {/* Submit Banner Message */}
            {submitState.message && (
              <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
                submitState.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {submitState.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />}
                <span>{submitState.message}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-rose-600 py-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition disabled:opacity-60 shadow-md flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Submitting Safety Report...</span>
                </>
              ) : (
                <span>Submit Safety Report</span>
              )}
            </button>
          </div>

          {/* Location Detection Preview Map */}
          <div className="panel space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <p className="muted-label">GPS Verification</p>
                <h3 className="text-lg font-bold text-slate-900">Captured Incident Location</h3>
              </div>

              <button
                type="button"
                onClick={requestLocation}
                disabled={locationState.loading}
                className="flex items-center gap-1 text-xs text-rose-600 font-semibold hover:underline"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${locationState.loading ? 'animate-spin' : ''}`} />
                <span>Refresh GPS</span>
              </button>
            </div>

            <div className="h-[360px] w-full rounded-[20px] overflow-hidden border border-slate-200 relative shadow-inner">
              <ReportMap location={locationState.coords} isLoading={locationState.loading} error={locationState.error} />
            </div>

            {locationState.coords && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-900">GPS Coordinates Verified:</div>
                <div>Lat: {locationState.coords.latitude.toFixed(6)}°</div>
                <div>Lon: {locationState.coords.longitude.toFixed(6)}°</div>
              </div>
            )}
          </div>
        </form>
      ) : (
        /* Report History Tab */
        <div className="panel space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-bold text-slate-900">Submitted Community Reports</h3>
            <button
              type="button"
              onClick={loadReportHistory}
              disabled={historyLoading}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${historyLoading ? 'animate-spin text-rose-600' : ''}`} />
              <span>Reload History</span>
            </button>
          </div>

          {historyError && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
              {historyError}
            </div>
          )}

          {myReports.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {myReports.map((rpt) => (
                <div
                  key={rpt._id}
                  onClick={() => navigate(`/report/${rpt._id}`)}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{typeLabels[rpt.type || rpt.incidentType] || rpt.type || rpt.incidentType}</span>
                    <span className={`badge-pill ${rpt.severity === 'high' ? 'danger' : rpt.severity === 'medium' ? 'warning' : 'success'}`}>
                      {rpt.severity || 'Medium'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{rpt.description}</p>
                  <div className="text-[10px] text-slate-400">{formatDate(rpt.createdAt || rpt.incidentDate)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-xs text-slate-500">
              No submitted safety reports found yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

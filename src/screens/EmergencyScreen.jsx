import { AlertTriangle, LocateFixed, MapPinned, PhoneCall, Plus, Trash2, CheckCircle2, ShieldAlert, Loader2, ExternalLink, X, Share2, Mail, MessageSquare, Siren, Phone, Shield } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  submitIncident,
  updateIncidentStatus,
  updateIncidentLocation,
  getTrustedContacts,
  addTrustedContact,
  deleteTrustedContact,
} from '../services/apiClient';
import EmergencyMap from '../components/EmergencyMap';
import { displayPhone, isValidIndiaPhone } from '../utils/phoneUtils';

const DEFAULT_DESCRIPTION = 'Emergency alert triggered from Saarthi SOS.';

export default function EmergencyScreen() {
  const [sosActive, setSosActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [location, setLocation] = useState(null);
  const [incidentId, setIncidentId] = useState(null);
  const [shareToken, setShareToken] = useState(null);
  const [incidentStatus, setIncidentStatus] = useState(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [notificationStatus, setNotificationStatus] = useState(null);

  // Trusted Contacts State
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', relationship: '' });
  const [addContactLoading, setAddContactLoading] = useState(false);
  const [addContactError, setAddContactError] = useState('');

  // Watch position ref
  const watchIdRef = useRef(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const res = await getTrustedContacts();
      if (res?.success && Array.isArray(res.data)) {
        setContacts(res.data);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  const startLocationWatch = (activeIncidentId) => {
    if (!navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const latitude = Number(pos.coords.latitude);
        const longitude = Number(pos.coords.longitude);
        const accuracy = pos.coords.accuracy;
        const timestamp = new Date();

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setLocation({ latitude, longitude, accuracy, timestamp });

          if (activeIncidentId) {
            try {
              await updateIncidentLocation(activeIncidentId, { latitude, longitude, accuracy });
            } catch (err) {
              console.error('Location sync error:', err);
            }
          }
        }
      },
      (err) => {
        console.error('Location watch error:', err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const handleTriggerSOS = async () => {
    if (sosActive || isSubmitting) return;

    setError('');
    setStatusMessage('Locating your position...');
    setIsSubmitting(true);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsSubmitting(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = Number(pos.coords.latitude);
        const longitude = Number(pos.coords.longitude);
        const accuracy = pos.coords.accuracy;
        const timestamp = new Date();

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setError('Invalid location coordinates acquired.');
          setIsSubmitting(false);
          return;
        }

        const currentLoc = { latitude, longitude, accuracy, timestamp };
        setLocation(currentLoc);

        try {
          setStatusMessage('Sending emergency alert...');
          const payload = {
            latitude,
            longitude,
            accuracy,
            description: DEFAULT_DESCRIPTION,
            incidentType: 'sos',
            severity: 'high',
          };

          const res = await submitIncident(payload);

          if (res?.success && res.data) {
            const newIncidentId = res.data._id;
            setIncidentId(newIncidentId);
            setShareToken(res.data.shareToken || null);
            setIncidentStatus(res.data.status || 'active');
            setNotificationStatus(res.data.notifications || null);
            setSosActive(true);
            setStatusMessage('Emergency alert sent!');

            startLocationWatch(newIncidentId);
          } else {
            throw new Error(res?.message || 'Failed to register emergency incident.');
          }
        } catch (err) {
          setError(err?.message || 'Failed to dispatch SOS alert. Please try again.');
          setStatusMessage('');
        } finally {
          setIsSubmitting(false);
        }
      },
      (err) => {
        let msg = 'Failed to acquire location for SOS.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. GPS access is required to dispatch Emergency SOS.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal unavailable. Check device settings.';
        }
        setError(msg);
        setStatusMessage('');
        setIsSubmitting(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleResolveSOS = async () => {
    if (!incidentId || isResolving) return;

    setIsResolving(true);
    setError('');

    try {
      const res = await updateIncidentStatus(incidentId, 'resolved');
      if (res?.success) {
        setSosActive(false);
        setIncidentStatus('resolved');
        setStatusMessage('Emergency incident marked as resolved.');

        if (watchIdRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      } else {
        throw new Error(res?.message || 'Failed to resolve incident status.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to resolve emergency incident.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleAddContactSubmit = async (e) => {
    e.preventDefault();
    setAddContactError('');

    if (!newContact.name.trim()) {
      setAddContactError('Contact name is required.');
      return;
    }

    if (!newContact.phone.trim() || !isValidIndiaPhone(newContact.phone)) {
      setAddContactError('Enter a valid 10-digit Indian phone number.');
      return;
    }

    try {
      setAddContactLoading(true);
      const res = await addTrustedContact({
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        email: newContact.email.trim() || undefined,
        relationship: newContact.relationship.trim() || 'Trusted Contact',
      });

      if (res?.success) {
        setShowAddModal(false);
        setNewContact({ name: '', phone: '', email: '', relationship: '' });
        fetchContacts();
      } else {
        throw new Error(res?.message || 'Failed to save contact.');
      }
    } catch (err) {
      setAddContactError(err?.message || 'Error saving contact.');
    } finally {
      setAddContactLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    try {
      const res = await deleteTrustedContact(contactId);
      if (res?.success) {
        fetchContacts();
      }
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  return (
    <div className="surface-grid">
      {/* Header Banner */}
      <div className="panel border-rose-200/80 bg-gradient-to-r from-rose-50/70 via-white to-purple-50/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-100/60 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-800">
              <Shield className="h-3.5 w-3.5" /> Emergency Response Center
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Immediate Safety Assistance</h2>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:112"
              className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition shadow-sm"
            >
              <Phone className="h-4 w-4" /> Call 112
            </a>
            <a
              href="tel:100"
              className="flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-700 hover:bg-rose-50 transition shadow-sm"
            >
              <PhoneCall className="h-4 w-4" /> Police 100
            </a>
          </div>
        </div>
      </div>

      {/* Main Signature SOS Button Section */}
      <div className="panel bg-gradient-to-b from-white via-rose-50/30 to-white flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-[32px] border-rose-200/60 shadow-sm relative overflow-hidden">
        {!sosActive ? (
          <div className="space-y-6 max-w-md flex flex-col items-center">
            {/* Signature SOS Breathing Button */}
            <div className="relative my-4">
              <button
                type="button"
                onClick={handleTriggerSOS}
                disabled={isSubmitting}
                className="h-36 w-36 md:h-44 md:w-44 rounded-full bg-gradient-to-tr from-rose-700 via-rose-600 to-rose-500 text-white font-black text-3xl tracking-wider shadow-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transform hover:scale-105 active:scale-95 transition disabled:opacity-60 sos-pulse-ring"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-wider mt-1">{statusMessage || 'Dispatching...'}</span>
                  </>
                ) : (
                  <>
                    <Siren className="h-12 w-12" />
                    <span>SOS</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Press SOS for Immediate Assistance</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Dispatches your live location to MongoDB incident database and broadcasts alerts to your trusted contacts.
              </p>
            </div>
          </div>
        ) : (
          /* SOS Active State */
          <div className="space-y-6 max-w-lg w-full">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-800 animate-pulse">
              <Siren className="h-4 w-4" /> Live Emergency Alert Active
            </div>

            <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Incident Status</span>
                <span className="badge-pill danger">Active Broadcast</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Your live coordinates are being continuously broadcasted and logged. Emergency contacts have been notified.
              </p>
            </div>

            <button
              type="button"
              onClick={handleResolveSOS}
              disabled={isResolving}
              className="w-full rounded-full bg-emerald-600 py-4 text-sm font-bold uppercase tracking-wider text-white hover:bg-emerald-700 transition shadow-md flex items-center justify-center gap-2"
            >
              {isResolving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Resolving Incident...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  <span>I Am Safe — Resolve Incident</span>
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Live Emergency Map Panel */}
      <div className="panel space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="muted-label">GPS Tracking</p>
            <h3 className="text-lg font-bold text-slate-900">Live Incident Location</h3>
          </div>
          {location && (
            <span className="badge-pill rose">GPS Lat: {location.latitude.toFixed(5)}°</span>
          )}
        </div>

        <div className="h-[400px] w-full rounded-[20px] overflow-hidden border border-slate-200 relative shadow-inner">
          <EmergencyMap location={location} />
        </div>
      </div>

      {/* Trusted Emergency Contacts */}
      <div className="panel space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Trusted Emergency Contacts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Contacts who receive automatic alerts during SOS activation.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Contact
          </button>
        </div>

        {contactsLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading trusted contacts...</div>
        ) : contacts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((c) => (
              <div key={c._id} className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-sm">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.relationship || 'Trusted Contact'}</div>
                  <div className="text-xs font-mono text-rose-700 mt-1">{displayPhone(c.phone)}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteContact(c._id)}
                  className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition flex items-center justify-center shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-xs text-slate-500">
            No trusted emergency contacts added yet. Click "Add Contact" to configure emergency recipients.
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add Emergency Contact</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddContactSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Full Name</label>
                <input
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number (India 10-digit)</label>
                <input
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Relationship</label>
                <input
                  value={newContact.relationship}
                  onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                  placeholder="e.g. Mother, Sister, Friend"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white"
                />
              </div>

              {addContactError && <p className="text-xs text-rose-600">{addContactError}</p>}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addContactLoading}
                  className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
                >
                  {addContactLoading ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

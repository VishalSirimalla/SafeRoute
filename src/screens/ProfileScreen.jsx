import { useEffect, useState } from 'react';
import { User, Phone, Mail, Save, Loader2, CheckCircle2, AlertCircle, MapPin, HeartPulse, Shield } from 'lucide-react';
import { getProfile, updateProfile } from '../services/apiClient';
import { displayPhone, isValidIndiaPhone } from '../utils/phoneUtils';

export default function ProfileScreen() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    emergencyContact: { name: '', phone: '' },
    bloodGroup: '',
    medicalInfo: '',
    address: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getProfile();
      if (res?.success && res?.data) {
        setProfile({
          name: res.data.name || '',
          email: res.data.email || '',
          phone: displayPhone(res.data.phone) || '',
          emergencyContact: {
            name: res.data.emergencyContact?.name || '',
            phone: displayPhone(res.data.emergencyContact?.phone) || '',
          },
          bloodGroup: res.data.bloodGroup || '',
          medicalInfo: res.data.medicalInfo || '',
          address: res.data.address || '',
        });
      } else {
        setError(res?.message || 'Failed to load user profile.');
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to backend profile service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!profile.name.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!profile.email.trim()) {
      setError('Email Address is required.');
      return;
    }
    if (!isValidIndiaPhone(profile.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    try {
      setSaving(true);
      const res = await updateProfile(profile);
      if (res?.success) {
        setSuccessMessage('Safety profile saved successfully.');
        if (res.data) {
          setProfile({
            name: res.data.name || '',
            email: res.data.email || '',
            phone: displayPhone(res.data.phone) || '',
            emergencyContact: {
              name: res.data.emergencyContact?.name || '',
              phone: displayPhone(res.data.emergencyContact?.phone) || '',
            },
            bloodGroup: res.data.bloodGroup || '',
            medicalInfo: res.data.medicalInfo || '',
            address: res.data.address || '',
          });
        }
      } else {
        setError(res?.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError(err.message || 'Server error while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] w-full flex-col items-center justify-center bg-white rounded-[24px] border border-slate-200 p-8 text-center shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600 mb-3" />
        <p className="text-sm font-semibold text-slate-700">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="surface-grid">
      {/* Header Banner */}
      <div className="panel border-rose-200/80 bg-gradient-to-r from-rose-50/60 via-white to-purple-50/30">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-100/60 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-rose-800">
              <Shield className="h-3.5 w-3.5" /> User Security Profile
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Safety & Contact Information</h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="badge-pill success">Profile Active</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        {/* Personal Details */}
        <div className="panel space-y-4">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-rose-600" /> Personal Identity
          </h3>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
              placeholder="Full Name"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Email Address</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Phone Number (India 10-digit)</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
              placeholder="e.g. 9876543210"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Home / Primary Address</label>
            <textarea
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
              placeholder="Residential address details..."
            />
          </div>
        </div>

        {/* Emergency & Medical Information */}
        <div className="panel space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-rose-600" /> Medical & Emergency Profile
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Primary Emergency Contact Name</label>
              <input
                type="text"
                value={profile.emergencyContact.name}
                onChange={(e) => setProfile({ ...profile, emergencyContact: { ...profile.emergencyContact, name: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
                placeholder="Emergency Contact Name"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Primary Emergency Phone</label>
              <input
                type="tel"
                value={profile.emergencyContact.phone}
                onChange={(e) => setProfile({ ...profile, emergencyContact: { ...profile.emergencyContact, phone: e.target.value } })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
                placeholder="Emergency Phone"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Blood Group</label>
              <input
                type="text"
                value={profile.bloodGroup}
                onChange={(e) => setProfile({ ...profile, bloodGroup: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
                placeholder="e.g. O+, A+, B-"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Medical Conditions / Allergies</label>
              <textarea
                value={profile.medicalInfo}
                onChange={(e) => setProfile({ ...profile, medicalInfo: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-500/20 transition"
                placeholder="Important medical notes for emergency responders..."
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            {error && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-rose-600 py-3.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition disabled:opacity-60 shadow-md flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Safety Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminLogin } from '../services/apiClient';

export default function AdminLoginScreen() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('vishalsirimalla31@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError('Please enter a valid administrator email address.');
      return;
    }
    if (!password) {
      setError('Please enter administrator password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await adminLogin(email, password);
      if (res?.success && res?.token) {
        localStorage.setItem('saferoute_admin_authenticated', 'true');
        navigate('/admin/dashboard');
      } else {
        setError(res?.message || 'Invalid administrator credentials.');
      }
    } catch (err) {
      setError(err?.message || 'Authentication error. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md panel bg-white border border-rose-100 shadow-xl rounded-[28px] p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-2 shadow-sm">
            <Shield className="h-7 w-7 fill-current" />
          </div>

          <span className="badge-pill rose block w-max mx-auto">Admin Portal</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Saarthi Administrator Portal</h1>
          <p className="text-xs text-slate-500">Sign in to access executive safety control & system monitoring.</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Admin Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vishalsirimalla31@gmail.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:border-rose-300 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Access Key / Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:border-rose-300 focus:bg-white transition"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-rose-600 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Access Command Center</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </motion.button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
          Return to{' '}
          <button type="button" onClick={() => navigate('/')} className="text-rose-600 font-bold hover:underline">
            User Platform
          </button>
        </div>
      </motion.div>
    </div>
  );
}

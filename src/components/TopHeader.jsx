import { ArrowLeft, UserRound } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getProfile } from '../services/apiClient';

export default function TopHeader({ title, showBack = false, compact = false, avatar = true }) {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let isMounted = true;
    getProfile()
      .then((res) => {
        if (isMounted && res?.success && res?.data?.name) {
          setUserName(res.data.name);
        }
      })
      .catch(() => {
        // Silently handle if unauthenticated or offline
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return null;
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(userName);

  return (
    <header className="topbar">
      <div className="topbar-title-wrap">
        {showBack ? (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
            aria-label="Go back"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
        ) : null}
        <div>
          <p className="muted-label text-[10px] text-slate-500">Saarthi Platform</p>
          <h1 className={compact ? 'topbar-title compact' : 'topbar-title'}>{title}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        {avatar ? (
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs hover:bg-rose-200 transition shadow-sm"
            aria-label="User profile"
            title={userName || 'User Profile'}
          >
            {initials ? (
              <span className="font-semibold">{initials}</span>
            ) : (
              <UserRound size={18} />
            )}
          </Link>
        ) : null}
      </div>
    </header>
  );
}

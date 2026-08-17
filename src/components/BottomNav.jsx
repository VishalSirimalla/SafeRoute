import { Home, Route as RouteIcon, AlertTriangle, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const items = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Routes', icon: RouteIcon, to: '/routes' },
  { label: 'Reports', icon: AlertTriangle, to: '/report' },
  { label: 'Profile', icon: UserRound, to: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      {items.map(({ label, icon: Icon, to }) => {
        const active = location.pathname === to;
        return (
          <Link key={label} to={to} className={`bottom-nav-item ${active ? 'active' : ''}`}>
            <Icon size={18} strokeWidth={2.3} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

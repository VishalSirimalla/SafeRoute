import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AlertTriangle, BarChart3, Compass, House, Siren, UserRound, Route as RouteIcon, Shield, Lock } from 'lucide-react';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import HomeScreen from './screens/HomeScreen';
import ReportScreen from './screens/ReportScreen';
import RoutesScreen from './screens/RoutesScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import EmergencyDetailScreen from './screens/EmergencyDetailScreen';
import EmergencyShareScreen from './screens/EmergencyShareScreen';
import ReportDetailScreen from './screens/ReportDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import NavigationScreen from './screens/NavigationScreen';
import DashboardScreen from './screens/DashboardScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

const navigationItems = [
  { label: 'Home', to: '/', icon: House },
  { label: 'Dashboard', to: '/dashboard', icon: BarChart3 },
  { label: 'Routes', to: '/routes', icon: RouteIcon },
  { label: 'Navigation', to: '/navigation', icon: Compass },
  { label: 'Report', to: '/report', icon: AlertTriangle },
  { label: 'Emergency', to: '/emergency', icon: Siren },
  { label: 'Profile', to: '/profile', icon: UserRound },
];

const pageTitles = {
  '/': 'Community Safety',
  '/dashboard': 'Area Intelligence',
  '/routes': 'Route Planning',
  '/navigation': 'Live Navigation',
  '/report': 'Incident Report',
  '/emergency': 'Emergency Assistance',
  '/profile': 'User Profile',
  '/admin/login': 'Admin Sign In',
  '/admin/dashboard': 'Admin Command Portal',
};

function AdminProtectedGuard({ children }) {
  const adminToken = localStorage.getItem('saferoute_admin_token');
  const isAdminAuthed = localStorage.getItem('saferoute_admin_authenticated') === 'true';

  if (!adminToken || !isAdminAuthed) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const activeTitle = pageTitles[location.pathname] ?? (
    location.pathname.startsWith('/report/') ? 'Report Details' :
    location.pathname.startsWith('/emergency/share/') ? 'Emergency Share' :
    location.pathname.startsWith('/emergency/') ? 'Incident Detail' : 'Saarthi'
  );

  return (
    <div className="app-shell">
      <div className="desktop-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">
              <Shield className="h-5 w-5 fill-current" />
            </div>
            <div>
              <p className="muted-label text-[10px]">Women Safety</p>
              <h2>Saarthi</h2>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Main navigation">
            {navigationItems.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} strokeWidth={2.2} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-4 space-y-3">
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) => `nav-item border border-rose-200/60 bg-rose-50/40 text-rose-800 hover:bg-rose-100/60 transition ${isActive ? 'active' : ''}`}
            >
              <Lock size={16} />
              <span className="font-bold">Admin Portal</span>
            </NavLink>

            <div className="sidebar-summary">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Safety Status</div>
              <div className="text-xl font-black text-rose-900 mt-1">Protected</div>
              <div className="text-xs text-slate-600 mt-1">Live monitoring active</div>
            </div>
          </div>
        </aside>

        <div className="content-column">
          <TopHeader title={activeTitle} showBack={false} avatar={true} />

          <main className="page-surface">
            <Routes>
              {/* Public Application Routes — No login required */}
              <Route path="/" element={<HomeScreen />} />
              <Route path="/dashboard" element={<DashboardScreen />} />
              <Route path="/routes" element={<RoutesScreen />} />
              <Route path="/navigation" element={<NavigationScreen />} />
              <Route path="/report" element={<ReportScreen />} />
              <Route path="/report/:reportId" element={<ReportDetailScreen />} />
              <Route path="/emergency" element={<EmergencyScreen />} />
              <Route path="/emergency/:incidentId" element={<EmergencyDetailScreen />} />
              <Route path="/emergency/share/:token" element={<EmergencyShareScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />

              {/* Dedicated Admin Portal Routes */}
              <Route path="/admin/login" element={<AdminLoginScreen />} />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminProtectedGuard>
                    <AdminDashboardScreen />
                  </AdminProtectedGuard>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

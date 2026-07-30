import { Outlet, NavLink } from 'react-router-dom';
import { Activity, Globe, Swords, Search, PenTool, BarChart3, Users, Bell, TrendingUp, Lightbulb, LogOut, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const intelligenceLinks = [
  { to: '/admin/intelligence/overview', label: 'Overview', icon: Activity },
  { to: '/admin/intelligence/market', label: 'Market Watch', icon: Globe },
  { to: '/admin/intelligence/competitors', label: 'Competitors', icon: Swords },
  { to: '/admin/intelligence/seo', label: 'SEO Opportunities', icon: Search },
  { to: '/admin/intelligence/content', label: 'Content Opportunities', icon: PenTool },
  { to: '/admin/intelligence/campaigns', label: 'Campaign Insights', icon: BarChart3 },
  { to: '/admin/intelligence/leads', label: 'Lead Opportunities', icon: Users },
  { to: '/admin/intelligence/alerts', label: 'Alerts', icon: Bell },
  { to: '/admin/intelligence/trends', label: 'Trend Analysis', icon: TrendingUp },
  { to: '/admin/intelligence/insights', label: 'Executive Insights', icon: Lightbulb },
];

export default function IntelligenceLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <Shield size={20} />
          <span>Intelligence Center</span>
        </div>
        <nav className="admin-nav">
          {intelligenceLinks.map(link => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <NavLink to="/admin/brain/dashboard" className="admin-nav-link">
            <LogOut size={16} />
            <span>Brain Control Center</span>
          </NavLink>
        </div>
      </aside>
      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}
      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="admin-topbar-title">
            <Activity size={16} />
            <span>Admin / Intelligence Center</span>
          </div>
          <div className="admin-topbar-user">
            <span className="admin-user-badge">ADMIN</span>
            <span className="admin-user-name">{user?.name || user?.email}</span>
            <button className="admin-logout-btn" onClick={logout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="admin-page-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
import { Outlet, NavLink } from 'react-router-dom';
import { Brain, Activity, GraduationCap, Share2, Bot, Database, Lightbulb, AlertTriangle, BarChart3, ListOrdered, LogOut, Shield, Menu, X, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const adminLinks = [
  { to: '/admin/brain/dashboard', label: 'Dashboard', icon: Brain },
  { to: '/admin/brain/health', label: 'Health', icon: Activity },
  { to: '/admin/brain/learning', label: 'Learning', icon: GraduationCap },
  { to: '/admin/brain/graph', label: 'Knowledge Graph', icon: Share2 },
  { to: '/admin/brain/agents', label: 'Agents', icon: Bot },
  { to: '/admin/brain/memory', label: 'Memory', icon: Database },
  { to: '/admin/brain/recommendations', label: 'Recommendations', icon: Lightbulb },
  { to: '/admin/brain/diagnostics', label: 'Diagnostics', icon: AlertTriangle },
  { to: '/admin/brain/performance', label: 'Performance', icon: BarChart3 },
  { to: '/admin/brain/executions', label: 'Executions', icon: ListOrdered },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <Shield size={20} />
          <span>Brain Control Center</span>
        </div>
        <nav className="admin-nav">
          {adminLinks.map(link => {
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
          <NavLink to="/admin/intelligence/overview" className="admin-nav-link">
            <Layers size={16} />
            <span>Intelligence Center</span>
          </NavLink>
          <NavLink to="/app/dashboard" className="admin-nav-link">
            <LogOut size={16} />
            <span>Back to App</span>
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
            <Shield size={16} />
            <span>Admin / Brain Control Center</span>
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

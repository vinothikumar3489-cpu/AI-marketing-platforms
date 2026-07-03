import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Bot, Home, Rocket, Search, Settings, User, WandSparkles, Menu, X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { useState, useRef } from 'react';
import ChatHistoryPage from '../pages/ChatHistoryPage';

const links = [
  { to: '/app/dashboard', label: 'Dashboard', icon: Home },
  { to: '/app/growth-workspace', label: 'Growth Workspace', icon: Rocket },
  { to: '/app/seo', label: 'SEO Intelligence', icon: Search },
  { to: '/app/automation-center', label: 'AI Automation', icon: Bot },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { createChat, selectedChatId } = useProject();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isCreatingChatRef = useRef(false);

  const handleNewAnalysis = async () => {
    if (isCreatingChatRef.current) return;
    isCreatingChatRef.current = true;
    try {
      await createChat('New Analysis');
      navigate('/app/growth-workspace');
    } finally {
      isCreatingChatRef.current = false;
    }
  };

  const handleRunFullAnalysis = async () => {
    if (!selectedChatId) {
      alert('Please select a project first or create a New Analysis.');
      return;
    }
    navigate('/app/growth-workspace');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="ghost-btn small" onClick={() => setDrawerOpen(true)} style={{ padding: '6px', border: 'none', background: 'transparent' }}><Menu size={24} color="#fff" /></button>
          <span className="brand-icon"><WandSparkles size={18} /></span><span>AI Marketform</span>
        </div>
        <nav>
          {links.map(link => {
            const Icon = link.icon;
            return <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18} />{link.label}</NavLink>;
          })}
        </nav>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <ProjectDropdown />
          <div className="top-actions">
            <button onClick={handleNewAnalysis} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}>
              <Plus size={16} /> New Analysis
            </button>
            <button onClick={handleRunFullAnalysis} disabled={!selectedChatId} className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}>
              <Bot size={16} /> Run Full Analysis
            </button>
            <button className="avatar" onClick={logout}>{(user?.name || user?.email || 'U')[0]?.toUpperCase()}</button>
          </div>
        </header>
        <div className="page-wrap"><Outlet /></div>
      </main>

      {drawerOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex' }}>
          <div style={{ width: '380px', background: '#0b1220', height: '100%', overflowY: 'auto', borderRight: '1px solid #1d2738' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #1d2738' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Project History</h2>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <div style={{ padding: '20px' }}>
               <ChatHistoryPage />
            </div>
          </div>
          <div style={{ flex: 1 }} onClick={() => setDrawerOpen(false)}></div>
        </div>
      )}
    </div>
  );
}

function ProjectDropdown() {
  const { chats, selectedChatId, selectChat, createChat, deleteChat, fullResults } = useProject();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const isCreatingRef = useRef(false);

  const currentChat = chats.find(c => c.id === selectedChatId);
  const hasGrowth = fullResults?.growth && Object.keys(fullResults.growth).length > 0;
  const hasSeo = fullResults?.seo && Object.keys(fullResults.seo).length > 0;
  
  // Determine display values
  const displayTitle = hasGrowth || hasSeo 
    ? (fullResults?.profile?.productName || fullResults?.profile?.brandName || currentChat?.productName || currentChat?.title || 'Untitled Project')
    : 'New Project';
    
  const displayCompany = hasGrowth || hasSeo
    ? (fullResults?.profile?.companyName || fullResults?.profile?.websiteUrl || currentChat?.companyName || currentChat?.websiteUrl || 'No company')
    : 'No company';
  
  const filtered = chats.filter(c => (c.productName || c.title || '').toLowerCase().includes(search.toLowerCase()) || (c.companyName || '').toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;
    setOpen(false);
    try {
      await createChat('New Project');
    } finally {
      isCreatingRef.current = false;
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project forever?')) return;
    await deleteChat(id);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} className="ghost-btn" style={{ background: '#151b27', border: '1px solid #303849', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {selectedChatId ? (
          <>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800 }}>{displayTitle}</div>
              <div style={{ fontSize: '12px', color: '#9aa7bd' }}>{displayCompany}</div>
            </div>
          </>
        ) : (
          <span style={{ color: '#9aa7bd' }}>No project selected</span>
        )}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, width: '340px', background: '#101622', border: '1px solid #293245', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 100, padding: '12px' }}>
          <input 
            type="text" 
            placeholder="Search projects..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ marginBottom: '12px' }} 
          />
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(c => (
              <div 
                key={c.id}
                style={{ padding: '8px 12px', borderRadius: '12px', background: c.id === selectedChatId ? '#1a2335' : 'transparent', border: '1px solid transparent', borderColor: c.id === selectedChatId ? '#3a4355' : 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div onClick={() => { selectChat(c.id); setOpen(false); }} style={{ flex: 1, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 'bold' }}>{c.productName || c.title}</span>
                    <div style={{ fontSize: '12px', color: '#9aa7bd', display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <span>Growth: <strong style={{ color: '#fff' }}>{c.growthScore || '-'}</strong></span>
                      <span>SEO: <strong style={{ color: '#fff' }}>{c.seoScore || '-'}</strong></span>
                      <span style={{ marginLeft: 'auto' }}>{new Date(c.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={(e) => handleDelete(e, c.id)} className="ghost-btn" style={{ padding: '6px', color: '#ff6b6b', marginLeft: '8px', flexShrink: 0 }} title="Delete project">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ color: '#9aa7bd', textAlign: 'center', padding: '20px' }}>No projects found</div>}
          </div>
          <button onClick={handleCreate} className="primary-btn full" style={{ marginTop: '12px' }}>+ Create New Analysis</button>
        </div>
      )}
      {open && <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 99 }} onClick={() => setOpen(false)}></div>}
    </div>
  );
}

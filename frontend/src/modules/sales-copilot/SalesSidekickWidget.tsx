import { useState, useEffect, useCallback } from 'react';
import {
  Brain, X, Sparkles, Send, FileText, Activity, Target, Zap, Loader2, MessageSquare, Bell,
} from 'lucide-react';
import { Badge, Loading } from '../../components/UI';
import { getCopilotNotifications } from '../../lib/api';

interface Props {
  chatId: string;
  onNavigate: (view: string) => void;
}

export function SalesSidekickWidget({ chatId, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chatId) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [chatId]);

  async function loadNotifications() {
    try {
      const n = await getCopilotNotifications(chatId);
      setNotifications(n);
    } catch { /* silent */ }
  }

  const actions = [
    { id: 'dashboard', label: 'Dashboard', icon: <Activity size={14} />, color: '#53a7ff' },
    { id: 'insights', label: 'Deal Insights', icon: <Brain size={14} />, color: '#a855f7' },
    { id: 'health', label: 'Customer Health', icon: <Target size={14} />, color: '#10e18b' },
    { id: 'timeline', label: 'Timeline', icon: <MessageSquare size={14} />, color: '#ffb347' },
    { id: 'proposals', label: 'Proposals', icon: <FileText size={14} />, color: '#53a7ff' },
    { id: 'alerts', label: 'Alerts', icon: <Zap size={14} />, color: '#ff4757' },
  ];

  const fabStyle: React.CSSProperties = {
    position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000,
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px',
  };

  const fabBtn: React.CSSProperties = {
    width: '48px', height: '48px', borderRadius: '50%', border: 'none',
    background: 'linear-gradient(135deg, #a855f7, #53a7ff)', color: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(168,85,247,0.3)', transition: 'transform 0.2s',
  };

  const panelStyle: React.CSSProperties = {
    width: '320px', maxHeight: '480px', overflowY: 'auto', borderRadius: '12px',
    background: '#0f1729', border: '1px solid #293245',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '12px',
  };

  if (!open) {
    const alertCount = notifications?.notifications?.length || 0;
    return (
      <div style={fabStyle}>
        {alertCount > 0 && (
          <div style={{
            background: '#ff4757', color: '#fff', borderRadius: '12px', padding: '4px 10px',
            fontSize: '11px', fontWeight: 700,
          }}>
            {alertCount} alert{alertCount !== 1 ? 's' : ''}
          </div>
        )}
        <button style={fabBtn} onClick={() => setOpen(true)} title="Sales Sidekick">
          <Sparkles size={22} />
        </button>
      </div>
    );
  }

  return (
    <div style={fabStyle}>
      <div style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Brain size={16} style={{ color: '#a855f7' }} />
            <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '14px' }}>AI Sales Sidekick</span>
          </div>
          <button onClick={() => setOpen(false)} style={{
            background: 'transparent', border: 'none', color: '#6b7a93', cursor: 'pointer', padding: '4px',
          }}>
            <X size={16} />
          </button>
        </div>

        {loading ? <Loading /> : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {actions.map(a => (
              <button key={a.id} onClick={() => { onNavigate(a.id); setOpen(false); }} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                borderRadius: '8px', border: '1px solid #293245', background: '#101622',
                color: '#e5e7eb', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                transition: 'background 0.15s', width: '100%', textAlign: 'left',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2336'}
                onMouseLeave={e => e.currentTarget.style.background = '#101622'}
              >
                <span style={{ color: a.color }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        )}

        {notifications?.notifications?.length > 0 && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #293245', paddingTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', color: '#6b7a93', fontSize: '11px', fontWeight: 600 }}>
              <Bell size={12} /> Recent Alerts
            </div>
            {notifications.notifications.slice(0, 3).map((n: any, i: number) => (
              <div key={i} style={{ padding: '6px 0', fontSize: '12px', color: '#9aa7bd', borderBottom: '1px solid #1d2738' }}>
                {n.message?.slice(0, 80)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

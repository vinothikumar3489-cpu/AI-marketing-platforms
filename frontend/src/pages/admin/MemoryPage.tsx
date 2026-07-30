import { useState, useEffect } from 'react';
import { Database, Layers, Building2, Package, Megaphone, MessageSquare, Zap, RefreshCw, Activity } from 'lucide-react';
import { getBrainMemory } from '../../lib/admin-api';

const MEMORY_SECTIONS = [
  { key: 'workspace', label: 'Workspace Memory', icon: Layers, color: '#3b82f6' },
  { key: 'company', label: 'Company Memory', icon: Building2, color: '#10b981' },
  { key: 'product', label: 'Product Memory', icon: Package, color: '#f59e0b' },
  { key: 'campaign', label: 'Campaign Memory', icon: Megaphone, color: '#ec4899' },
  { key: 'conversation', label: 'Conversation Memory', icon: MessageSquare, color: '#8b5cf6' },
];

export default function AdminMemoryPage() {
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrainMemory()
      .then(res => setMemory(res.memory))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading memory data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!memory) return <div className="empty">No memory data available</div>;

  const engine = memory.engine || {};
  const status = (engine.status || 'unknown').toLowerCase();
  const statusColor = status === 'healthy' || status === 'ok' ? '#10b981' : status === 'degraded' ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database size={32} color="#3b82f6" /> Memory
        </h1>
        <p>Memory engine status, cache performance, and data freshness</p>
      </div>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="admin-metric-card" style={{ borderTop: `3px solid ${statusColor}` }}>
          <div className="admin-metric-header"><Activity size={18} color={statusColor} /><span>Memory Engine</span></div>
          <div className="admin-metric-value">{engine.status || 'Unknown'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><Zap size={18} color="#10b981" /><span>Cache Hit Rate</span></div>
          <div className="admin-metric-value">{engine.cacheHitRate != null ? `${(engine.cacheHitRate * 100).toFixed(1)}%` : '—'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><RefreshCw size={18} color="#f59e0b" /><span>Freshness</span></div>
          <div className="admin-metric-value">{engine.freshness || engine.dataFreshness || '—'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <div className="admin-metric-header"><Database size={18} color="#8b5cf6" /><span>Memory Sections</span></div>
          <div className="admin-metric-value">{memory.sections?.length || 0}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px' }}>
        {(memory.sections || MEMORY_SECTIONS.map(s => s.key)).map((section: any) => {
          const config = MEMORY_SECTIONS.find(s => s.key === (typeof section === 'string' ? section : section.key)) ||
            { label: typeof section === 'string' ? section : section.key, icon: Layers, color: '#6366f1' };
          const Icon = config.icon;
          const sectionStatus = typeof section === 'object' ? section : engine[section] || {};
          const sectionHealthy = sectionStatus.status !== 'error';
          return (
            <div key={typeof section === 'string' ? section : section.key} className="admin-section-card" style={{ borderTop: `3px solid ${sectionHealthy ? config.color : '#ef4444'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Icon size={18} color={config.color} />
                <strong>{config.label}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
                <span>Status: <span style={{ color: sectionHealthy ? '#10b981' : '#ef4444' }}>{sectionHealthy ? 'OK' : 'Error'}</span></span>
                {sectionStatus.size != null && <span>Size: {sectionStatus.size}</span>}
                {sectionStatus.entries != null && <span>Entries: {sectionStatus.entries}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-section-card" style={{ marginTop: '18px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <Database size={18} color="#3b82f6" /> Engine Details
        </h3>
        {engine && Object.keys(engine).length > 0 ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(engine).filter(([k]) => k !== 'status').map(([key, val]) => (
              <div key={key} className="admin-list-row">
                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                <span style={{ color: '#94a0b8' }}>{val != null ? String(val) : '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: '20px' }}>No engine details available</div>
        )}
      </div>
    </div>
  );
}
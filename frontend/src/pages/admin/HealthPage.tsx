import { useState, useEffect } from 'react';
import { Activity, Cpu, Database, Server, Wifi, Shield, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { getBrainHealth, type BrainHealth } from '../../lib/admin-api';

const ENGINE_LABELS: Record<string, string> = {
  memory: 'Memory Engine',
  knowledge: 'Knowledge Engine',
  evidence: 'Evidence Engine',
  adapter: 'Adapter Engine',
  graph: 'Graph Engine',
  reasoning: 'Reasoning Engine',
  recommendations: 'Recommendations Engine',
  confidence: 'Confidence Engine',
  learning: 'Learning Engine',
  quality: 'Quality Engine',
  scheduler: 'Scheduler',
};

const ENGINE_ICONS: Record<string, any> = {
  memory: Database,
  knowledge: Cpu,
  evidence: Shield,
  adapter: Server,
  graph: Activity,
  reasoning: Cpu,
  recommendations: Shield,
  confidence: Shield,
  learning: Cpu,
  quality: Activity,
  scheduler: Server,
};

export default function AdminHealthPage() {
  const [health, setHealth] = useState<BrainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrainHealth()
      .then(res => setHealth(res.health))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading health data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!health) return <div className="empty">No health data available</div>;

  const overallStatus = (health.overall || 'unknown').toLowerCase();
  const overallColor = overallStatus === 'healthy' ? '#10b981' : overallStatus === 'degraded' ? '#f59e0b' : '#ef4444';
  const StatusIcon = overallStatus === 'healthy' ? CheckCircle2 : overallStatus === 'degraded' ? AlertTriangle : XCircle;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={32} color="#10b981" /> System Health
          </h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '999px', background: overallStatus === 'healthy' ? '#073723' : '#33280b', color: overallColor, fontSize: '13px', fontWeight: 700 }}>
            <StatusIcon size={14} />
            {health.overall || 'Unknown'}
          </span>
        </div>
        <p>Real-time health monitoring for all Brain engines and infrastructure</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="admin-section-card" style={{ borderTop: '3px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Database size={16} color="#10b981" />
            <strong>Database</strong>
          </div>
          <span className="badge" style={{ background: health.database === 'connected' ? '#063b2a' : '#3b1f1f', color: health.database === 'connected' ? '#10e18b' : '#ff4757' }}>
            {health.database}
          </span>
        </div>
        <div className="admin-section-card" style={{ borderTop: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Server size={16} color="#6366f1" />
            <strong>Redis</strong>
          </div>
          <span className="badge" style={{ background: health.redis === 'connected' ? '#063b2a' : '#3b1f1f', color: health.redis === 'connected' ? '#10e18b' : '#ff4757' }}>
            {health.redis}
          </span>
        </div>
        <div className="admin-section-card" style={{ borderTop: '3px solid #a855f7' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Wifi size={16} color="#a855f7" />
            <strong>LLM Providers</strong>
          </div>
          <span className="badge" style={{ background: '#2a1a3b', color: '#c084fc' }}>{health.llmProviders}</span>
        </div>
      </div>

      <div className="admin-section-card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <Cpu size={18} color="#3b82f6" /> Engine Status
        </h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          {health.engines && Object.entries(health.engines).map(([name, engine]) => {
            const es = (engine.status || 'unknown').toLowerCase();
            const ec = es === 'healthy' || es === 'ok' ? '#10b981' : es === 'degraded' ? '#f59e0b' : '#ef4444';
            const Icon = ENGINE_ICONS[name] || Cpu;
            return (
              <div key={name} className="admin-list-row" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={16} color={ec} />
                  <strong>{ENGINE_LABELS[name] || name}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {engine.brainIQ != null && (
                    <span style={{ fontSize: '12px', color: '#94a0b8' }}>IQ: {engine.brainIQ.toFixed(1)}</span>
                  )}
                  {engine.executions != null && (
                    <span style={{ fontSize: '12px', color: '#94a0b8' }}>Execs: {engine.executions}</span>
                  )}
                  <span style={{ color: ec, fontWeight: 600 }}>{engine.status || 'unknown'}</span>
                </div>
              </div>
            );
          })}
          {(!health.engines || Object.keys(health.engines).length === 0) && (
            <div className="empty" style={{ padding: '20px' }}>No engine data available</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>
        Last checked: {health.lastChecked ? new Date(health.lastChecked).toLocaleString() : '—'}
      </div>
    </div>
  );
}
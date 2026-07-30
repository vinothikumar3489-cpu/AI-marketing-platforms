import { useState, useEffect } from 'react';
import { Brain, Activity, GraduationCap, Share2, Bot, Database, Lightbulb, BarChart3, ListOrdered, AlertTriangle, Shield, Cpu, Zap, Layers, Target } from 'lucide-react';
import { getBrainDashboard, getBrainHealth, type BrainDashboard, type BrainHealth } from '../../lib/admin-api';

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<BrainDashboard | null>(null);
  const [health, setHealth] = useState<BrainHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getBrainDashboard(), getBrainHealth()])
      .then(([dRes, hRes]) => {
        setDashboard(dRes.dashboard);
        setHealth(hRes.health);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Brain Control Center...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!dashboard) return <div className="empty">No dashboard data available</div>;

  const healthStatus = (health?.overall || dashboard.overallHealth || 'unknown').toLowerCase();
  const statusColor = healthStatus === 'healthy' ? '#10b981' : healthStatus === 'degraded' ? '#f59e0b' : '#ef4444';

  const metrics = [
    { label: 'Brain IQ', value: dashboard.brainIQ?.toFixed(1), icon: Brain, color: '#a855f7', suffix: '' },
    { label: 'Learning Score', value: dashboard.learningScore?.toFixed(1), icon: GraduationCap, color: '#3b82f6', suffix: '%' },
    { label: 'Knowledge Coverage', value: dashboard.knowledgeCoverage?.toFixed(1), icon: Target, color: '#10b981', suffix: '%' },
    { label: 'Entities', value: dashboard.entityCount, icon: Layers, color: '#f59e0b', suffix: '' },
    { label: 'Relationships', value: dashboard.relationshipCount, icon: Share2, color: '#06b6d4', suffix: '' },
    { label: 'Recommendation Accuracy', value: dashboard.recommendationAccuracy?.toFixed(1), icon: Lightbulb, color: '#ec4899', suffix: '%' },
    { label: 'Avg Confidence', value: dashboard.averageConfidence?.toFixed(1), icon: Shield, color: '#8b5cf6', suffix: '%' },
    { label: 'Executions', value: dashboard.executionCount, icon: ListOrdered, color: '#14b8a6', suffix: '' },
    { label: 'Avg Processing Time', value: dashboard.averageProcessingTime?.toFixed(0), icon: Zap, color: '#f97316', suffix: 'ms' },
    { label: 'Active Agents', value: dashboard.activeAgents, icon: Bot, color: '#6366f1', suffix: '' },
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Brain size={32} color="#a855f7" /> Brain Control Center
          </h1>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '999px', background: healthStatus === 'healthy' ? '#073723' : '#33280b', color: healthStatus === 'healthy' ? '#10e18b' : '#ffc53d', fontSize: '13px', fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
            {health?.overall || dashboard.overallHealth || 'Unknown'}
          </span>
        </div>
        <p>Real-time monitoring, diagnostics, and management of the Brain engine</p>
      </div>

      <div className="admin-metric-grid">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="admin-metric-card" style={{ borderTop: `3px solid ${m.color}` }}>
              <div className="admin-metric-header">
                <Icon size={18} color={m.color} />
                <span>{m.label}</span>
              </div>
              <div className="admin-metric-value">{m.value ?? '—'}{m.suffix}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '24px' }}>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Cpu size={18} color="#3b82f6" /> Engine Health
          </h3>
          {health?.engines && Object.entries(health.engines).map(([name, engine]) => {
            const es = (engine.status || 'unknown').toLowerCase();
            const ec = es === 'healthy' || es === 'ok' ? '#10b981' : es === 'degraded' ? '#f59e0b' : '#ef4444';
            return (
              <div key={name} className="admin-list-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: ec }} />
                  <strong>{name}</strong>
                </div>
                <span style={{ color: ec }}>{engine.status || 'unknown'}</span>
              </div>
            );
          })}
          {(!health?.engines || Object.keys(health.engines).length === 0) && <div className="empty" style={{ padding: '20px' }}>No engine data</div>}
        </div>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Activity size={18} color="#10b981" /> System Status
          </h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div className="admin-list-row">
              <span>Database</span>
              <span className="badge" style={{ background: '#063b2a', color: '#10e18b' }}>{health?.database || 'ok'}</span>
            </div>
            <div className="admin-list-row">
              <span>Redis</span>
              <span className="badge" style={{ background: '#063b2a', color: '#10e18b' }}>{health?.redis || 'ok'}</span>
            </div>
            <div className="admin-list-row">
              <span>LLM Providers</span>
              <span className="badge" style={{ background: '#063b2a', color: '#10e18b' }}>{health?.llmProviders || 'ok'}</span>
            </div>
            <div className="admin-list-row">
              <span>Version</span>
              <span style={{ color: '#94a0b8' }}>{dashboard.version || '—'}</span>
            </div>
            <div className="admin-list-row">
              <span>Last Checked</span>
              <span style={{ color: '#94a0b8' }}>{health?.lastChecked ? new Date(health.lastChecked).toLocaleString() : '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

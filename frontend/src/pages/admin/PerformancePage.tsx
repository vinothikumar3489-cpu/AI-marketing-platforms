import { useState, useEffect } from 'react';
import { BarChart3, Cpu, Database, Activity, Clock, Server, Zap, TrendingUp } from 'lucide-react';
import { getBrainPerformance } from '../../lib/admin-api';

export default function AdminPerformancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrainPerformance()
      .then(res => setData(res.performance))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading performance data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No performance data available</div>;

  const engineMetrics = data.engineMetrics || {};
  const adoption = data.adoption || {};
  const avgTime = data.averageExecutionTime || 0;

  const chartData = Object.entries(engineMetrics).map(([name, metrics]: [string, any]) => ({
    name,
    avgTime: metrics.avgTime || metrics.averageTime || 0,
    count: metrics.count || metrics.executions || 0,
    color: getEngineColor(name),
  }));

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 size={32} color="#10b981" /> Performance
        </h1>
        <p>Performance metrics, engine timings, and resource utilization</p>
      </div>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-metric-header"><Clock size={18} color="#3b82f6" /><span>Avg Execution Time</span></div>
          <div className="admin-metric-value">{avgTime.toFixed(0)}ms</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><Activity size={18} color="#10b981" /><span>Engines Tracked</span></div>
          <div className="admin-metric-value">{chartData.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><Zap size={18} color="#f59e0b" /><span>Total Executions</span></div>
          <div className="admin-metric-value">{chartData.reduce((sum, d) => sum + d.count, 0)}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <div className="admin-metric-header"><TrendingUp size={18} color="#8b5cf6" /><span>Adoption Rate</span></div>
          <div className="admin-metric-value">{adoption.rate != null ? `${(adoption.rate * 100).toFixed(1)}%` : '—'}</div>
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <Cpu size={18} color="#3b82f6" /> Engine Execution Times
        </h3>
        {chartData.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {chartData.map(engine => {
              const maxTime = Math.max(...chartData.map(d => d.avgTime), 1);
              const widthPct = (engine.avgTime / maxTime) * 100;
              return (
                <div key={engine.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ textTransform: 'capitalize' }}>{engine.name}</span>
                    <span style={{ color: '#94a0b8' }}>{engine.avgTime.toFixed(0)}ms ({engine.count} execs)</span>
                  </div>
                  <div style={{ height: '8px', background: '#1d2738', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${widthPct}%`, height: '100%', background: engine.color || '#3b82f6', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty" style={{ padding: '20px' }}>No engine metrics available</div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '18px' }}>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Database size={18} color="#10b981" /> Database Metrics
          </h3>
          {adoption && Object.keys(adoption).length > 0 ? (
            <div style={{ display: 'grid', gap: '8px' }}>
              {Object.entries(adoption).map(([key, val]) => (
                <div key={key} className="admin-list-row">
                  <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                  <span style={{ color: '#94a0b8' }}>{val != null ? String(typeof val === 'number' ? (typeof val === 'number' && val < 1 ? `${(val * 100).toFixed(1)}%` : val) : val) : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: '20px' }}>No adoption data</div>
          )}
        </div>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Server size={18} color="#8b5cf6" /> Engine Details
          </h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            {chartData.map(engine => (
              <div key={engine.name} className="admin-list-row">
                <span style={{ textTransform: 'capitalize' }}>{engine.name}</span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#94a0b8' }}>{engine.avgTime.toFixed(0)}ms avg</span>
                  <span style={{ color: '#6b7280' }}>{engine.count} total</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getEngineColor(name: string): string {
  const colors: Record<string, string> = {
    memory: '#3b82f6',
    knowledge: '#10b981',
    evidence: '#f59e0b',
    adapter: '#ec4899',
    graph: '#8b5cf6',
    reasoning: '#06b6d4',
    recommendations: '#a855f7',
    confidence: '#10b981',
    learning: '#f97316',
    quality: '#6366f1',
  };
  return colors[name.toLowerCase()] || '#6366f1';
}
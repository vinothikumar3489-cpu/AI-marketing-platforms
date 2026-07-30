import { useState, useEffect } from 'react';
import { AlertTriangle, Cpu, Database, Activity, Server, Zap } from 'lucide-react';
import { getBrainDiagnostics, type DiagnosticsData } from '../../lib/admin-api';

export default function AdminDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrainDiagnostics()
      .then(res => setData(res.diagnostics))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading diagnostics...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No diagnostics data available</div>;

  const pipelineStatus = (data.pipeline || 'idle').toLowerCase();
  const pipelineColor = pipelineStatus === 'running' ? '#10b981' : pipelineStatus === 'error' ? '#ef4444' : '#6b7280';

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertTriangle size={32} color="#f59e0b" /> Diagnostics
        </h1>
        <p>Engine diagnostics, pipeline execution, and system health checks</p>
      </div>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="admin-metric-card" style={{ borderTop: `3px solid ${pipelineColor}` }}>
          <div className="admin-metric-header"><Activity size={18} color={pipelineColor} /><span>Pipeline</span></div>
          <div className="admin-metric-value">{data.pipeline || 'idle'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-metric-header"><Database size={18} color="#3b82f6" /><span>DB Latency</span></div>
          <div className="admin-metric-value">{data.databaseLatency != null ? `${data.databaseLatency.toFixed(0)}ms` : '—'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <div className="admin-metric-header"><Share2 size={18} color="#8b5cf6" /><span>Graph Latency</span></div>
          <div className="admin-metric-value">{data.graphLatency != null ? `${data.graphLatency.toFixed(0)}ms` : '—'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><Zap size={18} color="#f59e0b" /><span>Learning Latency</span></div>
          <div className="admin-metric-value">{data.learningLatency != null ? `${data.learningLatency.toFixed(0)}ms` : '—'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '24px' }}>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Cpu size={18} color="#3b82f6" /> Engine Timings
          </h3>
          {data.engineTimings && Object.keys(data.engineTimings).length > 0 ? (
            <div style={{ display: 'grid', gap: '6px' }}>
              {Object.entries(data.engineTimings).map(([name, timing]) => {
                const tc = timing.status === 'healthy' || timing.status === 'ok' ? '#10b981' : timing.status === 'degraded' ? '#f59e0b' : '#ef4444';
                return (
                  <div key={name} className="admin-list-row" style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: tc }} />
                      <strong style={{ fontSize: '13px', textTransform: 'capitalize' }}>{name}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {timing.latency != null && <span style={{ fontSize: '12px', color: '#94a0b8' }}>{timing.latency.toFixed(0)}ms</span>}
                      <span style={{ color: tc, fontSize: '12px', fontWeight: 600 }}>{timing.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty" style={{ padding: '20px' }}>No engine timing data</div>
          )}
        </div>

        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Server size={18} color="#10b981" /> Memory Usage
          </h3>
          {data.memoryUsage ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>RSS</span><span style={{ color: '#94a0b8' }}>{data.memoryUsage.rss} MB</span>
                </div>
                <div style={{ height: '6px', background: '#1d2738', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (data.memoryUsage.rss / 4096) * 100)}%`, height: '100%', background: '#3b82f6', borderRadius: '3px' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Heap Total</span><span style={{ color: '#94a0b8' }}>{data.memoryUsage.heapTotal} MB</span>
                </div>
                <div style={{ height: '6px', background: '#1d2738', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (data.memoryUsage.heapTotal / 4096) * 100)}%`, height: '100%', background: '#8b5cf6', borderRadius: '3px' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Heap Used</span><span style={{ color: '#94a0b8' }}>{data.memoryUsage.heapUsed} MB</span>
                </div>
                <div style={{ height: '6px', background: '#1d2738', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (data.memoryUsage.heapUsed / data.memoryUsage.heapTotal) * 100)}%`, height: '100%', background: '#f59e0b', borderRadius: '3px' }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="empty" style={{ padding: '20px' }}>No memory usage data</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '18px' }}>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <XCircle size={18} color="#ef4444" /> Errors ({data.errors?.length || 0})
          </h3>
          {data.errors && data.errors.length > 0 ? (
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'grid', gap: '6px' }}>
              {data.errors.map((err: any, i: number) => (
                <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,71,87,0.08)', borderRadius: '6px', fontSize: '12px', color: '#ff8a8a' }}>
                  {err.message || err.error || String(err)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#10b981', fontSize: '14px' }}>No errors</div>
          )}
        </div>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <AlertTriangle size={18} color="#f59e0b" /> Warnings ({data.warnings?.length || 0})
          </h3>
          {data.warnings && data.warnings.length > 0 ? (
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'grid', gap: '6px' }}>
              {data.warnings.map((warn: any, i: number) => (
                <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,179,71,0.08)', borderRadius: '6px', fontSize: '12px', color: '#ffc53d' }}>
                  {warn.message || warn.warning || String(warn)}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#10b981', fontSize: '14px' }}>No warnings</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Share2(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function XCircle(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
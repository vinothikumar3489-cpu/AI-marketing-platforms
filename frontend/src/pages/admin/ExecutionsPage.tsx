import { useState, useEffect } from 'react';
import { ListOrdered, CheckCircle2, XCircle, Clock, Activity } from 'lucide-react';
import { getBrainExecutions, type ExecutionRecord } from '../../lib/admin-api';

export default function AdminExecutionsPage() {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getBrainExecutions()
      .then(res => setExecutions(res.executions || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading executions...</div>;
  if (error) return <div className="error">{error}</div>;

  const filtered = executions.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.module || '').toLowerCase().includes(q) ||
        (e.company || '').toLowerCase().includes(q) ||
        (e.product || '').toLowerCase().includes(q) ||
        (e.id || '').toLowerCase().includes(q);
    }
    return true;
  });

  const statusCounts: Record<string, number> = {};
  executions.forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ListOrdered size={32} color="#14b8a6" /> Executions
        </h1>
        <p>Execution history and processing records across all modules</p>
      </div>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #14b8a6' }}>
          <div className="admin-metric-header"><ListOrdered size={18} color="#14b8a6" /><span>Total</span></div>
          <div className="admin-metric-value">{executions.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><CheckCircle2 size={18} color="#10b981" /><span>Completed</span></div>
          <div className="admin-metric-value">{statusCounts['completed'] || 0}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><Activity size={18} color="#f59e0b" /><span>Running</span></div>
          <div className="admin-metric-value">{statusCounts['running'] || statusCounts['in_progress'] || 0}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #ef4444' }}>
          <div className="admin-metric-header"><XCircle size={18} color="#ef4444" /><span>Failed</span></div>
          <div className="admin-metric-value">{statusCounts['failed'] || 0}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', margin: '20px 0' }}>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: '160px', height: '34px', fontSize: '13px', padding: '0 12px' }}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="in_progress">In Progress</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
        <input
          type="text"
          placeholder="Search executions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, height: '34px', fontSize: '13px' }}
        />
      </div>

      <div className="admin-section-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Execution ID</th>
                <th>Module</th>
                <th>Company</th>
                <th>Product</th>
                <th>Agents Used</th>
                <th>Processing Time</th>
                <th>Brain IQ</th>
                <th>Confidence</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const sc = e.status === 'completed' ? '#10b981' : e.status === 'running' || e.status === 'in_progress' ? '#3b82f6' : e.status === 'failed' ? '#ef4444' : '#6b7280';
                return (
                  <tr key={e.id || i}>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace', color: '#94a0b8' }}>{(e.id || '').slice(0, 12)}...</td>
                    <td><span className="badge">{e.module}</span></td>
                    <td>{e.company || '—'}</td>
                    <td>{e.product || '—'}</td>
                    <td>{Array.isArray(e.agentsUsed) ? e.agentsUsed.join(', ') : e.agentsUsed || '—'}</td>
                    <td>{e.processingTime ? `${e.processingTime.toFixed(0)}ms` : '—'}</td>
                    <td>{e.brainIQ ? e.brainIQ.toFixed(1) : '—'}</td>
                    <td>{e.confidence != null ? `${(e.confidence * 100).toFixed(0)}%` : '—'}</td>
                    <td><span style={{ color: sc, fontWeight: 600 }}>{e.status}</span></td>
                    <td style={{ fontSize: '12px', color: '#6b7280' }}>{e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>No executions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
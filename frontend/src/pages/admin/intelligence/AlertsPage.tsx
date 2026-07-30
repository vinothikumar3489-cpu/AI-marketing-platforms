import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, Clock, XCircle, Filter } from 'lucide-react';
import { getAlerts, acknowledgeAlert } from '../../../lib/intelligence-api';

export default function AlertsIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const fetchData = (priority?: string) => {
    setLoading(true);
    const params: any = {};
    if (priority && priority !== 'all') params.priority = priority;
    getAlerts(params)
      .then(res => setData(res))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleAcknowledge = async (id: string) => {
    setAcknowledging(id);
    try {
      await acknowledgeAlert(id);
      fetchData(filter !== 'all' ? filter : undefined);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAcknowledging(null);
    }
  };

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Alerts...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No alerts available</div>;

  const alerts = data.alerts || [];

  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#ff6b35',
    medium: '#ffb347',
    low: '#10b981',
  };

  const priorityBackgrounds: Record<string, string> = {
    critical: 'rgba(255,71,87,0.12)',
    high: 'rgba(255,107,53,0.12)',
    medium: 'rgba(255,179,71,0.12)',
    low: 'rgba(16,225,139,0.12)',
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Bell size={32} color="#ef4444" /> Intelligence Alerts
            </h1>
            {data.unacknowledged > 0 && (
              <span className="badge" style={{ background: '#3b1120', color: '#ff4757' }}>
                {data.unacknowledged} unacknowledged
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'critical', 'high', 'medium', 'low'].map(p => (
              <button
                key={p}
                onClick={() => { setFilter(p); fetchData(p !== 'all' ? p : undefined); }}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: '1px solid #1a2438',
                  background: filter === p ? '#1a2a44' : 'transparent',
                  color: filter === p ? '#eef4ff' : '#94a0b8',
                  cursor: 'pointer', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize'
                }}
              >{p}</button>
            ))}
          </div>
        </div>
        <p>Real-time alerts from all intelligence modules</p>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card" style={{ borderTop: '3px solid #ef4444' }}>
          <div className="admin-metric-header"><Bell size={18} color="#ef4444" /> Total</div>
          <div className="admin-metric-value">{data.total || alerts.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #ff6b35' }}>
          <div className="admin-metric-header"><AlertTriangle size={18} color="#ff6b35" /> Unacknowledged</div>
          <div className="admin-metric-value">{data.unacknowledged || 0}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><CheckCircle2 size={18} color="#10b981" /> Acknowledged</div>
          <div className="admin-metric-value">{(data.total || alerts.length) - (data.unacknowledged || 0)}</div>
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <Bell size={18} color="#ef4444" /> Alert List
        </h3>
        {alerts.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Priority</th>
                <th>Source</th>
                <th>Created</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a: any) => {
                const pc = priorityColors[a.priority?.toLowerCase()] || '#6b7280';
                const pb = priorityBackgrounds[a.priority?.toLowerCase()] || 'rgba(107,114,128,0.12)';
                return (
                  <tr key={a.id}>
                    <td style={{ color: '#e5e7eb', fontWeight: 500 }}>
                      <div>{a.title || 'Alert'}</div>
                      {a.description && <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>{a.description}</div>}
                    </td>
                    <td>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: pb, color: pc, textTransform: 'uppercase' }}>
                        {a.priority || 'unknown'}
                      </span>
                    </td>
                    <td style={{ color: '#94a0b8' }}>{a.source || '—'}</td>
                    <td style={{ color: '#94a0b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} color="#6b7280" />
                        {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td>
                      {a.acknowledged ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '12px' }}>
                          <CheckCircle2 size={14} /> Acknowledged
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffb347', fontSize: '12px' }}>
                          <XCircle size={14} /> Pending
                        </span>
                      )}
                    </td>
                    <td>
                      {!a.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(a.id)}
                          disabled={acknowledging === a.id}
                          style={{
                            padding: '4px 10px', borderRadius: '6px', border: '1px solid #293245',
                            background: 'transparent', color: '#53a7ff', cursor: 'pointer', fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {acknowledging === a.id ? '...' : 'Acknowledge'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty" style={{ padding: '20px' }}>
            <CheckCircle2 size={24} color="#10b981" />
            <p>No alerts match the current filter</p>
          </div>
        )}
      </div>
    </div>
  );
}

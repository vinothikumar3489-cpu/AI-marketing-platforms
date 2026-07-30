import { useState, useEffect } from 'react';
import { Lightbulb, TrendingUp, Target, Shield, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { getBrainRecommendations } from '../../lib/admin-api';

export default function AdminRecommendationsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrainRecommendations()
      .then(res => setData(res.recommendations))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading recommendations...</div>;
  if (error) return <div className="error">{error}</div>;

  const engine = data?.engine || {};
  const recs = data?.recommendations || data?.items || [];
  const status = (engine.status || 'unknown').toLowerCase();
  const statusColor = status === 'healthy' || status === 'ok' ? '#10b981' : status === 'degraded' ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Lightbulb size={32} color="#ec4899" /> Recommendations
        </h1>
        <p>Active recommendations from the Brain intelligence engine</p>
      </div>

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="admin-metric-card" style={{ borderTop: `3px solid ${statusColor}` }}>
          <div className="admin-metric-header"><Lightbulb size={18} color={statusColor} /><span>Engine Status</span></div>
          <div className="admin-metric-value">{engine.status || 'Unknown'}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><Target size={18} color="#10b981" /><span>Total Recommendations</span></div>
          <div className="admin-metric-value">{recs.length || engine.recommendationCount || 0}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><TrendingUp size={18} color="#f59e0b" /><span>Active</span></div>
          <div className="admin-metric-value">{engine.activeRecommendations || 0}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #8b5cf6' }}>
          <div className="admin-metric-header"><Shield size={18} color="#8b5cf6" /><span>Avg Confidence</span></div>
          <div className="admin-metric-value">{engine.averageConfidence != null ? `${(engine.averageConfidence * 100).toFixed(0)}%` : '—'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px', marginTop: '24px' }}>
        {Array.isArray(recs) && recs.map((rec: any, i: number) => {
          const recStatus = (rec.status || 'active').toLowerCase();
          const statusColors: Record<string, string> = { active: '#10b981', pending: '#f59e0b', completed: '#3b82f6', rejected: '#ef4444' };
          return (
            <div key={rec.id || i} className="admin-section-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <strong>{rec.title || rec.name || rec.recommendation || `Recommendation #${i + 1}`}</strong>
                  {rec.priority && (
                    <span className="badge" style={{ marginLeft: '8px', background: rec.priority === 'high' ? '#3b1f1f' : rec.priority === 'medium' ? '#33280b' : '#1a2335', color: rec.priority === 'high' ? '#ff4757' : rec.priority === 'medium' ? '#ffc53d' : '#94a0b8' }}>
                      {rec.priority}
                    </span>
                  )}
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: statusColors[recStatus] || '#6b7280', fontWeight: 600, fontSize: '13px' }}>
                  {recStatus === 'active' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {rec.status || 'Active'}
                </span>
              </div>
              {rec.description && <p style={{ fontSize: '13px', color: '#94a0b8', margin: '4px 0 8px' }}>{rec.description}</p>}
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                {rec.source && <span>Source: {rec.source}</span>}
                {rec.reason && <span>Reason: {rec.reason}</span>}
                {rec.confidence != null && <span>Confidence: <span style={{ color: rec.confidence > 0.7 ? '#10b981' : '#f59e0b' }}>{(rec.confidence * 100).toFixed(0)}%</span></span>}
                {rec.createdAt && <span>Created: {new Date(rec.createdAt).toLocaleDateString()}</span>}
              </div>
            </div>
          );
        })}
        {(!recs || recs.length === 0) && (
          <div className="empty" style={{ padding: '40px' }}>
            <Lightbulb size={40} style={{ color: '#6b7280' }} />
            <h3>No Active Recommendations</h3>
            <p>The Brain has not generated any recommendations yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Users, Target, Building2, TrendingUp, Star, DollarSign, Zap } from 'lucide-react';
import { getLeadOpportunities } from '../../../lib/intelligence-api';

export default function LeadIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLeadOpportunities()
      .then(res => setData(res.leadOpportunities))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Lead Intelligence...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No lead opportunities available</div>;

  const totalValue = data.reduce((sum: number, l: any) => sum + (l.estimatedValue || 0), 0);
  const highValue = data.filter((l: any) => (l.estimatedValue || 0) >= 50000).length;
  const highIntent = data.filter((l: any) => (l.intent || '').toLowerCase() === 'high').length;
  const avgScore = data.length > 0 ? Math.round(data.reduce((sum: number, l: any) => sum + (l.score || 0), 0) / data.length) : 0;

  const intentColors: Record<string, string> = {
    high: '#10b981',
    medium: '#ffb347',
    low: '#6b7280',
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={32} color="#06b6d4" /> Lead Intelligence
        </h1>
        <p>AI-discovered lead opportunities with intent scoring and recommendations</p>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card" style={{ borderTop: '3px solid #06b6d4' }}>
          <div className="admin-metric-header"><Users size={18} color="#06b6d4" /> Total Leads</div>
          <div className="admin-metric-value">{data.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><DollarSign size={18} color="#10b981" /> Total Value</div>
          <div className="admin-metric-value">${totalValue.toLocaleString()}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><Star size={18} color="#f59e0b" /> High Value</div>
          <div className="admin-metric-value">{highValue}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #a855f7' }}>
          <div className="admin-metric-header"><Target size={18} color="#a855f7" /> High Intent</div>
          <div className="admin-metric-value">{highIntent}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-metric-header"><TrendingUp size={18} color="#3b82f6" /> Avg Score</div>
          <div className="admin-metric-value">{avgScore}/100</div>
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <Target size={18} color="#06b6d4" /> Lead Opportunities
        </h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Industry</th>
              <th>Score</th>
              <th>Est. Value</th>
              <th>Intent</th>
              <th>Source</th>
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((l: any, i: number) => {
              const intentColor = intentColors[l.intent?.toLowerCase()] || '#6b7280';
              return (
                <tr key={i}>
                  <td style={{ color: '#e5e7eb', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={14} color="#6b7280" />
                      {l.company || l.name}
                    </div>
                  </td>
                  <td style={{ color: '#94a0b8' }}>{l.industry || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '40px', height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${l.score || 0}%`, height: '100%', background: (l.score || 0) >= 70 ? '#10b981' : (l.score || 0) >= 40 ? '#ffb347' : '#ef4444', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: (l.score || 0) >= 70 ? '#10b981' : (l.score || 0) >= 40 ? '#ffb347' : '#ef4444' }}>{l.score || 0}</span>
                    </div>
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>${(l.estimatedValue || 0).toLocaleString()}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: `${intentColor}18`, color: intentColor, textTransform: 'capitalize'
                    }}>{l.intent || 'unknown'}</span>
                  </td>
                  <td style={{ color: '#94a0b8' }}>{l.source || 'AI Discovery'}</td>
                  <td style={{ color: '#53a7ff', fontSize: '12px' }}>{l.recommendedAction || l.action || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="empty" style={{ marginTop: '20px' }}>
          <Users size={32} color="#6b7280" />
          <p>No lead opportunities available</p>
        </div>
      )}
    </div>
  );
}

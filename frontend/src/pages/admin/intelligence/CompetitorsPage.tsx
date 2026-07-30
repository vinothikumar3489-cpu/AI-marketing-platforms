import { useState, useEffect } from 'react';
import { Swords, DollarSign, Star, TrendingDown, Zap, ExternalLink, Building } from 'lucide-react';
import { getCompetitorData } from '../../../lib/intelligence-api';

export default function CompetitorIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCompetitorData()
      .then(res => setData(res.competitors))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Competitor Intelligence...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No competitor data available</div>;

  const newCompetitors = data.new || [];
  const pricingChanges = data.pricing || [];
  const featureChanges = data.features || [];
  const rankings = data.rankings || [];

  const metrics = [
    { label: 'New Competitors', value: newCompetitors.length, icon: Swords, color: '#ef4444' },
    { label: 'Pricing Changes', value: pricingChanges.length, icon: DollarSign, color: '#f59e0b' },
    { label: 'Feature Changes', value: featureChanges.length, icon: Zap, color: '#3b82f6' },
    { label: 'Ranking Movements', value: rankings.length, icon: TrendingDown, color: '#a855f7' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Swords size={32} color="#ef4444" /> Competitor Intelligence
        </h1>
        <p>Tracking competitor movements, pricing, features, and rankings</p>
      </div>

      <div className="admin-metric-grid">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="admin-metric-card" style={{ borderTop: `3px solid ${m.color}` }}>
              <div className="admin-metric-header"><Icon size={18} color={m.color} /> {m.label}</div>
              <div className="admin-metric-value">{m.value}</div>
            </div>
          );
        })}
      </div>

      {newCompetitors.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Swords size={18} color="#ef4444" /> New Competitors
          </h3>
          {newCompetitors.map((c: any, i: number) => (
            <div key={i} className="admin-list-row" style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building size={16} color="#6b7280" />
                <div>
                  <strong style={{ color: '#e5e7eb' }}>{c.name || c.company || c.domain}</strong>
                  {c.description && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{c.description}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {c.threatScore != null && (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: c.threatScore >= 70 ? 'rgba(255,71,87,0.12)' : c.threatScore >= 40 ? 'rgba(255,179,71,0.12)' : 'rgba(16,225,139,0.12)',
                    color: c.threatScore >= 70 ? '#ff4757' : c.threatScore >= 40 ? '#ffb347' : '#10e18b'
                  }}>Threat: {c.threatScore}/100</span>
                )}
                {c.website && (
                  <a href={c.website} target="_blank" rel="noreferrer" style={{ color: '#53a7ff' }}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pricingChanges.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <DollarSign size={18} color="#f59e0b" /> Pricing Changes
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Competitor</th>
                <th>Change</th>
                <th>Previous</th>
                <th>Current</th>
                <th>Impact</th>
              </tr>
            </thead>
            <tbody>
              {pricingChanges.map((p: any, i: number) => (
                <tr key={i}>
                  <td style={{ color: '#e5e7eb', fontWeight: 500 }}>{p.name || p.competitor}</td>
                  <td style={{ color: p.change === 'increase' ? '#ef4444' : p.change === 'decrease' ? '#10b981' : '#94a0b8' }}>
                    {p.change || p.type || '—'}
                  </td>
                  <td style={{ color: '#94a0b8' }}>{p.previous || p.oldPrice || '—'}</td>
                  <td style={{ color: '#e5e7eb' }}>{p.current || p.newPrice || '—'}</td>
                  <td>
                    {p.impact && (
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                        background: p.impact === 'high' ? 'rgba(255,71,87,0.12)' : 'rgba(255,179,71,0.12)',
                        color: p.impact === 'high' ? '#ff4757' : '#ffb347'
                      }}>{p.impact.toUpperCase()}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {featureChanges.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Zap size={18} color="#3b82f6" /> Feature Changes
          </h3>
          {featureChanges.map((f: any, i: number) => (
            <div key={i} className="admin-list-row" style={{ padding: '12px 0' }}>
              <div>
                <strong style={{ color: '#e5e7eb' }}>{f.name || f.competitor}</strong>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{f.feature || f.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {f.type && (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: f.type === 'new' ? 'rgba(16,225,139,0.12)' : 'rgba(255,179,71,0.12)',
                    color: f.type === 'new' ? '#10e18b' : '#ffb347'
                  }}>{f.type.toUpperCase()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {rankings.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <TrendingDown size={18} color="#a855f7" /> Rankings
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Competitor</th>
                <th>Category</th>
                <th>Previous</th>
                <th>Current</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r: any, i: number) => {
                const change = r.current != null && r.previous != null ? r.previous - r.current : 0;
                return (
                  <tr key={i}>
                    <td style={{ color: '#e5e7eb', fontWeight: 500 }}>{r.name || r.competitor}</td>
                    <td style={{ color: '#94a0b8' }}>{r.category || r.metric || 'Overall'}</td>
                    <td style={{ color: '#94a0b8' }}>{r.previous != null ? `#${r.previous}` : '—'}</td>
                    <td style={{ color: '#e5e7eb', fontWeight: 600 }}>{r.current != null ? `#${r.current}` : '—'}</td>
                    <td>
                      {change !== 0 && (
                        <span style={{ color: change > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {change > 0 ? `↑${change}` : `↓${Math.abs(change)}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {newCompetitors.length === 0 && pricingChanges.length === 0 && featureChanges.length === 0 && rankings.length === 0 && (
        <div className="empty" style={{ marginTop: '20px' }}>
          <Swords size={32} color="#6b7280" />
          <p>No competitor intelligence data available</p>
        </div>
      )}
    </div>
  );
}

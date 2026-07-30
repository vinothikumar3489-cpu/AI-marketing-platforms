import { useState, useEffect } from 'react';
import { Globe, TrendingUp, Users, Building2, Radio, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import { getMarketData } from '../../../lib/intelligence-api';

export default function MarketIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMarketData()
      .then(res => setData(res.market))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Market Intelligence...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No market data available</div>;

  const changes = data.changes || [];
  const competitors = data.emergingCompetitors || [];
  const shifts = data.industryShifts || [];

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Globe size={32} color="#06b6d4" /> Market Intelligence
        </h1>
        <p>Real-time market changes, emerging competitors, and industry shifts</p>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card" style={{ borderTop: '3px solid #06b6d4' }}>
          <div className="admin-metric-header"><Radio size={18} color="#06b6d4" /> Market Changes</div>
          <div className="admin-metric-value">{changes.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><Building2 size={18} color="#f59e0b" /> Emerging</div>
          <div className="admin-metric-value">{competitors.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #a855f7' }}>
          <div className="admin-metric-header"><TrendingUp size={18} color="#a855f7" /> Industry Shifts</div>
          <div className="admin-metric-value">{shifts.length}</div>
        </div>
      </div>

      {changes.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Radio size={18} color="#06b6d4" /> Market Changes
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Change</th>
                <th>Impact</th>
                <th>Timeframe</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c: any, i: number) => (
                <tr key={i}>
                  <td style={{ color: '#e5e7eb', fontWeight: 500 }}>{c.title || c.change || c.description}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: c.impact === 'high' ? 'rgba(16,225,139,0.12)' : c.impact === 'medium' ? 'rgba(255,179,71,0.12)' : 'rgba(107,114,128,0.12)',
                      color: c.impact === 'high' ? '#10e18b' : c.impact === 'medium' ? '#ffb347' : '#6b7280'
                    }}>{(c.impact || 'unknown').toUpperCase()}</span>
                  </td>
                  <td style={{ color: '#94a0b8' }}>{c.timeframe || c.timeline || '—'}</td>
                  <td style={{ color: '#94a0b8' }}>{c.source || 'AI Analysis'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {competitors.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Building2 size={18} color="#f59e0b" /> Emerging Competitors
          </h3>
          {competitors.map((c: any, i: number) => (
            <div key={i} className="admin-list-row" style={{ padding: '12px 0' }}>
              <div>
                <strong style={{ color: '#e5e7eb' }}>{c.name || c.company || 'Unknown'}</strong>
                {c.description && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{c.description}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {c.threatLevel && (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: c.threatLevel === 'high' ? 'rgba(255,71,87,0.12)' : 'rgba(255,179,71,0.12)',
                    color: c.threatLevel === 'high' ? '#ff4757' : '#ffb347'
                  }}>{c.threatLevel.toUpperCase()}</span>
                )}
                {c.funding && <span style={{ fontSize: '12px', color: '#10b981' }}>{c.funding}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {shifts.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <TrendingUp size={18} color="#a855f7" /> Industry Shifts
          </h3>
          {shifts.map((s: any, i: number) => (
            <div key={i} className="admin-list-row" style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {(s.direction === 'up' || s.direction === 'increasing') ? <ArrowUp size={14} color="#10b981" /> : <ArrowDown size={14} color="#ef4444" />}
                <div>
                  <strong style={{ color: '#e5e7eb' }}>{s.title || s.shift || s.name}</strong>
                  {s.description && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{s.description}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {s.impact && (
                  <span style={{ fontSize: '12px', color: s.impact === 'high' ? '#10e18b' : '#ffb347' }}>{s.impact} impact</span>
                )}
                {s.confidence != null && (
                  <span style={{ fontSize: '12px', color: s.confidence >= 70 ? '#10b981' : '#ffb347' }}>{s.confidence}% confidence</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {changes.length === 0 && competitors.length === 0 && shifts.length === 0 && (
        <div className="empty" style={{ marginTop: '20px' }}>
          <Globe size={32} color="#6b7280" />
          <p>No market intelligence data available. Run an intelligence cycle to gather data.</p>
        </div>
      )}
    </div>
  );
}

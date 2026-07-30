import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Target, PieChart, Lightbulb } from 'lucide-react';
import { getCampaignInsights } from '../../../lib/intelligence-api';

export default function CampaignIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCampaignInsights()
      .then(res => setData(res.campaign))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Campaign Intelligence...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No campaign data available</div>;

  const performance = data.performance || {};
  const recommendations = data.recommendations || [];
  const channels = Object.keys(performance);

  const totals = channels.reduce((acc: any, ch: string) => {
    const p = performance[ch];
    if (!p) return acc;
    acc.impressions += p.impressions || 0;
    acc.clicks += p.clicks || 0;
    acc.conversions += p.conversions || 0;
    acc.spend += p.spend || 0;
    acc.revenue += p.revenue || 0;
    return acc;
  }, { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });

  const overallCTR = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
  const overallCVR = totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : '0.00';
  const overallROAS = totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0.00';

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BarChart3 size={32} color="#f59e0b" /> Campaign Intelligence
        </h1>
        <p>Cross-channel campaign performance and optimization recommendations</p>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-metric-header"><BarChart3 size={18} color="#3b82f6" /> Impressions</div>
          <div className="admin-metric-value">{totals.impressions.toLocaleString()}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #06b6d4' }}>
          <div className="admin-metric-header"><Target size={18} color="#06b6d4" /> CTR</div>
          <div className="admin-metric-value">{overallCTR}%</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><TrendingUp size={18} color="#10b981" /> Conversions</div>
          <div className="admin-metric-value">{totals.conversions.toLocaleString()}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><DollarSign size={18} color="#f59e0b" /> Spend</div>
          <div className="admin-metric-value">${totals.spend.toLocaleString()}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #a855f7' }}>
          <div className="admin-metric-header"><PieChart size={18} color="#a855f7" /> Revenue</div>
          <div className="admin-metric-value">${totals.revenue.toLocaleString()}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><DollarSign size={18} color="#10b981" /> ROAS</div>
          <div className="admin-metric-value">{overallROAS}x</div>
        </div>
      </div>

      {channels.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <BarChart3 size={18} color="#3b82f6" /> Performance by Channel
          </h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>CPC</th>
                <th>Conv.</th>
                <th>CVR</th>
                <th>CPA</th>
                <th>Spend</th>
                <th>Revenue</th>
                <th>ROAS</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch: string) => {
                const p = performance[ch];
                if (!p) return null;
                const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(2) : '0.00';
                const cvr = p.clicks > 0 ? ((p.conversions / p.clicks) * 100).toFixed(2) : '0.00';
                const roas = p.spend > 0 ? (p.revenue / p.spend).toFixed(2) : '0.00';
                return (
                  <tr key={ch}>
                    <td style={{ color: '#e5e7eb', fontWeight: 600, textTransform: 'capitalize' }}>{ch}</td>
                    <td style={{ color: '#94a0b8' }}>{p.impressions?.toLocaleString() || '—'}</td>
                    <td style={{ color: '#94a0b8' }}>{p.clicks?.toLocaleString() || '—'}</td>
                    <td style={{ color: '#06b6d4' }}>{ctr}%</td>
                    <td style={{ color: '#94a0b8' }}>${p.cpc?.toFixed(2) || '—'}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{p.conversions || 0}</td>
                    <td style={{ color: '#10b981' }}>{cvr}%</td>
                    <td style={{ color: '#94a0b8' }}>${p.cpa?.toFixed(2) || '—'}</td>
                    <td style={{ color: '#f59e0b' }}>${p.spend?.toLocaleString() || '—'}</td>
                    <td style={{ color: '#10b981' }}>${p.revenue?.toLocaleString() || '—'}</td>
                    <td style={{ color: parseFloat(roas) >= 1 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{roas}x</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="admin-section-card" style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Lightbulb size={18} color="#f59e0b" /> Recommendations
          </h3>
          {recommendations.map((r: any, i: number) => (
            <div key={i} className="admin-list-row" style={{ padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Lightbulb size={16} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#e5e7eb' }}>{r.title || r.action || r.recommendation}</strong>
                  {r.description && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{r.description}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {r.impact && (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: r.impact === 'high' ? 'rgba(16,225,139,0.12)' : 'rgba(255,179,71,0.12)',
                    color: r.impact === 'high' ? '#10e18b' : '#ffb347'
                  }}>{r.impact.toUpperCase()} Impact</span>
                )}
                {r.channel && <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{r.channel}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {channels.length === 0 && recommendations.length === 0 && (
        <div className="empty" style={{ marginTop: '20px' }}>
          <BarChart3 size={32} color="#6b7280" />
          <p>No campaign data available</p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { TrendingUp, Search, Activity, Users, Radio, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { getTrendData } from '../../../lib/intelligence-api';

export default function TrendsIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTrendData()
      .then(res => setData(res.trends))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Trend Intelligence...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No trend data available</div>;

  const sections = [
    { key: 'industry', label: 'Industry Trends', icon: Activity, color: '#3b82f6', data: data.industry },
    { key: 'search', label: 'Search Trends', icon: Search, color: '#10b981', data: data.search },
    { key: 'competitor', label: 'Competitor Trends', icon: TrendingUp, color: '#ef4444', data: data.competitor },
    { key: 'audience', label: 'Audience Trends', icon: Users, color: '#a855f7', data: data.audience },
  ];

  const flattenItems = (section: any): any[] => {
    if (!section) return [];
    if (Array.isArray(section)) return section;
    if (typeof section === 'object') {
      return Object.entries(section).map(([k, v]) => ({
        name: k,
        value: v,
        ...(typeof v === 'object' ? v : {}),
      }));
    }
    return [];
  };

  const directionIcon = (dir?: string) => {
    if (dir === 'up' || dir === 'increasing' || dir === 'rising') return <ArrowUp size={14} color="#10b981" />;
    if (dir === 'down' || dir === 'decreasing' || dir === 'falling') return <ArrowDown size={14} color="#ef4444" />;
    return <Minus size={14} color="#6b7280" />;
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrendingUp size={32} color="#10b981" /> Trend Intelligence
        </h1>
        <p>Cross-domain trend analysis across industry, search, competitor, and audience</p>
      </div>

      <div className="admin-metric-grid">
        {sections.map(s => {
          const items = flattenItems(s.data);
          return (
            <div key={s.key} className="admin-metric-card" style={{ borderTop: `3px solid ${s.color}` }}>
              <div className="admin-metric-header"><s.icon size={18} color={s.color} /> {s.label}</div>
              <div className="admin-metric-value">{items.length}</div>
            </div>
          );
        })}
      </div>

      {sections.map(section => {
        const items = flattenItems(section.data);
        const Icon = section.icon;
        if (items.length === 0) return null;
        return (
          <div className="admin-section-card" style={{ marginTop: '20px' }} key={section.key}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
              <Icon size={18} color={section.color} /> {section.label}
            </h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Trend</th>
                  <th>Direction</th>
                  <th>Strength</th>
                  <th>Volume</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, i: number) => {
                  const name = item.name || item.title || item.trend || item.keyword || 'Unknown';
                  const direction = item.direction || item.trend;
                  const strength = item.strength ?? item.score ?? item.confidence ?? 50;
                  const volume = item.volume ?? item.value ?? item.count ?? item.searchVolume;
                  const change = item.change ?? item.growth ?? item.momentum;
                  const strengthColor = strength >= 70 ? '#10b981' : strength >= 40 ? '#ffb347' : '#6b7280';

                  return (
                    <tr key={i}>
                      <td style={{ color: '#e5e7eb', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {directionIcon(direction)}
                          {name}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                          color: direction === 'up' || direction === 'increasing' || direction === 'rising' ? '#10b981'
                            : direction === 'down' || direction === 'decreasing' || direction === 'falling' ? '#ef4444' : '#6b7280',
                          background: direction === 'up' || direction === 'increasing' || direction === 'rising' ? 'rgba(16,225,139,0.12)'
                            : direction === 'down' || direction === 'decreasing' || direction === 'falling' ? 'rgba(255,71,87,0.12)' : 'rgba(107,114,128,0.12)',
                          textTransform: 'capitalize'
                        }}>{direction || 'stable'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '50px', height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${strength}%`, height: '100%', background: strengthColor, borderRadius: '2px' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: strengthColor }}>{Math.round(strength)}%</span>
                        </div>
                      </td>
                      <td style={{ color: '#94a0b8' }}>{volume != null ? volume.toLocaleString?.() || volume : '—'}</td>
                      <td style={{ color: change > 0 ? '#10b981' : change < 0 ? '#ef4444' : '#6b7280', fontWeight: 600 }}>
                        {change != null ? `${change > 0 ? '+' : ''}${change}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      {sections.every(s => flattenItems(s.data).length === 0) && (
        <div className="empty" style={{ marginTop: '20px' }}>
          <TrendingUp size={32} color="#6b7280" />
          <p>No trend data available</p>
        </div>
      )}
    </div>
  );
}

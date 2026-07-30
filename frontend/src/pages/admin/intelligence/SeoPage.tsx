import { useState, useEffect } from 'react';
import { Search, FileText, Link2, BarChart3, Target } from 'lucide-react';
import { getSeoOpportunities } from '../../../lib/intelligence-api';

export default function SeoIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSeoOpportunities()
      .then(res => setData(res.seoOpportunities))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading SEO Intelligence...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No SEO opportunities available</div>;

  const totalScore = data.reduce((sum: number, o: any) => sum + (o.score || 0), 0);
  const avgScore = data.length > 0 ? Math.round(totalScore / data.length) : 0;
  const totalTraffic = data.reduce((sum: number, o: any) => sum + (o.estimatedTraffic || 0), 0);

  const typeColors: Record<string, string> = {
    keyword: '#3b82f6',
    content: '#10b981',
    technical: '#f59e0b',
    backlink: '#a855f7',
    local: '#06b6d4',
  };

  const typeIcons: Record<string, any> = {
    keyword: Search,
    content: FileText,
    technical: BarChart3,
    backlink: Link2,
    local: Target,
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Search size={32} color="#3b82f6" /> SEO Intelligence
        </h1>
        <p>SEO opportunities, keyword rankings, and search visibility insights</p>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-metric-header"><Target size={18} color="#3b82f6" /> Opportunities</div>
          <div className="admin-metric-value">{data.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><BarChart3 size={18} color="#10b981" /> Avg Score</div>
          <div className="admin-metric-value">{avgScore}/100</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><FileText size={18} color="#f59e0b" /> Est. Traffic</div>
          <div className="admin-metric-value">{totalTraffic.toLocaleString()}</div>
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <Search size={18} color="#3b82f6" /> SEO Opportunities
        </h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Score</th>
              <th>Est. Traffic</th>
              <th>Difficulty</th>
              <th>Keywords</th>
            </tr>
          </thead>
          <tbody>
            {data.map((o: any, i: number) => {
              const TypeIcon = typeIcons[o.type?.toLowerCase()] || Search;
              const typeColor = typeColors[o.type?.toLowerCase()] || '#6b7280';
              const difficulty = o.difficulty ?? 50;
              const diffColor = difficulty >= 70 ? '#ef4444' : difficulty >= 40 ? '#ffb347' : '#10b981';
              return (
                <tr key={i}>
                  <td style={{ color: '#e5e7eb', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TypeIcon size={14} color={typeColor} />
                      {o.title || o.keyword}
                    </div>
                    {o.description && <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>{o.description}</div>}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: `${typeColor}18`, color: typeColor, textTransform: 'capitalize'
                    }}>{o.type || 'keyword'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '50px', height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${o.score || 0}%`, height: '100%', background: (o.score || 0) >= 70 ? '#10b981' : (o.score || 0) >= 40 ? '#ffb347' : '#ef4444', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: (o.score || 0) >= 70 ? '#10b981' : (o.score || 0) >= 40 ? '#ffb347' : '#ef4444' }}>{o.score || 0}</span>
                    </div>
                  </td>
                  <td style={{ color: '#94a0b8' }}>{o.estimatedTraffic?.toLocaleString() || '—'}</td>
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: `${diffColor}18`, color: diffColor }}>
                      {difficulty >= 70 ? 'Hard' : difficulty >= 40 ? 'Moderate' : 'Easy'} ({difficulty})
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(o.keywords || []).slice(0, 3).map((kw: string, j: number) => (
                        <span key={j} style={{ padding: '1px 6px', background: '#1d2738', borderRadius: '4px', fontSize: '10px', color: '#94a0b8' }}>{kw}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="empty" style={{ marginTop: '20px' }}>
          <Search size={32} color="#6b7280" />
          <p>No SEO opportunities found</p>
        </div>
      )}
    </div>
  );
}

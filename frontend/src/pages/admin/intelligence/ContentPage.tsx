import { useState, useEffect } from 'react';
import { PenTool, Share2, Mail, Monitor, Video, Target, Users, TrendingUp } from 'lucide-react';
import { getContentOpportunities } from '../../../lib/intelligence-api';

export default function ContentIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getContentOpportunities()
      .then(res => setData(res.contentOpportunities))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Content Intelligence...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No content opportunities available</div>;

  const channelIcons: Record<string, any> = {
    blog: PenTool,
    social: Share2,
    email: Mail,
    video: Video,
    web: Monitor,
    display: Monitor,
  };

  const channelColors: Record<string, string> = {
    blog: '#3b82f6',
    social: '#a855f7',
    email: '#f59e0b',
    video: '#ef4444',
    web: '#10b981',
    display: '#06b6d4',
  };

  const totalImpact = data.reduce((sum: number, o: any) => sum + (o.estimatedImpact || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <PenTool size={32} color="#a855f7" /> Content Intelligence
        </h1>
        <p>Content opportunities across all channels with audience insights</p>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card" style={{ borderTop: '3px solid #a855f7' }}>
          <div className="admin-metric-header"><PenTool size={18} color="#a855f7" /> Opportunities</div>
          <div className="admin-metric-value">{data.length}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><TrendingUp size={18} color="#10b981" /> Total Impact</div>
          <div className="admin-metric-value">{totalImpact.toLocaleString()}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-metric-header"><Users size={18} color="#3b82f6" /> Channels</div>
          <div className="admin-metric-value">{new Set(data.map((o: any) => o.channel)).size}</div>
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <PenTool size={18} color="#a855f7" /> Content Opportunities
        </h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Channel</th>
              <th>Score</th>
              <th>Audience</th>
              <th>Est. Impact</th>
            </tr>
          </thead>
          <tbody>
            {data.map((o: any, i: number) => {
              const Icon = channelIcons[o.channel?.toLowerCase()] || PenTool;
              const color = channelColors[o.channel?.toLowerCase()] || '#6b7280';
              return (
                <tr key={i}>
                  <td style={{ color: '#e5e7eb', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={14} color={color} />
                      {o.title || o.topic}
                    </div>
                    {o.description && <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>{o.description}</div>}
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                      background: `${color}18`, color, textTransform: 'capitalize'
                    }}>{o.type || 'article'}</span>
                  </td>
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: `${color}18`, color, textTransform: 'capitalize' }}>
                      {o.channel || 'web'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '50px', height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${o.score || 0}%`, height: '100%', background: (o.score || 0) >= 70 ? '#10b981' : (o.score || 0) >= 40 ? '#ffb347' : '#ef4444', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: (o.score || 0) >= 70 ? '#10b981' : (o.score || 0) >= 40 ? '#ffb347' : '#ef4444' }}>{o.score || 0}</span>
                    </div>
                  </td>
                  <td style={{ color: '#94a0b8' }}>{o.audience || o.targetAudience || '—'}</td>
                  <td style={{ color: o.estimatedImpact >= 70 ? '#10b981' : o.estimatedImpact >= 40 ? '#ffb347' : '#6b7280', fontWeight: 600 }}>
                    {o.estimatedImpact != null ? `${o.estimatedImpact}/100` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="empty" style={{ marginTop: '20px' }}>
          <PenTool size={32} color="#6b7280" />
          <p>No content opportunities available</p>
        </div>
      )}
    </div>
  );
}

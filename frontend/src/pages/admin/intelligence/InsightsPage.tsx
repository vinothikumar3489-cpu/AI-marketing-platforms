import { useState, useEffect } from 'react';
import { Lightbulb, Star, TrendingUp, Target, Zap, Clock, Shield } from 'lucide-react';
import { getInsightsData } from '../../../lib/intelligence-api';

export default function InsightsIntelligencePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getInsightsData()
      .then(res => setData(res))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading Insights...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No insights available</div>;

  const insights = data.insights || [];
  const total = data.total || insights.length;

  const categoryColors: Record<string, string> = {
    market: '#06b6d4',
    competitor: '#ef4444',
    seo: '#3b82f6',
    content: '#a855f7',
    campaign: '#f59e0b',
    lead: '#10b981',
    trend: '#8b5cf6',
    audience: '#ec4899',
    product: '#6366f1',
    growth: '#ff6b35',
  };

  const categoryIcons: Record<string, any> = {
    market: TrendingUp,
    competitor: Zap,
    seo: Target,
    content: Star,
    campaign: TrendingUp,
    lead: Target,
    trend: TrendingUp,
    audience: Star,
    product: Zap,
    growth: TrendingUp,
  };

  const impactColors: Record<string, string> = {
    high: '#10b981',
    medium: '#ffb347',
    low: '#6b7280',
  };

  const highImpact = insights.filter((i: any) => (i.impact || '').toLowerCase() === 'high').length;
  const highConfidence = insights.filter((i: any) => (i.confidence || 0) >= 80).length;

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Lightbulb size={32} color="#f59e0b" /> Intelligence Insights
        </h1>
        <p>AI-generated strategic insights with impact and confidence scoring</p>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="admin-metric-header"><Lightbulb size={18} color="#f59e0b" /> Total Insights</div>
          <div className="admin-metric-value">{total}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #10b981' }}>
          <div className="admin-metric-header"><Star size={18} color="#10b981" /> High Impact</div>
          <div className="admin-metric-value">{highImpact}</div>
        </div>
        <div className="admin-metric-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="admin-metric-header"><Shield size={18} color="#3b82f6" /> High Confidence</div>
          <div className="admin-metric-value">{highConfidence}</div>
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <Lightbulb size={18} color="#f59e0b" /> All Insights
        </h3>
        {insights.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {insights.map((insight: any) => {
              const cat = (insight.category || '').toLowerCase();
              const catColor = categoryColors[cat] || '#6b7280';
              const CatIcon = categoryIcons[cat] || Lightbulb;
              const impactColor = impactColors[(insight.impact || '').toLowerCase()] || '#6b7280';
              const isExpanded = expanded === insight.id;

              return (
                <div
                  key={insight.id}
                  style={{
                    background: '#151d2b', borderRadius: '10px', border: '1px solid #293245',
                    borderLeft: `4px solid ${catColor}`, overflow: 'hidden', cursor: 'pointer'
                  }}
                  onClick={() => setExpanded(isExpanded ? null : insight.id)}
                >
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <CatIcon size={14} color={catColor} />
                          <h4 style={{ margin: 0, fontSize: '14px', color: '#e5e7eb', fontWeight: 600 }}>{insight.title || 'Insight'}</h4>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                            background: `${catColor}18`, color: catColor, textTransform: 'capitalize'
                          }}>{insight.category || 'general'}</span>
                        </div>
                        <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#9aa7bd', lineHeight: 1.5 }}>
                          {insight.summary || insight.description}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        {insight.impact && (
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                            background: `${impactColor}18`, color: impactColor
                          }}>{insight.impact} Impact</span>
                        )}
                        {insight.confidence != null && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: insight.confidence >= 70 ? 'rgba(16,225,139,0.1)' : 'rgba(255,179,71,0.1)', color: insight.confidence >= 70 ? '#10e18b' : '#ffb347' }}>
                            <Shield size={10} />{Math.round(insight.confidence)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1d2738' }}>
                        {insight.recommendedAction && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 12px', background: 'rgba(42,163,255,0.06)', borderRadius: '8px', borderLeft: '3px solid #53a7ff', marginBottom: '8px' }}>
                            <Target size={14} color="#53a7ff" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '11px', color: '#53a7ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Recommended Action</div>
                              <div style={{ fontSize: '13px', color: '#d1d5db' }}>{insight.recommendedAction}</div>
                            </div>
                          </div>
                        )}
                        {insight.createdAt && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
                            <Clock size={12} />
                            Generated: {new Date(insight.createdAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty" style={{ padding: '20px' }}>
            <Lightbulb size={24} color="#6b7280" />
            <p>No insights available</p>
          </div>
        )}
      </div>
    </div>
  );
}

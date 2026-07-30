import { useState, useEffect } from 'react';
import { GraduationCap, Brain, Target, TrendingUp, Zap, BarChart3, Lightbulb, Activity, Shield } from 'lucide-react';
import { getBrainLearning, type LearningData } from '../../lib/admin-api';

export default function AdminLearningPage() {
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBrainLearning()
      .then(res => setData(res.learning))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="inline-loader"><span className="spin">&#9696;</span> Loading learning data...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return <div className="empty">No learning data available</div>;

  const score = data.score || {};
  const summary = data.summary || {};
  const trends = data.trends || {};
  const rulePerf = data.rulePerformance || {};

  const metrics = [
    { label: 'Learning Score', value: summary.learningScore ?? score.learningScore, icon: GraduationCap, color: '#3b82f6', suffix: '%' },
    { label: 'Brain IQ', value: summary.brainIQ ?? score.brainIQ, icon: Brain, color: '#a855f7', suffix: '' },
    { label: 'Knowledge Growth', value: summary.knowledgeGrowth ?? trends.knowledgeGrowth, icon: TrendingUp, color: '#10b981', suffix: '%' },
    { label: 'Pattern Discovery', value: trends.patternsFound || trends.patternDiscoveryCount, icon: Zap, color: '#f59e0b', suffix: '' },
    { label: 'Recommendation Accuracy', value: summary.recommendationUsefulness ?? score.recommendationUsefulness, icon: Lightbulb, color: '#ec4899', suffix: '%' },
    { label: 'Avg Confidence', value: summary.avgConfidence ?? score.avgConfidence, icon: Shield, color: '#8b5cf6', suffix: '%' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GraduationCap size={32} color="#3b82f6" /> Learning Intelligence
        </h1>
        <p>Brain learning metrics, knowledge evolution, and trend analysis</p>
      </div>

      <div className="admin-metric-grid">
        {metrics.map(m => {
          const Icon = m.icon;
          const val = m.value;
          return (
            <div key={m.label} className="admin-metric-card" style={{ borderTop: `3px solid ${m.color}` }}>
              <div className="admin-metric-header">
                <Icon size={18} color={m.color} />
                <span>{m.label}</span>
              </div>
              <div className="admin-metric-value">{val != null ? `${typeof val === 'number' ? val.toFixed(1) : val}${m.suffix}` : '—'}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginTop: '24px' }}>
        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <BarChart3 size={18} color="#10b981" /> Knowledge Evolution
          </h3>
          {summary && Object.entries(summary).filter(([k]) => !k.includes('IQ') && !k.includes('score') && !k.includes('confidence')).map(([key, val]) => (
            <div key={key} className="admin-list-row">
              <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
              <span style={{ color: '#94a0b8' }}>{String(val ?? '—')}</span>
            </div>
          ))}
          {(!summary || Object.keys(summary).length === 0) && <div className="empty" style={{ padding: '20px' }}>No evolution data</div>}
        </div>

        <div className="admin-section-card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
            <Activity size={18} color="#a855f7" /> Trend Analysis
          </h3>
          {trends && Object.entries(trends).slice(0, 10).map(([key, val]) => (
            <div key={key} className="admin-list-row">
              <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
              <span style={{ color: '#94a0b8' }}>{String(val ?? '—')}</span>
            </div>
          ))}
          {(!trends || Object.keys(trends).length === 0) && <div className="empty" style={{ padding: '20px' }}>No trend data</div>}
        </div>
      </div>

      <div className="admin-section-card" style={{ marginTop: '18px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <Target size={18} color="#f59e0b" /> Rule Performance
        </h3>
        {rulePerf && Object.keys(rulePerf).length > 0 ? (
          <div style={{ display: 'grid', gap: '8px' }}>
            {Object.entries(rulePerf).map(([key, val]) => (
              <div key={key} className="admin-list-row">
                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                <span style={{ color: '#94a0b8' }}>{String(val ?? '—')}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: '20px' }}>No rule performance data</div>
        )}
      </div>
    </div>
  );
}
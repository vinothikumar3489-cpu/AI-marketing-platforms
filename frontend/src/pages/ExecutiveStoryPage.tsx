import React from 'react';
import { useProject } from '../context/ProjectContext';
import { Card, SectionTitle, InsightCard, Loading, EmptyState } from '../components/UI';
import { TrendingUp, Users, Target, Search, Activity, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { downloadReport } from '../lib/api';
import { renderSafeValue } from '../lib/normalizers';

export default function ExecutiveStoryPage() {
  const { fullResults, loading, selectedChatId } = useProject();

  if (loading) return <Loading text="Generating Executive Story..." />;
  if (!fullResults || !fullResults.market) return <EmptyState title="Run Growth Workspace first" message="We need intelligence data to compile the executive story." />;

  const { product, market, audience, competitor, intent, positioning, campaign, channel } = fullResults;

  // Derive top insights for the executive summary
  const topTrend = market?.marketTrends?.[0]?.value || 'Market expanding rapidly';
  const topRisk = market?.risks?.[0]?.value || 'Growing competition';
  const bestChannel = channel?.recommendedChannels?.[0]?.channel || 'LinkedIn';
  const expectedRoi = channel?.recommendedChannels?.[0]?.expectedRoi || 150;

  return (
    <div className="page-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(83, 167, 255, 0.2)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '32px', background: 'linear-gradient(90deg, #fff, #53a7ff)', WebkitBackgroundClip: 'text', color: 'transparent', margin: 0 }}>
            Executive Story & Strategy
          </h1>
          <p className="subtitle" style={{ fontSize: '18px', color: '#9aa7bd', marginTop: '8px' }}>
            A McKinsey-style comprehensive strategy document for {product?.productName || 'your business'}.
          </p>
        </div>
        <div className="dropdown" style={{ position: 'relative', marginTop: '4px' }}>
          <button className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
            <TrendingUp size={14} /> Download Report ▾
          </button>
          <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', background: '#101622', border: '1px solid #293245', borderRadius: '8px', padding: '4px', zIndex: 100, display: 'none', minWidth: '160px' }}>
            {['pdf', 'docx', 'pptx', 'json', 'csv', 'markdown'].map(f => (
              <button key={f} onClick={() => { const id = selectedChatId || fullResults?.chat?.id; if (id) downloadReport(id, 'executive', f); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#9aa7bd', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' }} onMouseEnter={e => (e.target as HTMLElement).style.background = '#1a2335'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>{f.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '30px', marginTop: '20px' }}>
        {/* 1. Executive Summary */}
        <Card style={{ background: 'linear-gradient(135deg, rgba(83,167,255,0.05) 0%, rgba(168,85,247,0.05) 100%)', border: '1px solid rgba(168,85,247,0.3)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', marginBottom: '20px' }}>
            <Briefcase color="#a855f7" /> Executive Summary
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '15px', background: '#101622', borderRadius: '8px', borderLeft: '3px solid #10e18b' }}>
              <h4 style={{ color: '#9aa7bd', margin: '0 0 5px 0' }}>TAM</h4>
              <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>{renderSafeValue(market?.tam) || '$X B'}</div>
            </div>
            <div style={{ padding: '15px', background: '#101622', borderRadius: '8px', borderLeft: '3px solid #ffb347' }}>
              <h4 style={{ color: '#9aa7bd', margin: '0 0 5px 0' }}>Top Trend</h4>
              <div style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>{topTrend}</div>
            </div>
            <div style={{ padding: '15px', background: '#101622', borderRadius: '8px', borderLeft: '3px solid #ff6b6b' }}>
              <h4 style={{ color: '#9aa7bd', margin: '0 0 5px 0' }}>Primary Risk</h4>
              <div style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>{topRisk}</div>
            </div>
            <div style={{ padding: '15px', background: '#101622', borderRadius: '8px', borderLeft: '3px solid #53a7ff' }}>
              <h4 style={{ color: '#9aa7bd', margin: '0 0 5px 0' }}>Expected ROI</h4>
              <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>{renderSafeValue(expectedRoi)}%</div>
            </div>
          </div>
          <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#53a7ff' }}>Core Value Proposition</h4>
            <p style={{ fontStyle: 'italic', color: '#fff', fontSize: '18px', lineHeight: '1.5', margin: 0 }}>
              "{renderSafeValue(positioning?.positioningStatement || positioning?.statement) || 'A premium solution built for scale.'}"
            </p>
          </div>
        </Card>

        {/* 2. Market Dynamics */}
        <Card>
          <SectionTitle title="Market Dynamics" subtitle="Growth drivers and unexploited opportunities." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {(market?.opportunities || market?.growthOpportunities || []).slice(0, 4).map((opp: any, idx: number) => (
              <InsightCard key={idx} insight={{ value: typeof opp === 'object' ? opp.value : opp, impact: typeof opp === 'object' ? opp.impact : 'High', confidence: typeof opp === 'object' ? opp.confidence : 80 }} icon={TrendingUp} />
            ))}
          </div>
        </Card>

        {/* 3. Audience & Intent */}
        <Card>
          <SectionTitle title="Audience & Buying Intent" subtitle="Who is buying and why." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            {(audience?.buyingTriggers || []).slice(0, 3).map((trigger: any, idx: number) => (
              <div key={idx} style={{ padding: '15px', background: '#151d2b', borderRadius: '8px', borderLeft: '3px solid #ffb347' }}>
                <h4 style={{ color: '#ffb347', margin: '0 0 5px 0' }}>Buying Trigger</h4>
                <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>{typeof trigger === 'object' ? renderSafeValue(trigger.value) : renderSafeValue(trigger)}</p>
              </div>
            ))}
            {(intent?.hotSegments || []).slice(0, 2).map((seg: any, idx: number) => (
              <div key={idx} style={{ padding: '15px', background: '#151d2b', borderRadius: '8px', borderLeft: '3px solid #ff6b6b' }}>
                <h4 style={{ color: '#ff6b6b', margin: '0 0 5px 0' }}>Hot Segment</h4>
                <p style={{ color: '#fff', margin: 0, fontSize: '14px' }}>{typeof seg === 'object' ? renderSafeValue(seg.value) : renderSafeValue(seg)}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* 4. Strategic Action Plan */}
        {campaign?.actionPlan && (
          <Card>
            <SectionTitle title="Strategic Roadmap" subtitle="Execution plan derived from intelligence." />
            <div style={{ display: 'grid', gap: '15px' }}>
              {(campaign.actionPlan.thirtyDay || []).map((task: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '15px', padding: '15px', background: '#151d2b', borderRadius: '8px', borderLeft: '4px solid #53a7ff' }}>
                  <div style={{ width: '100%' }}>
                    <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>{renderSafeValue(task.title || task.task)}</h4>
                    <p style={{ color: '#9aa7bd', fontSize: '13px', margin: '0 0 10px 0' }}>{renderSafeValue(task.description || task.expectedGain || task.businessImpact)}</p>
                    
                    {(task.problem || task.evidence) && (
                      <details style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid #293245' }}>
                        <summary style={{ cursor: 'pointer', color: '#53a7ff', fontSize: '13px', fontWeight: 'bold' }}>View Strategic Reasoning</summary>
                        <div style={{ marginTop: '10px', fontSize: '13px', color: '#9aa7bd', display: 'grid', gap: '8px' }}>
                          {task.problem && <div><strong style={{ color: '#ff6b6b' }}>Problem:</strong> {renderSafeValue(task.problem)}</div>}
                          {task.evidence && <div><strong style={{ color: '#ffb347' }}>Evidence:</strong> {renderSafeValue(task.evidence)}</div>}
                          {task.businessImpact && <div><strong style={{ color: '#53a7ff' }}>Impact:</strong> {renderSafeValue(task.businessImpact)}</div>}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Card, Badge } from './UI';
import { ChevronDown, ChevronUp, Link as LinkIcon, AlertCircle, Info, Target, Users, Zap, TrendingUp, BarChart2 } from 'lucide-react';

export interface Insight {
  value: string;
  confidence?: number;
  evidence?: string;
  source?: string;
  impact?: 'High' | 'Medium' | 'Low';
  title?: string;
  recommendedAction?: string;
}

export function InsightCard({ insight, icon: Icon = Info }: { insight: Insight | string, icon?: any }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!insight) return null;
  
  // Handle legacy string data gracefully
  if (typeof insight === 'string') {
    return (
      <Card className="insight-card">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Icon size={18} style={{ color: '#53a7ff', marginTop: '2px' }} />
          <p style={{ margin: 0, lineHeight: '1.5' }}>{insight}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="insight-card" style={{ borderLeft: insight.impact === 'High' ? '4px solid #10e18b' : insight.impact === 'Medium' ? '4px solid #2aa3ff' : '1px solid #293245' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Icon size={18} style={{ color: '#a855f7' }} />
          {insight.title && <h4 style={{ margin: 0 }}>{insight.title}</h4>}
          {!insight.title && <span style={{ fontWeight: 'bold' }}>Insight</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {insight.confidence && (
            <Badge tone={insight.confidence > 80 ? 'green' : insight.confidence > 50 ? 'blue' : 'yellow'}>
              {insight.confidence}% Confidence
            </Badge>
          )}
          {insight.impact && (
            <Badge tone={insight.impact === 'High' ? 'pink' : 'dark'}>{insight.impact} Impact</Badge>
          )}
        </div>
      </div>
      
      <p style={{ margin: '0 0 10px 0', lineHeight: '1.5', fontSize: '15px' }}>{insight.value}</p>
      
      {insight.recommendedAction && (
        <div style={{ background: '#151d2b', padding: '10px', borderRadius: '8px', marginBottom: '10px', display: 'flex', gap: '8px' }}>
          <Target size={16} style={{ color: '#ffb347' }} />
          <span style={{ fontSize: '13px', color: '#9aa7bd' }}><b>Action:</b> {insight.recommendedAction}</span>
        </div>
      )}

      {(insight.evidence || insight.source) && (
        <div>
          <button 
            onClick={() => setExpanded(!expanded)} 
            style={{ background: 'transparent', border: 'none', color: '#53a7ff', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: 0, fontSize: '13px' }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 
            {expanded ? 'Hide Evidence' : 'View Evidence & Source'}
          </button>
          
          {expanded && (
            <div style={{ marginTop: '10px', padding: '12px', background: '#0b1220', borderRadius: '8px', border: '1px solid #1d2738', fontSize: '13px' }}>
              {insight.evidence && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: insight.source ? '8px' : 0 }}>
                  <AlertCircle size={14} style={{ color: '#ff4757', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: '#9aa7bd', fontStyle: 'italic' }}>"{insight.evidence}"</span>
                </div>
              )}
              {insight.source && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: insight.evidence ? '8px' : 0 }}>
                  <LinkIcon size={14} style={{ color: '#2aa3ff' }} />
                  <a href={insight.source} target="_blank" rel="noreferrer" style={{ color: '#2aa3ff', textDecoration: 'none' }}>{insight.source}</a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function PersonaCard({ persona }: { persona: any }) {
  if (!persona) return null;
  return (
    <Card className="persona-card" style={{ borderTop: '4px solid #a855f7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} style={{ color: '#a855f7' }} />
          {persona.name || persona.persona || 'Unknown Persona'}
        </h3>
        {persona.intentScore && <Badge tone="pink">Intent: {persona.intentScore}%</Badge>}
      </div>
      
      <p style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '15px' }}>{persona.description || persona.demographics}</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <strong style={{ fontSize: '12px', color: '#10e18b', textTransform: 'uppercase', letterSpacing: '1px' }}>Goals</strong>
          <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px' }}>
            {(persona.goals || []).map((g: string, i: number) => <li key={i}>{g}</li>)}
          </ul>
        </div>
        <div>
          <strong style={{ fontSize: '12px', color: '#ff4757', textTransform: 'uppercase', letterSpacing: '1px' }}>Frustrations</strong>
          <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px' }}>
            {(persona.painPoints || persona.frustrations || []).map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      </div>
      
      <div style={{ background: '#151d2b', padding: '12px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <Zap size={14} style={{ color: '#ffb347' }} />
          <span style={{ fontSize: '13px' }}><b>Buying Trigger:</b> {persona.buyingTrigger || persona.buyingTriggers?.[0] || 'Unknown'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <AlertCircle size={14} style={{ color: '#53a7ff' }} />
          <span style={{ fontSize: '13px' }}><b>Objection:</b> {persona.objection || persona.objections?.[0] || 'Unknown'}</span>
        </div>
      </div>
    </Card>
  );
}

export function CompetitorCard({ competitor }: { competitor: any }) {
  if (!competitor) return null;
  return (
    <Card className="competitor-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        <div>
          <h3 style={{ margin: '0 0 5px 0' }}>{competitor.name || competitor.domain}</h3>
          <a href={competitor.website || `https://${competitor.domain}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#2aa3ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <LinkIcon size={12} /> {competitor.website || competitor.domain}
          </a>
        </div>
        {competitor.opportunityScore && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#9aa7bd', textTransform: 'uppercase' }}>Opportunity</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10e18b' }}>{competitor.opportunityScore}/100</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', padding: '12px', background: '#151d2b', borderRadius: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}><TrendingUp size={12}/> Traffic Estimate</div>
          <div style={{ fontWeight: 'bold' }}>{competitor.trafficEstimate || 'Unknown'}</div>
        </div>
        <div style={{ width: '1px', background: '#293245' }}></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}><BarChart2 size={12}/> SEO Authority</div>
          <div style={{ fontWeight: 'bold', color: '#a855f7' }}>{competitor.seoAuthority || competitor.estimatedAuthority || 'Unknown'}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <strong style={{ fontSize: '12px', color: '#10e18b' }}>Strengths</strong>
          <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px' }}>
            {(competitor.strengths || []).slice(0, 3).map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div>
          <strong style={{ fontSize: '12px', color: '#ff4757' }}>Weaknesses (Exploitable)</strong>
          <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px' }}>
            {(competitor.weaknesses || []).slice(0, 3).map((w: string, i: number) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      </div>
    </Card>
  );
}

import React, { useState } from 'react';
import { Card, Badge, EvidenceBadge } from './UI';
import { renderSafeValue } from '../lib/normalizers';
import SafeValue from './SafeValue';
import { ChevronDown, ChevronUp, Link as LinkIcon, AlertCircle, Info, Target, Users, Zap, TrendingUp, BarChart2, DollarSign, Building, Code, Star, Shield, PieChart } from 'lucide-react';

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
  
  if (typeof insight === 'string') {
    return (
      <Card className="insight-card">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <Icon size={18} style={{ color: '#53a7ff', marginTop: '2px' }} />
          <p style={{ margin: 0, lineHeight: '1.5' }}><SafeValue value={insight} /></p>
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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {insight.confidence && (
            <Badge tone={insight.confidence > 80 ? 'green' : insight.confidence > 50 ? 'blue' : 'yellow'}>
              {insight.confidence}% Confidence
            </Badge>
          )}
          {insight.impact && (
            <Badge tone={insight.impact === 'High' ? 'pink' : 'dark'}>{insight.impact} Impact</Badge>
          )}
          {insight.evidence && typeof insight.evidence === 'object' && (
            <EvidenceBadge evidence={insight.evidence} />
          )}
        </div>
      </div>
      
      <p style={{ margin: '0 0 10px 0', lineHeight: '1.5', fontSize: '15px' }}>{renderSafeValue(insight.value)}</p>
      
      {insight.recommendedAction && (
        <div style={{ background: '#151d2b', padding: '10px', borderRadius: '8px', marginBottom: '10px', display: 'flex', gap: '8px' }}>
          <Target size={16} style={{ color: '#ffb347' }} />
          <span style={{ fontSize: '13px', color: '#9aa7bd' }}><b>Action:</b> <SafeValue value={insight.recommendedAction} /></span>
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
              {insight.evidence && typeof insight.evidence === 'string' && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: insight.source ? '8px' : 0 }}>
                  <AlertCircle size={14} style={{ color: '#ff4757', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: '#9aa7bd', fontStyle: 'italic' }}>"{renderSafeValue(insight.evidence)}"</span>
                </div>
              )}
              {insight.evidence && typeof insight.evidence === 'object' && (
                <EvidenceBadge evidence={insight.evidence} size="md" />
              )}
              {insight.source && typeof insight.source === 'string' && (
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
          {persona.name || persona.persona || persona.icpName || 'Unknown Persona'}
        </h3>
        {persona.intentScore && <Badge tone="pink">Intent: {persona.intentScore}%</Badge>}
      </div>
      
      <p style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '15px' }}>{persona.description || persona.demographics || persona.role}</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <strong style={{ fontSize: '12px', color: '#10e18b', textTransform: 'uppercase', letterSpacing: '1px' }}>Goals</strong>
          <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px' }}>
            {(persona.goals || []).slice(0, 3).map((g: string, i: number) => <li key={i}>{renderSafeValue(g)}</li>)}
          </ul>
        </div>
        <div>
          <strong style={{ fontSize: '12px', color: '#ff4757', textTransform: 'uppercase', letterSpacing: '1px' }}>Frustrations / Pain Points</strong>
          <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px' }}>
            {(persona.painPoints || persona.frustrations || []).slice(0, 3).map((f: string, i: number) => <li key={i}>{renderSafeValue(f)}</li>)}
          </ul>
        </div>
      </div>
      
      <div style={{ background: '#151d2b', padding: '12px', borderRadius: '8px' }}>
        {persona.budget && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <DollarSign size={14} style={{ color: '#10e18b' }} />
            <span style={{ fontSize: '13px' }}><b>Budget:</b> {persona.budget}</span>
          </div>
        )}
        {persona.buyingTriggers && persona.buyingTriggers.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <Zap size={14} style={{ color: '#ffb347' }} />
            <span style={{ fontSize: '13px' }}><b>Buying Trigger:</b> {Array.isArray(persona.buyingTriggers) ? persona.buyingTriggers[0] : persona.buyingTriggers}</span>
          </div>
        )}
        {persona.objections && persona.objections.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <AlertCircle size={14} style={{ color: '#53a7ff' }} />
            <span style={{ fontSize: '13px' }}><b>Objection:</b> {Array.isArray(persona.objections) ? persona.objections[0] : persona.objections}</span>
          </div>
        )}
        {persona.lifetimeValue && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <TrendingUp size={14} style={{ color: '#a855f7' }} />
            <span style={{ fontSize: '13px' }}><b>LTV:</b> {typeof persona.lifetimeValue === 'object' ? persona.lifetimeValue.estimatedRange || persona.lifetimeValue : persona.lifetimeValue}</span>
          </div>
        )}
        {persona.evidence && <EvidenceBadge evidence={persona.evidence} size="sm" />}
      </div>
    </Card>
  );
}

export function CompetitorCard({ competitor }: { competitor: any }) {
  if (!competitor) return null;
  const ef = competitor.enterpriseFields || {};
  const showExtended = ef.pricing || ef.funding || ef.employeeCount || ef.technologies || ef.reviewScore || ef.marketShare || ef.estimatedARR;

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

      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', padding: '12px', background: '#151d2b', borderRadius: '8px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '100px' }}>
          <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}><TrendingUp size={12}/> Traffic</div>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{competitor.trafficEstimate || ef.trafficEstimate || 'Unknown'}</div>
        </div>
        {ef.employeeCount && (
          <div style={{ flex: 1, minWidth: '100px' }}>
            <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}><Building size={12}/> Employees</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{ef.employeeCount}</div>
          </div>
        )}
        {ef.funding && (
          <div style={{ flex: 1, minWidth: '100px' }}>
            <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}><DollarSign size={12}/> Funding</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#10e18b' }}>{ef.funding}</div>
          </div>
        )}
        {ef.estimatedARR && (
          <div style={{ flex: 1, minWidth: '100px' }}>
            <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}><PieChart size={12}/> Est. ARR</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#ffb347' }}>{ef.estimatedARR}</div>
          </div>
        )}
        {ef.marketShare && (
          <div style={{ flex: 1, minWidth: '100px' }}>
            <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}><BarChart2 size={12}/> Market Share</div>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{ef.marketShare}</div>
          </div>
        )}
      </div>

      {showExtended && (
        <div style={{ marginBottom: '15px', padding: '12px', background: '#151d2b', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            {ef.pricing && <div><span style={{ color: '#9aa7bd' }}>Pricing:</span> <span style={{ color: '#e5e7eb' }}>{ef.pricing}</span></div>}
            {ef.reviewScore && <div><span style={{ color: '#9aa7bd' }}>Review Score:</span> <span style={{ color: '#ffb347' }}>{typeof ef.reviewScore === 'number' ? '⭐'.repeat(Math.round(ef.reviewScore)) : ef.reviewScore}</span></div>}
            {ef.positioning && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#9aa7bd' }}>Positioning:</span> <span style={{ color: '#e5e7eb' }}>{ef.positioning}</span></div>}
          </div>
          {ef.technologies && Array.isArray(ef.technologies) && ef.technologies.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <span style={{ color: '#9aa7bd', fontSize: '12px' }}>Technologies: </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {ef.technologies.slice(0, 5).map((t: string, i: number) => (
                  <span key={i} style={{ padding: '2px 6px', background: '#1d2738', borderRadius: '4px', fontSize: '11px', color: '#2aa3ff' }}><Code size={10} style={{ marginRight: '3px' }}/>{renderSafeValue(t)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <strong style={{ fontSize: '12px', color: '#10e18b' }}>Strengths</strong>
          <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px' }}>
            {(competitor.strengths || ef.strengths || []).slice(0, 3).map((s: string, i: number) => <li key={i}>{renderSafeValue(s)}</li>)}
            {!(competitor.strengths || ef.strengths || []).length && <li style={{ color: '#6b7280' }}>Unknown</li>}
          </ul>
        </div>
        <div>
          <strong style={{ fontSize: '12px', color: '#ff4757' }}>Weaknesses (Exploitable)</strong>
          <ul style={{ paddingLeft: '15px', margin: '5px 0', fontSize: '13px' }}>
            {(competitor.weaknesses || ef.weaknesses || []).slice(0, 3).map((w: string, i: number) => <li key={i}>{renderSafeValue(w)}</li>)}
            {!(competitor.weaknesses || ef.weaknesses || []).length && <li style={{ color: '#6b7280' }}>Unknown</li>}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function TechnologyCard({ tech }: { tech: any }) {
  if (!tech) return null;
  const confidenceColor = tech.confidence >= 95 ? '#10e18b' : tech.confidence >= 75 ? '#2aa3ff' : tech.confidence >= 50 ? '#ffb347' : '#ff4757';
  return (
    <div style={{ padding: '10px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{tech.name}</div>
        {tech.evidence && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{typeof tech.evidence === 'string' ? tech.evidence.slice(0, 60) : ''}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '40px', height: '6px', background: '#1d2738', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${typeof tech.confidence === 'number' ? tech.confidence : 0}%`, height: '100%', background: confidenceColor, borderRadius: '3px' }} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: confidenceColor }}>{tech.confidence != null ? `${tech.confidence}%` : 'N/A'}</span>
      </div>
    </div>
  );
}

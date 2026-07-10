import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import SafeValue from './SafeValue';
import {
  Shield, TrendingUp, Target, AlertTriangle, CheckCircle2, Lightbulb, Zap,
  ChevronDown, ChevronUp, Info, X, Search, Copy, Download, Share2,
  Clock, FileText, BarChart2, PieChart, Activity, Users, Building,
  Code, DollarSign, ExternalLink, Maximize2, Minimize2, Flag, Calendar,
  UserCheck, Layers, Sliders, Eye, ArrowUpRight, ArrowDownRight,
  ArrowRight, GripHorizontal, Star, Flame, Snowflake, Filter, Globe,
  Map, Box, Briefcase, Loader2, Play, SkipBack, SkipForward, Monitor,
  GitBranch, Sparkles, Link, Award, Medal, Trophy, RefreshCw
} from 'lucide-react';
import { ProgressBar, StatusBadge, ConfidenceBadge, PriorityChip, EnterpriseInsightCard, KPIDashboard, MiniRadarLegend } from './EnterpriseComponents';
import { EvidenceBadge } from './UI';
import { downloadReport } from '../lib/api';
import { renderSafeValue } from '../lib/normalizers';

const C = {
  excellent: '#10e18b', good: '#53a7ff', needsImprovement: '#ffb347',
  critical: '#ff4757', bg: '#0f1729', card: '#151d2b', border: '#293245',
  text: '#e5e7eb', muted: '#9aa7bd', dim: '#6b7280', accent: '#818cf8',
  purple: '#a855f7', orange: '#ff6b35', pink: '#ec4899', cyan: '#06b6d4'
};

// ══════════════════════════════════════════════════════════════
// LEGACY COMPONENTS (preserved for backward compatibility)
// ══════════════════════════════════════════════════════════════

export interface ExecSummaryData {
  keyFindings?: { text: string; confidence?: number; impact?: string }[];
  biggestRisks?: { text: string; severity?: string; probability?: number }[];
  biggestOpportunities?: { text: string; roi?: string; effort?: string }[];
  overallHealth?: { score: number; label: string; color: string };
  executiveRecommendation?: { text: string; reasoning: string; confidence: number };
}

export function ExecutiveSummaryCards({ data }: { data?: ExecSummaryData }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {data.overallHealth && (
        <div style={{
          background: `linear-gradient(135deg, ${data.overallHealth.color}15 0%, #0f1729 100%)`,
          border: `1px solid ${data.overallHealth.color}40`, borderRadius: '12px', padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '11px', color: C.dim, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Overall Business Health</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: data.overallHealth.color }}>{data.overallHealth.label}</div>
          </div>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: `conic-gradient(${data.overallHealth.color} ${data.overallHealth.score}%, ${C.border} ${data.overallHealth.score}%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: data.overallHealth.color }}>{data.overallHealth.score}%</div>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        {data.keyFindings && data.keyFindings.length > 0 && (
          <PremiumCard icon={Lightbulb} title="Key Findings" color="#53a7ff" count={data.keyFindings.length}>
            {data.keyFindings.map((f, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < data.keyFindings!.length - 1 ? '1px solid #1d2738' : 'none' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(83,167,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#53a7ff', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: C.text }}>{renderSafeValue(f.text)}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>{f.confidence && <ConfidenceBadge value={f.confidence} />}{f.impact && <StatusBadge status={f.impact} />}</div>
                  </div>
                </div>
              </div>
            ))}
          </PremiumCard>
        )}
        {data.biggestRisks && data.biggestRisks.length > 0 && (
          <PremiumCard icon={AlertTriangle} title="Biggest Risks" color="#ff4757" count={data.biggestRisks.length}>
            {data.biggestRisks.map((r, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < data.biggestRisks!.length - 1 ? '1px solid #1d2738' : 'none' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,71,87,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#ff4757', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '13px', color: C.text }}>{renderSafeValue(r.text)}</div><div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>{r.severity && <StatusBadge status={r.severity} />}{r.probability !== undefined && <ConfidenceBadge value={r.probability} />}</div></div>
                </div>
              </div>
            ))}
          </PremiumCard>
        )}
        {data.biggestOpportunities && data.biggestOpportunities.length > 0 && (
          <PremiumCard icon={Target} title="Biggest Opportunities" color="#10e18b" count={data.biggestOpportunities.length}>
            {data.biggestOpportunities.map((o, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < data.biggestOpportunities!.length - 1 ? '1px solid #1d2738' : 'none' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(16,225,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#10e18b', flexShrink: 0, marginTop: '1px' }}>{i + 1}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '13px', color: C.text }}>{renderSafeValue(o.text)}</div><div style={{ display: 'flex', gap: '6px', marginTop: '3px', fontSize: '11px', color: C.dim }}>{o.roi && <span style={{ color: '#10e18b' }}>ROI: {renderSafeValue(o.roi)}</span>}{o.effort && <span style={{ color: '#ffb347' }}>Effort: {renderSafeValue(o.effort)}</span>}</div></div>
                </div>
              </div>
            ))}
          </PremiumCard>
        )}
      </div>
      {data.executiveRecommendation && (
        <div style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.1) 0%, rgba(168,85,247,0.05) 100%)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '12px', padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Star size={18} style={{ color: '#818cf8' }} /><span style={{ fontSize: '14px', fontWeight: 600, color: '#818cf8' }}>AI Executive Recommendation</span>
            {data.executiveRecommendation.confidence && <ConfidenceBadge value={data.executiveRecommendation.confidence} />}
          </div>
          <p style={{ fontSize: '15px', color: C.text, lineHeight: 1.6, margin: '0 0 8px' }}>{renderSafeValue(data.executiveRecommendation.text)}</p>
          {data.executiveRecommendation.reasoning && <div style={{ fontSize: '12px', color: C.dim, fontStyle: 'italic', padding: '8px 10px', background: C.bg, borderRadius: '6px' }}>Why: {renderSafeValue(data.executiveRecommendation.reasoning)}</div>}
        </div>
      )}
    </div>
  );
}

function PremiumCard({ icon: Icon, title, color, count, children }: { icon: any; title: string; color: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1d2738', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={16} style={{ color }} /><span style={{ fontSize: '13px', fontWeight: 600, color: C.text, flex: 1 }}>{title}</span>
        <div style={{ fontSize: '11px', color: C.dim, background: C.bg, padding: '2px 8px', borderRadius: '10px' }}>{count}</div>
      </div>
      <div style={{ padding: '4px 16px' }}>{children}</div>
    </div>
  );
}

export interface HealthScoreData { overall: number; components: { label: string; value: number; color?: string }[]; }

export function BusinessHealthScore({ data }: { data?: HealthScoreData }) {
  if (!data) return null;
  const overall = data.overall;
  const grade = overall != null && overall >= 85 ? 'Excellent' : overall != null && overall >= 65 ? 'Good' : overall != null && overall >= 40 ? 'Needs Improvement' : 'Not measured';
  const gradeColor = overall != null && overall >= 85 ? C.excellent : overall != null && overall >= 65 ? C.good : overall != null && overall >= 40 ? C.needsImprovement : C.dim;
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div><div style={{ fontSize: '11px', color: C.dim, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Business Health</div><div style={{ fontSize: '28px', fontWeight: 700, color: gradeColor }}>{grade}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '36px', fontWeight: 700, color: gradeColor }}>{overall != null ? `${Math.round(overall)}%` : 'Not measured'}</div><div style={{ fontSize: '11px', color: C.dim }}>Composite Score</div></div>
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {data.components.map((c, i) => {
          const val = c.value;
          const barColor = c.color || (val != null && val >= 70 ? C.excellent : val != null && val >= 40 ? C.needsImprovement : C.dim);
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}><span style={{ color: C.muted }}>{c.label}</span><span style={{ color: barColor, fontWeight: 600 }}>{val != null ? `${Math.round(val)}%` : 'Not measured'}</span></div>
              <div style={{ height: '6px', background: '#1d2738', borderRadius: '3px', overflow: 'hidden' }}><div style={{ width: val != null ? `${Math.min(val, 100)}%` : '0%', height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.6s ease' }} /></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface DecisionItem { label: string; question: string; answer: 'Yes' | 'No' | 'Likely' | 'Unlikely' | 'Neutral'; reasoning: string; confidence: number; }

export function AIDecisionPanel({ decisions, onClose }: { decisions: DecisionItem[]; onClose?: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [minimized, setMinimized] = useState(false);
  if (!decisions || decisions.length === 0) return null;
  const answerColor = (a: string) => a === 'Yes' || a === 'Likely' ? C.excellent : a === 'No' || a === 'Unlikely' ? C.critical : C.needsImprovement;
  if (minimized) return (
    <button onClick={() => setMinimized(false)} style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, padding: '12px 20px', borderRadius: '30px', border: `1px solid ${C.accent}`, background: C.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <Zap size={18} style={{ color: C.accent }} /><span style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>AI Decisions</span><Maximize2 size={14} style={{ color: C.dim }} />
    </button>
  );
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 999, width: '380px', maxHeight: '520px', overflow: 'hidden', background: C.bg, border: `1px solid ${C.accent}40`, borderRadius: '16px', boxShadow: '0 12px 48px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1d2738', background: `linear-gradient(135deg, ${C.accent}10, transparent)`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <GripHorizontal size={14} style={{ color: C.dim }} /><Zap size={16} style={{ color: C.accent }} /><span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: C.text }}>AI Decision Panel</span>
        <button onClick={() => setMinimized(true)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '2px' }}><Minimize2 size={14} /></button>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '2px' }}><X size={14} /></button>}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 12px' }}>
        {decisions.map((d, i) => (
          <div key={i} style={{ marginTop: '8px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${answerColor(d.answer)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: answerColor(d.answer) }}>{d.answer === 'Yes' ? '✓' : d.answer === 'No' ? '✗' : d.answer === 'Likely' ? '↑' : d.answer === 'Unlikely' ? '↓' : '?'}</div>
              </div>
              <div style={{ flex: 1 }}><div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{d.label}</div><div style={{ fontSize: '11px', color: answerColor(d.answer), fontWeight: 600, marginTop: '1px' }}>{d.answer}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ConfidenceBadge value={d.confidence} size="sm" />{expanded === i ? <ChevronUp size={14} style={{ color: C.dim }} /> : <ChevronDown size={14} style={{ color: C.dim }} />}</div>
            </button>
            {expanded === i && <div style={{ padding: '0 12px 10px', borderTop: '1px solid #1d2738' }}><div style={{ marginTop: '8px', fontSize: '12px', color: C.muted, lineHeight: 1.5 }}><strong style={{ color: C.text }}>WHY:</strong> {d.reasoning}</div></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface RecommendationItem { title: string; description?: string; group: 'Quick Wins' | 'High ROI' | 'Long-Term' | 'Critical' | 'High Risk' | 'Blocked'; priority: 'Critical' | 'High' | 'Medium' | 'Low'; difficulty: number; roi: string; timeline: string; owner: string; confidence: number; }

export function RecommendationPriorities({ items }: { items: RecommendationItem[] }) {
  if (!items || items.length === 0) return null;
  const groups = ['Critical', 'Quick Wins', 'High ROI', 'Long-Term', 'High Risk', 'Blocked'];
  const groupColors: Record<string, string> = { 'Critical': C.critical, 'Quick Wins': C.excellent, 'High ROI': '#a855f7', 'Long-Term': C.good, 'High Risk': '#ff6b35', 'Blocked': C.dim };
  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      {groups.map(group => {
        const groupItems = items.filter(i => i.group === group);
        if (groupItems.length === 0) return null;
        return (
          <div key={group} style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #1d2738', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: groupColors[group] }} /><span style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{group}</span><span style={{ fontSize: '11px', color: C.dim }}>({groupItems.length})</span>
            </div>
            <div style={{ padding: '8px 14px 12px', display: 'grid', gap: '8px' }}>
              {groupItems.map((r, i) => (
                <div key={i} style={{ padding: '10px 12px', background: C.bg, borderRadius: '8px', border: '1px solid #1d2738' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{renderSafeValue(r.title)}</div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}><PriorityChip priority={r.priority} /><ConfidenceBadge value={r.confidence} /></div>
                  </div>
                  {r.description && <div style={{ fontSize: '12px', color: C.muted, marginBottom: '6px' }}>{renderSafeValue(r.description)}</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: C.dim, marginTop: '4px' }}>
                    <span>Difficulty: <strong style={{ color: r.difficulty != null ? (r.difficulty >= 70 ? C.critical : r.difficulty >= 40 ? C.needsImprovement : C.excellent) : C.dim }}>{r.difficulty != null ? `${r.difficulty}/100` : 'Not measured'}</strong></span>
                    <span>Timeline: <strong style={{ color: C.good }}>{r.timeline}</strong></span><span>Owner: <strong style={{ color: C.muted }}>{r.owner}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface CrossModuleItem { title: string; description: string; sourceModule: string; targetModule: string; impact: 'high' | 'medium' | 'low'; type: string; }

export function CrossModuleInsights({ items }: { items: CrossModuleItem[] }) {
  if (!items || items.length === 0) return null;
  const moduleColors: Record<string, string> = { 'Growth': '#10e18b', 'SEO': '#53a7ff', 'Automation': '#ffb347', 'Reports': '#a855f7', 'Competitors': '#ff4757', 'Audience': '#f59e0b' };
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><div style={{ fontSize: '13px', fontWeight: 600, color: C.text, flex: 1 }}>{renderSafeValue(item.title)}</div><StatusBadge status={item.impact} /></div>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px' }}>{renderSafeValue(item.description)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${(moduleColors[item.sourceModule] || C.dim)}15`, color: moduleColors[item.sourceModule] || C.dim, fontWeight: 600 }}>{item.sourceModule}</span>
            <ArrowRight size={12} style={{ color: C.dim }} />
            <span style={{ padding: '2px 8px', borderRadius: '4px', background: `${(moduleColors[item.targetModule] || C.dim)}15`, color: moduleColors[item.targetModule] || C.dim, fontWeight: 600 }}>{item.targetModule}</span>
            <span style={{ color: C.dim, marginLeft: 'auto' }}>{item.type}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface ExplanationData { evidence: string; reasoning: string; businessImpact: string; expectedRoi: string; dependencies: string[]; }

export function ExplainButton({ explanation, label = 'Explain' }: { explanation?: ExplanationData; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!explanation) return null;
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', color: '#818cf8', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Info size={12} /> {label} {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: '0', zIndex: 50, marginTop: '6px', width: '340px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: '11px', color: C.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>AI Explanation</div>
          <ExplainRow icon={Shield} label="Evidence" value={explanation.evidence} color={C.good} />
          <ExplainRow icon={Activity} label="Reasoning" value={explanation.reasoning} color={C.accent} />
          <ExplainRow icon={TrendingUp} label="Business Impact" value={explanation.businessImpact} color={C.excellent} />
          <ExplainRow icon={DollarSign} label="Expected ROI" value={explanation.expectedRoi} color="#10e18b" />
          {explanation.dependencies.length > 0 && (
            <div style={{ marginTop: '8px' }}><div style={{ fontSize: '10px', color: C.dim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Dependencies</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{explanation.dependencies.map((d, i) => <span key={i} style={{ fontSize: '10px', padding: '2px 6px', background: C.bg, borderRadius: '4px', color: C.muted }}>{renderSafeValue(d)}</span>)}</div></div>
          )}
        </div>
      )}
    </div>
  );
}

function ExplainRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  if (!value) return null;
  return <div style={{ marginBottom: '6px', padding: '6px 8px', background: C.bg, borderRadius: '6px', borderLeft: `3px solid ${color}` }}><div style={{ fontSize: '10px', color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Icon size={10} /> <SafeValue value={label} /></div><div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.4 }}><SafeValue value={value} /></div></div>;
}

export interface CompareData { label: string; current: number; previous: number; unit?: string; }

export function CompareResults({ currentLabel = 'Current', previousLabel = 'Previous', metrics }: { currentLabel?: string; previousLabel?: string; metrics: CompareData[] }) {
  if (!metrics || metrics.length === 0) return null;
  const improved = metrics.filter(m => m.current > m.previous);
  const dropped = metrics.filter(m => m.current < m.previous);
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <BarChart2 size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Compare Results</span>
        <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto', fontSize: '11px' }}>{improved.length > 0 && <span style={{ color: C.excellent }}>↑ {improved.length} Improved</span>}{dropped.length > 0 && <span style={{ color: C.critical, marginLeft: '8px' }}>↓ {dropped.length} Dropped</span>}</div>
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {metrics.map((m, i) => {
          const diff = m.current - m.previous;
          const isImproved = diff > 0;
          const isDropped = diff < 0;
          const diffColor = isImproved ? C.excellent : isDropped ? C.critical : C.dim;
          return (
            <div key={i} style={{ padding: '8px 10px', background: C.bg, borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, fontSize: '12px', color: C.muted }}>{m.label}</div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: '11px', color: C.dim }}>{previousLabel}</div><div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{m.previous}{m.unit || '%'}</div></div>
              <div style={{ textAlign: 'center', width: '24px' }}>{isImproved ? <ArrowUpRight size={16} style={{ color: C.excellent }} /> : isDropped ? <ArrowDownRight size={16} style={{ color: C.critical }} /> : <span style={{ color: C.dim }}>=</span>}</div>
              <div style={{ textAlign: 'left' }}><div style={{ fontSize: '11px', color: C.dim }}>{currentLabel}</div><div style={{ fontSize: '13px', fontWeight: 600, color: diffColor }}>{m.current}{m.unit || '%'}</div></div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: diffColor, minWidth: '50px', textAlign: 'right' }}>{isImproved ? `+${diff}` : isDropped ? `${diff}` : '0'}{m.unit || '%'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface MatrixItem { title: string; impact: number; effort: number; quadrant?: string; }

export function OpportunityMatrix({ items }: { items: MatrixItem[] }) {
  if (!items || items.length === 0) return null;
  const withQuadrant = items.map(item => ({ ...item, quadrant: item.quadrant || (item.impact >= 50 && item.effort < 50 ? 'Quick Wins' : item.impact >= 50 && item.effort >= 50 ? 'Major Projects' : item.impact < 50 && item.effort < 50 ? 'Fill-ins' : 'Avoid') }));
  const quadrants = [
    { name: 'Quick Wins', x: 'Low Effort', y: 'High Impact', color: C.excellent, bg: 'rgba(16,225,139,0.05)', filter: (i: any) => i.quadrant === 'Quick Wins' },
    { name: 'Major Projects', x: 'High Effort', y: 'High Impact', color: C.good, bg: 'rgba(83,167,255,0.05)', filter: (i: any) => i.quadrant === 'Major Projects' },
    { name: 'Fill-ins', x: 'Low Effort', y: 'Low Impact', color: C.needsImprovement, bg: 'rgba(255,179,71,0.05)', filter: (i: any) => i.quadrant === 'Fill-ins' },
    { name: 'Avoid', x: 'High Effort', y: 'Low Impact', color: C.critical, bg: 'rgba(255,71,87,0.05)', filter: (i: any) => i.quadrant === 'Avoid' },
  ];
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}><Target size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Opportunity Matrix</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {quadrants.map(q => {
          const qItems = withQuadrant.filter(q.filter);
          return (
            <div key={q.name} style={{ background: q.bg, borderRadius: '8px', border: `1px solid ${q.color}30`, padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: q.color }} /><span style={{ fontSize: '12px', fontWeight: 600, color: q.color }}>{q.name}</span><span style={{ fontSize: '10px', color: C.dim }}>({qItems.length})</span></div>
              {qItems.map((item, i) => <div key={i} style={{ fontSize: '11px', color: C.muted, padding: '3px 0', borderBottom: i < qItems.length - 1 ? '1px solid #1d2738' : 'none' }}>{renderSafeValue(item.title)}</div>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export interface RiskItem { title: string; category: 'Business' | 'SEO' | 'Competition' | 'Technical' | 'Market'; probability: number; impact: 'high' | 'medium' | 'low'; mitigation: string; owner: string; }

export function RiskMatrix({ items }: { items: RiskItem[] }) {
  if (!items || items.length === 0) return null;
  const categories = ['Business', 'SEO', 'Competition', 'Technical', 'Market'];
  const catColors: Record<string, string> = { 'Business': C.critical, 'SEO': C.good, 'Competition': '#ff6b35', 'Technical': C.needsImprovement, 'Market': '#a855f7' };
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}><Shield size={18} style={{ color: C.critical }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Risk Matrix</span></div>
      {categories.map(cat => {
        const catItems = items.filter(r => r.category === cat);
        if (catItems.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', background: catColors[cat] }} /><span style={{ fontSize: '12px', fontWeight: 600, color: catColors[cat] }}>{cat} Risks</span></div>
            {catItems.map((r, i) => (
              <div key={i} style={{ padding: '8px 10px', background: C.bg, borderRadius: '6px', marginBottom: '4px', border: '1px solid #1d2738' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{renderSafeValue(r.title)}</div><div style={{ display: 'flex', gap: '4px' }}><StatusBadge status={r.probability != null ? (r.probability >= 70 ? 'critical' : r.probability >= 40 ? 'warning' : 'low') : 'unknown'} /><StatusBadge status={r.impact} /></div>
                  </div>
                  <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px' }}><strong>Mitigation:</strong> {renderSafeValue(r.mitigation)}</div>
                <div style={{ fontSize: '10px', color: C.dim }}>Probability: {r.probability != null ? `${r.probability}%` : 'Not measured'} | Owner: {r.owner}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export interface ConfidenceData { section: string; confidence: number; evidenceStrength: number; sourceCount: number; dataFreshness: string; }

export function ConfidenceVisualization({ items }: { items: ConfidenceData[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}><Shield size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>AI Confidence</span></div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {items.map((item, i) => {
          const confColor = item.confidence != null && item.confidence >= 70 ? C.excellent : item.confidence != null && item.confidence >= 40 ? C.needsImprovement : C.critical;
          const evColor = item.evidenceStrength != null && item.evidenceStrength >= 70 ? C.excellent : item.evidenceStrength != null && item.evidenceStrength >= 40 ? C.needsImprovement : C.critical;
          return (
            <div key={i} style={{ padding: '10px 12px', background: C.bg, borderRadius: '8px', border: '1px solid #1d2738' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}><span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{item.section}</span><span style={{ fontSize: '12px', fontWeight: 700, color: confColor }}>{item.confidence != null ? `${Math.round(item.confidence)}%` : 'Not measured'}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', color: C.dim }}>
                <div>Evidence: <strong style={{ color: evColor }}>{item.evidenceStrength != null ? `${Math.round(item.evidenceStrength)}%` : 'Not measured'}</strong></div><div>Sources: <strong style={{ color: C.text }}>{item.sourceCount}</strong></div>
                <div style={{ gridColumn: '1 / -1' }}>Freshness: <strong style={{ color: C.text }}>{item.dataFreshness}</strong></div>
              </div>
              <div style={{ marginTop: '6px', display: 'flex', gap: '8px' }}>
                <MiniConfBar label="Confidence" value={item.confidence} color={confColor} />
                <MiniConfBar label="Evidence" value={item.evidenceStrength} color={evColor} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniConfBar({ label, value, color }: { label: string; value?: number; color: string }) {
  const pct = value != null ? Math.min(Math.max(value, 0), 100) : 0;
  return <div style={{ flex: 1 }}><div style={{ fontSize: '9px', color: C.dim, marginBottom: '2px' }}>{label}</div><div style={{ height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} /></div></div>;
}

export interface FilterOption { key: string; label: string; values: string[]; }

export function InteractiveFilters({ options, activeFilters, onFilterChange }: { options: FilterOption[]; activeFilters: Record<string, string[]>; onFilterChange: (key: string, values: string[]) => void }) {
  if (!options || options.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px 14px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, marginBottom: '14px' }}>
      <Filter size={14} style={{ color: C.dim, marginRight: '4px' }} />
      {options.map(opt => {
        const active = activeFilters[opt.key] || [];
        const [open, setOpen] = useState(false);
        return (
          <div key={opt.key} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${active.length > 0 ? C.accent : C.border}`, background: active.length > 0 ? `${C.accent}15` : C.bg, cursor: 'pointer', fontSize: '11px', color: active.length > 0 ? C.accent : C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {opt.label} {active.length > 0 && `(${active.length})`}<ChevronDown size={10} />
            </button>
            {open && (
              <div style={{ position: 'absolute', top: '100%', left: '0', zIndex: 50, marginTop: '4px', minWidth: '160px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                {opt.values.map(v => {
                  const isActive = active.includes(v);
                  return <button key={renderSafeValue(v)} onClick={() => { const next = isActive ? active.filter(x => x !== v) : [...active, v]; onFilterChange(opt.key, next); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: isActive ? `${C.accent}15` : 'none', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: isActive ? C.accent : C.muted }}>{isActive ? '✓ ' : ''}{renderSafeValue(v)}</button>;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SmartSearch({ modules, onSearch }: { modules: string[]; onSearch: (query: string, moduleFilter: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>(modules);
  const [showModules, setShowModules] = useState(false);
  const debounceRef = useRef<any>(null);
  const handleChange = (val: string) => { setQuery(val); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => onSearch(val, selectedModules), 300); };
  return (
    <div style={{ position: 'relative', marginBottom: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '4px 12px' }}>
        <Search size={16} style={{ color: C.dim, flexShrink: 0 }} />
        <input value={query} onChange={e => handleChange(e.target.value)} placeholder="Search across Growth, SEO, Automation, Reports, Competitors..." style={{ flex: 1, padding: '8px 4px', background: 'none', border: 'none', color: C.text, fontSize: '13px', outline: 'none' }} />
        {query && <button onClick={() => handleChange('')} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={14} /></button>}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowModules(!showModules)} style={{ background: C.bg, border: 'none', color: C.dim, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>
            <Layers size={12} /> {selectedModules.length}/{modules.length}
          </button>
          {showModules && (
            <div style={{ position: 'absolute', top: '100%', right: '0', zIndex: 50, marginTop: '4px', minWidth: '160px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              {modules.map(m => { const active = selectedModules.includes(m); return <button key={renderSafeValue(m)} onClick={() => { const next = active ? selectedModules.filter(x => x !== m) : [...selectedModules, m]; setSelectedModules(next); onSearch(query, next); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', background: active ? `${C.accent}15` : 'none', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', color: active ? C.accent : C.muted }}>{active ? '✓ ' : ''}{renderSafeValue(m)}</button>; })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EnterpriseReportPreview({ chatId, type = 'growth', sections = [] }: { chatId?: string; type?: 'executive' | 'growth' | 'seo'; sections?: { name: string; content: string }[] }) {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [previewMode, setPreviewMode] = useState(false);
  const formats = [
    { format: 'pdf', label: 'PDF', icon: FileText, desc: 'Enterprise report with full formatting' },
    { format: 'docx', label: 'DOCX', icon: FileText, desc: 'Editable Word document' },
    { format: 'pptx', label: 'PPTX', icon: BarChart2, desc: 'Investor-ready slide deck' },
    { format: 'markdown', label: 'MD', icon: FileText, desc: 'Clean markdown documentation' },
    { format: 'csv', label: 'CSV', icon: PieChart, desc: 'Raw data export' },
  ];
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Enterprise Report Preview</span></div>
          <button onClick={() => setPreviewMode(!previewMode)} style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${C.accent}`, background: previewMode ? `${C.accent}20` : C.bg, cursor: 'pointer', fontSize: '11px', color: C.accent, display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> {previewMode ? 'Hide Preview' : 'Live Preview'}</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {formats.map(f => (
            <button key={f.format} onClick={() => setSelectedFormat(f.format)}
              style={{ padding: '10px 16px', borderRadius: '8px', border: selectedFormat === f.format ? '1px solid #818cf8' : `1px solid ${C.border}`, background: selectedFormat === f.format ? `${C.accent}10` : C.bg, cursor: 'pointer', textAlign: 'center', flex: '1', minWidth: '100px' }}>
              <f.icon size={20} style={{ color: selectedFormat === f.format ? C.accent : C.dim, margin: '0 auto 4px', display: 'block' }} />
              <div style={{ fontSize: '12px', fontWeight: 600, color: selectedFormat === f.format ? C.accent : C.text }}>{f.label}</div>
              <div style={{ fontSize: '10px', color: C.dim, marginTop: '2px' }}>{f.desc}</div>
            </button>
          ))}
        </div>
      </div>
      {previewMode && sections.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', color: '#1a1a2e', minHeight: '200px', maxHeight: '500px', overflow: 'auto', fontSize: '12px', lineHeight: 1.6 }}>
          {sections.map((s, i) => <div key={i} style={{ marginBottom: '16px' }}><h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a2e', borderBottom: '2px solid #1a1a2e', paddingBottom: '4px', marginBottom: '8px' }}>{s.name}</h4><p style={{ color: '#333' }}>{s.content}</p></div>)}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {formats.map(f => (
          <button key={f.format} onClick={() => { if (chatId) downloadReport(chatId, type, f.format); }}
            style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', color: C.text, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = C.accent; (e.target as HTMLElement).style.background = '#1a2335'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = C.border; (e.target as HTMLElement).style.background = C.card; }}>
            <Download size={14} /> {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProductivityBar({ items, onCopy, onExport, onShare }: { items: { label: string; content: string }[]; onCopy?: (label: string) => void; onExport?: (label: string) => void; onShare?: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const handleCopy = (item: { label: string; content: string }) => { navigator.clipboard.writeText(item.content).then(() => { setCopied(item.label); setTimeout(() => setCopied(null), 2000); onCopy?.(item.label); }).catch(() => {}); };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 14px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}` }}>
      {items.map((item, i) => (
        <button key={i} onClick={() => handleCopy(item)} style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: copied === item.label ? 'rgba(16,225,139,0.1)' : C.bg, cursor: 'pointer', fontSize: '11px', color: copied === item.label ? C.excellent : C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {copied === item.label ? <CheckCircle2 size={12} /> : <Copy size={12} />}{copied === item.label ? 'Copied!' : `Copy ${item.label}`}
        </button>
      ))}
      {items.length > 0 && <button onClick={() => { navigator.clipboard.writeText(items.map(i => `${i.label}:\n${i.content}`).join('\n\n---\n\n')); }} style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontSize: '11px', color: C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}><Copy size={12} /> Copy All</button>}
      <button onClick={onShare} style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer', fontSize: '11px', color: C.muted, display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}><Share2 size={12} /> Share Link (Coming Soon)</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PHASE 6C ENTERPRISE COMPONENTS (NEW)
// ══════════════════════════════════════════════════════════════

// ── Part 13 — Workspace Memory ──
export function useWorkspaceMemory<T>(key: string, defaultValue: T): [T, (val: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try { const stored = localStorage.getItem(`workspace_${key}`); return stored ? JSON.parse(stored) : defaultValue; } catch { return defaultValue; }
  });
  const setAndStore = useCallback((val: T) => { setValue(val); try { localStorage.setItem(`workspace_${key}`, JSON.stringify(val)); } catch {} }, [key]);
  return [value, setAndStore];
}

// ── Part 14 — Smart Empty States ──
export interface SmartEmptyData { title: string; why: string; missingData: string[]; howToImprove: string; apisToConnect?: string[]; expectedBenefit: string; }

export function SmartEmptyState({ data, icon: Icon = AlertTriangle }: { data: SmartEmptyData; icon?: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a1040 100%)', borderRadius: '12px', border: '1px solid #293245', padding: '28px 24px', textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(129,140,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Icon size={28} style={{ color: C.accent }} /></div>
      <h3 style={{ margin: '0 0 4px', fontSize: '17px', color: C.text }}>{data.title}</h3>
      <p style={{ margin: '0 auto 16px', fontSize: '13px', color: C.muted, maxWidth: '500px' }}>{data.why}</p>
      <button onClick={() => setExpanded(!expanded)} style={{ padding: '8px 18px', borderRadius: '8px', border: `1px solid ${C.accent}`, background: 'transparent', cursor: 'pointer', color: C.accent, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Info size={14} /> {expanded ? 'Hide Details' : 'Why & How to Fix'}</button>
      {expanded && (
        <div style={{ marginTop: '16px', textAlign: 'left', maxWidth: '500px', margin: '16px auto 0' }}>
          {data.missingData.length > 0 && <div style={{ marginBottom: '12px' }}><div style={{ fontSize: '11px', color: C.critical, fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Missing Data</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{data.missingData.map((d, i) => <span key={i} style={{ padding: '3px 8px', background: 'rgba(255,71,87,0.1)', borderRadius: '4px', fontSize: '11px', color: '#ff8a8a' }}>{renderSafeValue(d)}</span>)}</div></div>}
          <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '11px', color: C.good, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>How to Improve</div><p style={{ fontSize: '12px', color: C.muted, margin: 0, lineHeight: 1.5 }}>{data.howToImprove}</p></div>
          {data.apisToConnect && data.apisToConnect.length > 0 && <div style={{ marginBottom: '10px' }}><div style={{ fontSize: '11px', color: C.needsImprovement, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>APIs to Connect</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{data.apisToConnect.map((a, i) => <span key={i} style={{ padding: '3px 8px', background: 'rgba(255,179,71,0.1)', borderRadius: '4px', fontSize: '11px', color: '#ffb347' }}>{renderSafeValue(a)}</span>)}</div></div>}
          <div><div style={{ fontSize: '11px', color: C.excellent, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expected Benefit</div><p style={{ fontSize: '12px', color: C.muted, margin: 0, lineHeight: 1.5 }}>{data.expectedBenefit}</p></div>
        </div>
      )}
    </div>
  );
}

// ── Part 1 — Executive Command Center ──
export interface CommandCenterData { companyLogo?: string; companyName: string; website: string; industry: string; analysisTimestamp: string; aiConfidence: number; businessHealthScore: number; overallRecommendation: string; riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'; growthStage: string; keyMetrics: { label: string; value: string; trend?: number; color?: string }[]; }

export function ExecutiveCommandCenter({ data }: { data?: CommandCenterData }) {
  if (!data) return null;
  const bhScore = data.businessHealthScore;
  const healthColor = bhScore != null && bhScore >= 80 ? C.excellent : bhScore != null && bhScore >= 60 ? C.good : bhScore != null && bhScore >= 40 ? C.needsImprovement : C.dim;
  const riskColor = data.riskLevel === 'Low' ? C.excellent : data.riskLevel === 'Medium' ? C.needsImprovement : data.riskLevel === 'High' ? C.orange : C.critical;
  return (
    <div style={{ background: 'linear-gradient(135deg, #0f1729 0%, #151d2b 50%, #1a1040 100%)', borderRadius: '16px', border: '1px solid #293245', padding: '28px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {data.companyLogo ? <img src={data.companyLogo} alt="" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'contain' }} />
            : <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg, #818cf8, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#fff' }}>{data.companyName.charAt(0)}</div>}
          <div>
            <h1 style={{ margin: '0 0 2px', fontSize: '22px', fontWeight: 700, color: C.text }}>{data.companyName}</h1>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: C.muted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={12} /> {data.website}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building size={12} /> {data.industry}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {data.analysisTimestamp}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={12} /> {data.growthStage}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: bhScore != null ? `conic-gradient(${healthColor} ${bhScore}%, #1d2738 ${bhScore}%)` : '#1d2738', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0f1729', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: healthColor }}>{bhScore != null ? `${bhScore}%` : '?'}</div>
            </div>
            <div style={{ fontSize: '9px', color: C.dim, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Health</div>
          </div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '14px', fontWeight: 700, color: riskColor }}>{data.riskLevel}</div><div style={{ fontSize: '9px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk</div></div>
          <div style={{ textAlign: 'center' }}><ConfidenceBadge value={data.aiConfidence} size="md" /><div style={{ fontSize: '9px', color: C.dim, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{data.aiConfidence != null ? 'Confidence' : 'Not measured'}</div></div>
        </div>
      </div>
      <div style={{ padding: '14px 18px', background: 'rgba(129,140,248,0.06)', borderRadius: '10px', border: '1px solid rgba(129,140,248,0.2)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}><Star size={14} style={{ color: C.accent }} /><span style={{ fontSize: '11px', color: C.accent, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Executive Recommendation</span></div>
        <p style={{ margin: '4px 0 0', fontSize: '15px', color: C.text, lineHeight: 1.6 }}>{data.overallRecommendation}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
        {data.keyMetrics.map((m, i) => (
          <div key={i} style={{ background: '#151d2b', borderRadius: '10px', padding: '12px', border: '1px solid #293245', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{m.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: m.color || C.text }}>{m.value}</div>
            {m.trend !== undefined && <div style={{ fontSize: '11px', color: m.trend >= 0 ? C.excellent : C.critical, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>{m.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(m.trend)}%</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Part 2 — Story Driven Results ──
export interface StoryStep { icon: any; title: string; content: string; color: string; details?: string[]; }

export function StoryDrivenResults({ steps, activeStep, onStepClick }: { steps: StoryStep[]; activeStep?: number; onStepClick?: (i: number) => void }) {
  const [expandedStep, setExpandedStep] = useState<number>(activeStep || 0);
  const activeIdx = activeStep !== undefined ? activeStep : expandedStep;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '23px', top: '0', bottom: '0', width: '2px', background: 'linear-gradient(to bottom, #818cf8, #a855f7, #10e18b, #53a7ff, #ffb347, #ff4757)', borderRadius: '1px', opacity: 0.3 }} />
      <div style={{ display: 'grid', gap: '4px' }}>
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = activeIdx === i;
          const isPast = activeIdx > i;
          return (
            <div key={i} style={{ position: 'relative', paddingLeft: '52px', cursor: onStepClick ? 'pointer' : 'default' }} onClick={() => { setExpandedStep(i); onStepClick?.(i); }}>
              <div style={{ position: 'absolute', left: '12px', top: '10px', width: '24px', height: '24px', borderRadius: '50%', background: isActive ? step.color : isPast ? `${step.color}40` : '#151d2b', border: `2px solid ${isActive ? step.color : '#293245'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease', transform: isActive ? 'scale(1.15)' : 'scale(1)' }}>
                <Icon size={12} style={{ color: isActive ? '#fff' : C.dim }} />
              </div>
              <div style={{ background: isActive ? '#151d2b' : 'transparent', borderRadius: '10px', padding: isActive ? '14px 16px' : '10px 16px', border: isActive ? `1px solid ${step.color}40` : '1px solid transparent', transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isActive ? '8px' : '0' }}>
                  <span style={{ fontSize: isActive ? '14px' : '13px', fontWeight: 600, color: isActive ? step.color : C.muted, transition: 'all 0.3s' }}>{i + 1}. {step.title}</span>
                  {isPast && <CheckCircle2 size={14} style={{ color: C.excellent }} />}
                </div>
                {isActive && <div style={{ animation: 'fadeIn 0.3s ease' }}><p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6, margin: '0 0 8px' }}>{step.content}</p>{step.details && step.details.length > 0 && <ul style={{ margin: '4px 0 0', paddingLeft: '18px', fontSize: '12px', color: C.dim, lineHeight: 1.8 }}>{step.details.map((d, j) => <li key={j}>{renderSafeValue(d)}</li>)}</ul>}</div>}
              </div>
              {i < steps.length - 1 && isActive && <div style={{ textAlign: 'center', padding: '6px 0', color: C.dim }}><ChevronDown size={14} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Part 3 — AI Business Advisor ──
export interface AdvisorAnswer { question: string; answer: 'YES' | 'NO' | 'MAYBE'; reason: string; confidence: number; businessImpact: string; estimatedRoi: string; }

export function AIBusinessAdvisor({ answers, onClose }: { answers: AdvisorAnswer[]; onClose?: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [minimized, setMinimized] = useState(false);
  if (!answers || answers.length === 0) return null;
  const answerColor = (a: string) => a === 'YES' ? C.excellent : a === 'NO' ? C.critical : C.needsImprovement;
  if (minimized) return (
    <button onClick={() => setMinimized(false)} style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, padding: '14px 22px', borderRadius: '40px', border: '1px solid rgba(129,140,248,0.4)', background: 'linear-gradient(135deg, #151d2b, #1a1040)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 12px 48px rgba(0,0,0,0.6)', animation: 'pulse-glow 2s infinite' }}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: C.excellent, animation: 'pulse-dot 1.5s infinite' }} />
      <Sparkles size={20} style={{ color: '#818cf8' }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>AI Business Advisor</span><Maximize2 size={14} style={{ color: C.dim }} />
    </button>
  );
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, width: '420px', maxHeight: '600px', overflow: 'hidden', background: 'linear-gradient(135deg, #0f1729 0%, #151d2b 100%)', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '16px', boxShadow: '0 16px 64px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1d2738', background: 'linear-gradient(135deg, rgba(129,140,248,0.08), transparent)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: C.excellent, animation: 'pulse-dot 1.5s infinite' }} />
        <Sparkles size={18} style={{ color: C.accent }} /><span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: C.text }}>AI Business Advisor</span>
        <button onClick={() => setMinimized(true)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '2px' }}><Minimize2 size={14} /></button>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '2px' }}><X size={14} /></button>}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 12px' }}>
        {answers.map((a, i) => (
          <div key={i} style={{ marginTop: '8px', background: '#151d2b', borderRadius: '10px', border: '1px solid #293245', overflow: 'hidden' }}>
            <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${answerColor(a.answer)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: '11px', fontWeight: 800, color: answerColor(a.answer) }}>{a.answer}</span></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{a.question}</div><div style={{ fontSize: '11px', color: answerColor(a.answer), fontWeight: 700, marginTop: '1px' }}>{a.answer}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ConfidenceBadge value={a.confidence} size="sm" />{expanded === i ? <ChevronUp size={14} style={{ color: C.dim }} /> : <ChevronDown size={14} style={{ color: C.dim }} />}</div>
            </button>
            {expanded === i && <div style={{ padding: '0 12px 12px', borderTop: '1px solid #1d2738' }}><div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}><DetailRow icon={Activity} label="Reason" value={a.reason} color={C.accent} /><DetailRow icon={TrendingUp} label="Business Impact" value={a.businessImpact} color={C.excellent} /><DetailRow icon={DollarSign} label="Estimated ROI" value={a.estimatedRoi} color="#10e18b" /></div></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return <div style={{ padding: '6px 8px', background: '#0f1729', borderRadius: '6px', borderLeft: `3px solid ${color}` }}><div style={{ fontSize: '9px', color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}><Icon size={10} /> <SafeValue value={label} /></div><div style={{ fontSize: '12px', color: C.muted }}><SafeValue value={value} /></div></div>;
}

// ── Part 4 — Decision Simulator ──
export interface SimScenario { id: string; label: string; impact: number; confidence: number; effects: { label: string; before: string; after: string; improvement: number }[]; }

export function DecisionSimulator({ scenarios, onRun }: { scenarios: SimScenario[]; onRun?: (id: string) => void }) {
  const [selected, setSelected] = useState<string>(scenarios[0]?.id || '');
  const [running, setRunning] = useState(false);
  const scenario = scenarios.find(s => s.id === selected);
  const handleRun = () => { if (!selected) return; setRunning(true); setTimeout(() => { setRunning(false); onRun?.(selected); }, 1500); };
  if (!scenarios || scenarios.length === 0) return null;
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}><GitBranch size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Decision Simulator</span></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {scenarios.map(s => <button key={s.id} onClick={() => setSelected(s.id)} style={{ padding: '6px 14px', borderRadius: '8px', border: selected === s.id ? `1px solid ${C.accent}` : `1px solid ${C.border}`, background: selected === s.id ? `${C.accent}15` : C.bg, cursor: 'pointer', fontSize: '12px', color: selected === s.id ? C.accent : C.muted, fontWeight: selected === s.id ? 600 : 400 }}>{s.label}</button>)}
      </div>
      {scenario && (
        <div style={{ background: C.bg, borderRadius: '10px', padding: '14px', border: '1px solid #1d2738', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><span style={{ fontSize: '13px', color: C.text, fontWeight: 600 }}>{scenario.label}</span><span style={{ fontSize: '11px', color: scenario.impact != null && scenario.impact >= 0 ? C.excellent : C.dim, fontWeight: 600 }}>{scenario.impact != null ? `Impact: ${scenario.impact >= 0 ? '+' : ''}${scenario.impact}%` : 'Not measured'}</span></div>
          <div style={{ display: 'grid', gap: '8px' }}>{scenario.effects.map((e, i) => (
            <div key={i} style={{ padding: '8px 10px', background: C.card, borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}><span style={{ color: C.muted }}>{e.label}</span><span style={{ color: e.improvement >= 0 ? C.excellent : C.critical, fontWeight: 600 }}>{e.before} → {e.after} ({e.improvement >= 0 ? '+' : ''}{e.improvement}%)</span></div>
              <div style={{ height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: `${Math.min(Math.abs(e.improvement) * 5, 100)}%`, height: '100%', background: e.improvement >= 0 ? C.excellent : C.critical, borderRadius: '2px', transition: 'width 0.5s ease' }} /></div>
            </div>
          ))}</div>
        </div>
      )}
      <button onClick={handleRun} disabled={running || !selected} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: running ? `${C.accent}40` : C.accent, cursor: running ? 'wait' : 'pointer', color: '#fff', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>{running ? <><Loader2 size={16} className="spin" /> Simulating...</> : <><Play size={16} /> Run Simulation</>}</button>
    </div>
  );
}

// ── Part 5 — Competitor Positioning Map ──
export interface CompetitorPoint { name: string; domain?: string; price: number; marketPosition: number; traffic: number; threatScore: number; strengths: string[]; weaknesses: string[]; marketShare?: string; }

export function CompetitorPositioningMap({ competitors, selfPoint }: { competitors: CompetitorPoint[]; selfPoint?: CompetitorPoint }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const W = 520, H = 400, pad = 50;
  const allPoints = [...(selfPoint ? [selfPoint] : []), ...competitors];
  const maxTraffic = Math.max(...allPoints.map(p => p.traffic), 1);
  const minPrice = Math.min(...allPoints.map(p => p.price), 0);
  const maxPrice = Math.max(...allPoints.map(p => p.price), 100);
  const priceRange = maxPrice - minPrice || 1;
  const xScale = (price: number) => pad + ((price - minPrice) / priceRange) * (W - 2 * pad);
  const yScale = (pos: number) => pad + (1 - pos / 100) * (H - 2 * pad);
  const rScale = (traffic: number) => Math.max(8, Math.min(30, (traffic / maxTraffic) * 25));
  if (competitors.length === 0) return null;
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}><Map size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Competitor Positioning Map</span></div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', maxWidth: `${W}px`, height: 'auto' }}>
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#293245" strokeWidth="1" /><line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#293245" strokeWidth="1" />
          <text x={pad} y={pad - 10} fill="#6b7280" fontSize="10" textAnchor="middle">High Position</text><text x={pad} y={H - pad + 20} fill="#6b7280" fontSize="10" textAnchor="middle">Low Price</text>
          <text x={W - pad} y={H - pad + 20} fill="#6b7280" fontSize="10" textAnchor="end">High Price</text><text x={W - pad} y={pad - 10} fill="#6b7280" fontSize="10" textAnchor="end">Low Position</text>
          <text x={W / 2} y={H - pad + 35} fill="#6b7280" fontSize="11" textAnchor="middle">Price →</text><text x={12} y={H / 2} fill="#6b7280" fontSize="11" textAnchor="middle" transform={`rotate(-90, 12, ${H / 2})`}>Market Position →</text>
          <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="#1d2738" strokeWidth="1" strokeDasharray="4,4" /><line x1={W / 2} y1={pad} x2={W / 2} y2={H - pad} stroke="#1d2738" strokeWidth="1" strokeDasharray="4,4" />
          {allPoints.map((p, i) => {
            const cx = xScale(p.price), cy = yScale(p.marketPosition), r = rScale(p.traffic);
            const isHovered = hovered === i;
            const isSelf = selfPoint && p.name === selfPoint.name;
            return <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={isHovered ? r + 4 : r} fill={isSelf ? '#818cf8' : p.threatScore >= 70 ? '#ff4757' : p.threatScore >= 40 ? '#ffb347' : '#10e18b'} fillOpacity={isHovered ? 0.8 : 0.5} stroke={isSelf ? '#a855f7' : '#293245'} strokeWidth={isHovered || isSelf ? 2 : 1} />
              <text x={cx} y={cy + r + 14} fill="#9aa7bd" fontSize="10" textAnchor="middle" fontWeight={isSelf ? 700 : 400}>{isSelf ? `${p.name} (You)` : p.name}</text>
              {isHovered && <g><rect x={Math.min(cx + r + 10, W - 180)} y={Math.max(cy - r - 60, 10)} width="170" height="55" rx="6" fill="#151d2b" stroke="#293245" strokeWidth="1" />
                <text x={Math.min(cx + r + 16, W - 174)} y={Math.max(cy - r - 46, 20)} fill="#e5e7eb" fontSize="11" fontWeight="600">{p.name}</text>
                {p.marketShare && <text x={Math.min(cx + r + 16, W - 174)} y={Math.max(cy - r - 32, 34)} fill="#9aa7bd" fontSize="10">Share: {p.marketShare}</text>}
                <text x={Math.min(cx + r + 16, W - 174)} y={Math.max(cy - r - 20, 46)} fill="#9aa7bd" fontSize="10">Traffic: {p.traffic.toLocaleString()}</text></g>}
            </g>;
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '10px', fontSize: '10px', color: C.dim }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#818cf8', display: 'inline-block' }} /> You</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff4757', opacity: 0.5, display: 'inline-block' }} /> High Threat</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffb347', opacity: 0.5, display: 'inline-block' }} /> Medium</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10e18b', opacity: 0.5, display: 'inline-block' }} /> Low Threat</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>○ Size = Traffic</span>
      </div>
    </div>
  );
}

// ── Part 6 — Market Opportunity Heatmap ──
export interface HeatCell { label: string; value: number; subtitle?: string; }

export function MarketOpportunityHeatmap({ title = 'Market Opportunity', cells }: { title?: string; cells: HeatCell[] }) {
  if (!cells || cells.length === 0) return null;
  const maxVal = Math.max(...cells.map(c => c.value), 1);
  const heatColor = (v: number) => { const pct = v / maxVal; if (pct >= 0.75) return { bg: 'rgba(16,225,139,0.2)', text: C.excellent, label: 'High' }; if (pct >= 0.45) return { bg: 'rgba(255,179,71,0.15)', text: C.needsImprovement, label: 'Medium' }; return { bg: 'rgba(255,71,87,0.1)', text: C.critical, label: 'Low' }; };
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        <span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
        {cells.map((c, i) => {
          const h = heatColor(c.value);
          return <div key={i} style={{ padding: '12px 10px', borderRadius: '8px', background: h.bg, border: `1px solid ${h.text}25`, textAlign: 'center', transition: 'transform 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')} onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            <div style={{ fontSize: '9px', color: h.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{h.label}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '2px' }}>{c.label}</div>
            <div style={{ width: '100%', height: '3px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden', marginBottom: '3px' }}><div style={{ width: `${(c.value / maxVal) * 100}%`, height: '100%', background: h.text, borderRadius: '2px' }} /></div>
            {c.subtitle && <div style={{ fontSize: '9px', color: C.dim }}>{c.subtitle}</div>}
          </div>;
        })}
      </div>
    </div>
  );
}

// ── Part 7 — Business Timeline ──
export interface Milestone { label: string; days: string; color: string; tasks: { title: string; status?: 'done' | 'in-progress' | 'pending'; owner?: string }[]; }

export function BusinessTimeline({ milestones }: { milestones: Milestone[] }) {
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  useEffect(() => { setAnimating(true); const t = setTimeout(() => setAnimating(false), 1000); return () => clearTimeout(t); }, []);
  if (!milestones || milestones.length === 0) return null;
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}><Clock size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Business Roadmap</span></div>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: '16px', top: '0', bottom: '0', width: '2px', background: 'linear-gradient(to bottom, #10e18b, #53a7ff, #a855f7, #ffb347, #ff6b35, #ff4757)', borderRadius: '1px', opacity: 0.4 }} />
        {milestones.map((ms, i) => {
          const isExpanded = expandedMilestone === i;
          const doneCount = ms.tasks.filter(t => t.status === 'done').length;
          return (
            <div key={i} style={{ position: 'relative', paddingLeft: '44px', marginBottom: i < milestones.length - 1 ? '16px' : '0' }}>
              <div style={{ position: 'absolute', left: '6px', top: '6px', width: '22px', height: '22px', borderRadius: '50%', background: ms.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', transition: 'transform 0.3s ease', transform: animating ? 'scale(1.1)' : 'scale(1)', boxShadow: `0 0 12px ${ms.color}40` }}>{ms.days}</div>
              <div style={{ background: C.bg, borderRadius: '10px', border: `1px solid ${isExpanded ? ms.color + '40' : '#1d2738'}`, overflow: 'hidden', transition: 'all 0.3s ease' }}>
                <button onClick={() => setExpandedMilestone(isExpanded ? null : i)} style={{ width: '100%', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: 600, color: ms.color }}>{ms.label}</div><div style={{ fontSize: '11px', color: C.dim, marginTop: '2px' }}>{doneCount}/{ms.tasks.length} tasks completed</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '80px', height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: `${(doneCount / Math.max(ms.tasks.length, 1)) * 100}%`, height: '100%', background: ms.color, borderRadius: '2px', transition: 'width 0.5s ease' }} /></div>
                    {isExpanded ? <ChevronUp size={14} style={{ color: C.dim }} /> : <ChevronDown size={14} style={{ color: C.dim }} />}
                  </div>
                </button>
                {isExpanded && <div style={{ padding: '0 14px 12px', borderTop: '1px solid #1d2738' }}>{ms.tasks.map((t, j) => (
                  <div key={j} style={{ padding: '7px 0', borderBottom: j < ms.tasks.length - 1 ? '1px solid #1d2738' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: t.status === 'done' ? C.excellent : t.status === 'in-progress' ? C.needsImprovement : '#1d2738', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {t.status === 'done' && <CheckCircle2 size={10} style={{ color: '#fff' }} />}{t.status === 'in-progress' && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: '12px', color: C.muted }}>{t.title}</span>
                    </div>
                    {t.owner && <span style={{ fontSize: '10px', color: C.dim }}>{t.owner}</span>}
                  </div>
                ))}</div>}
              </div>
              {i < milestones.length - 1 && <div style={{ textAlign: 'center', padding: '4px 0', color: C.dim }}><ChevronDown size={12} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Part 8 — Executive KPI Dashboard ──
export interface KpiWidgetData { label: string; value: string; trend: number; previousValue: string; target: string; status: 'on-track' | 'at-risk' | 'behind' | 'exceeding'; color: string; sparklineData: number[]; }

function SparklineSvg({ data, color = '#818cf8', width = 80, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}><polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function ExecutiveKPIDashboard({ widgets }: { widgets: KpiWidgetData[] }) {
  if (!widgets || widgets.length === 0) return null;
  const statusConfig = { 'exceeding': { label: 'Exceeding', color: C.excellent, bg: 'rgba(16,225,139,0.1)' }, 'on-track': { label: 'On Track', color: C.good, bg: 'rgba(83,167,255,0.1)' }, 'at-risk': { label: 'At Risk', color: C.needsImprovement, bg: 'rgba(255,179,71,0.1)' }, 'behind': { label: 'Behind', color: C.critical, bg: 'rgba(255,71,87,0.1)' } };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
      {widgets.map((w, i) => {
        const sc = statusConfig[w.status];
        return (
          <div key={i} style={{ background: 'linear-gradient(135deg, #151d2b 0%, #1a2335 100%)', borderRadius: '12px', border: '1px solid #293245', padding: '16px', transition: 'border-color 0.2s, transform 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = w.color + '60'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#293245'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div><div style={{ fontSize: '10px', color: C.dim, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{w.label}</div><div style={{ fontSize: '24px', fontWeight: 700, color: w.color }}>{w.value}</div></div>
              <SparklineSvg data={w.sparklineData} color={w.color} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: C.dim, marginBottom: '8px' }}><span>Prev: <strong style={{ color: C.muted }}>{w.previousValue}</strong></span><span>Target: <strong style={{ color: C.text }}>{w.target}</strong></span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #1d2738' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: w.trend >= 0 ? C.excellent : C.critical }}>{w.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(w.trend)}%</div>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Part 9 — Insight Relationships ──
export interface RelationshipNode { id: string; label: string; value: string; color: string; severity?: 'high' | 'medium' | 'low'; }
export interface RelationshipEdge { from: string; to: string; label?: string; }

export function InsightRelationships({ nodes, edges }: { nodes: RelationshipNode[]; edges: RelationshipEdge[] }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  if (!nodes || nodes.length === 0) return null;
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}><Link size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Insight Relationships</span><span style={{ fontSize: '11px', color: C.dim }}>Why recommendations exist</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
        {nodes.map((node, i) => {
          const isHovered = hoveredNode === node.id || !hoveredNode;
          const isConnected = hoveredNode && (edges.some(e => e.from === hoveredNode && e.to === node.id) || edges.some(e => e.to === hoveredNode && e.from === node.id));
          return (
            <React.Fragment key={node.id}>
              <div onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
                style={{ padding: '10px 16px', borderRadius: '10px', background: isHovered ? `${node.color}12` : C.bg, border: `1px solid ${isHovered ? node.color + '40' : '#1d2738'}`, display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '500px', cursor: 'pointer', transition: 'all 0.2s', opacity: hoveredNode && !isHovered && !isConnected ? 0.4 : 1 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${node.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: node.color }} /></div>
                <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: 600, color: node.color }}>{node.label}</div><div style={{ fontSize: '11px', color: C.muted }}>{node.value}</div></div>
                {node.severity && <StatusBadge status={node.severity} />}
              </div>
              {i < nodes.length - 1 && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}><ChevronDown size={14} style={{ color: C.dim }} />{edges.filter(e => e.from === node.id).map((e, j) => <span key={j} style={{ fontSize: '9px', color: C.dim, background: C.bg, padding: '0 6px', borderRadius: '4px' }}>{e.label || ''}</span>)}</div>}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Part 10 — Evidence Explorer ──
export interface EvidenceItem { source: string; confidence: number; dateCollected: string; website: string; page: string; rawEvidence: string; aiReasoning: string; }

export function EvidenceExplorer({ evidence, onClose }: { evidence: EvidenceItem[]; onClose?: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!evidence || evidence.length === 0) return null;
  return (
    <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1d2738', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shield size={16} style={{ color: C.accent }} /><span style={{ fontSize: '13px', fontWeight: 600, color: C.text, flex: 1 }}>Evidence Explorer</span><span style={{ fontSize: '11px', color: C.dim }}>{evidence.length} sources</span>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={14} /></button>}
      </div>
      <div style={{ padding: '8px 12px 12px' }}>
        {evidence.map((e, i) => (
          <div key={i} style={{ marginTop: '8px', background: C.bg, borderRadius: '8px', border: '1px solid #1d2738', overflow: 'hidden' }}>
            <button onClick={() => setExpanded(expanded === i ? null : i)} style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: e.confidence != null && e.confidence >= 70 ? C.excellent : e.confidence != null && e.confidence >= 40 ? C.needsImprovement : C.dim, flexShrink: 0 }} />
              <div style={{ flex: 1 }}><div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{e.source}</div><div style={{ fontSize: '10px', color: C.dim }}>{e.website} — {e.dateCollected}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ConfidenceBadge value={e.confidence} size="sm" />{expanded === i ? <ChevronUp size={14} style={{ color: C.dim }} /> : <ChevronDown size={14} style={{ color: C.dim }} />}</div>
            </button>
            {expanded === i && <div style={{ padding: '0 12px 10px', borderTop: '1px solid #1d2738' }}>
              <div style={{ marginTop: '8px', display: 'grid', gap: '6px', fontSize: '11px' }}>
                <div><span style={{ color: C.dim }}>Page: </span><span style={{ color: C.muted }}>{e.page}</span></div>
                <div><div style={{ color: C.dim, marginBottom: '2px' }}>Raw Evidence</div><div style={{ padding: '6px 8px', background: '#0f1729', borderRadius: '4px', color: C.muted, fontStyle: 'italic', fontSize: '11px', lineHeight: 1.5 }}>"{e.rawEvidence}"</div></div>
                <div><div style={{ color: C.dim, marginBottom: '2px' }}>AI Reasoning</div><div style={{ padding: '6px 8px', background: 'rgba(129,140,248,0.06)', borderRadius: '4px', color: C.muted, borderLeft: '3px solid #818cf8', fontSize: '11px', lineHeight: 1.5 }}>{e.aiReasoning}</div></div>
              </div>
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Part 11 — Report Preview 2.0 ──
export function ReportPreview20({ chatId, type = 'growth' }: { chatId?: string; type?: 'executive' | 'growth' | 'seo' }) {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [previewSection, setPreviewSection] = useState('cover');
  const [previewMode, setPreviewMode] = useState(false);
  const formats = [
    { format: 'pdf', label: 'PDF', icon: FileText, desc: 'Enterprise report' }, { format: 'docx', label: 'DOCX', icon: FileText, desc: 'Editable document' },
    { format: 'pptx', label: 'PPTX', icon: BarChart2, desc: 'Slide deck' }, { format: 'markdown', label: 'MD', icon: FileText, desc: 'Documentation' },
    { format: 'csv', label: 'CSV', icon: PieChart, desc: 'Raw data' },
  ];
  const previewSections = [{ id: 'cover', label: 'Cover Page' }, { id: 'toc', label: 'Table of Contents' }, { id: 'charts', label: 'Charts' }, { id: 'roadmap', label: 'Roadmap' }, { id: 'appendix', label: 'Appendix' }];
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} style={{ color: C.accent }} /><span style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>Report Preview 2.0</span></div>
          <button onClick={() => setPreviewMode(!previewMode)} style={{ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${C.accent}`, background: previewMode ? `${C.accent}20` : C.bg, cursor: 'pointer', fontSize: '11px', color: C.accent, display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> {previewMode ? 'Close Preview' : 'Open Preview'}</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {formats.map(f => (
            <button key={f.format} onClick={() => setSelectedFormat(f.format)} style={{ padding: '8px 14px', borderRadius: '8px', border: selectedFormat === f.format ? '1px solid #818cf8' : `1px solid ${C.border}`, background: selectedFormat === f.format ? `${C.accent}10` : C.bg, cursor: 'pointer', textAlign: 'center', flex: '1', minWidth: '80px' }}>
              <f.icon size={18} style={{ color: selectedFormat === f.format ? C.accent : C.dim, margin: '0 auto 2px', display: 'block' }} />
              <div style={{ fontSize: '11px', fontWeight: 600, color: selectedFormat === f.format ? C.accent : C.text }}>{f.label}</div>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {previewSections.map(s => (
            <button key={s.id} onClick={() => setPreviewSection(s.id)} style={{ padding: '4px 10px', borderRadius: '4px', border: 'none', background: previewSection === s.id ? `${C.accent}15` : 'transparent', cursor: 'pointer', fontSize: '11px', color: previewSection === s.id ? C.accent : C.muted, fontWeight: previewSection === s.id ? 600 : 400 }}>{s.label}</button>
          ))}
        </div>
      </div>
      {previewMode && (
        <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }} /><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b' }} /><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>{previewSection === 'cover' ? 'Report Cover' : previewSection === 'toc' ? 'Table of Contents' : previewSection === 'charts' ? 'Charts' : previewSection === 'roadmap' ? 'Roadmap' : 'Appendix'}</span>
          </div>
          <div style={{ padding: '32px', color: '#1a1a2e', minHeight: '300px', maxHeight: '450px', overflow: 'auto', fontSize: '13px', lineHeight: 1.6 }}>
            {previewSection === 'cover' && <div style={{ textAlign: 'center', padding: '40px 0' }}><div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>Enterprise Business Intelligence Report</div><div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>Comprehensive Analysis & Strategic Recommendations</div><div style={{ width: '60px', height: '4px', background: '#818cf8', margin: '0 auto 20px', borderRadius: '2px' }} /><div style={{ fontSize: '12px', color: '#9ca3af' }}>Generated by AI Marketing Platform</div></div>}
            {previewSection === 'toc' && <div><h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', marginBottom: '12px' }}>Table of Contents</h3>{['Executive Summary', 'Market Analysis', 'Competitive Intelligence', 'Audience Insights', 'Growth Strategy', 'Action Plan', 'Financial Projections', 'Risk Assessment'].map((s, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dotted #e5e7eb', fontSize: '13px', color: '#374151' }}><span>{i + 1}. {s}</span><span style={{ color: '#9ca3af' }}>p.{i + 3}</span></div>)}</div>}
            {previewSection === 'charts' && <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Charts and visualizations will appear here in the generated report.</div>}
            {previewSection === 'roadmap' && <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Implementation roadmap timeline will render here.</div>}
            {previewSection === 'appendix' && <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Appendix with methodology, data sources, and disclaimers.</div>}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {formats.map(f => (
          <button key={f.format} onClick={() => { if (chatId) downloadReport(chatId, type, f.format); }}
            style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', color: C.text, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = C.accent; (e.target as HTMLElement).style.background = '#1a2335'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = C.border; (e.target as HTMLElement).style.background = C.card; }}>
            <Download size={14} /> Download {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Part 12 — Presentation Mode ──
export interface PresentationSlide { title: string; content: React.ReactNode; icon?: any; }

export function PresentationMode({ slides, onClose }: { slides: PresentationSlide[]; onClose?: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];
  const goNext = () => { if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1); };
  const goPrev = () => { if (currentSlide > 0) setCurrentSlide(currentSlide - 1); };
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape') { onClose?.(); }
    };
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  }, [currentSlide, slides.length]);
  if (!slides || slides.length === 0) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'linear-gradient(135deg, #0b1220 0%, #0f1729 50%, #151d2b 100%)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #293245' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Monitor size={16} style={{ color: C.accent }} /><span style={{ fontSize: '12px', color: C.dim }}>Presentation Mode</span><span style={{ fontSize: '12px', color: C.muted }}>Slide {currentSlide + 1} of {slides.length}</span></div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={goPrev} disabled={currentSlide === 0} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #293245', background: 'transparent', cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', color: currentSlide === 0 ? C.dim : C.muted }}><SkipBack size={14} /></button>
          <div style={{ width: '120px', height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}><div style={{ width: `${((currentSlide + 1) / slides.length) * 100}%`, height: '100%', background: C.accent, borderRadius: '2px', transition: 'width 0.3s' }} /></div>
          <button onClick={goNext} disabled={currentSlide === slides.length - 1} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #293245', background: 'transparent', cursor: currentSlide === slides.length - 1 ? 'not-allowed' : 'pointer', color: currentSlide === slides.length - 1 ? C.dim : C.muted }}><SkipForward size={14} /></button>
          <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ff4757', background: 'transparent', cursor: 'pointer', color: '#ff4757', fontSize: '11px', marginLeft: '12px' }}>Exit <X size={12} style={{ marginLeft: '4px' }} /></button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', overflow: 'auto' }}>
        <div style={{ maxWidth: '900px', width: '100%', textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
          {slide.icon && <slide.icon size={48} style={{ color: C.accent, margin: '0 auto 20px', display: 'block' }} />}
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: C.text, marginBottom: '24px', lineHeight: 1.3 }}>{slide.title}</h2>
          <div style={{ fontSize: '16px', color: C.muted, lineHeight: 1.8, maxWidth: '700px', margin: '0 auto' }}>{slide.content}</div>
        </div>
      </div>
      <div style={{ padding: '12px 24px', borderTop: '1px solid #293245', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.dim }}><span>← / ↑ Previous | Space / → / ↓ Next | Esc Exit</span><span>AI Marketing Platform • Enterprise Intelligence</span></div>
    </div>
  );
}

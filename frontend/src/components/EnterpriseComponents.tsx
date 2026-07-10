import React, { useState, useRef, useEffect, useCallback } from 'react';
import { renderSafeValue } from '../lib/normalizers';
import SafeValue from './SafeValue';
import {
  ChevronDown, ChevronUp, ChevronRight, ExternalLink, Clock, Shield, AlertTriangle,
  CheckCircle2, Target, Users, TrendingUp, Zap, DollarSign, Building, Code,
  Star, BarChart2, PieChart, Info, Lightbulb, Flag, Calendar, UserCheck,
  Search, X, Layers, ArrowRight, Maximize2, Minimize2, Loader2, FileText
} from 'lucide-react';

// ──────────────────────────────────────────────
// Part 12 — Empty State
// ──────────────────────────────────────────────
export function EnterpriseEmptyState({ icon: Icon = AlertTriangle, title = 'Verified data unavailable', message = 'Collect more evidence to populate this section.', action, actionLabel }: {
  icon?: any; title?: string; message?: string; action?: () => void; actionLabel?: string;
}) {
  return (
    <div className="enterprise-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: '#0f1729', borderRadius: '12px', border: '1px dashed #293245', textAlign: 'center', minHeight: '200px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(42,163,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
        <Icon size={24} style={{ color: '#53a7ff' }} />
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#e5e7eb' }}><SafeValue value={title} /></h3>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280', maxWidth: '400px' }}><SafeValue value={message} /></p>
      {action && actionLabel && (
        <button onClick={action} style={{ padding: '8px 16px', background: '#1d2738', border: '1px solid #293245', borderRadius: '8px', color: '#53a7ff', cursor: 'pointer', fontSize: '13px' }}>
          <SafeValue value={actionLabel} />
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 13 — Loading Skeleton
// ──────────────────────────────────────────────
export function SkeletonBar({ width = '100%', height = '16px' }: { width?: string; height?: string }) {
  return <div className="skeleton-bar" style={{ width, height, background: 'linear-gradient(90deg, #1d2738 25%, #293245 50%, #1d2738 75%)', backgroundSize: '200% 100%', borderRadius: '4px', animation: 'shimmer 1.5s infinite' }} />;
}

export function LoadingSkeleton({ type = 'card', count = 3 }: { type?: 'card' | 'table' | 'list'; count?: number }) {
  const cards = Array.from({ length: count });
  if (type === 'card') {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
      {cards.map((_, i) => (
        <div key={i} style={{ background: '#151d2b', borderRadius: '10px', padding: '20px', border: '1px solid #293245' }}>
          <SkeletonBar width="60%" height="18px" />
          <div style={{ height: '12px' }} />
          <SkeletonBar width="90%" height="12px" />
          <div style={{ height: '8px' }} />
          <SkeletonBar width="70%" height="12px" />
          <div style={{ height: '16px' }} />
          <SkeletonBar width="40%" height="14px" />
        </div>
      ))}
    </div>;
  }
  if (type === 'table') {
    return <div style={{ background: '#151d2b', borderRadius: '10px', padding: '16px', border: '1px solid #293245' }}>
      {cards.map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < count - 1 ? '1px solid #1d2738' : 'none' }}>
          <SkeletonBar width="25%" height="14px" />
          <SkeletonBar width="40%" height="14px" />
          <SkeletonBar width="20%" height="14px" />
        </div>
      ))}
    </div>;
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
    {cards.map((_, i) => <SkeletonBar key={i} width={`${70 + i * 10}%`} height="14px" />)}
  </div>;
}

// ──────────────────────────────────────────────
// Part 4 — Visual Indicators
// ──────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color, height = '6px', label, showValue = true }: { value: number; max?: number; color?: string; height?: string; label?: string; showValue?: boolean }) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const barColor = color || (pct >= 70 ? '#10e18b' : pct >= 40 ? '#ffb347' : '#ff4757');
  return <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    {label && <span style={{ fontSize: '11px', color: '#9aa7bd', minWidth: '80px', textAlign: 'right' }}>{label}</span>}
    <div style={{ flex: 1, height, background: '#1d2738', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.5s ease' }} />
    </div>
    {showValue && <span style={{ fontSize: '11px', fontWeight: 600, color: barColor, minWidth: '32px', textAlign: 'right' }}>{Math.round(pct)}%</span>}
  </div>;
}

export function StatusBadge({ status, size = 'sm' }: { status?: string; size?: 'sm' | 'md' }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    critical: { label: 'Critical', color: '#ff4757', bg: 'rgba(255,71,87,0.12)' },
    high: { label: 'High', color: '#ff6b35', bg: 'rgba(255,107,53,0.12)' },
    medium: { label: 'Medium', color: '#ffb347', bg: 'rgba(255,179,71,0.12)' },
    low: { label: 'Low', color: '#10e18b', bg: 'rgba(16,225,139,0.12)' },
    verified: { label: 'Verified', color: '#10e18b', bg: 'rgba(16,225,139,0.12)' },
    estimated: { label: 'Estimated', color: '#ffb347', bg: 'rgba(255,179,71,0.12)' },
    unknown: { label: 'Unknown', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
    ok: { label: 'OK', color: '#10e18b', bg: 'rgba(16,225,139,0.12)' },
    warning: { label: 'Warning', color: '#ffb347', bg: 'rgba(255,179,71,0.12)' },
    error: { label: 'Error', color: '#ff4757', bg: 'rgba(255,71,87,0.12)' },
  };
  const s = map[status?.toLowerCase() || ''] || { label: status || 'Unknown', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
  const fontSize = size === 'md' ? '11px' : '10px';
  const padding = size === 'md' ? '4px 10px' : '2px 8px';
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize, fontWeight: 600, padding, background: s.bg, color: s.color, borderRadius: '4px', letterSpacing: '0.3px' }}>{s.label}</span>;
}

export function ConfidenceBadge({ value, size = 'sm' }: { value?: number; size?: 'sm' | 'md' }) {
  if (value === null || value === undefined) return null;
  const color = value >= 70 ? '#10e18b' : value >= 40 ? '#ffb347' : '#ff4757';
  const bg = value >= 70 ? 'rgba(16,225,139,0.1)' : value >= 40 ? 'rgba(255,179,71,0.1)' : 'rgba(255,71,87,0.1)';
  const fs = size === 'md' ? '11px' : '10px';
  return <span style={{ fontSize: fs, fontWeight: 600, padding: '2px 8px', background: bg, color, borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Shield size={10} />{Math.round(value)}%</span>;
}

export function ImpactBadge({ impact }: { impact?: string }) {
  if (!impact) return null;
  const map: Record<string, { color: string; bg: string }> = {
    high: { color: '#10e18b', bg: 'rgba(16,225,139,0.1)' },
    medium: { color: '#ffb347', bg: 'rgba(255,179,71,0.1)' },
    low: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  };
  const s = map[impact.toLowerCase()] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
  return <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', background: s.bg, color: s.color, borderRadius: '4px' }}>{impact} Impact</span>;
}

export function PriorityChip({ priority }: { priority?: string }) {
  if (!priority) return null;
  const map: Record<string, { color: string; bg: string }> = {
    critical: { color: '#ff4757', bg: 'rgba(255,71,87,0.15)' },
    high: { color: '#ff6b35', bg: 'rgba(255,107,53,0.15)' },
    medium: { color: '#ffb347', bg: 'rgba(255,179,71,0.15)' },
    low: { color: '#10e18b', bg: 'rgba(16,225,139,0.15)' },
  };
  const s = map[priority.toLowerCase()] || { color: '#9aa7bd', bg: 'rgba(154,167,189,0.1)' };
  return <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', background: s.bg, color: s.color, borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}><SafeValue value={priority} /></span>;
}

export function RoiIndicator({ value, suffix = '%' }: { value?: number; suffix?: string }) {
  if (value === null || value === undefined) return null;
  const color = value >= 100 ? '#10e18b' : value >= 50 ? '#ffb347' : value >= 0 ? '#ff6b35' : '#ff4757';
  const arrow = value >= 100 ? '↑' : value >= 0 ? '→' : '↓';
  return <span style={{ fontSize: '12px', fontWeight: 600, color, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>{arrow} {value}{suffix} ROI</span>;
}

export function DifficultyIndicator({ value }: { value?: number }) {
  if (value === null || value === undefined) return null;
  const color = value >= 70 ? '#ff4757' : value >= 40 ? '#ffb347' : '#10e18b';
  const label = value >= 70 ? 'Hard' : value >= 40 ? 'Moderate' : 'Easy';
  return <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', background: `${color}18`, color, borderRadius: '4px' }}>{label} ({value}/100)</span>;
}

// ──────────────────────────────────────────────
// Part 1 — Executive KPI Dashboard
// ──────────────────────────────────────────────
export interface KpiItem {
  label: string;
  value: string | number;
  icon?: any;
  color?: string;
  tooltip?: string;
}

export function KPIDashboard({ items, columns = 5 }: { items: KpiItem[]; columns?: number }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="kpi-dashboard" style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${columns <= 4 ? '180px' : '150px'}, 1fr))`, gap: '10px', marginBottom: '20px' }}>
      {items.map((item, i) => {
        const Icon = item.icon || Info;
        return (
          <div key={i} className="kpi-card-enterprise" title={item.tooltip}
            style={{ background: 'linear-gradient(135deg, #151d2b 0%, #1a2335 100%)', border: '1px solid #293245', borderRadius: '10px', padding: '14px 12px', textAlign: 'center', transition: 'border-color 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: item.color ? `${item.color}15` : 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} style={{ color: item.color || '#818cf8' }} />
              </div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: item.color || '#e5e7eb', lineHeight: 1.2, marginBottom: '4px' }}>{item.value}</div>
            <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 2 — Story Section
// ──────────────────────────────────────────────
export function StorySection({ number, title, icon: Icon, children, color = '#6366f1', defaultOpen = true }: {
  number: string; title: string; icon?: any; children: React.ReactNode; color?: string; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="story-section" style={{ marginBottom: '16px', background: '#0f1729', borderRadius: '12px', border: '1px solid #293245', overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#e5e7eb', fontSize: '14px', fontWeight: 600, textAlign: 'left' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color, flexShrink: 0 }}>{number}</div>
        {Icon && <Icon size={18} style={{ color, flexShrink: 0 }} />}
        <span style={{ flex: 1 }}>{title}</span>
        {open ? <ChevronUp size={16} style={{ color: '#6b7280' }} /> : <ChevronDown size={16} style={{ color: '#6b7280' }} />}
      </button>
      {open && <div style={{ padding: '0 18px 16px' }}>{children}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 3 — Insight Card (Enterprise Expandable)
// ──────────────────────────────────────────────
export interface EnterpriseInsight {
  title?: string;
  description?: string;
  severity?: string;
  confidence?: number;
  businessImpact?: string;
  evidence?: string;
  whyItMatters?: string;
  recommendation?: string;
  expectedGain?: string;
  owner?: string;
  timeline?: string;
  estimatedEffort?: string;
  dependencies?: string[];
  source?: string;
  url?: string;
  collectedAt?: string;
  collector?: string;
}

export function EnterpriseInsightCard({ insight, defaultOpen = false }: { insight: EnterpriseInsight; defaultOpen?: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [showEvidence, setShowEvidence] = useState(false);
  if (!insight) return null;

  const hasDetails = insight.businessImpact || insight.recommendation || insight.expectedGain || insight.owner || insight.timeline || insight.dependencies?.length;
  const hasEvidence = insight.evidence || insight.source || insight.url || insight.collectedAt;

  return (
    <div className="enterprise-insight-card" style={{ background: '#151d2b', borderRadius: '10px', border: '1px solid #293245', marginBottom: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              {insight.title && <h4 style={{ margin: 0, fontSize: '14px', color: '#e5e7eb', fontWeight: 600 }}>{renderSafeValue(insight.title)}</h4>}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {insight.severity && <StatusBadge status={insight.severity} />}
                {insight.confidence !== undefined && <ConfidenceBadge value={insight.confidence} />}
              </div>
            </div>
            {insight.description && <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9aa7bd', lineHeight: 1.5 }}>{renderSafeValue(insight.description)}</p>}
          </div>
          <div style={{ color: '#6b7280', flexShrink: 0, marginTop: '2px' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #1d2738' }}>
          {insight.businessImpact && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(16,225,139,0.06)', borderRadius: '8px', borderLeft: '3px solid #10e18b' }}>
              <div style={{ fontSize: '11px', color: '#10e18b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Business Impact</div>
              <div style={{ fontSize: '13px', color: '#d1d5db' }}>{renderSafeValue(insight.businessImpact)}</div>
            </div>
          )}

          {insight.recommendation && (
            <div style={{ marginTop: '8px', padding: '10px 12px', background: 'rgba(42,163,255,0.06)', borderRadius: '8px', borderLeft: '3px solid #53a7ff' }}>
              <div style={{ fontSize: '11px', color: '#53a7ff', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Recommendation</div>
              <div style={{ fontSize: '13px', color: '#d1d5db' }}>{renderSafeValue(insight.recommendation)}</div>
            </div>
          )}

          {insight.whyItMatters && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(255,179,71,0.06)', borderRadius: '8px', borderLeft: '3px solid #ffb347' }}>
              <div style={{ fontSize: '11px', color: '#ffb347', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Why It Matters</div>
              <div style={{ fontSize: '13px', color: '#d1d5db' }}>{renderSafeValue(insight.whyItMatters)}</div>
            </div>
          )}

          {hasDetails && (
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
              {insight.expectedGain && <DetailChip icon={TrendingUp} label="Expected Gain" value={insight.expectedGain} />}
              {insight.owner && <DetailChip icon={UserCheck} label="Owner" value={insight.owner} />}
              {insight.timeline && <DetailChip icon={Calendar} label="Timeline" value={insight.timeline} />}
              {insight.estimatedEffort && <DetailChip icon={Zap} label="Effort" value={insight.estimatedEffort} />}
              {insight.dependencies?.length ? <DetailChip icon={Layers} label="Dependencies" value={insight.dependencies.join(', ')} /> : null}
            </div>
          )}

          {hasEvidence && (
            <div style={{ marginTop: '10px' }}>
              <button onClick={(e) => { e.stopPropagation(); setShowEvidence(!showEvidence); }}
                style={{ background: 'transparent', border: 'none', color: '#53a7ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', fontSize: '12px' }}>
                <Shield size={14} /> {showEvidence ? 'Hide Evidence' : 'View Evidence'}
                {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showEvidence && <EvidenceDetail insight={insight} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailChip({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#0f1729', borderRadius: '6px', fontSize: '11px' }}>
      <Icon size={12} style={{ color: '#6b7280', flexShrink: 0 }} />
      <div><span style={{ color: '#6b7280' }}>{label}: </span><span style={{ color: '#d1d5db', fontWeight: 500 }}>{renderSafeValue(value)}</span></div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 5 — Evidence Drawer
// ──────────────────────────────────────────────
function EvidenceDetail({ insight }: { insight: EnterpriseInsight }) {
  const evidenceItems = [
    { source: insight.source || 'Firecrawl', confidence: typeof insight.confidence === 'number' ? insight.confidence : null, collectedAt: insight.collectedAt, collector: insight.collector || 'AI Scraper', url: insight.url },
  ];
  return (
    <div style={{ marginTop: '8px', padding: '12px', background: '#0f1729', borderRadius: '8px', border: '1px solid #1d2738' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Collected From</div>
      {evidenceItems.map((item, i) => (
        <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '12px', padding: '8px 0', borderBottom: i < evidenceItems.length - 1 ? '1px solid #1d2738' : 'none' }}>
          <span style={{ color: '#e5e7eb', fontWeight: 500 }}><Shield size={12} style={{ marginRight: '4px' }} />{item.source}</span>
          {item.confidence != null && <span style={{ color: item.confidence >= 70 ? '#10e18b' : '#ffb347' }}>{item.confidence}%</span>}
          {item.collectedAt && <span style={{ color: '#6b7280' }}><Clock size={12} style={{ marginRight: '3px' }} />{new Date(item.collectedAt).toLocaleDateString()}</span>}
          {item.collector && <span style={{ color: '#6b7280' }}>Collector: {item.collector}</span>}
          {item.url && <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#53a7ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><ExternalLink size={12} />Source URL</a>}
        </div>
      ))}
      {insight.evidence && <div style={{ marginTop: '8px', padding: '8px', background: '#151d2b', borderRadius: '6px', fontSize: '12px', color: '#9aa7bd', fontStyle: 'italic' }}>"{renderSafeValue(insight.evidence)}"</div>}
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 6 — Timeline
// ──────────────────────────────────────────────
export interface TimelinePhase {
  label: string;
  days: string;
  color: string;
  tasks: { title?: string; owner?: string; dependencies?: string; expectedKpi?: string; priority?: string }[];
}

export function Timeline({ phases }: { phases: TimelinePhase[] }) {
  if (!phases || phases.length === 0) return <EnterpriseEmptyState title="No timeline data" message="Action plan data unavailable. Connect analytics to generate." />;
  return (
    <div className="enterprise-timeline">
      {phases.map((phase, i) => {
        if (!phase.tasks || phase.tasks.length === 0) return null;
        return (
          <div key={i} className="timeline-phase" style={{ position: 'relative', paddingLeft: '32px', paddingBottom: i < phases.length - 1 ? '20px' : '0' }}>
            <div style={{ position: 'absolute', left: '10px', top: '4px', bottom: i < phases.length - 1 ? '4px' : 'auto', width: '2px', background: '#1d2738' }} />
            <div style={{ position: 'absolute', left: '0', top: '4px', width: '22px', height: '22px', borderRadius: '50%', background: phase.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff' }}>{phase.days}</div>
            <div style={{ background: '#151d2b', borderRadius: '10px', border: '1px solid #293245', padding: '12px 14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: phase.color, marginBottom: '8px' }}>{renderSafeValue(phase.label)}</div>
              {phase.tasks.map((task, j) => (
                <div key={j} style={{ padding: '6px 0', borderBottom: j < phase.tasks.length - 1 ? '1px solid #1d2738' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: phase.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#d1d5db' }}>{renderSafeValue(task.title) || 'Task'}</span>
                    </div>
                    {task.priority && <PriorityChip priority={task.priority} />}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px', marginLeft: '14px', fontSize: '11px', color: '#6b7280' }}>
                    {task.owner && <span>Owner: {renderSafeValue(task.owner)}</span>}
                    {task.dependencies && <span>Depends: {renderSafeValue(task.dependencies)}</span>}
                    {task.expectedKpi && <span style={{ color: '#10e18b' }}>KPI: {renderSafeValue(task.expectedKpi)}</span>}
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

// ──────────────────────────────────────────────
// Part 7 — Competitor Card (Enterprise)
// ──────────────────────────────────────────────
export function EnterpriseCompetitorCard({ competitor }: { competitor: any }) {
  const [expanded, setExpanded] = useState(false);
  if (!competitor) return null;
  const ef = competitor.enterpriseFields || {};
  const traffic = competitor.trafficEstimate || ef.trafficEstimate || '';
  const employees = competitor.employeeCount || ef.employeeCount || ef.employees || '';
  const funding = competitor.funding || ef.funding || '';
  const marketShare = competitor.marketShare || ef.marketShare || '';
  const pricing = competitor.pricing || ef.pricing || '';
  const technologies = competitor.technologies || ef.technologies || [];
  const strengths = competitor.strengths || ef.strengths || [];
  const weaknesses = competitor.weaknesses || ef.weaknesses || [];
  const threatScore = competitor.threatScore || competitor.similarityScore || ef.threatScore || 0;

  const hasExtended = employees || funding || marketShare || pricing || technologies.length;

  return (
    <div className="enterprise-competitor-card" style={{ background: '#151d2b', borderRadius: '10px', border: '1px solid #293245', overflow: 'hidden' }}>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: '0 0 2px', fontSize: '15px', color: '#e5e7eb' }}>{renderSafeValue(competitor.name || competitor.domain) || 'Unknown'}</h4>
            {(competitor.website || competitor.domain) && (
              <a href={competitor.website || `https://${competitor.domain}`} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#53a7ff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ExternalLink size={10} />{renderSafeValue(competitor.domain || competitor.website)}
              </a>
            )}
          </div>
          {threatScore > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Threat</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: threatScore >= 70 ? '#ff4757' : threatScore >= 40 ? '#ffb347' : '#10e18b' }}>{Math.round(threatScore)}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {traffic && <MetricMini icon={TrendingUp} label="Traffic" value={traffic} />}
          {employees && <MetricMini icon={Building} label="Employees" value={employees} />}
          {funding && <MetricMini icon={DollarSign} label="Funding" value={funding} />}
          {marketShare && <MetricMini icon={PieChart} label="Market Share" value={marketShare} />}
          {pricing && <MetricMini icon={Tag} label="Pricing" value={pricing} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          {strengths.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#10e18b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Strengths</div>
              <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '12px', color: '#9aa7bd' }}>
                {strengths.slice(0, 3).map((s: string, i: number) => <li key={i}>{renderSafeValue(s)}</li>)}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#ff4757', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Weaknesses</div>
              <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '12px', color: '#9aa7bd' }}>
                {weaknesses.slice(0, 3).map((w: string, i: number) => <li key={i}>{renderSafeValue(w)}</li>)}
              </ul>
            </div>
          )}
        </div>

        {hasExtended && (
          <button onClick={() => setExpanded(!expanded)} style={{ background: '#0f1729', border: '1px solid #1d2738', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9aa7bd', width: '100%', justifyContent: 'center' }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? 'Less' : 'More'} Details
          </button>
        )}

        {expanded && (
          <div style={{ marginTop: '10px', padding: '12px', background: '#0f1729', borderRadius: '8px' }}>
            {technologies.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Technology: </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {technologies.slice(0, 8).map((t: any, i: number) => (
                    <span key={i} style={{ padding: '2px 6px', background: '#151d2b', borderRadius: '4px', fontSize: '10px', color: '#53a7ff' }}>{renderSafeValue(typeof t === 'string' ? t : t.name || t)}</span>
                  ))}
                </div>
              </div>
            )}
            {competitor.opportunityScore != null && (
              <div style={{ fontSize: '12px', color: '#10e18b' }}>Opportunity Score: {competitor.opportunityScore}/100</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricMini({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: '#0f1729', borderRadius: '6px', fontSize: '11px' }}>
      <Icon size={12} style={{ color: '#6b7280' }} />
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ color: '#d1d5db', fontWeight: 500 }}>{renderSafeValue(value)}</span>
    </div>
  );
}

function TagIcon() { return null; }
const Tag = DollarSign;

// ──────────────────────────────────────────────
// Part 8 — Audience Card (Enterprise Premium)
// ──────────────────────────────────────────────
export function EnterpriseAudienceCard({ persona }: { persona: any }) {
  if (!persona) return null;
  const initials = (persona.name || persona.role || '?').charAt(0).toUpperCase();
  return (
    <div className="enterprise-audience-card" style={{ background: '#151d2b', borderRadius: '10px', border: '1px solid #293245', padding: '18px', borderTop: '4px solid #a855f7' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 2px', fontSize: '15px', color: '#e5e7eb' }}>{renderSafeValue(persona.role || persona.name) || 'Target Persona'}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {persona.companySize && <BadgePill label="Company Size" value={persona.companySize} />}
            {persona.intentScore && <BadgePill label="Intent" value={`${persona.intentScore}%`} color="#ffb347" />}
            {persona.budget && <BadgePill label="Budget" value={persona.budget} color="#10e18b" />}
            {persona.buyingStage && <BadgePill label="Stage" value={persona.buyingStage} color="#53a7ff" />}
            {persona.decisionAuthority && <BadgePill label="Authority" value={persona.decisionAuthority} />}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {(persona.painPoints || persona.frustrations || []).length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: '#ff4757', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Pain Points</div>
            <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '12px', color: '#9aa7bd' }}>
              {(persona.painPoints || persona.frustrations || []).slice(0, 3).map((p: string, i: number) => <li key={i}>{renderSafeValue(p)}</li>)}
            </ul>
          </div>
        )}
        {(persona.goals || []).length > 0 && (
          <div>
            <div style={{ fontSize: '10px', color: '#10e18b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Goals</div>
            <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '12px', color: '#9aa7bd' }}>
              {persona.goals.slice(0, 3).map((g: string, i: number) => <li key={i}>{renderSafeValue(g)}</li>)}
            </ul>
          </div>
        )}
      </div>
      {(persona.buyingTriggers || []).length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '10px', color: '#ffb347', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Buying Triggers</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {(persona.buyingTriggers || []).slice(0, 4).map((bt: string, i: number) => (
              <span key={i} style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(255,179,71,0.08)', color: '#ffb347', borderRadius: '4px' }}>{renderSafeValue(bt)}</span>
            ))}
          </div>
        </div>
      )}
      {persona.evidence && <div style={{ marginTop: '10px' }}><ConfidenceBadge value={typeof persona.confidence === 'number' ? persona.confidence : (persona.evidence?.confidence ?? null)} /></div>}
    </div>
  );
}

function BadgePill({ label, value, color = '#6b7280' }: { label: string; value: string; color?: string }) {
  if (!value) return null;
  return <span style={{ fontSize: '10px', padding: '2px 8px', background: `${color}12`, color, borderRadius: '4px', fontWeight: 500 }}>{label}: {renderSafeValue(value)}</span>;
}

// ──────────────────────────────────────────────
// Part 9 — Technology Dashboard
// ──────────────────────────────────────────────
const TECH_CATEGORIES: Record<string, { label: string; color: string }> = {
  frontend: { label: 'Frontend', color: '#53a7ff' },
  backend: { label: 'Backend', color: '#10e18b' },
  database: { label: 'Database', color: '#ffb347' },
  hosting: { label: 'Hosting', color: '#a855f7' },
  analytics: { label: 'Analytics', color: '#ff6b35' },
  crm: { label: 'CRM', color: '#06b6d4' },
  email: { label: 'Email', color: '#ec4899' },
  security: { label: 'Security', color: '#ff4757' },
  payments: { label: 'Payments', color: '#10e18b' },
  infrastructure: { label: 'Infrastructure', color: '#6366f1' },
  marketing: { label: 'Marketing', color: '#f59e0b' },
  cms: { label: 'CMS', color: '#8b5cf6' },
};

export function TechnologyDashboard({ technologies }: { technologies: any[] }) {
  if (!technologies || technologies.length === 0) return <EnterpriseEmptyState title="Technology data unavailable" message="Technology fingerprinting inconclusive. Connect analytics for full stack detection." />;

  const groups: Record<string, any[]> = {};
  technologies.forEach(t => {
    const cat = (t.category || 'other').toLowerCase();
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(t);
  });

  return (
    <div className="tech-dashboard">
      {Object.entries(groups).map(([cat, items]) => {
        const catInfo = TECH_CATEGORIES[cat] || { label: cat.charAt(0).toUpperCase() + cat.slice(1), color: '#6b7280' };
        return (
          <div key={cat} style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: catInfo.color }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#d1d5db' }}>{catInfo.label}</span>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>({items.length})</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px' }}>
              {items.map((t, i) => {
                const conf = typeof t.confidence === 'number' ? t.confidence : 0;
                const confColor = conf >= 90 ? '#10e18b' : conf >= 70 ? '#53a7ff' : conf >= 40 ? '#ffb347' : '#ff4757';
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#0f1729', borderRadius: '6px', border: '1px solid #1d2738' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#d1d5db', fontWeight: 500 }}>{renderSafeValue(t.name)}</span>
                      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '1px' }}>Detected by: {renderSafeValue(t.source || t.evidence?.source) || 'Firecrawl'}</div>
                    </div>
                    <ConfidenceBadge value={conf} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 11 — Smart Navigation
// ──────────────────────────────────────────────
export interface NavItem {
  id: string;
  label: string;
  icon?: any;
}

export function SmartNavigation({ items, activeId, onNavigate }: { items: NavItem[]; activeId: string; onNavigate: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { setVisible(!entry.isIntersecting); },
      { threshold: 0 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <>
      <div ref={observerRef} />
      {visible && (
        <div className="smart-navigation" style={{
          position: 'sticky', top: '0', zIndex: 50,
          background: 'linear-gradient(135deg, #0f1729 0%, #151d2b 100%)',
          borderBottom: '1px solid #293245', padding: '8px 12px',
          display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '16px',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {items.map(item => {
            const active = activeId === item.id;
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: 'none',
                  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: active ? '#818cf8' : '#9aa7bd', cursor: 'pointer',
                  fontSize: '12px', fontWeight: active ? 600 : 400,
                  whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px',
                  transition: 'all 0.15s',
                }}>
                {Icon && <Icon size={14} />}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// Part 14 — Search Inside Results
// ──────────────────────────────────────────────
export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');
  return (
    <div style={{ position: 'relative', marginBottom: '14px' }}>
      <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
      <input value={query} onChange={e => { setQuery(e.target.value); onSearch(e.target.value); }}
        placeholder="Search inside results..."
        style={{ width: '100%', padding: '8px 12px 8px 36px', background: '#151d2b', border: '1px solid #293245', borderRadius: '8px', color: '#e5e7eb', fontSize: '13px', outline: 'none' }}
      />
      {query && (
        <button onClick={() => { setQuery(''); onSearch(''); }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 4 — Section with Progress/Score Bars (reusable)
// ──────────────────────────────────────────────
export function ScoreSection({ title, scores }: { title: string; scores: { label: string; value: number; max?: number; color?: string }[] }) {
  if (!scores || scores.length === 0) return null;
  return (
    <div style={{ background: '#151d2b', borderRadius: '10px', border: '1px solid #293245', padding: '16px', marginBottom: '14px' }}>
      <h4 style={{ margin: '0 0 12px', fontSize: '13px', color: '#d1d5db' }}>{title}</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {scores.map((s, i) => <ProgressBar key={i} label={s.label} value={s.value} max={s.max || 100} color={s.color} />)}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 14 — Show More / Show Less
// ──────────────────────────────────────────────
export function ExpandableSection({ children, maxHeight = 200, showMoreText = 'Show More', showLessText = 'Show Less' }: { children: React.ReactNode; maxHeight?: number; showMoreText?: string; showLessText?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.scrollHeight > maxHeight) {
      setNeedsTruncation(true);
    }
  }, [children, maxHeight]);

  return (
    <div>
      <div ref={contentRef} style={{ overflow: 'hidden', maxHeight: expanded ? 'none' : `${maxHeight}px`, transition: 'max-height 0.3s ease' }}>
        {children}
      </div>
      {needsTruncation && (
        <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: 'none', color: '#53a7ff', cursor: 'pointer', fontSize: '12px', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {expanded ? showLessText : showMoreText}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Part 10 — Mini Chart Wrappers (visual only)
// ──────────────────────────────────────────────
export function MiniRadarLegend({ items }: { items: { label: string; value: number }[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: '#0f1729', borderRadius: '6px' }}>
          <div style={{ flex: 1, fontSize: '11px', color: '#9aa7bd' }}>{renderSafeValue(item.label)}</div>
          <ProgressBar value={item.value} height="4px" showValue={false} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: item.value >= 70 ? '#10e18b' : item.value >= 40 ? '#ffb347' : '#ff4757', minWidth: '28px', textAlign: 'right' }}>{renderSafeValue(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, Loader2, BookOpen, Mail, RadioTower,
  PenTool, Video, Megaphone, FolderOpen, Search, X, Trash2, ExternalLink,
  RefreshCw, History, Eye, ChevronDown, ChevronUp, Shield, Sparkles,
  Target, Wifi, Clock, FileText, Quote, Hash, Twitter, Globe, Camera,
  Youtube, Instagram, Facebook, Linkedin, HelpCircle, Info, Copy, Save,
  Layers, BarChart2, FileDown, List, Grid, Tag
} from 'lucide-react';
import { Badge, Card, EmptyState, Loading, PageHeader, ScoreCard } from './UI';
import { useWorkspaceMemory } from './EnterpriseDecisionSuite';
import {
  api, getEvidenceContext, getContentBrief, generateContentItem,
  generateContentPlan, getContentAssets, getAssetVersionHistory,
  regenerateContentAsset, getIntegrationHealth, fromAssetToEmailCampaign
} from '../lib/api';
import { useProject } from '../context/ProjectContext';

// ============================================
// CONSTANTS
// ============================================

const C = {
  excellent: '#10e18b', good: '#53a7ff', needsImprovement: '#ffb347',
  critical: '#ff4757', bg: '#0f1729', card: '#151d2b', border: '#293245',
  text: '#e5e7eb', muted: '#9aa7bd', dim: '#6b7280', accent: '#818cf8',
  purple: '#a855f7', orange: '#ff6b35', pink: '#ec4899', cyan: '#06b6d4',
  brand: '#53a7ff'
};

const S = {
  card: { background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '20px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' },
  cardTitle: { fontSize: '15px', fontWeight: 600, color: C.text, flex: 1, minWidth: 0, overflowWrap: 'anywhere' as const },
  flexCenter: { display: 'flex', alignItems: 'center', gap: '8px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  gridAuto: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' },
  input: { width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px', outline: 'none', minWidth: 0, boxSizing: 'border-box' as const },
  btn: (color: string) => ({ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${color}`, background: `${color}15`, cursor: 'pointer', fontSize: '11px', fontWeight: 600, color, display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 }),
  tag: (color: string) => ({ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${color}15`, color }),
  row: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.bg, borderRadius: '8px', border: `1px solid #1d2738`, minWidth: 0 },
  scrollY: { maxHeight: '400px', overflowY: 'auto' as const, overflowX: 'hidden' as const },
  smallButton: { padding: '4px 10px', borderRadius: '6px', border: '1px solid', cursor: 'pointer', fontSize: '10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0 },
  previewBox: { padding: '12px', background: C.bg, borderRadius: '8px', fontSize: '13px', color: C.muted, lineHeight: 1.6, maxHeight: '500px', overflowY: 'auto' as const, overflowX: 'hidden' as const, minWidth: 0, wordBreak: 'break-word' as const, whiteSpace: 'pre-wrap' as const },
};

// Must match backend content-studio.service.js CONTENT_TYPES keys
const CONTENT_TYPES = [
  { value: 'blog_article', label: 'Blog Article', icon: FileText, group: 'long-form' },
  { value: 'faq_page', label: 'FAQ Page', icon: HelpCircle, group: 'long-form' },
  { value: 'landing_page', label: 'Landing Page', icon: Globe, group: 'long-form' },
  { value: 'product_page', label: 'Product Page', icon: Tag, group: 'long-form' },
  { value: 'comparison_page', label: 'Comparison Page', icon: BarChart2, group: 'long-form' },
  { value: 'feature_announcement', label: 'Feature Announcement', icon: Megaphone, group: 'long-form' },
  { value: 'whitepaper', label: 'Whitepaper', icon: BookOpen, group: 'long-form' },
  { value: 'linkedin_post', label: 'LinkedIn Post', icon: Linkedin, group: 'social' },
  { value: 'instagram_post', label: 'Instagram Post', icon: Instagram, group: 'social' },
  { value: 'twitter_post', label: 'X (Twitter) Post', icon: Twitter, group: 'social' },
  { value: 'facebook_post', label: 'Facebook Post', icon: Facebook, group: 'social' },
  { value: 'youtube_description', label: 'YouTube Description', icon: Youtube, group: 'social' },
  { value: 'email_copy', label: 'Email Copy', icon: Mail, group: 'email' },
  { value: 'creative_brief', label: 'Creative Brief', icon: PenTool, group: 'brief' },
  { value: 'video_script', label: 'Video Script', icon: Camera, group: 'brief' },
] as const;

type ContentType = typeof CONTENT_TYPES[number]['value'];
const CONTENT_TYPE_VALUES = CONTENT_TYPES.map(t => t.value);

function isValidContentType(v: string): v is ContentType {
  return CONTENT_TYPE_VALUES.includes(v as ContentType);
}

// ============================================
// HELPERS
// ============================================

function renderVal(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(renderVal).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    return Object.values(obj).map(renderVal).filter(Boolean).join(', ');
  }
  return String(v);
}

function toText(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') return v.trim() || fallback;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    const items = v.map(i => toText(i, '')).filter(Boolean);
    return items.length > 0 ? items.join(', ') : fallback;
  }
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    return toText(obj.title || obj.name || obj.label || obj.text || obj.headline || obj.description || obj.summary || '', fallback);
  }
  return fallback;
}

function statusColor(s: string): string {
  if (s === 'passed') return C.excellent;
  if (s === 'needs_review') return C.needsImprovement;
  if (s === 'blocked') return C.critical;
  if (s === 'draft') return C.needsImprovement;
  if (s === 'approved') return C.excellent;
  if (s === 'generation_failed') return C.critical;
  return C.dim;
}

const CONTENT_GROUP_LABELS: Record<string, string> = {
  'long-form': 'Long-Form Content',
  'social': 'Social Media',
  'email': 'Email',
  'brief': 'Briefs & Scripts',
};

// ============================================
// STAGE A — CONTENT BRIEF
// ============================================

function ContentBriefPanel({ brief, loading }: { brief: any; loading: boolean }) {
  if (loading) {
    return (
      <div style={S.card}>
        <div style={S.cardHeader}><Target size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Content Brief</span></div>
        <div style={{ padding: '20px', textAlign: 'center', color: C.muted, fontSize: '12px' }}><Loader2 className="spin" size={16} /> Loading brief...</div>
      </div>
    );
  }

  if (!brief) return null;

  const hasData = brief.product?.name || brief.company?.name || brief.targetPersonas?.length > 0;

  if (!hasData) {
    return (
      <div style={S.card}>
        <div style={S.cardHeader}><Target size={18} style={{ color: C.needsImprovement }} /><span style={S.cardTitle}>Content Brief</span></div>
        <div style={{ padding: '16px', textAlign: 'center', color: C.muted, fontSize: '12px', background: 'rgba(255,179,71,0.08)', borderRadius: '8px', border: '1px solid rgba(255,179,71,0.2)' }}>
          <AlertTriangle size={20} style={{ marginBottom: '8px', color: C.needsImprovement }} />
          <div>Run product analysis with a website URL first to generate a content brief.</div>
        </div>
      </div>
    );
  }

  const sections: Array<{ label: string; items: Array<{ key: string; val: string; color?: string }> }> = [
    {
      label: 'Company & Product',
      items: [
        { key: 'Company', val: toText(brief.company?.name) },
        { key: 'Industry', val: toText(brief.company?.industry) },
        { key: 'Product', val: toText(brief.product?.name) },
        { key: 'Summary', val: toText(brief.product?.summary) },
        { key: 'USP', val: toText(brief.product?.usp) },
        { key: 'Features', val: (brief.product?.features || []).map((f: any) => typeof f === 'string' ? f : f.feature || f.name).filter(Boolean).slice(0, 6).join(', ') },
        { key: 'Benefits', val: (brief.product?.benefits || []).map((b: any) => typeof b === 'string' ? b : b.benefit || b.name).filter(Boolean).slice(0, 5).join(', ') },
      ],
    },
    {
      label: 'Audience',
      items: [
        { key: 'Personas', val: (brief.targetPersonas || []).map((p: any) => p.name).filter(Boolean).join(', ') },
        { key: 'Pain Points', val: (brief.painPoints || []).map((p: any) => typeof p === 'string' ? p : p.painPoint || p.name).filter(Boolean).slice(0, 5).join(', ') },
        { key: 'Objections', val: (brief.objections || []).map((o: any) => typeof o === 'string' ? o : o.objection || o.name).filter(Boolean).slice(0, 3).join(', ') },
      ],
    },
    {
      label: 'SEO & Content',
      items: [
        { key: 'Keywords', val: (brief.verifiedKeywords || []).map((k: any) => k.keyword).filter(Boolean).slice(0, 8).join(', ') },
        { key: 'Topic Ideas', val: (brief.topicIdeas || []).map((t: any) => t.topic).filter(Boolean).slice(0, 4).join(', ') },
        { key: 'Content Gaps', val: (brief.contentGaps || []).slice(0, 4).join(', ') },
        { key: 'CTAs', val: (brief.CTA || []).join(', ') },
      ],
    },
    {
      label: 'Competitors',
      items: [
        { key: 'Validated', val: (brief.validatedCompetitors || []).map((c: any) => c.name).filter(Boolean).join(', ') },
      ],
    },
  ];

  return (
    <div style={S.card}>
      <div style={S.cardHeader}><Target size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Content Brief</span></div>
      {brief.limitations?.length > 0 && (
        <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(255,179,71,0.08)', borderRadius: '6px', border: '1px solid rgba(255,179,71,0.2)', fontSize: '11px', color: C.needsImprovement, display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>Evidence limitations: {brief.limitations.join('; ')}</span>
        </div>
      )}
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {sections.map(section => {
          const hasVal = section.items.some(i => i.val);
          if (!hasVal) return null;
          return (
            <div key={section.label} style={{ padding: '10px', background: C.bg, borderRadius: '8px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{section.label}</div>
              {section.items.map(item => item.val ? (
                <div key={item.key} style={{ marginBottom: '6px', fontSize: '11px', minWidth: 0 }}>
                  <span style={{ color: C.dim, fontWeight: 500, display: 'block', marginBottom: '1px' }}>{item.key}</span>
                  <span style={{ color: C.text, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{item.val}</span>
                </div>
              ) : null)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// STAGE B — GENERATOR
// ============================================

const TYPE_GROUPS = ['long-form', 'social', 'email', 'brief'] as const;

function ContentGeneratorPanel({
  brief, evidenceContext, onGenerated, selectedChatId, abortRef
}: {
  brief: any; evidenceContext: any; onGenerated: (result: any) => void;
  selectedChatId: string; abortRef: React.MutableRefObject<AbortController | null>;
}) {
  const [selectedType, setSelectedType] = useState<ContentType>('blog_article');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string>('long-form');
  const [contentGoal, setContentGoal] = useState<string>('');
  const [contentTone, setContentTone] = useState<string>('');
  const generatingRef = useRef(false);

  const GOALS = ['Awareness', 'Education', 'Engagement', 'Lead generation', 'Trial conversion', 'Product announcement'];
  const TONES = ['Professional', 'Educational', 'Conversational', 'Bold', 'Technical', 'Founder-led'];

  const handleGenerate = useCallback(async () => {
    // PART 9: In-flight protection to prevent duplicate POSTs
    if (!selectedChatId || loading || generatingRef.current) return;
    
    generatingRef.current = true;
    setLoading(true);
    setError(null);
    onGenerated(null);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const res = await generateContentItem(selectedChatId, selectedType, signal);
      if (signal.aborted) return;
      if (res?.success !== false && res?.data) {
        onGenerated(res.data);
      } else if (res?.success !== false && res?.content) {
        onGenerated(res);
      } else {
        setError('Generation returned empty. Ensure product analysis is complete.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Generation failed. Check server connection.');
    } finally {
      generatingRef.current = false;
      if (!abortRef.current?.signal.aborted) setLoading(false);
    }
  }, [selectedChatId, selectedType, loading, onGenerated, abortRef]);

  const grouped = TYPE_GROUPS.map(group => ({
    group,
    label: CONTENT_GROUP_LABELS[group] || group,
    types: CONTENT_TYPES.filter(t => t.group === group),
  }));

  return (
    <div style={S.card}>
      <div style={S.cardHeader}><Sparkles size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Generate Content</span></div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {grouped.map(g => (
          <button
            key={g.group}
            onClick={() => setActiveGroup(g.group)}
            style={{
              padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '10px', fontWeight: 600, background: activeGroup === g.group ? `${C.accent}20` : 'transparent', color: activeGroup === g.group ? C.accent : C.muted,
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: '6px', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: '14px' }}>
        {grouped.find(g => g.group === activeGroup)?.types.map(ct => {
          const isActive = selectedType === ct.value;
          return (
            <button
              key={ct.value}
              onClick={() => setSelectedType(ct.value)}
              style={{
                padding: '8px 10px', borderRadius: '8px', border: `1px solid ${isActive ? C.accent : C.border}`,
                background: isActive ? `${C.accent}12` : C.bg, cursor: 'pointer', textAlign: 'left' as const,
                color: isActive ? C.accent : C.muted, fontSize: '11px', fontWeight: isActive ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0,
              }}
            >
              <ct.icon size={14} style={{ flexShrink: 0 }} />
              <span style={{ overflowWrap: 'anywhere', minWidth: 0 }}>{ct.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', alignItems: 'center' }}>
        <select value={contentGoal} onChange={e => setContentGoal(e.target.value)} style={{ ...S.input, width: 'auto', minWidth: '120px', fontSize: '10px', padding: '4px 8px' }}>
          <option value="">Any goal</option>
          {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={contentTone} onChange={e => setContentTone(e.target.value)} style={{ ...S.input, width: 'auto', minWidth: '120px', fontSize: '10px', padding: '4px 8px' }}>
          <option value="">Any tone</option>
          {TONES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerate}
          disabled={loading || !selectedChatId}
          style={{
            ...S.btn(C.brand), padding: '8px 20px', opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Sparkles size={14} /> Generate</>}
        </button>
        {error && (
          <div style={{ fontSize: '11px', color: C.critical, display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
            <AlertTriangle size={12} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// STAGE C — REVIEW PANEL (quality + claims)
// ============================================

function QualityBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { passed: C.excellent, needs_review: C.needsImprovement, blocked: C.critical };
  const labels: Record<string, string> = { passed: 'Passed', needs_review: 'Needs review', blocked: 'Blocked' };
  const color = colors[status] || C.dim;
  return <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: `${color}20`, color, whiteSpace: 'nowrap' as const }}>{labels[status] || status}</span>;
}

function QualityPanel({ qualityScore }: { qualityScore: any }) {
  if (!qualityScore || !qualityScore.checks) return null;
  const { overall, checks, summary } = qualityScore;
  return (
    <div style={S.card}>
      <div style={S.cardHeader}><Shield size={18} style={{ color: statusColor(overall) }} /><span style={S.cardTitle}>Quality Check</span>
        <QualityBadge status={overall} />
      </div>
      <div style={{ display: 'grid', gap: '6px', marginBottom: '10px' }}>
        {Object.entries(checks).map(([key, check]: [string, any]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: C.bg, borderRadius: '6px', fontSize: '11px', minWidth: 0 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor(check.status), flexShrink: 0 }} />
            <span style={{ color: C.text, fontWeight: 500, flexShrink: 0 }}>{check.label || key.replace(/([A-Z])/g, ' $1').trim()}</span>
            <span style={{ color: C.muted, minWidth: 0, overflowWrap: 'anywhere', flex: 1 }}>{check.detail}</span>
            <QualityBadge status={check.status} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: '10px', color: C.dim }}>{summary}</div>
    </div>
  );
}

function ClaimPanel({ content }: { content: any }) {
  const claimFindings = content?._claimFindings || content?.claimsRequiringReview || [];
  const claimStatus = content?._claimStatus || content?.claimValidation || 'passed';

  if (!claimFindings || claimFindings.length === 0) {
    return (
      <div style={S.card}>
        <div style={S.cardHeader}><Shield size={18} style={{ color: C.excellent }} /><span style={S.cardTitle}>Claim Validation</span>
          <QualityBadge status={claimStatus} />
        </div>
        <div style={{ fontSize: '11px', color: C.muted }}>No claims flagged — all content appears evidence-backed.</div>
      </div>
    );
  }

  const blockedCount = claimFindings.filter((f: any) => f.status === 'blocked').length;
  return (
    <div style={S.card}>
      <div style={S.cardHeader}><Shield size={18} style={{ color: blockedCount > 0 ? C.critical : C.needsImprovement }} /><span style={S.cardTitle}>Claim Validation</span>
        <QualityBadge status={claimStatus} />
      </div>
      {blockedCount > 0 && (
        <div style={{ marginBottom: '10px', padding: '8px 10px', background: 'rgba(255,71,87,0.08)', borderRadius: '6px', border: '1px solid rgba(255,71,87,0.2)', fontSize: '11px', color: C.critical, display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>{blockedCount} blocked claim(s) — content cannot be marked publish-ready. Review and fix before publishing.</span>
        </div>
      )}
      <div style={{ display: 'grid', gap: '6px' }}>
        {claimFindings.map((f: any, i: number) => (
          <div key={i} style={{ padding: '8px 10px', background: C.bg, borderRadius: '6px', border: `1px solid ${f.status === 'blocked' ? 'rgba(255,71,87,0.2)' : f.status === 'needs_review' ? 'rgba(255,179,71,0.2)' : 'rgba(16,225,139,0.15)'}`, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <QualityBadge status={f.status || 'needs_review'} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: C.text, minWidth: 0, overflowWrap: 'anywhere', flex: 1 }}>{toText(f.claim || f.text || f.title)}</span>
            </div>
            {f.reason && <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>Reason: {toText(f.reason)}</div>}
            {f.evidence && <div style={{ fontSize: '10px', color: C.dim, marginTop: '2px' }}>Evidence: {toText(f.evidence)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceUsedPanel({ content }: { content: any }) {
  const evidenceList = content?.evidenceUsed || content?._evidenceUsed || [];
  if (!evidenceList.length) return null;
  return (
    <div style={S.card}>
      <div style={S.cardHeader}><Info size={18} style={{ color: C.accent }} /><span style={S.cardTitle}>Evidence Sources Used</span></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {evidenceList.map((e: string, i: number) => (
          <span key={i} style={S.tag(C.accent)}>{e}</span>
        ))}
      </div>
    </div>
  );
}

// ============================================
// DEDICATED CONTENT TYPE RENDERERS (Part 23)
// ============================================

function LinkedInRenderer({ content, onCopy }: { content: any; onCopy: (text: string) => void }) {
  const fullText = [content.hook, content.body, content.cta].filter(Boolean).join('\n\n');
  return (
    <div style={S.card}>
      <div style={{ ...S.cardHeader, marginBottom: '4px' }}><Linkedin size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>LinkedIn Post</span></div>
      <div style={{ fontSize: '11px', color: C.dim, marginBottom: '8px' }}>Angle: {content.angle} {content.audience ? `| Audience: ${content.audience}` : ''}</div>
      <div style={S.previewBox}>
        <div style={{ fontWeight: 600, color: C.text, marginBottom: '8px' }}>{content.hook}</div>
        <div style={{ color: C.muted, marginBottom: '8px' }}>{content.body}</div>
        {content.cta && <div style={{ color: C.brand, fontWeight: 600, marginTop: '8px' }}>{content.cta}</div>}
      </div>
      {content.hashtags?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
          {content.hashtags.map((h: string, i: number) => <span key={i} style={S.tag(C.brand)}>{h}</span>)}
        </div>
      )}
      <CopyButton text={fullText} onCopy={onCopy} />
    </div>
  );
}

function InstagramRenderer({ content, onCopy }: { content: any; onCopy: (text: string) => void }) {
  const captionWithHashtags = content.hashtags?.length
    ? content.caption + '\n\n' + content.hashtags.join(' ')
    : content.caption;
  return (
    <div style={S.card}>
      <div style={{ ...S.cardHeader, marginBottom: '4px' }}><Instagram size={18} style={{ color: C.pink }} /><span style={S.cardTitle}>Instagram Post</span></div>
      <div style={{ fontSize: '11px', color: C.dim, marginBottom: '8px' }}>
        {content.angle ? `Angle: ${content.angle} | ` : ''}
        {content.audience ? `Audience: ${content.audience}` : ''}
      </div>
      {content.visualConcept && (
        <div style={{ padding: '8px 10px', background: 'rgba(168,85,247,0.08)', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.2)', fontSize: '11px', color: C.purple, marginBottom: '10px' }}>
          <Camera size={12} style={{ marginRight: '4px' }} /> Visual concept: {content.visualConcept}
        </div>
      )}
      <div style={S.previewBox}>
        <div style={{ fontWeight: 600, color: C.text, marginBottom: '8px' }}>{content.hook}</div>
        <div style={{ whiteSpace: 'pre-wrap', color: C.muted }}>{captionWithHashtags}</div>
      </div>
      {content.cta && <div style={{ color: C.pink, fontWeight: 600, marginTop: '8px', fontSize: '13px' }}>{content.cta}</div>}
      <CopyButton text={captionWithHashtags} onCopy={onCopy} />
    </div>
  );
}

function TwitterRenderer({ content, onCopy }: { content: any; onCopy: (text: string) => void }) {
  const fullPost = content.hashtags?.length
    ? content.post + ' ' + content.hashtags.join(' ')
    : content.post;
  return (
    <div style={S.card}>
      <div style={{ ...S.cardHeader, marginBottom: '4px' }}><Twitter size={18} style={{ color: C.cyan }} /><span style={S.cardTitle}>X (Twitter) Post</span></div>
      <div style={{ fontSize: '11px', color: C.dim, marginBottom: '4px' }}>Angle: {content.angle}</div>
      <div style={S.previewBox}>{fullPost}</div>
      <div style={{ fontSize: '10px', color: C.dim, marginTop: '4px' }}>{fullPost.length}/280 chars</div>
      {content.cta && <div style={{ color: C.cyan, fontWeight: 600, marginTop: '6px', fontSize: '13px' }}>{content.cta}</div>}
      <CopyButton text={fullPost} onCopy={onCopy} />
    </div>
  );
}

function FacebookRenderer({ content, onCopy }: { content: any; onCopy: (text: string) => void }) {
  const fullText = [content.headline, content.body, content.cta].filter(Boolean).join('\n\n');
  return (
    <div style={S.card}>
      <div style={{ ...S.cardHeader, marginBottom: '4px' }}><Facebook size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Facebook Post</span></div>
      <div style={{ fontSize: '11px', color: C.dim, marginBottom: '8px' }}>Angle: {content.angle} {content.audience ? `| Audience: ${content.audience}` : ''}</div>
      <div style={S.previewBox}>
        {content.headline && <div style={{ fontWeight: 600, color: C.text, marginBottom: '8px' }}>{content.headline}</div>}
        <div style={{ color: C.muted, marginBottom: '8px' }}>{content.body}</div>
        {content.cta && <div style={{ color: C.brand, fontWeight: 600, marginTop: '8px' }}>{content.cta}</div>}
      </div>
      <CopyButton text={fullText} onCopy={onCopy} />
    </div>
  );
}

function YouTubeRenderer({ content, onCopy }: { content: any; onCopy: (text: string) => void }) {
  const descParts = [
    content.openingHook,
    '',
    content.description,
    '',
    content.chapters?.length ? 'Chapters:' : '',
    ...(content.chapters || []).map((ch: any) => `${ch.timestamp} — ${ch.title}`),
    '',
    content.links?.length ? 'Links:' : '',
    ...(content.links || []).map((l: any) => `${l.label}: ${l.url}`),
    '',
    content.hashtags?.length ? content.hashtags.join(' ') : '',
    '',
    content.cta,
  ].filter(Boolean).join('\n');

  return (
    <div style={S.card}>
      <div style={{ ...S.cardHeader, marginBottom: '4px' }}><Youtube size={18} style={{ color: C.critical }} /><span style={S.cardTitle}>YouTube Description</span></div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>{content.title}</div>
      <div style={S.previewBox}>
        <div style={{ color: C.muted, whiteSpace: 'pre-wrap' }}>{descParts}</div>
      </div>
      {content.keywords?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
          {content.keywords.map((k: string, i: number) => <span key={i} style={S.tag(C.needsImprovement)}>{k}</span>)}
        </div>
      )}
      <CopyButton text={descParts} onCopy={onCopy} />
    </div>
  );
}

function EmailRenderer({ content, onCopy, selectedChatId, onAddToCampaign }: { content: any; onCopy: (text: string) => void; selectedChatId?: string; onAddToCampaign?: (assetId: string) => void }) {
  const rendered = [
    `Subject: ${content.subject}`,
    content.previewText ? `Preview text: ${content.previewText}` : '',
    '',
    content.greeting,
    '',
    content.opening,
    '',
    ...content.bodyParagraphs.map((p: string) => p + '\n'),
    content.bulletPoints?.length ? content.bulletPoints.map((b: string) => `• ${b}`).join('\n') : '',
    '',
    content.ctaText,
    '',
    content.closing,
    '',
    content.signature,
    content.complianceNote ? `\n${content.complianceNote}` : '',
  ].filter(Boolean).join('\n');

  return (
    <div style={S.card}>
      <div style={{ ...S.cardHeader, marginBottom: '4px' }}><Mail size={18} style={{ color: C.purple }} /><span style={S.cardTitle}>Email Copy</span></div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={S.tag(C.purple)}>{content.emailType?.replace(/_/g, ' ')}</span>
        {content.personalizationFields?.map((f: string, i: number) => <span key={i} style={S.tag(C.needsImprovement)}>{f}</span>)}
      </div>
      <div style={S.previewBox}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>{content.subject}</div>
        {content.previewText && <div style={{ fontSize: '11px', color: C.dim, marginBottom: '12px' }}>{content.previewText}</div>}
        <div style={{ whiteSpace: 'pre-wrap', color: C.muted, lineHeight: 1.7 }}>{rendered}</div>
      </div>
      <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
        <CopyButton text={rendered} onCopy={onCopy} />
        {content._assetId && selectedChatId && onAddToCampaign && (
          <button onClick={() => onAddToCampaign(content._assetId)} style={{ ...S.smallButton, background: `${C.purple}15`, color: C.purple, border: `1px solid ${C.purple}30` }}>
            <Mail size={12} /> Add to Email Campaign
          </button>
        )}
      </div>
    </div>
  );
}

function CreativeBriefRenderer({ content, onCopy }: { content: any; onCopy: (text: string) => void }) {
  const fullText = [
    `Objective: ${content.objective}`,
    `Audience: ${content.audience}`,
    `Message: ${content.message}`,
    `Visual: ${content.visualDirection}`,
    `Brand signals: ${content.brandSignals?.join(', ')}`,
    `Required text: ${content.requiredText}`,
    `CTA: ${content.cta}`,
    `Format: ${content.format}`,
    content.evidenceLimitations?.length ? `Limitations: ${content.evidenceLimitations.join('; ')}` : '',
  ].filter(Boolean).join('\n');

  return (
    <div style={S.card}>
      <div style={{ ...S.cardHeader, marginBottom: '4px' }}><PenTool size={18} style={{ color: C.needsImprovement }} /><span style={S.cardTitle}>Creative Brief</span></div>
      <div style={S.previewBox}>
        <div style={{ display: 'grid', gap: '10px' }}>
          {content.objective && <div><span style={{ color: C.dim, fontSize: '10px', display: 'block' }}>OBJECTIVE</span><span style={{ color: C.text }}>{content.objective}</span></div>}
          {content.audience && <div><span style={{ color: C.dim, fontSize: '10px', display: 'block' }}>AUDIENCE</span><span style={{ color: C.text }}>{content.audience}</span></div>}
          {content.message && <div><span style={{ color: C.dim, fontSize: '10px', display: 'block' }}>MESSAGE</span><span style={{ color: C.text }}>{content.message}</span></div>}
          {content.visualDirection && <div><span style={{ color: C.dim, fontSize: '10px', display: 'block' }}>VISUAL DIRECTION</span><span style={{ color: C.text }}>{content.visualDirection}</span></div>}
          {content.brandSignals?.length > 0 && <div><span style={{ color: C.dim, fontSize: '10px', display: 'block' }}>BRAND SIGNALS</span><span style={{ color: C.text }}>{content.brandSignals.join(', ')}</span></div>}
          {content.requiredText && <div><span style={{ color: C.dim, fontSize: '10px', display: 'block' }}>REQUIRED TEXT</span><span style={{ color: C.accent, fontWeight: 600 }}>{content.requiredText}</span></div>}
          {content.format && <div><span style={{ color: C.dim, fontSize: '10px', display: 'block' }}>FORMAT</span><span style={S.tag(C.needsImprovement)}>{content.format}</span></div>}
          {content.evidenceLimitations?.length > 0 && <div><span style={{ color: C.critical, fontSize: '10px', display: 'block' }}>LIMITATIONS</span>{content.evidenceLimitations.map((l: string, i: number) => <div key={i} style={{ color: C.muted, fontSize: '11px' }}>⚠ {l}</div>)}</div>}
        </div>
      </div>
      <CopyButton text={fullText} onCopy={onCopy} />
    </div>
  );
}

function VideoScriptRenderer({ content, onCopy }: { content: any; onCopy: (text: string) => void }) {
  const fullText = (content.scenes || []).map((s: any) =>
    `Scene ${s.scene}: ${s.narration}
  On-screen: ${s.onScreenText || ''}
  Visual: ${s.visual || ''}
  Evidence: ${s.evidencePoint || ''}
  CTA: ${s.cta || '—'}`
  ).join('\n\n');

  return (
    <div style={S.card}>
      <div style={{ ...S.cardHeader, marginBottom: '4px' }}><Camera size={18} style={{ color: C.critical }} /><span style={S.cardTitle}>Video Script</span></div>
      <div style={{ fontSize: '11px', color: C.dim, marginBottom: '8px' }}>Duration: {content.duration || '30s'} | {content.scenes?.length || 0} scenes</div>
      <div style={S.previewBox}>
        {(content.scenes || []).map((s: any, i: number) => (
          <div key={i} style={{ marginBottom: '14px', padding: '10px', background: C.bg, borderRadius: '8px', border: '1px solid rgba(255,71,87,0.15)' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: C.critical, marginBottom: '4px' }}>SCENE {s.scene || i + 1}</div>
            <div style={{ fontSize: '12px', color: C.text, marginBottom: '4px' }}>🎙 {s.narration}</div>
            {s.onScreenText && <div style={{ fontSize: '11px', color: C.accent, marginBottom: '2px' }}>📺 {s.onScreenText}</div>}
            {s.visual && <div style={{ fontSize: '11px', color: C.muted, marginBottom: '2px' }}>🎬 {s.visual}</div>}
            {s.evidencePoint && <div style={{ fontSize: '10px', color: C.dim }}>📋 {s.evidencePoint}</div>}
            {s.cta && <div style={{ fontSize: '11px', color: C.brand, fontWeight: 600, marginTop: '2px' }}>👉 {s.cta}</div>}
          </div>
        ))}
      </div>
      <CopyButton text={fullText} onCopy={onCopy} />
    </div>
  );
}

function CopyButton({ text, onCopy }: { text: string; onCopy: (text: string) => void }) {
  return (
    <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
      <button onClick={() => onCopy(text)} style={S.btn(C.accent)}><Copy size={12} /> Copy</button>
    </div>
  );
}

function ContentPreview({ content, selectedChatId, onAddToCampaign }: { content: any; selectedChatId?: string; onAddToCampaign?: (assetId: string) => void }) {
  if (!content) return null;

  const [copyFeedback, setCopyFeedback] = useState('');

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    }).catch(() => {
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(''), 2000);
    });
  }, []);

  // Detect content type from _type field or field presence
  const contentType = content._type || '';

  let renderer: JSX.Element | null = null;

  if (contentType === 'linkedin_post' || (content.hook && content.body && content.hasOwnProperty('hashtags') && !content.caption)) {
    renderer = <LinkedInRenderer content={content} onCopy={handleCopy} />;
  } else if (contentType === 'instagram_post' || (content.hook && content.caption)) {
    renderer = <InstagramRenderer content={content} onCopy={handleCopy} />;
  } else if (contentType === 'twitter_post' || content.post) {
    renderer = <TwitterRenderer content={content} onCopy={handleCopy} />;
  } else if (contentType === 'facebook_post' || (content.headline !== undefined && content.body && !content.hook)) {
    renderer = <FacebookRenderer content={content} onCopy={handleCopy} />;
  } else if (contentType === 'youtube_description' || (content.openingHook && content.description)) {
    renderer = <YouTubeRenderer content={content} onCopy={handleCopy} />;
  } else if (contentType === 'email_copy' || (content.emailType && content.subject)) {
    renderer = <EmailRenderer content={content} onCopy={handleCopy} selectedChatId={selectedChatId} onAddToCampaign={onAddToCampaign} />;
  } else if (contentType === 'creative_brief' || (content.objective && content.visualDirection)) {
    renderer = <CreativeBriefRenderer content={content} onCopy={handleCopy} />;
  } else if (contentType === 'video_script' || (content.duration && content.scenes)) {
    renderer = <VideoScriptRenderer content={content} onCopy={handleCopy} />;
  }

  if (renderer) {
    return (
      <div>
        {renderer}
        {copyFeedback && <div style={{ fontSize: '10px', color: C.excellent, marginTop: '4px' }}>{copyFeedback}</div>}
      </div>
    );
  }

  // Fallback: generic renderer for blog, FAQ, landing page, etc.
  const extractPreview = (c: any) => {
    let title = toText(c.title || c.headline || c.subjectLine);
    let body = toText(c.article || c.body || c.description || c.caption || c.executiveSummary);
    if (title === body) title = null;
    if (!title && !body) body = JSON.stringify(c, null, 2);
    return { title, body };
  };

  const { title, body } = extractPreview(content);

  return (
    <div style={S.card}>
      <div style={S.cardHeader}><Eye size={18} style={{ color: C.accent }} /><span style={S.cardTitle}>Preview</span></div>
      {title && <div style={{ fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '12px', overflowWrap: 'anywhere', lineHeight: 1.3 }}>{title}</div>}
      <div style={S.previewBox}>
        {body}
      </div>
    </div>
  );
}

function ReviewPanel({ content, qualityScore, selectedChatId, onAddToCampaign }: { content: any; qualityScore: any; selectedChatId?: string; onAddToCampaign?: (assetId: string) => void }) {
  if (!content) return null;
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <ContentPreview content={content} selectedChatId={selectedChatId} onAddToCampaign={onAddToCampaign} />
      <EvidenceUsedPanel content={content} />
      <QualityPanel qualityScore={qualityScore} />
      <ClaimPanel content={content} />
    </div>
  );
}

// ============================================
// ASSET LIBRARY
// ============================================

function AssetRow({ asset, onOpen, onRegenerate }: { asset: any; onOpen: (a: any) => void; onRegenerate: (a: any) => void }) {
  const typeColors: Record<string, string> = {
    content_blog_article: C.brand, content_faq_page: C.accent, content_landing_page: C.excellent,
    content_product_page: C.good, content_comparison_page: C.purple, content_feature_announcement: C.orange,
    content_whitepaper: C.pink, content_linkedin_post: C.brand, content_instagram_post: C.pink,
    content_twitter_post: C.cyan, content_facebook_post: C.good, content_youtube_description: C.critical,
    content_email_copy: C.purple, content_creative_brief: C.needsImprovement, content_video_script: C.critical,
  };
  const typeMatch = CONTENT_TYPES.find(t => t.value === asset.assetType?.replace('content_', ''));
  const label = typeMatch?.label || asset.assetType?.replace('content_', '').replace(/_/g, ' ') || 'Content';
  const color = typeColors[asset.assetType] || C.dim;
  const Icon = typeMatch?.icon || FileText;
  const version = asset.assetContent?.version || 1;
  const created = asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : '';
  const qs = asset.assetContent?.qualityScore?.overall || '';

  return (
    <div style={{ ...S.row, cursor: 'pointer', borderColor: C.border, flexWrap: 'wrap', gap: '8px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: '120px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, overflowWrap: 'anywhere' }}>{asset.assetTitle || toText(asset.assetContent)}</div>
        <div style={{ fontSize: '10px', color: C.muted, display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={S.tag(color)}>{label}</span>
          <span>v{version}</span>
          {created && <span>{created}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        {qs && <QualityBadge status={qs} />}
        <span style={{ fontSize: '10px', color: C.dim, ...S.tag(statusColor(asset.status || 'draft')) }}>{asset.status || 'draft'}</span>
        <button onClick={() => onOpen(asset)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '4px', display: 'flex' }} title="View"><Eye size={13} /></button>
        <button onClick={() => onRegenerate(asset)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '4px', display: 'flex' }} title="Regenerate"><RefreshCw size={13} /></button>
      </div>
    </div>
  );
}

function AssetDetailPanel({ asset, onClose, onRegenerate }: { asset: any; onClose: () => void; onRegenerate: (a: any) => void }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  useEffect(() => {
    if (!asset?.id) return;
    setVersionsLoading(true);
    getAssetVersionHistory(asset.id)
      .then(res => {
        if (res?.success !== false && res?.data) setVersions(Array.isArray(res.data) ? res.data : []);
        else if (Array.isArray(res)) setVersions(res);
      })
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoading(false));
  }, [asset?.id]);

  const content = asset.assetContent || {};
  const version = content.version || 1;
  const typeMatch = CONTENT_TYPES.find(t => t.value === asset.assetType?.replace('content_', ''));
  const Icon = typeMatch?.icon || FileText;

  return (
    <div style={{ ...S.card, position: 'sticky', top: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
          <Icon size={16} style={{ color: C.accent, flexShrink: 0 }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: C.text, overflowWrap: 'anywhere', minWidth: 0 }}>{asset.assetTitle || 'Asset Detail'}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', flexShrink: 0 }}><X size={16} /></button>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', color: C.dim }}>v{version}</span>
        {asset.createdAt && <span style={{ fontSize: '10px', color: C.dim }}>Created: {new Date(asset.createdAt).toLocaleString()}</span>}
        {asset.status && <span style={S.tag(statusColor(asset.status))}>{asset.status}</span>}
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden', fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '10px', background: C.bg, borderRadius: '6px', marginBottom: '10px' }}>
        {JSON.stringify(content, null, 2)}
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button onClick={() => onRegenerate(asset)} style={S.btn(C.brand)}><RefreshCw size={12} /> Regenerate</button>
      </div>

      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <History size={12} /> Version History{versionsLoading && <Loader2 className="spin" size={12} style={{ marginLeft: '4px' }} />}
          {versions.length > 0 && <span style={{ color: C.dim, fontWeight: 400 }}>({versions.length})</span>}
        </div>
        {versions.length === 0 && !versionsLoading && (
          <div style={{ fontSize: '11px', color: C.dim, padding: '8px', background: C.bg, borderRadius: '6px' }}>No version history available.</div>
        )}
        <div style={{ display: 'grid', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
          {versions.map((v: any, i: number) => {
            const vContent = v.assetContent || {};
            const vNum = vContent.version || (versions.length - i);
            const isCurrent = v.id === asset.id;
            return (
              <div key={v.id || i} style={{ padding: '6px 8px', background: isCurrent ? `${C.accent}08` : C.bg, borderRadius: '4px', border: `1px solid ${isCurrent ? C.accent + '30' : 'transparent'}`, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <Layers size={10} style={{ color: C.dim, flexShrink: 0 }} />
                <span style={{ color: isCurrent ? C.accent : C.text, fontWeight: isCurrent ? 600 : 400 }}>v{vNum}</span>
                {v.createdAt && <span style={{ color: C.dim }}>{new Date(v.createdAt).toLocaleDateString()}</span>}
                {isCurrent && <span style={S.tag(C.accent)}>current</span>}
                {vContent.qualityScore?.overall && <QualityBadge status={vContent.qualityScore.overall} />}
                {!isCurrent && <span style={{ color: C.dim }}>({v.status || 'draft'})</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AssetLibraryPanel({
  selectedChatId, onRegenerate, onAssetOpen, selectedAsset, onCloseAsset, view
}: {
  selectedChatId: string; onRegenerate: (asset: any) => void;
  onAssetOpen: (asset: any) => void; selectedAsset: any; onCloseAsset: () => void; view: string;
}) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loaded, setLoaded] = useState(false);

  const loadAssets = useCallback(async () => {
    if (!selectedChatId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getContentAssets(selectedChatId);
      const list = res?.success !== false && res?.data ? res.data : Array.isArray(res) ? res : [];
      setAssets(list);
      setLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load assets');
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [selectedChatId]);

  useEffect(() => {
    setAssets([]);
    setLoaded(false);
    setSelectedAssetId(null);
    onCloseAsset();
    if (selectedChatId) loadAssets();
  }, [selectedChatId, loadAssets, onCloseAsset]);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const filtered = assets.filter(a => {
    if (filterType !== 'all' && !a.assetType?.includes(filterType)) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const title = (a.assetTitle || '').toLowerCase();
      const type = (a.assetType || '').toLowerCase();
      return title.includes(q) || type.includes(q);
    }
    return true;
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const typeCounts: Record<string, number> = {};
  assets.forEach(a => {
    const t = a.assetType || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  const typeOptions = Object.keys(typeCounts).sort();

  if (loading && !loaded) {
    return (
      <div style={S.card}>
        <div style={S.cardHeader}><FolderOpen size={18} style={{ color: C.accent }} /><span style={S.cardTitle}>Asset Library</span></div>
        <div style={{ padding: '20px', textAlign: 'center', color: C.muted, fontSize: '12px' }}><Loader2 className="spin" size={16} /> Loading assets...</div>
      </div>
    );
  }

  if (!loaded && error) {
    return (
      <div style={S.card}>
        <div style={S.cardHeader}><FolderOpen size={18} style={{ color: C.critical }} /><span style={S.cardTitle}>Asset Library</span></div>
        <div style={{ padding: '16px', color: C.critical, fontSize: '11px', background: 'rgba(255,71,87,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} /> {error}</div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div style={S.card}>
        <div style={S.cardHeader}><FolderOpen size={18} style={{ color: C.dim }} /><span style={S.cardTitle}>Asset Library</span></div>
        <div style={{ textAlign: 'center', padding: '32px 16px', color: C.muted, fontSize: '12px' }}>
          <FolderOpen size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <div>No content assets generated yet. Generate content to build your library.</div>
        </div>
      </div>
    );
  }

  const showSideBySide = view === 'grid' && selectedAsset;

  return (
    <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: showSideBySide ? '1fr 380px' : '1fr' }}>
      <div>
        <div style={S.card}>
          <div style={{ ...S.cardHeader, marginBottom: '12px' }}><FolderOpen size={18} style={{ color: C.accent }} /><span style={S.cardTitle}>Asset Library</span>
            <span style={{ fontSize: '11px', color: C.muted }}>{assets.length} assets</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '140px' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: C.dim }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search..." style={{ ...S.input, paddingLeft: '28px', fontSize: '11px' }} />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...S.input, width: 'auto', fontSize: '11px' }}>
              <option value="all">All types</option>
              {typeOptions.map(t => (
                <option key={t} value={t}>{t.replace('content_', '').replace(/_/g, ' ')} ({typeCounts[t]})</option>
              ))}
            </select>
          </div>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: C.dim, fontSize: '12px' }}>No assets match your filters.</div>
          ) : (
            <div style={{ display: 'grid', gap: '6px' }}>
              {filtered.map(a => (
                <AssetRow
                  key={a.id}
                  asset={a}
                  onOpen={() => { setSelectedAssetId(a.id); onAssetOpen(a); }}
                  onRegenerate={onRegenerate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {showSideBySide && selectedAsset && (
        <AssetDetailPanel asset={selectedAsset} onClose={onCloseAsset} onRegenerate={onRegenerate} />
      )}
    </div>
  );
}

// ============================================
// INTEGRATION HEALTH
// ============================================

function IntegrationHealthPanel() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getIntegrationHealth().then(d => { setHealth(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ fontSize: '11px', color: C.dim, padding: '8px 0' }}>Checking provider health...</div>;
  if (!health) return null;
  const { providers } = health;
  const items = [
    { label: 'AI', ok: providers.ai?.gemini || providers.ai?.groq, detail: providers.ai?.gemini ? 'Gemini' : providers.ai?.groq ? 'Groq' : 'None' },
    { label: 'Email', ok: providers.email?.configured, detail: providers.email?.provider || 'Not configured' },
    { label: 'Image', ok: providers.image?.pollinations?.configured !== false || providers.image?.fal?.configured === true, detail: providers.image?.pollinations?.configured !== false ? 'Pollinations' : providers.image?.fal?.configured === true ? 'Fal' : 'None' },
    { label: 'Video', ok: providers.video?.shotstack?.configured === true || providers.video?.creatomate?.configured === true, detail: providers.video?.shotstack?.configured === true ? 'Shotstack' : providers.video?.creatomate?.configured === true ? 'Creatomate' : 'None' },
  ];
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '8px 12px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '12px', alignItems: 'center' }}>
      <span style={{ fontSize: '10px', fontWeight: 600, color: C.muted, display: 'flex', alignItems: 'center', gap: '3px' }}><Wifi size={11} /> Providers:</span>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 6px', borderRadius: '4px', background: item.ok ? 'rgba(16,225,139,0.08)' : 'rgba(255,179,71,0.08)', border: `1px solid ${item.ok ? 'rgba(16,225,139,0.2)' : 'rgba(255,179,71,0.2)'}` }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: item.ok ? C.excellent : C.needsImprovement }} />
          <span style={{ fontSize: '9px', color: item.ok ? C.excellent : C.needsImprovement, fontWeight: 600 }}>{item.label}</span>
          <span style={{ fontSize: '8px', color: C.dim }}>{item.detail}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN CONTENT STUDIO PAGE
// ============================================

export default function AIContentStudio() {
  const { selectedChatId, fullResults } = useProject();
  const [activeTab, setActiveTab] = useWorkspaceMemory('studio-activeTab', 'content');
  const [brief, setBrief] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [evidenceContext, setEvidenceContext] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [showHealth, setShowHealth] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [addingToCampaign, setAddingToCampaign] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleAddToEmailCampaign = useCallback(async (assetId: string) => {
    if (!selectedChatId || addingToCampaign) return;
    setAddingToCampaign(true);
    try {
      const result = await fromAssetToEmailCampaign(selectedChatId, assetId, { purpose: 'promotional' });
      if (result.success !== false && result.data) {
        setError(null);
        alert('Email campaign created!');
      } else {
        setError(result.error || 'Failed to create email campaign');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create email campaign');
    } finally {
      setAddingToCampaign(false);
    }
  }, [selectedChatId, addingToCampaign]);

  useEffect(() => {
    setBrief(null);
    setGeneratedContent(null);
    setQualityScore(null);
    setSelectedAsset(null);
    setReadiness(null);

    if (!selectedChatId) {
      setContextLoading(false);
      setBriefLoading(false);
      setReadinessLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setContextLoading(true);
    setBriefLoading(true);
    setReadinessLoading(true);

    getEvidenceContext(selectedChatId)
      .then(ctx => {
        if (ctx && typeof ctx === 'object') setEvidenceContext(ctx);
        else setEvidenceContext(null);
      })
      .catch(() => setEvidenceContext(null))
      .finally(() => setContextLoading(false));

    getContentBrief(selectedChatId)
      .then(res => {
        if (res && typeof res === 'object') setBrief(res);
        else setBrief(null);
      })
      .catch(() => setBrief(null))
      .finally(() => setBriefLoading(false));

    // Source of truth for content readiness is the backend evidence-readiness endpoint.
    // PART 10: Preserve previous readiness during refetch to prevent flicker
    setReadinessLoading(true);
    api.get(`/chats/${selectedChatId}/evidence-readiness`)
      .then((res: any) => {
        console.info("[Content Studio] Evidence-readiness response", {
          chatId: selectedChatId,
          responseType: typeof res,
          responseKeys: res ? Object.keys(res) : null,
          contentGenerationReady: res?.contentGenerationReady,
          hasProductIntelligence: res?.hasProductIntelligence,
          fullResponse: res
        });
        // Handle both wrapped and unwrapped response shapes
        const readinessData = res?.data || res;
        if (readinessData && typeof readinessData === 'object') {
          setReadiness(readinessData);
        }
      })
      .catch((err) => {
        console.error("[Content Studio] Evidence-readiness fetch failed", err);
        // Don't setReadiness(null) on error - preserve previous value
      })
      .finally(() => setReadinessLoading(false));

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [selectedChatId]);

  const handleGenerated = useCallback((result: any) => {
    if (!result) {
      setGeneratedContent(null);
      setQualityScore(null);
      return;
    }
    if (result._status === 'generation_failed' || result.metadata?.status === 'generation_failed') {
      setError(result._error || result.metadata?.error || 'Content generation failed');
      return;
    }
    if (result._status === 'blocked') {
      setError(result._reason || 'Generation blocked: insufficient data');
      return;
    }
    const contentData = result.content || result;
    const resultMeta = result.metadata || {};
    setGeneratedContent(contentData);
    setQualityScore(result.qualityScore || result?._qualityScore || null);
    if (result.asset || result._assetId) {
      setSelectedAsset(result.asset || null);
    }
  }, []);

  const handleRegenerate = useCallback((asset: any) => {
    if (!asset?.id) return;
    const abortC = new AbortController();
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = abortC;

    regenerateContentAsset(asset.id, abortC.signal)
      .then(res => {
        if (abortC.signal.aborted) return;
        if (res?.success !== false && res?.data) {
          setGeneratedContent(res.data.content || res.data);
          setQualityScore(res.data.qualityScore || null);
          setActiveTab('content');
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError('Regeneration failed: ' + (err.message || 'Unknown error'));
      });
  }, [setActiveTab]);

  const backendReady = readiness?.contentGenerationReady === true;
  const hasEvidence = (
    backendReady ||
    evidenceContext?.sourceSummary?.sourcesCollected?.length > 0 ||
    brief?.product?.name ||
    fullResults?.hasProductIntelligence === true
  );
  console.info("[Content Studio Readiness]", {
    chatId: selectedChatId,
    hasProductIntelligence: fullResults?.hasProductIntelligence,
    contentGenerationReady: backendReady,
    readiness,
    hasEvidence,
    sourceComponent: "AIContentStudio.tsx"
  });

  const tabs = [
    { id: 'content', label: 'Content Studio', icon: Sparkles },
    { id: 'library', label: 'Asset Library', icon: FolderOpen },
  ];

  const renderContent = () => {
    if (!selectedChatId) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: '13px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }}>
          <FolderOpen size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div>Select a project to start creating content.</div>
        </div>
      );
    }

    if (activeTab === 'library') {
      return (
        <AssetLibraryPanel
          selectedChatId={selectedChatId}
          onRegenerate={handleRegenerate}
          onAssetOpen={setSelectedAsset}
          selectedAsset={selectedAsset}
          onCloseAsset={() => setSelectedAsset(null)}
          view="grid"
        />
      );
    }

    return (
      <div style={{ display: 'grid', gap: '16px' }}>
        <ContentBriefPanel brief={brief} loading={briefLoading} />
        {backendReady || brief?.product?.name ? (
          <ContentGeneratorPanel
            brief={brief}
            evidenceContext={evidenceContext}
            onGenerated={handleGenerated}
            selectedChatId={selectedChatId}
            abortRef={abortRef}
          />
        ) : (
          !briefLoading && !readinessLoading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: C.muted, fontSize: '12px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }}>
              <AlertTriangle size={24} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <div>Run product analysis with a website URL first before generating content.</div>
            </div>
          )
        )}
        {generatedContent && (
          <ReviewPanel content={generatedContent} qualityScore={qualityScore} selectedChatId={selectedChatId} onAddToCampaign={handleAddToEmailCampaign} />
        )}
      </div>
    );
  };

  return (
    <div style={{ minWidth: 0 }}>
      <PageHeader eyebrow="AI Content Studio" title="Content & Campaign Studio" subtitle="Generate, preview, and manage AI-powered marketing content. All content is evidence-backed." />
      <div style={{ marginTop: '20px', minWidth: 0 }}>
        {contextLoading ? (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Loader2 className="spin" size={14} /> Loading evidence context...
          </div>
        ) : !hasEvidence ? (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(255,179,71,0.08)', borderRadius: '8px', border: '1px solid rgba(255,179,71,0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.needsImprovement }}>
            <AlertTriangle size={16} />
            <div>Evidence unavailable — run product analysis with a website URL first.</div>
          </div>
        ) : null}

        <div style={{ marginBottom: '8px' }}>
          <button onClick={() => setShowHealth(!showHealth)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {showHealth ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Provider Health
          </button>
          {showHealth && <IntegrationHealthPanel />}
        </div>

        {error && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(255,71,87,0.1)', borderRadius: '8px', border: '1px solid rgba(255,71,87,0.3)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#ff8a8a' }}>
            <AlertTriangle size={16} />
            <div style={{ flex: 1 }}>{error}</div>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '10px' }}>Dismiss</button>
          </div>
        )}
        <Card>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px', marginBottom: '16px' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: activeTab === t.id ? `${C.accent}15` : 'transparent',
                cursor: 'pointer', fontSize: '11px', color: activeTab === t.id ? C.accent : C.muted,
                fontWeight: activeTab === t.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>
          {renderContent()}
        </Card>
      </div>
    </div>
  );
}

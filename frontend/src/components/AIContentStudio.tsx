import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, Lightbulb, Zap, Target, TrendingUp, Shield,
  ChevronDown, ChevronUp, Info, X, Search, Copy, Download, Share2,
  Clock, FileText, BarChart2, Activity, Users, Building, Code, DollarSign,
  ExternalLink, Flag, Calendar, UserCheck, Layers, Sliders, Eye,
  ArrowUpRight, ArrowDownRight, ArrowRight, GripHorizontal, Star, Flame,
  Filter, Globe, Map, Briefcase, Loader2, Sparkles, Link, Plus, Check,
  MoreHorizontal, Edit3, MessageSquare, Bell, Pin, Trash2, ThumbsUp,
  ThumbsDown, HelpCircle, User, List, Grid, Maximize2, Minimize2,
  Keyboard, Command, CheckSquare, Square, LayoutDashboard, RefreshCw,
  Send, Image, Video, Music, PenTool, Megaphone, BookOpen, Mail,
  Hash, AtSign, Quote, ArrowLeft, ArrowRight as ArrowRightIcon,
  AlignLeft, AlignCenter, AlignJustify, Bold, Italic, Underline,
  Type, Heading1, Heading2, ListOrdered, List as ListIcon,
  Table, ImagePlus, Upload, FolderOpen, Save, Printer,
  FileDown, FileUp, Clipboard, ClipboardCheck,
  Settings, SlidersHorizontal, PanelRightOpen, PanelRightClose,
  Radio, RadioTower, Waypoints, ScrollText, NotepadText,
  CalendarDays, CalendarCheck, CalendarRange, ChartNoAxesCombined,
  FolderKanban, CheckCheck, Bookmark, BookmarkCheck,
  CircleCheckBig, CircleDashed, CircleDot, CircleOff,
  Speech, TextSelect, WholeWord, Wifi, Monitor,
  Eraser, EyeOff, Gavel
} from 'lucide-react';
import {
  ProgressBar, StatusBadge, ConfidenceBadge, PriorityChip, EnterpriseInsightCard,
  KPIDashboard, MiniRadarLegend, EnterpriseEmptyState, SmartNavigation,
  SearchBar, LoadingSkeleton
} from './EnterpriseComponents';
import { Badge, Card, EmptyState, Loading, PageHeader, ScoreCard, SectionTitle, EvidenceBadge } from './UI';
import { useWorkspaceMemory } from './EnterpriseDecisionSuite';
import { api, getEvidenceContext, generateExecutionModule, getExecutionData } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asText, asNumber, renderSafeValue } from '../lib/normalizers';
import { getIntegrationHealth, sendTestEmail, generatePosterImage, renderVideo } from '../lib/api';

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
  cardTitle: { fontSize: '15px', fontWeight: 600, color: C.text, flex: 1 },
  flexCenter: { display: 'flex', alignItems: 'center', gap: '8px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' },
  input: { width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px', outline: 'none' },
  btn: (color: string) => ({ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${color}`, background: `${color}15`, cursor: 'pointer', fontSize: '11px', fontWeight: 600, color, display: 'inline-flex', alignItems: 'center', gap: '4px' }),
  tag: (color: string) => ({ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${color}15`, color }),
  row: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.bg, borderRadius: '8px', border: `1px solid #1d2738` },
};

function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function now(): string { return new Date().toISOString(); }

// ============================================
// EVIDENCE PANEL
// ============================================

function EvidencePanel({ context }: { context: any }) {
  if (!context) return null;
  const { website, product, audience, seo, sourceSummary } = context;
  const hasData = website?.heroText || product?.features?.length > 0 || audience?.painPoints?.length > 0 || seo?.issues?.length > 0;

  return (
    <div style={{ ...S.card, marginBottom: '16px' }}>
      <div style={S.cardHeader}><Target size={18} style={{ color: C.excellent }} /><span style={S.cardTitle}>Evidence-Backed Product Data</span></div>
      {!hasData ? (
        <div style={{ fontSize: '12px', color: C.needsImprovement, padding: '8px', background: C.bg, borderRadius: '6px' }}>
          No evidence data available. Run product analysis with a website URL first.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {website?.heroText && (
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, marginBottom: '2px' }}>HERO TEXT</div>
              <div style={{ fontSize: '11px', color: C.muted }}>{renderSafeValue(website.heroText)}</div>
            </div>
          )}
          {website?.ctaTexts?.length > 0 && (
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, marginBottom: '2px' }}>CTAs</div>
              {website.ctaTexts.map((cta: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: C.excellent, marginBottom: '2px' }}>{renderSafeValue(cta)}</div>
              ))}
            </div>
          )}
          {audience?.painPoints?.length > 0 && (
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, marginBottom: '2px' }}>PAIN POINTS</div>
              {audience.painPoints.slice(0, 3).map((p: string, i: number) => (
                <div key={i} style={{ fontSize: '11px', color: C.muted }}>• {renderSafeValue(p)}</div>
              ))}
            </div>
          )}
          {seo?.issues?.length > 0 && (
            <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}>
              <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, marginBottom: '2px' }}>SEO ISSUES</div>
              <div style={{ fontSize: '11px', color: C.needsImprovement }}>{seo.issues.length} technical issues found</div>
            </div>
          )}
          <div style={{ padding: '8px', background: C.bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '10px', color: C.accent, fontWeight: 600, marginBottom: '2px' }}>SOURCES</div>
            <div style={{ fontSize: '11px', color: C.muted }}>
              {sourceSummary?.sourcesCollected?.length > 0
                ? sourceSummary.sourcesCollected.join(', ')
                : 'No data sources connected'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CONTENT STUDIO
// ============================================

const contentTypes = [
  { value: 'blog-article', label: 'Blog Article' },
  { value: 'landing-page', label: 'Landing Page' },
  { value: 'faq-page', label: 'FAQ Page' },
  { value: 'whitepaper-outline', label: 'Whitepaper Outline' },
  { value: 'case-study', label: 'Case Study' },
  { value: 'feature-announcement', label: 'Feature Announcement' },
  { value: 'comparison-page', label: 'Comparison Page' },
  { value: 'linkedin-article', label: 'LinkedIn Article' },
];

export function ContentStudio({ context, onSave }: { context: any; onSave: (asset: any) => void }) {
  const { selectedChatId } = useProject();
  const [type, setType] = useState('blog-article');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('professional');
  const [goal, setGoal] = useState('inform');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim() || !selectedChatId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateExecutionModule(selectedChatId, 'content-studio');
      if (result?.success && result?.data) {
        const generated = {
          id: generateId(),
          type: 'content',
          subType: type,
          title: topic,
          content: result.data,
          topic,
          audience,
          tone,
          goal,
          generatedAt: now(),
          approvalStatus: 'draft' as const,
          confidence: null,
        };
        setAsset(generated);
        onSave(generated);
      } else {
        setError('Content generation returned no data. Ensure analysis is complete first.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate content. Check backend connection.');
    } finally {
      setGenerating(false);
    }
  };

  const tones = ['professional', 'conversational', 'persuasive', 'educational', 'inspirational'];
  const goals = ['inform', 'convert', 'engage', 'educate', 'inspire'];

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><BookOpen size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Content Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Asset Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={S.input}>
              {contentTypes.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={S.input}>
              {tones.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Topic *</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., How AI is transforming marketing automation" style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Target Audience</label>
            <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g., B2B marketers, SaaS founders" style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Goal</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={S.input}>
              {goals.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ ...S.btn(C.brand), padding: '8px 20px' }}>
            {generating ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Sparkles size={14} /> Generate Content</>}
          </button>
        </div>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={2} /></div>}

      {error && (
        <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={14} style={{ color: C.critical }} /> {error}
        </div>
      )}

      {asset && !generating && !error && (
        <div style={S.card}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>{asset.title}</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '500px', overflow: 'auto', padding: '12px', background: C.bg, borderRadius: '8px' }}>
            {JSON.stringify(asset.content, null, 2)}
          </div>
          <div style={{ marginTop: '8px', fontSize: '10px', color: C.dim }}>
            Generated using {context?.sourceSummary?.sourcesCollected?.length || 0} evidence sources
          </div>
        </div>
      )}

      {!asset && !generating && !error && (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }}>
          <BookOpen size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <div>Enter a topic and click Generate to create content backed by product evidence.</div>
        </div>
      )}
    </div>
  );
}

// ============================================
// EMAIL CAMPAIGN STUDIO
// ============================================

const emailTypes = [
  { value: 'cold-outreach', label: 'Cold Outreach' },
  { value: 'follow-up', label: 'Follow-Up Sequence' },
  { value: 'demo-request', label: 'Demo Request' },
  { value: 'onboarding', label: 'Customer Onboarding' },
  { value: 'retention', label: 'Customer Retention' },
  { value: 're-engagement', label: 'Re-engagement' },
  { value: 'newsletter', label: 'Newsletter' },
];

export function EmailStudio({ context, onSave }: { context: any; onSave: (asset: any) => void }) {
  const { selectedChatId } = useProject();
  const [type, setType] = useState('cold-outreach');
  const [persona, setPersona] = useState('');
  const [tone, setTone] = useState('professional');
  const [subject, setSubject] = useState('');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedChatId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateExecutionModule(selectedChatId, 'email-campaigns');
      if (result?.success && result?.data) {
        const generated = {
          id: generateId(),
          type: 'email',
          subType: type,
          title: subject || `${type} Email`,
          content: result.data,
          targetAudience: persona,
          tone,
          generatedAt: now(),
          approvalStatus: 'draft' as const,
          confidence: null,
        };
        setAsset(generated);
        onSave(generated);
      } else {
        setError('Email generation returned no data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate email.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ ...S.card, background: 'rgba(255,179,71,0.05)', border: '1px solid rgba(255,179,71,0.3)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Shield size={16} style={{ color: C.needsImprovement }} />
          <div style={{ fontSize: '12px', color: C.needsImprovement }}>Email Compliance Notice: Review CAN-SPAM, GDPR, and CASL before sending. All emails are drafts requiring manual approval.</div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardHeader}><Mail size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Email Campaign Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Email Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={S.input}>
              {emailTypes.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Tone</label>
            <select value={tone} onChange={e => setTone(e.target.value)} style={S.input}>
              <option value="professional">Professional</option><option value="friendly">Friendly</option><option value="formal">Formal</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Target Persona</label>
            <input value={persona} onChange={e => setPersona(e.target.value)} placeholder="e.g., Marketing Director at SaaS company" style={S.input} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Subject Line</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" style={S.input} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={{ ...S.btn(C.brand), padding: '8px 20px', marginTop: '14px' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Sparkles size={14} /> Generate Email</>}
        </button>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={2} /></div>}
      {error && <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} style={{ color: C.critical }} /> {error}</div>}

      {asset && !generating && !error && (
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>{asset.title}</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '500px', overflow: 'auto', padding: '12px', background: C.bg, borderRadius: '8px' }}>
            {JSON.stringify(asset.content, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// SOCIAL MEDIA STUDIO
// ============================================

export function SocialStudio({ context, onSave }: { context: any; onSave: (asset: any) => void }) {
  const { selectedChatId } = useProject();
  const [platform, setPlatform] = useState('linkedin');
  const [goal, setGoal] = useState('awareness');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedChatId || !topic.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateExecutionModule(selectedChatId, 'social-calendars');
      if (result?.success && result?.data) {
        const generated = {
          id: generateId(),
          type: 'social',
          subType: platform,
          title: `${platform} post: ${topic}`,
          content: result.data,
          goal,
          generatedAt: now(),
          approvalStatus: 'draft' as const,
          confidence: null,
        };
        setAssets([generated]);
        onSave(generated);
      } else {
        setError('Social content generation returned no data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate social content.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><RadioTower size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Social Media Content Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={S.input}>
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">X / Twitter</option>
              <option value="tiktok">TikTok Caption</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Goal</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={S.input}>
              <option value="awareness">Awareness</option>
              <option value="engagement">Engagement</option>
              <option value="conversion">Conversion</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's your post about?" style={S.input} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ ...S.btn(C.brand), padding: '8px 20px', marginTop: '14px' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Sparkles size={14} /> Generate Social Post</>}
        </button>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={2} /></div>}
      {error && <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} style={{ color: C.critical }} /> {error}</div>}

      {assets.length > 0 && !generating && !error && assets.map(a => (
        <div key={a.id} style={S.card}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px' }}>{a.title}</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '8px', background: C.bg, borderRadius: '6px', maxHeight: '300px', overflow: 'auto' }}>
            {JSON.stringify(a.content, null, 2)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// CREATIVE STUDIO
// ============================================

export function CreativeStudio({ context, onSave }: { context: any; onSave: (asset: any) => void }) {
  const { selectedChatId } = useProject();
  const [type, setType] = useState('poster');
  const [platform, setPlatform] = useState('social');
  const [headline, setHeadline] = useState('');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedChatId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateExecutionModule(selectedChatId, 'creative-studio');
      if (result?.success && result?.data) {
        const generated = {
          id: generateId(),
          type: 'creative',
          subType: type,
          title: `${type}: ${headline || 'Creative Asset'}`,
          content: result.data,
          generatedAt: now(),
          approvalStatus: 'draft' as const,
          confidence: null,
        };
        setAsset(generated);
        onSave(generated);
      } else {
        setError('Creative brief generation returned no data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate creative brief.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><PenTool size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Creative Brief Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Creative Type</label>
            <select value={type} onChange={e => setType(e.target.value)} style={S.input}>
              <option value="poster">Poster Brief</option>
              <option value="banner">Banner Ad</option>
              <option value="carousel">Carousel</option>
              <option value="social-graphic">Instagram Creative</option>
              <option value="display-ad">Display Ad</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={S.input}>
              <option value="social">Social Media</option>
              <option value="web">Web</option>
              <option value="print">Print</option>
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '4px', display: 'block' }}>Headline</label>
            <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Main headline for the creative" style={S.input} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={{ ...S.btn(C.brand), padding: '8px 20px', marginTop: '14px' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Sparkles size={14} /> Generate Creative Brief</>}
        </button>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={2} /></div>}
      {error && <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} style={{ color: C.critical }} /> {error}</div>}

      {asset && !generating && !error && (
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>{asset.title}</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '12px', background: C.bg, borderRadius: '8px', maxHeight: '500px', overflow: 'auto' }}>
            {JSON.stringify(asset.content, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// VIDEO STUDIO
// ============================================

export function VideoStudio({ context, onSave }: { context: any; onSave: (asset: any) => void }) {
  const { selectedChatId } = useProject();
  const [type, setType] = useState('30s-ad');
  const [platform, setPlatform] = useState('youtube');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedChatId || !topic.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateExecutionModule(selectedChatId, 'video-studio');
      if (result?.success && result?.data) {
        const generated = {
          id: generateId(),
          type: 'video',
          subType: type,
          title: `${type} — ${topic}`,
          content: result.data,
          generatedAt: now(),
          approvalStatus: 'draft' as const,
          confidence: null,
        };
        setAsset(generated);
        onSave(generated);
      } else {
        setError('Video script generation returned no data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate video script.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><Video size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Video Script Generator</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>Duration</label>
            <select value={type} onChange={e => setType(e.target.value)} style={S.input}>
              <option value="15s-short">15 sec Short Ad</option>
              <option value="30s-ad">30 sec Ad</option>
              <option value="60s-ad">60 sec Ad</option>
              <option value="90s-explainer">90 sec Explainer</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={S.input}>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>Topic</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What's the video about?" style={S.input} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating || !topic.trim()} style={{ ...S.btn(C.brand), padding: '8px 20px', marginTop: '14px' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating Script...</> : <><Sparkles size={14} /> Generate Script</>}
        </button>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={2} /></div>}
      {error && <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} style={{ color: C.critical }} /> {error}</div>}

      {asset && !generating && !error && (
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>{asset.title}</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '12px', background: C.bg, borderRadius: '8px', maxHeight: '500px', overflow: 'auto' }}>
            {JSON.stringify(asset.content, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CAMPAIGN PLANNER
// ============================================

export function CampaignPlanner({ context, onSave }: { context: any; onSave: (asset: any) => void }) {
  const { selectedChatId } = useProject();
  const [duration, setDuration] = useState('30d');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [asset, setAsset] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedChatId) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateExecutionModule(selectedChatId, 'campaign-plans');
      if (result?.success && result?.data) {
        const generated = {
          id: generateId(),
          type: 'campaign',
          subType: duration,
          title: name || `${duration} Campaign Plan`,
          content: result.data,
          generatedAt: now(),
          approvalStatus: 'draft' as const,
          confidence: null,
        };
        setAsset(generated);
        onSave(generated);
      } else {
        setError('Campaign plan generation returned no data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate campaign plan.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={S.card}>
        <div style={S.cardHeader}><Megaphone size={18} style={{ color: C.brand }} /><span style={S.cardTitle}>Campaign Planner</span></div>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>Campaign Type</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} style={S.input}>
              <option value="30d">30-day campaign</option>
              <option value="60d">60-day campaign</option>
              <option value="90d">90-day campaign</option>
              <option value="product-launch">Product launch</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>Campaign Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Q3 Product Launch" style={S.input} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>Goal</label>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g., Generate 100 qualified leads" style={S.input} />
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={{ ...S.btn(C.brand), padding: '8px 20px', marginTop: '14px' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating Plan...</> : <><Sparkles size={14} /> Generate Campaign Plan</>}
        </button>
      </div>

      {generating && <div style={S.card}><LoadingSkeleton type="card" count={2} /></div>}
      {error && <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={14} style={{ color: C.critical }} /> {error}</div>}

      {asset && !generating && !error && (
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>{asset.title}</div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '12px', background: C.bg, borderRadius: '8px', maxHeight: '500px', overflow: 'auto' }}>
            {JSON.stringify(asset.content, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// ASSET LIBRARY (unchanged - pure UI)
// ============================================

export function AssetLibrary({ assets, onUpdate, onDelete }: {
  assets: any[]; onUpdate: (assets: any[]) => void; onDelete: (id: string) => void;
}) {
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const counts = {
    content: assets.filter(a => a.type === 'content').length,
    email: assets.filter(a => a.type === 'email').length,
    social: assets.filter(a => a.type === 'social').length,
    creative: assets.filter(a => a.type === 'creative').length,
    video: assets.filter(a => a.type === 'video').length,
    campaign: assets.filter(a => a.type === 'campaign').length,
  };

  const filtered = assets.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterStatus !== 'all' && a.approvalStatus !== filterStatus) return false;
    if (searchQ) { const q = searchQ.toLowerCase(); return a.title.toLowerCase().includes(q) || a.subType.toLowerCase().includes(q); }
    return true;
  }).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  const statusColor = (s: string) => s === 'draft' ? C.needsImprovement : s === 'approved' ? C.excellent : s === 'needs-review' ? C.accent : C.dim;
  const typeColors: Record<string, string> = { content: C.brand, email: C.purple, social: C.excellent, creative: C.needsImprovement, video: C.critical, campaign: C.accent };

  return (
    <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: selectedAsset ? '1fr 380px' : '1fr' }}>
      <div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.dim }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search assets..." style={{ ...S.input, paddingLeft: '30px', fontSize: '12px' }} />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...S.input, width: 'auto' }}>
            <option value="all">All Types ({assets.length})</option>
            <option value="content">Content ({counts.content})</option>
            <option value="email">Email ({counts.email})</option>
            <option value="social">Social ({counts.social})</option>
            <option value="creative">Creative ({counts.creative})</option>
            <option value="video">Video ({counts.video})</option>
            <option value="campaign">Campaign ({counts.campaign})</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...S.input, width: 'auto' }}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="needs-review">Needs Review</option>
          </select>
        </div>

        {assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: '13px', background: C.card, borderRadius: '12px', border: `1px solid ${C.border}` }}>
            <FolderOpen size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>No assets saved yet. Generate content and save it to build your library.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>No assets match your filters.</div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {filtered.map(a => (
              <div key={a.id} onClick={() => setSelectedAsset(selectedAsset?.id === a.id ? null : a)} style={{ ...S.row, cursor: 'pointer', borderColor: selectedAsset?.id === a.id ? C.accent + '60' : '#1d2738', flexWrap: 'wrap' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${typeColors[a.type] || C.dim}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {a.type === 'content' ? <BookOpen size={14} style={{ color: typeColors[a.type] }} /> :
                   a.type === 'email' ? <Mail size={14} style={{ color: typeColors[a.type] }} /> :
                   a.type === 'social' ? <RadioTower size={14} style={{ color: typeColors[a.type] }} /> :
                   a.type === 'creative' ? <PenTool size={14} style={{ color: typeColors[a.type] }} /> :
                   a.type === 'video' ? <Video size={14} style={{ color: typeColors[a.type] }} /> :
                   <Megaphone size={14} style={{ color: typeColors[a.type] }} />}
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{a.title}</div>
                  <div style={{ fontSize: '11px', color: C.muted, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={S.tag(typeColors[a.type] || C.dim)}>{a.subType}</span>
                    <span>{new Date(a.generatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${statusColor(a.approvalStatus)}20`, color: statusColor(a.approvalStatus) }}>{a.approvalStatus}</span>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(a.id); }} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAsset && (
        <div style={{ ...S.card, maxHeight: '80vh', overflow: 'auto', position: 'sticky', top: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>{selectedAsset.title}</div>
            <button onClick={() => setSelectedAsset(null)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer' }}><X size={16} /></button>
          </div>
          <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto', padding: '10px', background: C.bg, borderRadius: '6px' }}>
            {typeof selectedAsset.content === 'string' ? selectedAsset.content : JSON.stringify(selectedAsset.content, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// INTEGRATION HEALTH PANEL (unchanged)
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
  const items = (() => {
    const reasonMap: Record<string, string> = {
      missing_api_key: 'Missing API key', missing_from_email: 'Missing from email', init_failed: 'Init failed',
      missing_env_vars: 'Missing config', pollinations_only: 'Pollinations only', pollinations_fal_configured: 'Pollinations + Fal',
      shotstack_configured: 'Shotstack', creatomate_configured: 'Creatomate', no_video_provider: 'No provider',
    };
    const emailDesc = providers.email.configured ? (providers.email.provider === 'gmail' ? 'Gmail SMTP' : providers.email.provider === 'resend' ? 'Resend' : providers.email.provider || 'Configured') : (reasonMap[providers.email.reason] || providers.email.reason || 'Not configured');
    const imgPollinations = providers.image?.pollinations?.configured !== false;
    const imgFal = providers.image?.fal?.configured === true;
    const imgDesc = imgPollinations && imgFal ? 'Pollinations + Fal' : imgPollinations ? 'Pollinations' : imgFal ? 'Fal' : (reasonMap[providers.image.reason] || 'None');
    const storageDesc = providers.storage.configured ? 'Cloudinary' : (reasonMap[providers.storage.reason] || 'Not configured');
    const vidShotstack = providers.video?.shotstack?.configured === true;
    const vidCreatomate = providers.video?.creatomate?.configured === true;
    const videoDesc = vidShotstack ? 'Shotstack' : vidCreatomate ? 'Creatomate' : (reasonMap[providers.video.reason] || 'Not available');
    return [
      { label: 'Email', ok: providers.email.configured, detail: emailDesc, reason: providers.email.reason },
      { label: 'Image', ok: imgPollinations || imgFal, detail: imgDesc, reason: providers.image.reason },
      { label: 'Storage', ok: providers.storage.configured, detail: storageDesc, reason: providers.storage.reason },
      { label: 'Video', ok: vidShotstack || vidCreatomate, detail: videoDesc, reason: providers.video.reason },
      { label: 'AI', ok: providers.ai?.gemini || providers.ai?.groq, detail: `${providers.ai?.gemini ? 'Gemini' : ''}${providers.ai?.gemini && providers.ai?.groq ? ' + ' : ''}${providers.ai?.groq ? 'Groq' : ''}${!providers.ai?.gemini && !providers.ai?.groq ? 'None' : ''}` },
    ];
  })();
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}><Wifi size={12} /> Integration Status:</div>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', background: item.ok ? 'rgba(16,225,139,0.08)' : 'rgba(255,179,71,0.08)', border: `1px solid ${item.ok ? 'rgba(16,225,139,0.2)' : 'rgba(255,179,71,0.2)'}` }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.ok ? C.excellent : C.needsImprovement }} />
          <span style={{ fontSize: '10px', color: item.ok ? C.excellent : C.needsImprovement, fontWeight: 600 }}>{item.label}</span>
          <span style={{ fontSize: '9px', color: C.dim }}>{item.detail}{item.reason ? ` (${item.reason})` : ''}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN CONTENT STUDIO PAGE
// ============================================

const studioTabs = [
  { id: 'content', label: 'Content Studio', icon: BookOpen },
  { id: 'email', label: 'Email Studio', icon: Mail },
  { id: 'social', label: 'Social Studio', icon: RadioTower },
  { id: 'creative', label: 'Creative Studio', icon: PenTool },
  { id: 'video', label: 'Video Studio', icon: Video },
  { id: 'campaign', label: 'Campaign Planner', icon: Megaphone },
  { id: 'library', label: 'Asset Library', icon: FolderOpen },
];

export default function AIContentStudio() {
  const { selectedChatId, fullResults } = useProject();
  const [activeTab, setActiveTab] = useWorkspaceMemory('studio-activeTab', 'content');
  const [assets, setAssets] = useWorkspaceMemory<any[]>('studio-assets', []);
  const [evidenceContext, setEvidenceContext] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [showHealth, setShowHealth] = useState(true);

  useEffect(() => {
    if (!selectedChatId) return;
    setContextLoading(true);
    getEvidenceContext(selectedChatId)
      .then(ctx => {
        if (ctx?.success && ctx?.data) {
          setEvidenceContext(ctx.data);
        }
      })
      .catch(() => {
        // Evidence context unavailable — fall back to empty state
        setEvidenceContext(null);
      })
      .finally(() => setContextLoading(false));
  }, [selectedChatId]);

  const handleSave = (asset: any) => {
    const existing = assets.find(a => a.id === asset.id);
    if (existing) {
      setAssets(assets.map(a => a.id === asset.id ? asset : a));
    } else {
      setAssets([asset, ...assets]);
    }
  };

  const handleDeleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  const handleUpdateAssets = (updated: any[]) => {
    setAssets(updated);
  };

  const renderTab = () => {
    const sharedProps = { context: evidenceContext, onSave: handleSave };
    switch (activeTab) {
      case 'content': return <ContentStudio {...sharedProps} />;
      case 'email': return <EmailStudio {...sharedProps} />;
      case 'social': return <SocialStudio {...sharedProps} />;
      case 'creative': return <CreativeStudio {...sharedProps} />;
      case 'video': return <VideoStudio {...sharedProps} />;
      case 'campaign': return <CampaignPlanner {...sharedProps} />;
      case 'library': return <AssetLibrary assets={assets} onUpdate={handleUpdateAssets} onDelete={handleDeleteAsset} />;
      default: return <ContentStudio {...sharedProps} />;
    }
  };

  return (
    <div>
      <PageHeader eyebrow="AI Content & Campaign Studio" title="Content & Campaign Studio" subtitle="Generate, preview, and manage AI-powered marketing content across all channels. All content is evidence-based and requires manual approval before publishing." />
      <div style={{ marginTop: '20px' }}>
        {contextLoading ? (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '12px', color: C.muted }}>
            Loading evidence context...
          </div>
        ) : !evidenceContext?.sourceSummary?.sourcesCollected?.length ? (
          <div style={{ marginBottom: '16px', padding: '10px 14px', background: 'rgba(255,179,71,0.08)', borderRadius: '8px', border: '1px solid rgba(255,179,71,0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.needsImprovement }}>
            <AlertTriangle size={16} />
            <div>Evidence unavailable — run product analysis with a website URL first.</div>
          </div>
        ) : (
          <EvidencePanel context={evidenceContext} />
        )}

        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <button onClick={() => setShowHealth(!showHealth)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {showHealth ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Provider Health
            </button>
          </div>
          {showHealth && <IntegrationHealthPanel />}
        </div>

        <Card>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px', marginBottom: '16px' }}>
            {studioTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: activeTab === t.id ? `${C.accent}15` : 'transparent',
                cursor: 'pointer', fontSize: '11px', color: activeTab === t.id ? C.accent : C.muted,
                fontWeight: activeTab === t.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <t.icon size={12} /> {t.label} {t.id === 'library' && assets.length > 0 && <span style={{ fontSize: '9px', background: C.accent, color: '#fff', borderRadius: '8px', padding: '0 5px', fontWeight: 700 }}>{assets.length}</span>}
              </button>
            ))}
          </div>
          {renderTab()}
        </Card>
      </div>
    </div>
  );
}

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle2, Lightbulb, Zap, Target, TrendingUp, Shield,
  ChevronDown, ChevronUp, Info, X, Search, Copy, Download, Share2,
  Clock, FileText, BarChart2, PieChart, Activity, Users, Building,
  Code, DollarSign, ExternalLink, Flag, Calendar, UserCheck, Layers,
  Sliders, Eye, ArrowUpRight, ArrowDownRight, ArrowRight, GripHorizontal,
  Star, Flame, Filter, Globe, Map, Briefcase, Loader2, Play, SkipBack,
  SkipForward, Monitor, GitBranch, Sparkles, Link, Award, Medal, Trophy,
  RefreshCw, Plus, Check, MoreHorizontal, Edit3, MessageSquare, Bell,
  Pin, Trash2, ThumbsUp, ThumbsDown, HelpCircle, User, List, Grid,
  Maximize2, Minimize2, BookOpen, AlertCircle, CheckCheck,
  FileSpreadsheet, FolderOpen, DownloadCloud, Upload,
  Keyboard, Command, AtSign, Reply, CheckSquare,
  Square, Circle, Timer, FlagTriangleRight, FolderKanban, LayoutDashboard,
  CalendarDays, CalendarCheck, CalendarRange,
  ScrollText, ChartNoAxesCombined,
  Waypoints, WholeWord, Wifi,
  Volume2, Voicemail
} from 'lucide-react';
import { ProgressBar, StatusBadge, ConfidenceBadge, PriorityChip, EnterpriseInsightCard, KPIDashboard, MiniRadarLegend, EnterpriseEmptyState, SmartNavigation, SearchBar, LoadingSkeleton } from './EnterpriseComponents';
import { Badge, Card, EmptyState, Loading, PageHeader, ScoreCard, SectionTitle, InsightCard, EvidenceBadge } from './UI';
import { ExecutiveSummaryCards, BusinessHealthScore, AIDecisionPanel, RecommendationPriorities, CrossModuleInsights, ExplainButton, CompareResults, OpportunityMatrix, RiskMatrix, ConfidenceVisualization, InteractiveFilters, SmartSearch, EnterpriseReportPreview, ProductivityBar, ExecutiveCommandCenter, StoryDrivenResults, AIBusinessAdvisor, DecisionSimulator, CompetitorPositioningMap, MarketOpportunityHeatmap, BusinessTimeline, ExecutiveKPIDashboard, InsightRelationships, EvidenceExplorer, ReportPreview20, PresentationMode, useWorkspaceMemory, SmartEmptyData, SmartEmptyState } from './EnterpriseDecisionSuite';
import { asArray, asNumber, asText, renderSafeValue } from '../lib/normalizers';

const C = {
  excellent: '#10e18b', good: '#53a7ff', needsImprovement: '#ffb347',
  critical: '#ff4757', bg: '#0f1729', card: '#151d2b', border: '#293245',
  text: '#e5e7eb', muted: '#9aa7bd', dim: '#6b7280', accent: '#818cf8',
  purple: '#a855f7', orange: '#ff6b35', pink: '#ec4899', cyan: '#06b6d4'
};

const S = {
  section: { marginBottom: '24px' },
  card: { background: C.card, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '20px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' },
  cardTitle: { fontSize: '15px', fontWeight: 600, color: C.text, flex: 1 },
  flexCenter: { display: 'flex', alignItems: 'center', gap: '8px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' },
  chip: (color: string) => ({ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${color}15`, color }),
  badge: (color: string) => ({ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${color}15`, color }),
  row: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: C.bg, borderRadius: '8px', border: `1px solid #1d2738` },
  input: { width: '100%', padding: '8px 12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '6px', color: C.text, fontSize: '13px', outline: 'none' },
  btn: (color: string) => ({ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${color}`, background: `${color}15`, cursor: 'pointer', fontSize: '11px', fontWeight: 600, color, display: 'inline-flex', alignItems: 'center', gap: '4px' }),
  tag: (color: string) => ({ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${color}15`, color }),
};

// ══════════════════════════════════════════════════════════════
// DATA TYPES
// ══════════════════════════════════════════════════════════════

export interface ActionItem {
  id: string; title: string; description?: string; priority: 'Critical' | 'High' | 'Medium' | 'Low';
  owner?: string; timeline?: string; status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  businessImpact?: string; expectedRoi?: string; confidence?: number;
  sourceModule?: string; dueDate?: string; progress?: number;
  comments?: CommentItem[]; approved?: boolean; approvedBy?: string; approvedDate?: string;
  approverNotes?: string; approvalStatus?: 'approved' | 'rejected' | 'needs-review' | 'pending';
}

export interface CommentItem { id: string; author: string; text: string; timestamp: string; mentions?: string[]; resolved?: boolean; }

export interface KpiData { id: string; label: string; current: number; target: number; trend: 'up' | 'down' | 'stable'; owner?: string; deadline?: string; confidence?: number; }

export interface NotificationItem { id: string; type: string; message: string; timestamp: string; read: boolean; module?: string; }

export interface ActivityItem { id: string; action: string; description: string; timestamp: string; module?: string; icon?: any; }

export interface CalendarEvent { id: string; title: string; date: string; type: 'campaign' | 'milestone' | 'seo' | 'content' | 'meeting'; module?: string; }

export interface ReportRecord { id: string; title: string; company: string; date: string; type: string; preview?: string; }

export interface StoredAction { id: string; title: string; description: string; priority: 'Critical' | 'High' | 'Medium' | 'Low'; owner: string; dueDate: string; status: 'pending' | 'in-progress' | 'completed' | 'blocked'; progress: number; comments: CommentItem[]; approvalStatus: 'approved' | 'rejected' | 'needs-review' | 'pending'; approvedBy: string; approvedDate: string; approverNotes: string; sourceModule: string; timeline: string; businessImpact: string; expectedRoi: string; confidence: number; createdAt: string; }

// ══════════════════════════════════════════════════════════════
// HOOKS
// ══════════════════════════════════════════════════════════════

function useWorkspaceData<T>(key: string, defaultValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try { const stored = localStorage.getItem(`workspace_${key}`); return stored ? JSON.parse(stored) : defaultValue; } catch { return defaultValue; }
  });
  const setAndStore = useCallback((val: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof val === 'function' ? (val as (prev: T) => T)(prev) : val;
      try { localStorage.setItem(`workspace_${key}`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [value, setAndStore];
}

function generateId(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// ══════════════════════════════════════════════════════════════
// PART 1 — EXECUTIVE ACTION CENTER
// ══════════════════════════════════════════════════════════════

export function ExecutiveActionCenter({ actions, onActionUpdate }: { actions: StoredAction[]; onActionUpdate?: (actions: StoredAction[]) => void }) {
  const [filter, setFilter] = useState<string>('all');
  const [searchQ, setSearchQ] = useState('');

  const counts = useMemo(() => ({
    critical: actions.filter(a => a.priority === 'Critical' && a.status !== 'completed').length,
    highRoi: actions.filter(a => a.priority === 'High' && a.status !== 'completed').length,
    immediate: actions.filter(a => a.status === 'pending').length,
    blocked: actions.filter(a => a.status === 'blocked').length,
    completed: actions.filter(a => a.status === 'completed').length,
    inProgress: actions.filter(a => a.status === 'in-progress').length,
  }), [actions]);

  const filtered = useMemo(() => {
    let list = actions;
    if (filter === 'critical') list = list.filter(a => a.priority === 'Critical' && a.status !== 'completed');
    else if (filter === 'high-roi') list = list.filter(a => a.priority === 'High' && a.status !== 'completed');
    else if (filter === 'immediate') list = list.filter(a => a.status === 'pending');
    else if (filter === 'blocked') list = list.filter(a => a.status === 'blocked');
    else if (filter === 'completed') list = list.filter(a => a.status === 'completed');
    else if (filter === 'in-progress') list = list.filter(a => a.status === 'in-progress');
    if (searchQ) { const q = searchQ.toLowerCase(); list = list.filter(a => a.title.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q) || a.sourceModule.toLowerCase().includes(q)); }
    return list.sort((a, b) => {
      const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (rank[a.priority] ?? 99) - (rank[b.priority] ?? 99);
    });
  }, [actions, filter, searchQ]);

  const priorityColor = (p: string) => p === 'Critical' ? C.critical : p === 'High' ? C.orange : p === 'Medium' ? C.needsImprovement : C.dim;
  const statusColor = (s: string) => s === 'completed' ? C.excellent : s === 'in-progress' ? C.good : s === 'blocked' ? C.critical : C.needsImprovement;

  const handleStatusChange = (id: string, newStatus: StoredAction['status']) => {
    if (!onActionUpdate) return;
    onActionUpdate(actions.map(a => a.id === id ? { ...a, status: newStatus, progress: newStatus === 'completed' ? 100 : newStatus === 'in-progress' ? Math.max(a.progress, 25) : newStatus === 'blocked' ? a.progress : 0 } : a));
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterButton label="All" active={filter === 'all'} count={actions.length} onClick={() => setFilter('all')} color={C.accent} />
        <FilterButton label="Critical" active={filter === 'critical'} count={counts.critical} onClick={() => setFilter('critical')} color={C.critical} />
        <FilterButton label="High ROI" active={filter === 'high-roi'} count={counts.highRoi} onClick={() => setFilter('high-roi')} color={C.purple} />
        <FilterButton label="In Progress" active={filter === 'in-progress'} count={counts.inProgress} onClick={() => setFilter('in-progress')} color={C.good} />
        <FilterButton label="Pending" active={filter === 'immediate'} count={counts.immediate} onClick={() => setFilter('immediate')} color={C.needsImprovement} />
        <FilterButton label="Blocked" active={filter === 'blocked'} count={counts.blocked} onClick={() => setFilter('blocked')} color={C.critical} />
        <FilterButton label="Completed" active={filter === 'completed'} count={counts.completed} onClick={() => setFilter('completed')} color={C.excellent} />
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', maxWidth: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.dim }} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search actions..." style={{ ...S.input, paddingLeft: '30px', fontSize: '12px' }} />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>
          {searchQ ? 'No actions match your search.' : 'No actions yet. Run analyses to generate actionable recommendations.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {filtered.map(a => (
            <div key={a.id} style={{ ...S.row, flexWrap: 'wrap', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent + '40'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1d2738'}>
              <input type="checkbox" checked={a.status === 'completed'} onChange={() => handleStatusChange(a.id, a.status === 'completed' ? 'pending' : 'completed')} style={{ width: '16px', height: '16px', accentColor: C.excellent, cursor: 'pointer' }} />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: a.status === 'completed' ? C.dim : C.text, textDecoration: a.status === 'completed' ? 'line-through' : 'none' }}>{a.title}</span>
                  <span style={S.tag(priorityColor(a.priority))}>{a.priority}</span>
                  {a.sourceModule && <span style={S.tag(C.accent)}>{a.sourceModule}</span>}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: C.muted, flexWrap: 'wrap' }}>
                  {a.owner && <span style={S.flexCenter}><User size={11} /> {a.owner}</span>}
                  {a.timeline && <span style={S.flexCenter}><Clock size={11} /> {a.timeline}</span>}
                  {a.expectedRoi && <span style={{ color: C.excellent }}>ROI: {a.expectedRoi}</span>}
                  {a.confidence !== undefined && <ConfidenceBadge value={a.confidence} size="sm" />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {a.status !== 'completed' && a.status !== 'blocked' && (
                  <div style={{ width: '80px' }}>
                    <div style={{ height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${a.progress}%`, height: '100%', background: a.status === 'in-progress' ? C.good : C.needsImprovement, borderRadius: '2px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '9px', color: C.dim, textAlign: 'center', marginTop: '2px' }}>{a.progress}%</div>
                  </div>
                )}
                <span style={S.badge(statusColor(a.status))}>{a.status}</span>
                {a.approvalStatus && a.approvalStatus !== 'pending' && (
                  a.approvalStatus === 'approved' ? <CheckCircle2 size={14} style={{ color: C.excellent }} /> :
                  a.approvalStatus === 'rejected' ? <X size={14} style={{ color: C.critical }} /> :
                  <HelpCircle size={14} style={{ color: C.needsImprovement }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: C.dim, padding: '8px 0' }}>
        <span><span style={{ color: C.critical, fontWeight: 600 }}>{counts.critical}</span> Critical</span>
        <span><span style={{ color: C.purple, fontWeight: 600 }}>{counts.highRoi}</span> High ROI</span>
        <span><span style={{ color: C.needsImprovement, fontWeight: 600 }}>{counts.immediate}</span> Pending</span>
        <span><span style={{ color: C.good, fontWeight: 600 }}>{counts.inProgress}</span> In Progress</span>
        <span><span style={{ color: C.critical, fontWeight: 600 }}>{counts.blocked}</span> Blocked</span>
        <span><span style={{ color: C.excellent, fontWeight: 600 }}>{counts.completed}</span> Completed</span>
      </div>
    </div>
  );
}

function FilterButton({ label, active, count, onClick, color }: { label: string; active: boolean; count: number; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{ padding: '5px 10px', borderRadius: '6px', border: active ? `1px solid ${color}` : `1px solid ${C.border}`, background: active ? `${color}12` : C.bg, cursor: 'pointer', fontSize: '11px', fontWeight: active ? 600 : 400, color: active ? color : C.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
      {label} {count > 0 && <span style={{ background: active ? color : C.dim, color: '#fff', borderRadius: '8px', padding: '0 5px', fontSize: '9px', fontWeight: 700 }}>{count}</span>}
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 2 — TASK MANAGEMENT
// ══════════════════════════════════════════════════════════════

export function TaskManager({ actions, onActionUpdate }: { actions: StoredAction[]; onActionUpdate?: (actions: StoredAction[]) => void }) {
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium' as StoredAction['priority'], owner: '', dueDate: '', sourceModule: '' });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    const task: StoredAction = {
      id: generateId(), title: form.title, description: form.description, priority: form.priority,
      owner: form.owner || 'Unassigned', dueDate: form.dueDate, status: 'pending', progress: 0,
      comments: [], approvalStatus: 'pending', approvedBy: '', approvedDate: '', approverNotes: '',
      sourceModule: form.sourceModule, timeline: form.dueDate || 'TBD', businessImpact: '', expectedRoi: '',
      confidence: 80, createdAt: new Date().toISOString(),
    };
    onActionUpdate?.([task, ...actions]);
    setForm({ title: '', description: '', priority: 'Medium', owner: '', dueDate: '', sourceModule: '' });
    setNewTaskOpen(false);
  };

  const handleEdit = (a: StoredAction) => {
    onActionUpdate?.(actions.map(x => x.id === a.id ? { ...x, ...form, id: x.id } : x));
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    onActionUpdate?.(actions.filter(x => x.id !== id));
  };

  const priorityColor = (p: string) => p === 'Critical' ? C.critical : p === 'High' ? C.orange : p === 'Medium' ? C.needsImprovement : C.dim;

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: C.muted }}>{actions.length} total tasks</div>
        <button onClick={() => setNewTaskOpen(true)} style={S.btn(C.excellent)}>
          <Plus size={14} /> New Task
        </button>
      </div>
      {newTaskOpen && (
        <div style={{ ...S.card, marginBottom: '8px' }}>
          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Task title *" style={S.input} />
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as any})} style={S.input}>
              <option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
            </select>
            <input value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} placeholder="Owner" style={S.input} />
            <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} style={S.input} />
            <input value={form.sourceModule} onChange={e => setForm({...form, sourceModule: e.target.value})} placeholder="Source module (e.g. SEO, Growth)" style={{ ...S.input, gridColumn: '1 / -1' }} />
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={2} style={{ ...S.input, gridColumn: '1 / -1', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button onClick={handleAdd} style={S.btn(C.excellent)}><Plus size={14} /> Add Task</button>
            <button onClick={() => setNewTaskOpen(false)} style={S.btn(C.dim)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gap: '8px' }}>
        {actions.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>No tasks yet. Create one or convert recommendations from your analyses.</div>}
        {actions.map(a => (
          <div key={a.id} style={{ ...S.row, flexDirection: 'column', alignItems: 'stretch', padding: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => onActionUpdate?.(actions.map(x => x.id === a.id ? { ...x, status: x.status === 'completed' ? 'pending' : 'completed', progress: x.status === 'completed' ? 0 : 100 } : x))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: a.status === 'completed' ? C.excellent : C.dim }}>
                {a.status === 'completed' ? <CheckSquare size={18} /> : <Square size={18} />}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: a.status === 'completed' ? C.dim : C.text, textDecoration: a.status === 'completed' ? 'line-through' : 'none' }}>{a.title}</span>
                  <span style={S.tag(priorityColor(a.priority))}>{a.priority}</span>
                </div>
                {a.description && <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{a.description}</div>}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => { setEditId(a.id); setForm({ title: a.title, description: a.description, priority: a.priority, owner: a.owner, dueDate: a.dueDate, sourceModule: a.sourceModule }); }} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '4px' }}><Edit3 size={13} /></button>
                <button onClick={() => handleDelete(a.id)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: C.muted, flexWrap: 'wrap', alignItems: 'center' }}>
              {a.owner && <span style={S.flexCenter}><User size={11} /> {a.owner}</span>}
              {a.dueDate && <span style={S.flexCenter}><Calendar size={11} /> {a.dueDate}</span>}
              {a.sourceModule && <span style={S.flexCenter}><Layers size={11} /> {a.sourceModule}</span>}
              <span style={S.badge(a.status === 'completed' ? C.excellent : a.status === 'in-progress' ? C.good : a.status === 'blocked' ? C.critical : C.needsImprovement)}>{a.status}</span>
              {a.progress > 0 && a.status !== 'completed' && (
                <div style={{ flex: 1, maxWidth: '120px' }}>
                  <div style={{ height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${a.progress}%`, height: '100%', background: C.good, borderRadius: '2px' }} />
                  </div>
                </div>
              )}
              {a.comments.length > 0 && <span style={S.flexCenter}><MessageSquare size={11} /> {a.comments.length}</span>}
              {a.approvalStatus === 'approved' && <span style={S.badge(C.excellent)}><CheckCircle2 size={10} /> Approved</span>}
              {a.approvalStatus === 'rejected' && <span style={S.badge(C.critical)}><X size={10} /> Rejected</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 3 — PROGRESS TRACKING
// ══════════════════════════════════════════════════════════════

export interface ProgressModule { label: string; value: number; color?: string; icon?: any; }

export function ProgressTracking({ modules, onModuleClick }: { modules: ProgressModule[]; onModuleClick?: (label: string) => void }) {
  const overall = modules.length > 0 ? Math.round(modules.reduce((s, m) => s + m.value, 0) / modules.length) : 0;
  const overallColor = overall >= 70 ? C.excellent : overall >= 40 ? C.needsImprovement : C.critical;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ ...S.card, textAlign: 'center' }}>
        <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 12px' }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1d2738" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={overallColor} strokeWidth="8" strokeDasharray={`${(overall / 100) * 327} 327`} transform="rotate(-90 60 60)" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: overallColor }}>{overall}%</div>
            <div style={{ fontSize: '10px', color: C.dim }}>Overall</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        {modules.map((m, i) => {
          const barColor = m.color || (m.value >= 70 ? C.excellent : m.value >= 40 ? C.needsImprovement : C.critical);
          return (
            <div key={i} onClick={() => onModuleClick?.(m.label)} style={{ cursor: onModuleClick ? 'pointer' : 'default', padding: '10px 14px', background: C.card, borderRadius: '8px', border: `1px solid ${C.border}`, transition: 'border-color 0.2s' }}
              onMouseEnter={e => { if (onModuleClick) (e.currentTarget as HTMLElement).style.borderColor = C.accent + '60'; }}
              onMouseLeave={e => { if (onModuleClick) (e.currentTarget as HTMLElement).style.borderColor = C.border; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                {m.icon && <m.icon size={16} style={{ color: barColor }} />}
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.text, flex: 1 }}>{m.label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: barColor }}>{Math.round(m.value)}%</span>
              </div>
              <div style={{ height: '8px', background: '#1d2738', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(m.value, 100)}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 4 — TEAM COLLABORATION
// ══════════════════════════════════════════════════════════════

export function TeamCollaboration({ actions, onActionUpdate }: { actions: StoredAction[]; onActionUpdate?: (actions: StoredAction[]) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const selected = actions.find(a => a.id === selectedId);

  const handleAddComment = () => {
    if (!commentText.trim() || !selectedId) return;
    const comment: CommentItem = {
      id: generateId(), author: 'Current User', text: commentText,
      timestamp: new Date().toISOString(),
      mentions: commentText.match(/@\w+/g) || [],
    };
    onActionUpdate?.(actions.map(a => a.id === selectedId ? { ...a, comments: [...a.comments, comment] } : a));
    setCommentText('');
  };

  const toggleResolve = (commentId: string) => {
    if (!selectedId) return;
    onActionUpdate?.(actions.map(a => a.id === selectedId ? { ...a, comments: a.comments.map(c => c.id === commentId ? { ...c, resolved: !c.resolved } : c) } : a));
  };

  if (actions.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>No tasks with comments yet.</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', minHeight: '400px' }}>
      <div style={{ ...S.card, padding: '8px', overflow: 'auto', maxHeight: '500px' }}>
        <div style={{ fontSize: '11px', color: C.dim, padding: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tasks with Comments</div>
        {actions.filter(a => a.comments.length > 0).map(a => (
          <button key={a.id} onClick={() => setSelectedId(a.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', background: selectedId === a.id ? `${C.accent}12` : 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', marginBottom: '2px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: selectedId === a.id ? C.accent : C.text }}>{a.title}</div>
            <div style={{ fontSize: '10px', color: C.dim }}><MessageSquare size={10} /> {a.comments.length} · {a.status}</div>
          </button>
        ))}
      </div>
      <div style={{ ...S.card, display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: '13px' }}>
            <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div>Select a task to view and add comments</div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.text }}>{selected.title}</div>
                <div style={{ fontSize: '11px', color: C.muted }}>{selected.owner} · {selected.status}</div>
              </div>
              <span style={S.tag(selected.priority === 'Critical' ? C.critical : selected.priority === 'High' ? C.orange : C.needsImprovement)}>{selected.priority}</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', maxHeight: '300px', display: 'grid', gap: '8px' }}>
              {selected.comments.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: C.dim, fontSize: '12px' }}>No comments yet.</div>}
              {selected.comments.map(c => (
                <div key={c.id} style={{ padding: '8px 10px', background: C.bg, borderRadius: '8px', borderLeft: `3px solid ${c.resolved ? C.excellent : C.accent}`, opacity: c.resolved ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: C.accent, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={11} /> {c.author}
                      {c.mentions && c.mentions.length > 0 && c.mentions.map((m, i) => <span key={i} style={S.tag(C.needsImprovement)}>{renderSafeValue(m)}</span>)}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: C.dim }}>{new Date(c.timestamp).toLocaleDateString()}</span>
                      <button onClick={() => toggleResolve(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.resolved ? C.excellent : C.dim, padding: '2px' }}>
                        <CheckCircle2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.5 }}>{c.text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment... (use @name to mention)" style={{ ...S.input, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
              <button onClick={handleAddComment} disabled={!commentText.trim()} style={S.btn(C.accent)}>
                <Send size={14} /> Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const Send = (props: any) => <ArrowUpRight {...props} style={{ transform: 'rotate(90deg)', ...props.style }} />;

// ══════════════════════════════════════════════════════════════
// PART 5 — APPROVAL WORKFLOW
// ══════════════════════════════════════════════════════════════

export function ApprovalWorkflow({ actions, onActionUpdate }: { actions: StoredAction[]; onActionUpdate?: (actions: StoredAction[]) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const pending = actions.filter(a => a.approvalStatus === 'pending' || a.approvalStatus === 'needs-review');
  const approved = actions.filter(a => a.approvalStatus === 'approved');
  const rejected = actions.filter(a => a.approvalStatus === 'rejected');

  const handleApprove = (id: string) => {
    onActionUpdate?.(actions.map(a => a.id === id ? { ...a, approvalStatus: 'approved', approvedBy: 'Current User', approvedDate: new Date().toISOString(), approverNotes: notes } : a));
    setNotes('');
  };

  const handleReject = (id: string) => {
    onActionUpdate?.(actions.map(a => a.id === id ? { ...a, approvalStatus: 'rejected', approvedBy: 'Current User', approvedDate: new Date().toISOString(), approverNotes: notes } : a));
    setNotes('');
  };

  const handleNeedsReview = (id: string) => {
    onActionUpdate?.(actions.map(a => a.id === id ? { ...a, approvalStatus: 'needs-review', approverNotes: notes } : a));
    setNotes('');
  };

  const renderAction = (a: StoredAction) => (
    <div key={a.id} style={{ ...S.row, flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{a.title}</div>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>Owner: {a.owner} · {a.sourceModule || 'General'}</div>
        </div>
        <span style={S.tag(a.priority === 'Critical' ? C.critical : a.priority === 'High' ? C.orange : C.needsImprovement)}>{a.priority}</span>
      </div>
      {a.approverNotes && <div style={{ fontSize: '11px', color: C.needsImprovement, fontStyle: 'italic', marginTop: '4px', padding: '4px 8px', background: C.bg, borderRadius: '4px' }}>Notes: {a.approverNotes}</div>}
      {a.approvedBy && <div style={{ fontSize: '10px', color: C.dim, marginTop: '4px' }}>By {a.approvedBy} · {a.approvedDate ? new Date(a.approvedDate).toLocaleDateString() : ''}</div>}
      <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        {a.approvalStatus === 'pending' || a.approvalStatus === 'needs-review' ? (
          <>
            <button onClick={() => handleApprove(a.id)} style={S.btn(C.excellent)}><ThumbsUp size={12} /> Approve</button>
            <button onClick={() => handleReject(a.id)} style={S.btn(C.critical)}><ThumbsDown size={12} /> Reject</button>
            <button onClick={() => handleNeedsReview(a.id)} style={S.btn(C.needsImprovement)}><HelpCircle size={12} /> Needs Review</button>
            <input value={selectedId === a.id ? notes : ''} onChange={e => { setSelectedId(a.id); setNotes(e.target.value); }} placeholder="Add reason..." style={{ ...S.input, flex: 1, minWidth: '150px', fontSize: '11px' }} />
          </>
        ) : (
          <span style={S.badge(a.approvalStatus === 'approved' ? C.excellent : C.critical)}>
            {a.approvalStatus === 'approved' ? <CheckCircle2 size={10} /> : <X size={10} />}
            {a.approvalStatus === 'approved' ? 'Approved' : 'Rejected'}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {pending.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.needsImprovement, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={14} /> Pending Review ({pending.length})
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>{pending.map(renderAction)}</div>
        </div>
      )}
      {approved.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.excellent, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> Approved ({approved.length})
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>{approved.map(renderAction)}</div>
        </div>
      )}
      {rejected.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.critical, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <X size={14} /> Rejected ({rejected.length})
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>{rejected.map(renderAction)}</div>
        </div>
      )}
      {pending.length === 0 && approved.length === 0 && rejected.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>No actions requiring approval.</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 6 — EXECUTIVE NOTIFICATIONS
// ══════════════════════════════════════════════════════════════

export function ExecutiveNotifications({ notifications, onMarkRead, onMarkAllRead }: {
  notifications: NotificationItem[]; onMarkRead?: (id: string) => void; onMarkAllRead?: () => void;
}) {
  const unread = notifications.filter(n => !n.read).length;

  const iconFor = (type: string) => {
    switch (type) {
      case 'report': return <FileText size={14} style={{ color: C.accent }} />;
      case 'seo': return <TrendingUp size={14} style={{ color: C.good }} />;
      case 'campaign': return <Target size={14} style={{ color: C.purple }} />;
      case 'competitor': return <Shield size={14} style={{ color: C.orange }} />;
      case 'opportunity': return <Lightbulb size={14} style={{ color: C.needsImprovement }} />;
      case 'automation': return <Zap size={14} style={{ color: C.excellent }} />;
      default: return <Bell size={14} style={{ color: C.dim }} />;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={14} /> {unread > 0 ? <span style={{ color: C.critical, fontWeight: 600 }}>{unread} unread</span> : 'All caught up'}
        </div>
        {unread > 0 && <button onClick={onMarkAllRead} style={S.btn(C.dim)}><CheckCheck size={12} /> Mark all read</button>}
      </div>
      <div style={{ display: 'grid', gap: '4px', maxHeight: '400px', overflow: 'auto' }}>
        {notifications.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: C.muted, fontSize: '12px' }}>No notifications yet.</div>}
        {notifications.map(n => (
          <div key={n.id} onClick={() => onMarkRead?.(n.id)} style={{
            padding: '10px 12px', background: n.read ? C.bg : `${C.accent}08`, borderRadius: '8px',
            border: n.read ? `1px solid #1d2738` : `1px solid ${C.accent}30`, cursor: 'pointer',
            display: 'flex', gap: '10px', alignItems: 'flex-start', transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent + '60'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = n.read ? '#1d2738' : C.accent + '30'}>
            {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.accent, flexShrink: 0, marginTop: '3px' }} />}
            {iconFor(n.type)}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: n.read ? C.muted : C.text, fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
              <div style={{ fontSize: '10px', color: C.dim, marginTop: '2px' }}>{new Date(n.timestamp).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 7 — BUSINESS CALENDAR
// ══════════════════════════════════════════════════════════════

export function BusinessCalendar({ events, onEventClick }: { events: CalendarEvent[]; onEventClick?: (event: CalendarEvent) => void }) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<string>('all');

  const typeColors: Record<string, string> = {
    campaign: C.purple, milestone: C.excellent, seo: C.good, content: C.needsImprovement, meeting: C.accent,
  };

  const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);
  const sorted = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (viewMode === 'calendar') {
    const weeks = 4; const start = new Date();
    const calendarDays: { date: Date; events: CalendarEvent[] }[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      calendarDays.push({ date: d, events: sorted.filter(e => new Date(e.date).toDateString() === d.toDateString()) });
    }

    return (
      <div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => setViewMode('list')} style={S.btn(C.accent)}><List size={14} /> List View</button>
          <div style={{ flex: 1 }} />
          {['all', 'campaign', 'milestone', 'seo', 'content', 'meeting'].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ ...S.btn(filter === t ? typeColors[t] || C.accent : C.dim), fontSize: '10px' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ fontSize: '10px', color: C.dim, textAlign: 'center', fontWeight: 600, padding: '4px' }}>{d}</div>
          ))}
          {calendarDays.map((day, i) => (
            <div key={i} style={{ minHeight: '70px', padding: '4px', background: C.bg, borderRadius: '6px', border: `1px solid ${C.border}`, fontSize: '10px' }}>
              <div style={{ fontSize: '10px', color: C.dim, marginBottom: '2px', fontWeight: 600 }}>{day.date.getDate()}</div>
              {day.events.slice(0, 2).map(e => (
                <div key={e.id} onClick={() => onEventClick?.(e)} style={{ padding: '2px 4px', marginBottom: '2px', borderRadius: '3px', background: `${typeColors[e.type] || C.dim}20`, color: typeColors[e.type] || C.dim, cursor: 'pointer', fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.title}
                </div>
              ))}
              {day.events.length > 2 && <div style={{ fontSize: '8px', color: C.dim }}>+{day.events.length - 2} more</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button onClick={() => setViewMode('calendar')} style={S.btn(C.accent)}><CalendarDays size={14} /> Calendar View</button>
        <div style={{ flex: 1 }} />
        {['all', 'campaign', 'milestone', 'seo', 'content', 'meeting'].map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ ...S.btn(filter === t ? typeColors[t] || C.accent : C.dim), fontSize: '10px' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: '6px' }}>
        {sorted.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: C.muted, fontSize: '12px' }}>No events scheduled.</div>}
        {sorted.map(e => (
          <div key={e.id} onClick={() => onEventClick?.(e)} style={{ ...S.row, cursor: 'pointer' }}
            onMouseEnter={ev => (ev.currentTarget as HTMLElement).style.borderColor = (typeColors[e.type] || C.accent) + '60'}
            onMouseLeave={ev => (ev.currentTarget as HTMLElement).style.borderColor = '#1d2738'}>
            <div style={{ width: '3px', height: '32px', borderRadius: '2px', background: typeColors[e.type] || C.dim, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{e.title}</div>
              <div style={{ fontSize: '11px', color: C.muted }}>{new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {e.module || e.type}</div>
            </div>
            <span style={S.tag(typeColors[e.type] || C.dim)}>{e.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 8 — KPI TRACKING
// ══════════════════════════════════════════════════════════════

export function KpiTracking({ kpis, onKpiUpdate }: { kpis: KpiData[]; onKpiUpdate?: (kpis: KpiData[]) => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({ label: '', current: 0, target: 100, owner: '', deadline: '', confidence: 80 });

  const handleAdd = () => {
    if (!newForm.label.trim()) return;
    const kpi: KpiData = { id: generateId(), ...newForm, trend: 'stable' };
    onKpiUpdate?.([...kpis, kpi]);
    setNewForm({ label: '', current: 0, target: 100, owner: '', deadline: '', confidence: 80 });
  };

  const handleDelete = (id: string) => onKpiUpdate?.(kpis.filter(k => k.id !== id));

  const trendIcon = (t: string) => t === 'up' ? <ArrowUpRight size={14} style={{ color: C.excellent }} /> : t === 'down' ? <ArrowDownRight size={14} style={{ color: C.critical }} /> : <span style={{ color: C.dim }}>→</span>;

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={newForm.label} onChange={e => setNewForm({...newForm, label: e.target.value})} placeholder="KPI name" style={{ ...S.input, width: '180px' }} />
        <input type="number" value={newForm.current} onChange={e => setNewForm({...newForm, current: Number(e.target.value)})} placeholder="Current" style={{ ...S.input, width: '80px' }} />
        <input type="number" value={newForm.target} onChange={e => setNewForm({...newForm, target: Number(e.target.value)})} placeholder="Target" style={{ ...S.input, width: '80px' }} />
        <input value={newForm.owner} onChange={e => setNewForm({...newForm, owner: e.target.value})} placeholder="Owner" style={{ ...S.input, width: '120px' }} />
        <button onClick={handleAdd} style={S.btn(C.excellent)}><Plus size={14} /> Add KPI</button>
      </div>
      <div style={S.grid4}>
        {kpis.map(k => {
          const pct = k.target > 0 ? Math.min(Math.round((k.current / k.target) * 100), 100) : 0;
          const color = pct >= 80 ? C.excellent : pct >= 50 ? C.needsImprovement : C.critical;
          return (
            <div key={k.id} style={{ ...S.card, padding: '14px', position: 'relative' }}>
              <button onClick={() => handleDelete(k.id)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '2px' }}><X size={12} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{k.label}</span>
                {trendIcon(k.trend)}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color }}>{k.current}<span style={{ fontSize: '12px', color: C.dim }}>/{k.target}</span></div>
              <div style={{ height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden', margin: '8px 0' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: C.muted, flexWrap: 'wrap' }}>
                {k.owner && <span><User size={10} /> {k.owner}</span>}
                {k.deadline && <span><Calendar size={10} /> {k.deadline}</span>}
                {k.confidence && <ConfidenceBadge value={k.confidence} size="sm" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 9 — ACTIVITY TIMELINE
// ══════════════════════════════════════════════════════════════

export function ActivityTimeline({ activities }: { activities: ActivityItem[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};
    activities.forEach(a => {
      const day = new Date(a.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      if (!groups[day]) groups[day] = [];
      groups[day].push(a);
    });
    return groups;
  }, [activities]);

  const moduleColor = (m?: string) => {
    switch (m) {
      case 'growth': return C.excellent; case 'seo': return C.good; case 'automation': return C.needsImprovement;
      case 'report': return C.accent; case 'task': return C.purple; default: return C.dim;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {Object.keys(grouped).length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>No activity yet.</div>}
      {Object.entries(grouped).map(([day, items]) => (
        <div key={day} style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: C.dim, fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{day}</div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '15px', top: '0', bottom: '0', width: '2px', background: C.border }} />
            {items.map((item, i) => (
              <div key={item.id} style={{ display: 'flex', gap: '14px', paddingLeft: '0', marginBottom: '10px', position: 'relative' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${moduleColor(item.module)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1 }}>
                  {item.icon ? <item.icon size={14} style={{ color: moduleColor(item.module) }} /> : <Activity size={14} style={{ color: moduleColor(item.module) }} />}
                </div>
                <div style={{ flex: 1, padding: '10px 12px', background: C.bg, borderRadius: '8px', border: `1px solid #1d2738` }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{item.action}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{item.description}</div>
                  <div style={{ fontSize: '10px', color: C.dim, marginTop: '4px' }}>{new Date(item.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 10 — VERSION HISTORY
// ══════════════════════════════════════════════════════════════

export function VersionHistory({ versions, currentVersion, onSelectVersion }: {
  versions: { id: string; label: string; date: string; summary?: Record<string, number> }[];
  currentVersion?: string; onSelectVersion?: (id: string) => void;
}) {
  const [compareId, setCompareId] = useState<string | null>(null);
  const current = versions.find(v => v.id === currentVersion);
  const compare = versions.find(v => v.id === compareId);

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'grid', gap: '8px' }}>
        {versions.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>No previous versions available.</div>}
        {versions.map(v => (
          <div key={v.id} onClick={() => onSelectVersion?.(v.id)} style={{ ...S.row, cursor: 'pointer', borderColor: currentVersion === v.id ? C.accent + '60' : '#1d2738' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent + '40'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = currentVersion === v.id ? C.accent + '60' : '#1d2738'}>
            <div style={{ width: '4px', height: '32px', borderRadius: '2px', background: currentVersion === v.id ? C.accent : C.dim, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{v.label}</div>
              <div style={{ fontSize: '11px', color: C.muted }}>{new Date(v.date).toLocaleString()}</div>
            </div>
            {currentVersion === v.id && <span style={S.badge(C.accent)}>Current</span>}
            {v.summary && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {Object.entries(v.summary).map(([k, val]) => (
                  <span key={k} style={{ fontSize: '10px', color: val >= 0 ? C.excellent : C.critical }}>
                    {k}: {typeof val === 'number' ? (val >= 0 ? '+' : '') + val + '%' : renderSafeValue(val)}
                  </span>
                ))}
              </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); setCompareId(compareId === v.id ? null : v.id); }} style={S.btn(C.accent)}>
              <BarChart2 size={12} /> {compareId === v.id ? 'Hide' : 'Compare'}
            </button>
          </div>
        ))}
      </div>
      {current && compare && (
        <div style={{ ...S.card }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '12px' }}>
            Comparing: {current.label} vs {compare.label}
          </div>
          <CompareResults metrics={[
            ...Object.entries(compare.summary || {}).map(([k, val]) => ({
              label: k, current: current.summary?.[k] || 0, previous: val,
            })),
          ]} />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 11 — WORKSPACE DASHBOARD
// ══════════════════════════════════════════════════════════════

export function WorkspaceDashboard({ actions, notifications, activities, kpis, onNavigate }: {
  actions: StoredAction[]; notifications: NotificationItem[]; activities: ActivityItem[]; kpis: KpiData[];
  onNavigate?: (section: string) => void;
}) {
  const criticalCount = actions.filter(a => a.priority === 'Critical' && a.status !== 'completed').length;
  const pendingCount = actions.filter(a => a.status === 'pending').length;
  const completedCount = actions.filter(a => a.status === 'completed').length;
  const unreadCount = notifications.filter(n => !n.read).length;
  const recentActivity = activities.slice(-5).reverse();

  const quickActions = [
    { label: 'New Task', icon: Plus, section: 'tasks', color: C.excellent },
    { label: 'View Actions', icon: CheckSquare, section: 'actions', color: C.accent },
    { label: 'Notifications', icon: Bell, section: 'notifications', color: C.needsImprovement },
    { label: 'Calendar', icon: CalendarDays, section: 'calendar', color: C.purple },
  ];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        <StatCard icon={AlertTriangle} label="Critical Actions" value={criticalCount} color={C.critical} onClick={() => onNavigate?.('actions')} />
        <StatCard icon={List} label="Pending Tasks" value={pendingCount} color={C.needsImprovement} onClick={() => onNavigate?.('tasks')} />
        <StatCard icon={CheckCircle2} label="Completed" value={completedCount} color={C.excellent} onClick={() => onNavigate?.('actions')} />
        <StatCard icon={Bell} label="Unread Notifications" value={unreadCount} color={C.accent} onClick={() => onNavigate?.('notifications')} />
        <StatCard icon={Activity} label="Activity Entries" value={activities.length} color={C.good} onClick={() => onNavigate?.('activity')} />
        <StatCard icon={BarChart2} label="KPIs Tracked" value={kpis.length} color={C.purple} onClick={() => onNavigate?.('kpis')} />
      </div>
      <div style={S.grid2}>
        <div style={{ ...S.card }}>
          <div style={S.cardHeader}><Zap size={16} style={{ color: C.accent }} /><span style={S.cardTitle}>Quick Actions</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {quickActions.map(q => (
              <button key={q.label} onClick={() => onNavigate?.(q.section)} style={{ padding: '12px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = q.color + '60'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}>
                <q.icon size={20} style={{ color: q.color, marginBottom: '6px' }} />
                <div style={{ fontSize: '11px', color: C.muted }}>{q.label}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ ...S.card }}>
          <div style={S.cardHeader}><Activity size={16} style={{ color: C.excellent }} /><span style={S.cardTitle}>Recent Activity</span></div>
          <div style={{ display: 'grid', gap: '6px', maxHeight: '200px', overflow: 'auto' }}>
            {recentActivity.map(a => (
              <div key={a.id} style={{ padding: '6px 8px', background: C.bg, borderRadius: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {a.icon ? <a.icon size={12} style={{ color: C.accent }} /> : <Activity size={12} style={{ color: C.dim }} />}
                <div style={{ flex: 1, fontSize: '11px', color: C.muted }}><strong style={{ color: C.text }}>{a.action}</strong> — {a.description}</div>
                <span style={{ fontSize: '9px', color: C.dim }}>{new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {kpis.length > 0 && (
        <div style={{ ...S.card }}>
          <div style={S.cardHeader}><BarChart2 size={16} style={{ color: C.purple }} /><span style={S.cardTitle}>KPI Overview</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
            {kpis.slice(0, 6).map(k => {
              const pct = k.target > 0 ? Math.round((k.current / k.target) * 100) : 0;
              return (
                <div key={k.id} style={{ padding: '10px', background: C.bg, borderRadius: '6px' }}>
                  <div style={{ fontSize: '10px', color: C.muted, marginBottom: '2px' }}>{k.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: pct >= 80 ? C.excellent : pct >= 50 ? C.needsImprovement : C.critical }}>{k.current}<span style={{ fontSize: '11px', color: C.dim }}>/{k.target}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }: { icon: any; label: string; value: number; color: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ padding: '16px', background: C.card, borderRadius: '10px', border: `1px solid ${C.border}`, cursor: onClick ? 'pointer' : 'default', textAlign: 'center' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.borderColor = color + '50'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.borderColor = C.border; }}>
      <Icon size={22} style={{ color, marginBottom: '6px', display: 'inline-block' }} />
      <div style={{ fontSize: '26px', fontWeight: 700, color: C.text }}>{value}</div>
      <div style={{ fontSize: '11px', color: C.muted }}>{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 12 — ENTERPRISE REPORT LIBRARY
// ══════════════════════════════════════════════════════════════

export function EnterpriseReportLibrary({ reports, onDownload, onPreview }: {
  reports: ReportRecord[]; onDownload?: (report: ReportRecord, format: string) => void; onPreview?: (report: ReportRecord) => void;
}) {
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('all');

  const filtered = reports.filter(r => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (searchQ) { const q = searchQ.toLowerCase(); return r.title.toLowerCase().includes(q) || r.company.toLowerCase().includes(q); }
    return true;
  });

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.dim }} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search reports..." style={{ ...S.input, paddingLeft: '30px', fontSize: '12px' }} />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...S.input, width: 'auto' }}>
          <option value="all">All Types</option>
          {[...new Set(reports.map(r => r.type))].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Badge tone="blue">{filtered.length} reports</Badge>
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: C.muted, fontSize: '13px' }}>
          {reports.length === 0 ? 'No reports generated yet. Run analyses to create reports.' : 'No reports match your filters.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {filtered.map(r => (
            <div key={r.id} style={{ ...S.card, padding: '14px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.accent + '60'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.border}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={18} style={{ color: C.accent }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{r.title}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{r.company}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', fontSize: '10px', color: C.dim, marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={S.tag(C.accent)}>{r.type}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={10} /> {new Date(r.date).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => onPreview?.(r)} style={S.btn(C.accent)}><Eye size={12} /> Preview</button>
                <button onClick={() => onDownload?.(r, 'pdf')} style={S.btn(C.excellent)}><Download size={12} /> PDF</button>
                <button onClick={() => onDownload?.(r, 'docx')} style={S.btn(C.good)}><FileText size={12} /> DOCX</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 13 — SMART RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════

export interface SmartRecommendation { id: string; action: string; reason: string; source: string; impact: string; confidence: number; }

export function SmartRecommendations({ recommendations, onApply }: {
  recommendations: SmartRecommendation[]; onApply?: (rec: SmartRecommendation) => void;
}) {
  const sourceColors: Record<string, string> = {
    SEO: C.good, Growth: C.excellent, Automation: C.needsImprovement, Competitor: C.orange, Risk: C.critical,
  };

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: `linear-gradient(135deg, ${C.accent}10, ${C.purple}08)`, borderRadius: '8px', border: `1px solid ${C.accent}30` }}>
        <Sparkles size={18} style={{ color: C.accent }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>AI-Powered Recommendations</div>
          <div style={{ fontSize: '11px', color: C.muted }}>Based on your current analysis data across all modules</div>
        </div>
      </div>
      {recommendations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: C.muted, fontSize: '12px' }}>Run analyses to get smart recommendations for next best actions.</div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {recommendations.map(r => (
            <div key={r.id} style={{ ...S.row, flexWrap: 'wrap' }}>
              <Sparkles size={14} style={{ color: C.accent, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>{r.action}</div>
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{r.reason}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={S.tag(sourceColors[r.source] || C.dim)}>{r.source}</span>
                <span style={S.tag(r.impact === 'high' ? C.critical : r.impact === 'medium' ? C.needsImprovement : C.good)}>{r.impact}</span>
                <ConfidenceBadge value={r.confidence} size="sm" />
                <button onClick={() => onApply?.(r)} style={S.btn(C.excellent)}><Plus size={12} /> Apply</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// PART 14 — PRODUCTIVITY IMPROVEMENTS
// ══════════════════════════════════════════════════════════════

export function ProductivityImprovements({ onQuickAction }: { onQuickAction?: (action: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const shortcuts = [
    { keys: 'Ctrl+K', action: 'Command Palette', desc: 'Open quick commands' },
    { keys: 'Ctrl+N', action: 'New Task', desc: 'Create a new task' },
    { keys: 'Ctrl+F', action: 'Search', desc: 'Search across workspace' },
    { keys: 'Escape', action: 'Close Panel', desc: 'Close current panel' },
  ];

  const commands = [
    { label: 'New Task', icon: Plus, action: 'new-task', color: C.excellent },
    { label: 'View Executive Actions', icon: List, action: 'executive-actions', color: C.critical },
    { label: 'Open Calendar', icon: CalendarDays, action: 'calendar', color: C.purple },
    { label: 'Activity Timeline', icon: Activity, action: 'activity', color: C.excellent },
    { label: 'KPI Dashboard', icon: BarChart2, action: 'kpis', color: C.good },
    { label: 'Notifications', icon: Bell, action: 'notifications', color: C.needsImprovement },
    { label: 'Report Library', icon: FileText, action: 'reports', color: C.accent },
    { label: 'Smart Recommendations', icon: Sparkles, action: 'recommendations', color: C.needsImprovement },
    { label: 'Version History', icon: Clock, action: 'versions', color: C.dim },
    { label: 'Workspace Dashboard', icon: LayoutDashboard, action: 'dashboard', color: C.excellent },
  ];

  const filtered = query ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase())) : commands;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(prev => !prev); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Keyboard size={16} style={{ color: C.accent }} /> Keyboard Shortcuts
        </div>
        <div style={{ display: 'grid', gap: '4px' }}>
          {shortcuts.map(s => (
            <div key={s.keys} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', background: C.bg, borderRadius: '6px' }}>
              <kbd style={{ padding: '3px 6px', background: C.card, borderRadius: '4px', border: `1px solid ${C.border}`, fontSize: '10px', color: C.accent, fontWeight: 600, minWidth: '60px', textAlign: 'center' }}>{s.keys}</kbd>
              <div style={{ flex: 1, fontSize: '12px', color: C.text }}>{s.action}</div>
              <div style={{ fontSize: '10px', color: C.dim }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Command size={16} style={{ color: C.purple }} /> Command Palette ({open ? 'open' : 'press Ctrl+K'})
        </div>
        {open && (
          <div style={{ ...S.card, padding: '12px' }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.dim }} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Type a command..." style={{ ...S.input, paddingLeft: '30px', fontSize: '12px' }} autoFocus />
            </div>
            <div style={{ display: 'grid', gap: '4px', maxHeight: '250px', overflow: 'auto' }}>
              {filtered.map(c => (
                <button key={c.label} onClick={() => { onQuickAction?.(c.action); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 10px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', color: C.text }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.card}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                  <c.icon size={16} style={{ color: c.color }} />
                  <span style={{ fontSize: '12px', flex: 1 }}>{c.label}</span>
                  <span style={{ fontSize: '9px', color: C.dim }}>{c.action}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN WORKSPACE CONTAINER
// ══════════════════════════════════════════════════════════════

const workspaceTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'actions', label: 'Action Center', icon: List },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'progress', label: 'Progress', icon: BarChart2 },
  { id: 'collaboration', label: 'Collaboration', icon: MessageSquare },
  { id: 'approvals', label: 'Approvals', icon: ThumbsUp },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'kpis', label: 'KPIs', icon: BarChart2 },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'versions', label: 'Versions', icon: Clock },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'recommendations', label: 'AI Recommendations', icon: Sparkles },
  { id: 'productivity', label: 'Productivity', icon: Keyboard },
];

export interface WorkspaceState {
  actions: StoredAction[]; notifications: NotificationItem[]; activities: ActivityItem[];
  events: CalendarEvent[]; kpis: KpiData[]; reports: ReportRecord[]; versions: { id: string; label: string; date: string; summary?: Record<string, number> }[];
  recommendations: SmartRecommendation[];
}

export function createDefaultWorkspaceState(): WorkspaceState {
  return { actions: [], notifications: [], activities: [], events: [], kpis: [], reports: [], versions: [], recommendations: [] };
}

export function EnterpriseActionWorkspace({ workspaceRef }: { workspaceRef?: { current?: WorkspaceState } }) {
  const [activeTab, setActiveTab] = useWorkspaceData('ws-activeTab', 'dashboard');
  const [data, setData] = useWorkspaceData<WorkspaceState>('ws-data', createDefaultWorkspaceState());

  const updateActions = useCallback((actions: StoredAction[]) => {
    setData(prev => {
      const now = new Date().toISOString();
      const activity: ActivityItem = { id: generateId(), action: 'Actions Updated', description: `${actions.length} actions in workspace`, timestamp: now, module: 'task' };
      return { ...prev, actions, activities: [...prev.activities, activity] };
    });
  }, [setData]);

  const addNotification = useCallback((type: string, message: string, module?: string) => {
    setData(prev => ({
      ...prev,
      notifications: [{ id: generateId(), type, message, timestamp: new Date().toISOString(), read: false, module }, ...prev.notifications],
    }));
  }, [setData]);

  const addActivity = useCallback((action: string, description: string, module?: string) => {
    setData(prev => ({
      ...prev,
      activities: [{ id: generateId(), action, description, timestamp: new Date().toISOString(), module }, ...prev.activities],
    }));
  }, [setData]);

  const handleMarkRead = useCallback((id: string) => {
    setData(prev => ({ ...prev, notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
  }, [setData]);

  const handleMarkAllRead = useCallback(() => {
    setData(prev => ({ ...prev, notifications: prev.notifications.map(n => ({ ...n, read: true })) }));
  }, [setData]);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'new-task': setActiveTab('tasks'); break;
      case 'executive-actions': setActiveTab('actions'); break;
      case 'calendar': setActiveTab('calendar'); break;
      case 'activity': setActiveTab('activity'); break;
      case 'kpis': setActiveTab('kpis'); break;
      case 'notifications': setActiveTab('notifications'); break;
      case 'reports': setActiveTab('reports'); break;
      case 'recommendations': setActiveTab('recommendations'); break;
      case 'versions': setActiveTab('versions'); break;
      case 'dashboard': setActiveTab('dashboard'); break;
    }
  }, [setActiveTab]);

  const [collapsed, setCollapsed] = useWorkspaceData('ws-collapsed', false);

  const defaultProgressModules = [
    { label: 'Overall Progress', value: data.actions.length > 0 ? Math.round((data.actions.filter(a => a.status === 'completed').length / data.actions.length) * 100) : 0, color: C.accent, icon: Activity },
    { label: 'SEO Progress', value: 0, color: C.good, icon: TrendingUp },
    { label: 'Growth Progress', value: 0, color: C.excellent, icon: Target },
    { label: 'Automation Progress', value: 0, color: C.needsImprovement, icon: Zap },
    { label: 'Campaign Progress', value: 0, color: C.purple, icon: Flag },
    { label: 'Implementation %', value: data.actions.length > 0 ? Math.round((data.actions.filter(a => a.progress >= 80).length / data.actions.length) * 100) : 0, color: C.cyan, icon: Code },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <WorkspaceDashboard actions={data.actions} notifications={data.notifications} activities={data.activities} kpis={data.kpis} onNavigate={handleQuickAction} />;
      case 'actions':
        return <ExecutiveActionCenter actions={data.actions} onActionUpdate={updateActions} />;
      case 'tasks':
        return <TaskManager actions={data.actions} onActionUpdate={updateActions} />;
      case 'progress':
        return <ProgressTracking modules={defaultProgressModules} onModuleClick={(label) => addActivity('Progress Viewed', `Viewed ${label} progress`)} />;
      case 'collaboration':
        return <TeamCollaboration actions={data.actions} onActionUpdate={updateActions} />;
      case 'approvals':
        return <ApprovalWorkflow actions={data.actions} onActionUpdate={updateActions} />;
      case 'notifications':
        return <ExecutiveNotifications notifications={data.notifications} onMarkRead={handleMarkRead} onMarkAllRead={handleMarkAllRead} />;
      case 'calendar':
        return <BusinessCalendar events={data.events} />;
      case 'kpis':
        return <KpiTracking kpis={data.kpis} onKpiUpdate={(kpis) => setData(prev => ({ ...prev, kpis }))} />;
      case 'activity':
        return <ActivityTimeline activities={data.activities} />;
      case 'versions':
        return <VersionHistory versions={data.versions} currentVersion={data.versions[0]?.id} />;
      case 'reports':
        return <EnterpriseReportLibrary reports={data.reports} />;
      case 'recommendations':
        return <SmartRecommendations recommendations={data.recommendations} onApply={(rec) => {
          updateActions([...data.actions, {
            id: generateId(), title: rec.action, description: rec.reason, priority: 'Medium',
            owner: '', dueDate: '', status: 'pending', progress: 0, comments: [], approvalStatus: 'pending',
            approvedBy: '', approvedDate: '', approverNotes: '', sourceModule: rec.source,
            timeline: 'TBD', businessImpact: rec.impact, expectedRoi: '', confidence: rec.confidence,
            createdAt: new Date().toISOString(),
          }]);
          addNotification('opportunity', `Recommendation applied: ${rec.action}`, rec.source);
        }} />;
      case 'productivity':
        return <ProductivityImprovements onQuickAction={handleQuickAction} />;
      default:
        return <WorkspaceDashboard actions={data.actions} notifications={data.notifications} activities={data.activities} kpis={data.kpis} onNavigate={handleQuickAction} />;
    }
  };

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutDashboard size={18} style={{ color: C.accent }} /> Enterprise Workspace
        </div>
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: '4px' }}>
          {collapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
        </button>
      </div>
      {!collapsed && (
        <>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px' }}>
            {workspaceTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                padding: '6px 10px', borderRadius: '6px', border: 'none',
                background: activeTab === t.id ? `${C.accent}15` : 'transparent',
                cursor: 'pointer', fontSize: '11px', color: activeTab === t.id ? C.accent : C.muted,
                fontWeight: activeTab === t.id ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>
          <div style={{ minHeight: '300px' }}>
            {renderContent()}
          </div>
        </>
      )}
    </div>
  );
}

export function generateWorkspaceData(actions: Partial<StoredAction>[]): StoredAction[] {
  return actions.map(a => ({
    id: generateId(), title: a.title || '', description: a.description || '', priority: a.priority || 'Medium',
    owner: a.owner || '', dueDate: a.dueDate || '', status: a.status || 'pending', progress: a.progress || 0,
    comments: a.comments || [], approvalStatus: a.approvalStatus || 'pending', approvedBy: a.approvedBy || '',
    approvedDate: a.approvedDate || '', approverNotes: a.approverNotes || '', sourceModule: a.sourceModule || '',
    timeline: a.timeline || '', businessImpact: a.businessImpact || '', expectedRoi: a.expectedRoi || '',
    confidence: a.confidence || 80, createdAt: a.createdAt || new Date().toISOString(),
  }));
}

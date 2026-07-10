import { AlertTriangle, CheckCircle2, Loader2, Shield, ExternalLink, Clock } from 'lucide-react';
import { downloadReport } from '../lib/api';
import SafeValue from './SafeValue';
import { EVIDENCE_LABELS, getEvidenceLabel } from '../lib/evidence-levels';

export function PageHeader({ eyebrow, title, subtitle }: any) {
  return <div className="page-header"><div className="eyebrow">• <SafeValue value={eyebrow} /></div><h1><SafeValue value={title} /></h1><p><SafeValue value={subtitle} /></p></div>;
}
export function Card({ children, className = '' }: any) { return <div className={`card ${className}`}>{children}</div>; }
export function Badge({ children, tone = 'blue' }: any) { return <span className={`badge ${tone}`}>{children}</span>; }
export function ScoreCard({ label, value, tone = 'purple', source, evidence }: any) {
  return (
    <Card className={`score-card ${tone}`}>
      <div className="score-value">{value !== null && value !== undefined ? <SafeValue value={value} /> : 'Not measured'}</div>
      <div><SafeValue value={label} /></div>
      {source && <div className="score-source" style={{ fontSize: '11px', color: '#9aa7bd', marginTop: '4px' }}>Source: <SafeValue value={source} /></div>}
      {evidence && <div className="score-evidence" style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}><SafeValue value={evidence} /></div>}
      {typeof value === 'number' && !isNaN(value) && <div className="bar"><span style={{ width: `${Math.min(Math.max(value,0),100)}%` }} /></div>}
    </Card>
  );
}
export function EmptyState({ title='No data yet', text='Run analysis to generate results.' }: any) { return <Card className="empty"><AlertTriangle size={40}/><h3><SafeValue value={title} /></h3><p><SafeValue value={text} /></p></Card>; }
export function Loading({ text='Loading...' }: any) { return <div className="inline-loader"><Loader2 className="spin" size={18}/><SafeValue value={text} /></div>; }
export function SectionTitle({ title, subtitle }: any) { return <div className="section-title"><h2><SafeValue value={title} /></h2>{subtitle && <p><SafeValue value={subtitle} /></p>}</div>; }
export function Status({ ok, label }: any) { return <span className={`status ${ok ? 'ok':'pending'}`}>{ok ? <CheckCircle2 size={14}/> : <AlertTriangle size={14}/>} <SafeValue value={label} /></span>; }

export function EvidenceBadge({ evidence, size = 'sm' }: { evidence?: any, size?: 'sm' | 'md' | 'lg' }) {
  if (!evidence) return null;
  const source = evidence.source || evidence.api || '';
  const confidence = evidence.confidence ?? null;
  const collectedAt = evidence.collectedAt || '';
  const nameMap: Record<string, string> = {
    'firecrawl': 'Firecrawl',
    'dataforseo': 'DataForSEO',
    'tavily': 'Tavily',
    'pagespeed': 'PageSpeed',
    'ai': 'AI Summary',
    'unknown': 'Unknown'
  };
  const displaySource = nameMap[source.toLowerCase()] || source || 'Unknown';
  const confidenceColor = confidence >= 95 ? '#10e18b' : confidence >= 75 ? '#2aa3ff' : confidence >= 50 ? '#ffb347' : '#ff4757';
  const fontSize = size === 'lg' ? '13px' : size === 'md' ? '12px' : '11px';
  const pad = size === 'lg' ? '8px 12px' : '4px 8px';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize, padding: pad, background: '#151d2b', borderRadius: '6px', border: '1px solid #293245', color: '#9aa7bd' }}>
      <Shield size={size === 'lg' ? 14 : 12} style={{ color: confidenceColor }} />
      <span style={{ color: '#e5e7eb', fontWeight: 500 }}>{displaySource}</span>
      <span style={{ color: confidenceColor, fontWeight: 600 }}>{getEvidenceLabel(evidence.evidenceLevel || '')}</span>
      {collectedAt && (
        <span title={new Date(collectedAt).toLocaleString()} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#6b7280' }}>
          <Clock size={10} />
          {new Date(collectedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}

export function DataQualityPanel({ sources, evidence }: { sources?: any[], evidence?: any }) {
  const srcList = sources || evidence?.sources || [];
  const warnings = evidence?.warnings || [];
  if (!srcList.length) return null;

  const verified = srcList.filter(s => s.success !== false).length;
  const estimated = srcList.filter(s => s.success === false || s.confidence && s.confidence < 50).length;
  const unknown = srcList.filter(s => !s.success && !s.confidence).length;
  const quality = srcList.length > 0 ? Math.round((verified / srcList.length) * 100) : 0;
  const qualityColor = quality >= 80 ? '#10e18b' : quality >= 50 ? '#ffb347' : '#ff4757';

  const sourceNames = [...new Set<string>(srcList.map((s: any) => s.source || s.type || 'Unknown').filter(Boolean))];
  const nameMap: Record<string, string> = {
    'firecrawl': 'Firecrawl', 'unified_scraper': 'Firecrawl', 'basic_fetch': 'HTTP Fetch',
    'dataforseo': 'DataForSEO', 'DataForSEO': 'DataForSEO',
    'tavily': 'Tavily', 'Tavily': 'Tavily',
    'pagespeed': 'Google PageSpeed', 'google_pagespeed_api': 'Google PageSpeed',
    'dataforseo_keyword_api': 'DataForSEO',
    'dataforseo_serp_api': 'DataForSEO',
    'tavily_search_api': 'Tavily',
    'tavily_news': 'Tavily',
    'serp_api': 'SERP API',
    'ai': 'AI Summary',
    'website_scrape': 'Website Scrape',
    'serp': 'SERP Analysis',
    'market_signals': 'Market Analysis',
    'keyword_trends': 'Keyword Trends',
    'competitor_serp': 'SERP Competitors',
    'competitor_tavily': 'Tavily Competitors',
    'website_content_analysis': 'Content Analysis',
    'industry_evidence_pattern': 'Industry Pattern'
  };

  return (
    <Card style={{ background: '#0f1729', border: '1px solid #293245' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <Shield size={18} style={{ color: '#2aa3ff' }} />
        <h3 style={{ margin: 0, fontSize: '15px' }}>Data Quality & Intelligence Sources</h3>
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ textAlign: 'center', padding: '8px 16px', background: '#151d2b', borderRadius: '8px', minWidth: '70px' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: qualityColor }}>{quality}%</div>
          <div style={{ fontSize: '11px', color: '#9aa7bd' }}>Data Quality</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px 16px', background: '#151d2b', borderRadius: '8px', minWidth: '70px' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#e5e7eb' }}>{srcList.length}</div>
          <div style={{ fontSize: '11px', color: '#9aa7bd' }}>Total Sources</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px 16px', background: '#151d2b', borderRadius: '8px', minWidth: '70px' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#10e18b' }}>{verified}</div>
          <div style={{ fontSize: '11px', color: '#9aa7bd' }}>Verified</div>
        </div>
        {estimated > 0 && (
          <div style={{ textAlign: 'center', padding: '8px 16px', background: '#151d2b', borderRadius: '8px', minWidth: '70px' }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ffb347' }}>{estimated}</div>
            <div style={{ fontSize: '11px', color: '#9aa7bd' }}>Estimated</div>
          </div>
        )}
        {unknown > 0 && (
          <div style={{ textAlign: 'center', padding: '8px 16px', background: '#151d2b', borderRadius: '8px', minWidth: '70px' }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff4757' }}>{unknown}</div>
            <div style={{ fontSize: '11px', color: '#9aa7bd' }}>Unknown</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {sourceNames.map(s => (
          <EvidenceBadge key={s} evidence={{ source: s, evidenceLevel: 'evidence_backed' }} />
        ))}
      </div>
      {warnings.length > 0 && (
        <div style={{ marginTop: '10px', padding: '8px 12px', background: 'rgba(255,71,87,0.08)', borderRadius: '6px', fontSize: '12px', color: '#ff8a8a' }}>
          <strong>Warnings ({warnings.length}):</strong> {warnings.slice(0, 3).join('; ')}
        </div>
      )}
    </Card>
  );
}

export function ReportPreview({ chatId }: { chatId?: string }) {
  const formats = [
    { format: 'pdf', label: 'PDF', icon: '📄', desc: 'Enterprise report with full formatting' },
    { format: 'docx', label: 'DOCX', icon: '📝', desc: 'Editable Word document for customization' },
    { format: 'pptx', label: 'PPTX', icon: '📊', desc: 'Investor-ready slide deck' },
    { format: 'json', label: 'JSON', icon: '📋', desc: 'Raw data for programmatic use' },
    { format: 'markdown', label: 'MD', icon: '📑', desc: 'Clean markdown for documentation' }
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
      {formats.map(f => (
        <button key={f.format} onClick={() => { if (chatId) { downloadReport(chatId, 'growth', f.format); }}} 
          style={{ padding: '12px', background: '#151d2b', border: '1px solid #293245', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', color: '#9aa7bd' }}
          onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = '#2aa3ff'; (e.target as HTMLElement).style.background = '#1a2335'; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = '#293245'; (e.target as HTMLElement).style.background = '#151d2b'; }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>{f.icon}</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{f.label}</div>
          <div style={{ fontSize: '11px', marginTop: '4px' }}>{f.desc}</div>
        </button>
      ))}
    </div>
  );
}

export * from './IntelligenceCards';

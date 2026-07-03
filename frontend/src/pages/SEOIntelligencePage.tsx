import { useEffect, useRef, useState, Component } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asNumber, asText, normalizeSeo } from '../lib/normalizers';
import { Badge, Card, EmptyState, Loading, PageHeader, ScoreCard, SectionTitle } from '../components/UI';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Shield, Target, TrendingUp, Zap, Search, Globe, Code, FileText, Cpu, LayoutList, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

// Safe format helpers to handle non-number values from backend
function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,%]/g, '').trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  if (value && typeof value === 'object') {
    const obj = value as any;
    return toNumberOrNull(obj.value ?? obj.amount ?? obj.cpc ?? obj.score ?? obj.number);
  }
  return null;
}

function formatMoney(value: unknown): string {
  const n = toNumberOrNull(value);
  if (n === null) return 'Unavailable';
  return `$${n.toFixed(2)}`;
}

function formatNumber(value: unknown): string {
  const n = toNumberOrNull(value);
  if (n === null) return 'Unavailable';
  return n.toLocaleString();
}

function formatPercent(value: unknown): string {
  const n = toNumberOrNull(value);
  if (n === null) return 'Unavailable';
  return `${Math.round(n)}%`;
}

function formatInt(value: unknown): string {
  const n = toNumberOrNull(value);
  if (n === null) return 'Unavailable';
  return Math.round(n).toString();
}

// ErrorBoundary to prevent black screen from individual tab errors
class TabErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tab rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <EmptyState 
            title="Tab Error" 
            text={`This tab encountered an error: ${this.state.error?.message || 'Unknown error'}. Please try refreshing or check the data.`}
          />
        </Card>
      );
    }
    return this.props.children;
  }
}

const tabs = ['Executive Dashboard', 'Executive Story', 'Technical Audit', 'Keyword Intelligence', 'Competitor SEO', 'Content Gaps', 'GEO / AI Visibility', 'Blog Intelligence', 'Action Plan'];

export default function SEOIntelligencePage() {
  const { selectedChatId, createChat, loadFullResults, fullResults, refreshChats } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const isNewAnalysis = location.state?.newAnalysis === true;
  const storedChatRef = useRef<string>('');
  const [url, setUrl] = useState('');
  const [seo, setSeo] = useState<any>({});
  const [activeTab, setActiveTab] = useState('Executive Dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'form' | 'creating' | 'running' | 'results' | 'error'>(isNewAnalysis ? 'form' : 'form');
  const [creatingChat, setCreatingChat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('Starting...');
  const seoProgressStages = [
    'Starting...',
    'Scraping website',
    'Technical audit',
    'Keyword intelligence',
    'Competitor SEO',
    'GEO / AI visibility',
    'Content gaps + blog intelligence',
    'Saving results'
  ];
  useEffect(() => {
    if (mode === 'running') {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 7) { clearInterval(interval); return 7; }
          const next = p + 1;
          setCurrentStage(seoProgressStages[next] || 'Processing...');
          return next;
        });
      }, 10000);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
      setCurrentStage('Starting...');
    }
  }, [mode]);

  // Helper: check if seo object has meaningful data (not just normalized empty keys)
  function hasRealSeoData(d: any): boolean {
    if (!d || typeof d !== 'object') return false;
    const keys = Object.keys(d);
    if (keys.length === 0) return false;
    // Must have at least one meaningful content field
    return !!(
      (d.scoreBreakdown && typeof d.scoreBreakdown === 'object' && Object.keys(d.scoreBreakdown).length > 0) ||
      d.performanceScore ||
      d.seoScore ||
      (d.technical && typeof d.technical === 'object' && Object.keys(d.technical).length > 0) ||
      (d.keywords && typeof d.keywords === 'object' && Object.keys(d.keywords).length > 0) ||
      (d.executiveDashboard && typeof d.executiveDashboard === 'object' && Object.keys(d.executiveDashboard).length > 0) ||
      d.executiveStory ||
      (d.actionPlan && (d.actionPlan.day7?.length || d.actionPlan.day30?.length || d.actionPlan.day60?.length || d.actionPlan.day90?.length)) ||
      d.websiteUrl
    );
  }

  // On mount, hydrate from fullResults if data exists for this chat
  useEffect(() => {
    if (isNewAnalysis) return;
    if (!selectedChatId) return;
    const r = fullResults.seoIntelligence || fullResults.seo || {};
    if (hasRealSeoData(r)) {
      storedChatRef.current = selectedChatId;
      setSeo(r);
      setMode('results');
      if (!url) setUrl(r.websiteUrl || '');
    }
  }, []);

  // On fullResults change: update if data exists, never clear existing results
  useEffect(() => {
    if (isNewAnalysis) return;
    if (!selectedChatId) return;
    const r = fullResults.seoIntelligence || fullResults.seo || {};
    if (hasRealSeoData(r)) {
      storedChatRef.current = selectedChatId;
      setSeo(r);
      setMode('results');
      if (!url) setUrl(r.websiteUrl || '');
    }
  }, [fullResults]);

  async function run() {
    if (!url) { setError('Website URL is required'); return; }
    setLoading(true);
    setError('');
    
    // Clear old results before running fresh analysis
    setSeo({});

    let chatId = selectedChatId;
    if (!chatId) {
      setMode('creating');
      setCreatingChat(true);
      try {
        chatId = await createChat('New SEO Analysis');
        navigate('/app/seo', { replace: true });
      } catch (e: any) {
        setError('Failed to create project: ' + (e.message || 'Unknown error'));
        setMode('form');
        setCreatingChat(false);
        setLoading(false);
        return;
      }
      setCreatingChat(false);
    }

    setMode('running');
    try {
      console.log('[SEO UI] run started for chat:', chatId, 'url:', url);
      
      console.log('[SEO UI] Sending POST /chats/' + chatId + '/seo-intelligence/run');
      const res: any = await api.post(`/chats/${chatId}/seo-intelligence/run`, { websiteUrl: url, url });
      console.log('[SEO UI] run completed');

      // Store API response data directly in local state (like Growth Workspace does)
      const rawSeo = res.seoIntelligence || res.data || res;
      if (rawSeo && typeof rawSeo === 'object' && Object.keys(rawSeo).length > 0) {
        setSeo(normalizeSeo(rawSeo));
      }

      console.log('[SEO UI] refreshing full results');
      await loadFullResults(chatId);

      // Refresh chat history so the analyzed chat shows latest
      await refreshChats();
      
      // Only set mode to results after full results are loaded
      setMode('results');
    } catch (e: any) {
      console.error('[SEO UI] run failed:', e.message || e);
      setError(e.message || 'SEO analysis failed');
      setMode('error');
    } finally {
      setLoading(false);
    }
  }

  function handleNewAnalysis() {
    setUrl('');
    setSeo({});
    setError('');
    setMode('form');
  }

  const hasData = hasRealSeoData(seo);
  const analyzedUrl = seo.websiteUrl || '';
  const analyzedDomain = seo.domain || '';
  const analyzedCompany = seo.companyName || seo.productName || '';

  // Check for mismatch if there is an active chat with a known profile url
  const projectUrl = fullResults?.seoIntelligence?.websiteUrl || fullResults?.productIntelligence?.inputJson?.websiteUrl || '';
  const isMismatch = projectUrl && analyzedUrl && projectUrl !== analyzedUrl && !analyzedUrl.includes(projectUrl.replace(/^https?:\/\//, '').split('/')[0]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <PageHeader 
          eyebrow="Search & Generative Engine Optimization" 
          title={hasData && analyzedCompany ? `${analyzedCompany} SEO Intelligence` : "SEO & GEO Intelligence"} 
          subtitle={hasData && analyzedDomain ? `Displaying 14-step technical, content, and competitor SEO audit for ${analyzedDomain}` : "Run a complete 14-step technical, content, and competitor SEO audit."} 
        />
      </div>
      
      {error && (
        <Card style={{ background: 'rgba(255, 71, 87, 0.1)', borderColor: '#ff4757', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#ff4757' }}>SEO Analysis Failed</h4>
              <p style={{ margin: 0, color: '#ff8a8a' }}>{error}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={run} className="secondary-btn" disabled={loading}>Retry</button>
              <button onClick={handleNewAnalysis} className="ghost-btn">New Analysis</button>
            </div>
          </div>
        </Card>
      )}

      {isMismatch && (
        <Card style={{ background: 'rgba(255, 171, 0, 0.1)', borderColor: '#ffab00', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <AlertTriangle color="#ffab00" size={24} />
            <div>
              <h4 style={{ margin: 0, color: '#ffab00' }}>Project Mismatch Warning</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#ffab00', opacity: 0.8 }}>
                The SEO analysis you are viewing is for <strong>{analyzedUrl}</strong>, which does not match the active project URL <strong>{projectUrl}</strong>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {mode === 'creating' && (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Loader2 className="spin" size={24} />
            <p style={{ color: '#9aa7bd', marginTop: '15px' }}>Creating project...</p>
          </div>
        </Card>
      )}

      {(mode === 'form' || mode === 'running') && (
      <Card>
        <SectionTitle title="Analyze Website" subtitle="Enter your URL to generate thousands of data points." />
        <div style={{ display: 'flex', gap: '15px' }}>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #303849', background: '#0b1220', color: '#fff' }} disabled={loading} />
          <button onClick={run} className="primary-btn" disabled={loading || !url || mode === 'creating'} style={{ padding: '0 30px' }}>
            {loading ? 'Running 14-Step Audit...' : 'Run SEO Intelligence'}
          </button>
        </div>
      </Card>
      )}

      {mode === 'running' && (
        <Card>
          <div style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 className="spin" size={20} /> Running SEO Intelligence
            </h3>
            <div style={{ height: '8px', background: '#1d2738', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
              <div style={{ height: '100%', width: `${Math.min((progress / 8) * 100, 90)}%`, background: 'linear-gradient(90deg, #10e18b, #2aa3ff)', borderRadius: '4px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ color: '#9aa7bd', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{currentStage}</span>
              <span>{Math.round((progress / 8) * 100)}%</span>
            </div>
          </div>
        </Card>
      )}

      {mode === 'results' && hasData && (
        <Card>
          <div className="tab-row" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className={activeTab === t ? 'active' : ''}>{t}</button>
            ))}
          </div>

          <div className="tab-content" style={{ marginTop: '20px' }}>
            <TabErrorBoundary>
              {activeTab === 'Executive Dashboard' && <ExecutiveDashboard data={seo} />}
              {activeTab === 'Executive Story' && <ExecutiveStory data={seo} />}
              {activeTab === 'Technical Audit' && <TechnicalAudit data={{ ...seo, ...seo.technicalAudit }} />}
              {activeTab === 'Keyword Intelligence' && <KeywordIntelligence data={seo.keywordIntelligence} />}
              {activeTab === 'Competitor SEO' && <CompetitorSEO data={seo.competitorIntelligence} />}
              {activeTab === 'Content Gaps' && <ContentGaps data={seo.contentGapAnalysis} />}
              {activeTab === 'GEO / AI Visibility' && <GeoIntelligence data={seo.geoIntelligence} />}
              {activeTab === 'Blog Intelligence' && <BlogIntelligence data={seo.blogIntelligence} />}
              {activeTab === 'Action Plan' && <ActionPlan data={seo} />}
            </TabErrorBoundary>
          </div>
        </Card>
      )}

      {mode === 'form' && !hasData && !loading && (
        <EmptyState title="No SEO data yet" text="Enter a URL and run the analysis to generate SEO & GEO intelligence." />
      )}

      
    </div>
  );
}

// ----------------------------------------------------------------------
// TAB COMPONENTS
// ----------------------------------------------------------------------

import { PriorityCard } from '../components/SEO/PriorityCard';

function ExecutiveDashboard({ data }: { data: any }) {
  if (import.meta.env.DEV) {
    console.log('===== TAB: ExecutiveDashboard =====');
    console.log('data keys:', Object.keys(data || {}));
    console.log('data.executiveDashboard:', data.executiveDashboard ? 'EXISTS keys:' + Object.keys(data.executiveDashboard).join(',') : 'MISSING');
    console.log('data.scoreBreakdown:', data.scoreBreakdown ? 'EXISTS keys:' + Object.keys(data.scoreBreakdown).join(',') : 'MISSING');
    console.log('data.executiveStory:', data.executiveStory ? 'EXISTS' : 'MISSING');
    console.log('data.actionPlan:', data.actionPlan ? 'EXISTS' : 'MISSING');
    console.log('===== END TAB: ExecutiveDashboard =====');
  }
  const exec = data.executiveDashboard || {};
  const execOverview = exec.executiveOverview || exec.overview || {};
  const seoHealth = exec.seoHealthSummary || exec.health || {};
  const keyOpps = exec.keyOpportunities || exec.opportunities || [];
  const competitorSnap = exec.competitorSnapshot || exec.competitors || {};
  const aiSearchVis = exec.aiSearchVisibility || exec.aiVisibility || {};
  const contentStrat = exec.contentStrategySummary || exec.contentStrategy || {};
  const actionPlan = exec.executiveActionPlan || exec.actionPlan || {};

  // Use canonical field paths from contract, with fallback to scoreBreakdown and normalized scores
  const scoreBreakdown = data.scoreBreakdown || {};
  
  // Extract scores with deep fallback paths
  const extract = (paths: any[]) => {
    for (const p of paths) {
      if (p != null && !isNaN(Number(p))) return Number(p);
    }
    return null;
  };
  
  const overallSeoScore = extract([
    execOverview.overallSeoScore?.value, execOverview.overallSeoScore, execOverview.seoScore,
    scoreBreakdown.overall, data.seoScore, data.scoreBreakdown?.overallScore
  ]);
  const technicalHealth = extract([
    execOverview.technicalHealth?.value, execOverview.technicalHealth, execOverview.technicalScore,
    data.technicalAudit?.performanceScore, data.technicalAudit?.seoScore,
    scoreBreakdown.technical, data.performanceScore
  ]);
  const contentAuthority = extract([
    execOverview.contentAuthority?.value, execOverview.contentAuthority, execOverview.contentScore,
    data.blogIntelligence?.metadata?.totalIdeas, scoreBreakdown.content
  ]);
  const aiVisibility = extract([
    execOverview.aiVisibility?.value, execOverview.aiVisibility, execOverview.aiScore,
    data.geoIntelligence?.aiVisibilityScore, data.aiVisibilityScore, data.geoIntelligence?.overallScore,
    scoreBreakdown.aiVisibility
  ]);
  const opportunityScore = extract([
    execOverview.opportunityScore?.value, execOverview.opportunityScore,
    scoreBreakdown.opportunity
  ]);
  const riskScore = extract([
    execOverview.riskScore?.value, execOverview.riskScore
  ]);

  const hasExecutiveData = overallSeoScore !== null || technicalHealth !== null || data.performanceScore !== null;

  // Build radar data from canonical fields
  const radarData = [
    { subject: 'Technical', A: asNumber(technicalHealth, null), fullMark: 100 },
    { subject: 'On-Page', A: asNumber(technicalHealth, null), fullMark: 100 },
    { subject: 'Content', A: asNumber(contentAuthority, null), fullMark: 100 },
    { subject: 'Authority', A: asNumber(contentAuthority, null), fullMark: 100 },
    { subject: 'AI Visibility', A: asNumber(aiVisibility, null), fullMark: 100 },
    { subject: 'Local SEO', A: asNumber(50, null), fullMark: 100 },
  ];
  
  // Fallback to scoreBreakdown if radar has no data
  if (radarData.every(d => d.A === null) && data.scoreBreakdown) {
    const sb = data.scoreBreakdown;
    radarData[0].A = asNumber(sb.technical || sb.technicalScore, null);
    radarData[1].A = asNumber(sb.onPage || sb.onPageSeo, null);
    radarData[2].A = asNumber(sb.content || sb.contentScore, null);
    radarData[3].A = asNumber(sb.authority || sb.domainAuthority, null);
    radarData[4].A = asNumber(sb.aiVisibility || sb.geoScore, null);
    radarData[5].A = asNumber(sb.localSeo || sb.localScore, null);
  }

  // Extract priority actions from multiple sources
  const priorities = asArray(
    exec.priorityActions ||
    exec.executiveActionPlan?.immediate ||
    exec.executiveActionPlan?.day7 ||
    (exec.keyOpportunities || exec.opportunities)?.slice(0, 5) ||
    exec.metadata?.executiveStory?.priorityActions ||
    exec.topOpportunities ||
    data.executiveStory?.mainOpportunities ||
    data.contentGaps?.contentGaps ||
    data.keywordIntelligence?.contentOpportunities ||
    []
  ).slice(0, 5);

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="score-grid">
        <ScoreCard
          label="Overall SEO Score"
          value={overallSeoScore}
        />
        <ScoreCard
          label="Technical Health"
          value={technicalHealth}
          tone="blue"
        />
        <ScoreCard
          label="Content Authority"
          value={contentAuthority}
          tone="green"
        />
        <ScoreCard
          label="AI Visibility (GEO)"
          value={aiVisibility}
          tone="pink"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card style={{ height: 'auto', minHeight: '350px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Globe size={18} /> SEO Health Radar</h3>
          {radarData.some(d => d.A !== null) ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#293245" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9aa7bd', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#1a2335' }} contentStyle={{ background: '#101622', border: '1px solid #293245', borderRadius: '8px' }} />
                <Radar name="Score" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No radar data available" text="Run complete SEO analysis to see health radar." />
          )}
        </Card>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, padding: '10px 0 0 10px' }}>
            <Zap size={18} color="#ffa502" /> Priority Actions
            {hasExecutiveData && <Badge className="blue">Verified Data</Badge>}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {priorities.length > 0 ? (
              priorities.map((p: any, i: number) => <PriorityCard key={i} data={p} />)
            ) : (
              <EmptyState title="No priorities found" text="Run a complete scan to see recommendations." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecutiveStory({ data }: { data: any }) {
  if (import.meta.env.DEV) {
    console.log('===== TAB: ExecutiveStory =====');
    console.log('data.executiveStory:', data.executiveStory ? 'EXISTS' : 'MISSING');
    console.log('data.executiveDashboard?.executiveStory:', data.executiveDashboard?.executiveStory ? 'EXISTS' : 'MISSING');
    console.log('data.executiveDashboard?.metadata?.executiveStory:', data.executiveDashboard?.metadata?.executiveStory ? 'EXISTS' : 'MISSING');
    console.log('===== END TAB: ExecutiveStory =====');
  }
  // Use canonical path from normalized data with deep fallback through dashboard fields
  const story = data.executiveStory || 
               data.executiveDashboard?.metadata?.executiveStory || 
               data.executiveDashboard?.executiveStory ||
               // Build from dashboard top-level fields if story itself is missing
               (data.executiveDashboard?.executiveOverview ? {
                 seoHealthSummary: {
                   overallScore: data.executiveDashboard?.executiveOverview?.overallSeoScore?.value || data.scoreBreakdown?.overall,
                   technicalScore: data.executiveDashboard?.executiveOverview?.technicalHealth?.value || data.scoreBreakdown?.technical,
                   contentScore: data.executiveDashboard?.executiveOverview?.contentAuthority?.value || data.scoreBreakdown?.content,
                   aiVisibilityScore: data.executiveDashboard?.executiveOverview?.aiVisibility?.value || data.scoreBreakdown?.aiVisibility,
                 },
                 mainOpportunities: data.executiveDashboard?.keyOpportunities?.slice(0, 5) || [],
                 mainRisks: [],
                 actionPlan: data.executiveDashboard?.executiveActionPlan || data.actionPlan || {}
               } : {}) ||
               {};
  const hasStory = story && Object.keys(story).length > 0 && 
    (story.companyOverview || story.seoHealthSummary || story.mainOpportunities || story.actionPlan?.day7 || (Array.isArray(story) ? story.length > 0 : false));

  if (!hasStory) {
    return (
      <EmptyState 
        title="Executive Story Not Available" 
        text="Executive Story is not available for this analysis. Re-run SEO analysis after latest update to generate the executive story."
      />
    );
  }

  const companyOverview = story.companyOverview || {};
  const seoHealth = story.seoHealthSummary || {};
  const technical = story.technicalFindings || {};
  // Use page-level data for counts when story fields are missing
  const keywords = story.keywordFindings || {
    totalKeywords: (data.keywordIntelligence?.primaryKeywords?.length || 0) + (data.keywordIntelligence?.secondaryKeywords?.length || 0),
    primaryKeywordsCount: data.keywordIntelligence?.primaryKeywords?.length || 0,
    opportunitiesCount: data.keywordIntelligence?.contentOpportunities?.length || 0,
    topKeywords: (data.keywordIntelligence?.primaryKeywords || []).slice(0, 5).map((k: any) => ({
      keyword: k.keyword || k,
      searchVolume: k.searchVolume || k.volume || 0,
      difficulty: k.difficulty || k.kd || 0
    }))
  };
  const competitors = story.competitorFindings || {
    totalCompetitors: data.competitorIntelligence?.competitorProfiles?.length || data.competitorIntelligence?.competitors?.length || 0,
    avgThreatScore: null,
    topCompetitors: (data.competitorIntelligence?.competitorProfiles || data.competitorIntelligence?.competitors || []).slice(0, 5).map((c: any) => ({
      name: c.name || c.domain,
      threatScore: c.threatScore || c.estimatedAuthority || null,
      weakness: c.weakness || c.overlapReason || ''
    }))
  };
  const contentGaps = story.contentGapFindings || {
    totalGaps: data.contentGapAnalysis?.contentGaps?.length || 0,
    criticalGaps: (data.contentGapAnalysis?.contentGaps || []).filter((g: any) => g.priority === 'critical').length,
    highGaps: (data.contentGapAnalysis?.contentGaps || []).filter((g: any) => g.priority === 'high').length,
    topGaps: (data.contentGapAnalysis?.contentGaps || []).slice(0, 5)
  };
  const aiVisibility = story.aiVisibilityFindings || {
    overallScore: data.geoIntelligence?.aiVisibilityScore || null,
    chatGptScore: data.geoIntelligence?.chatGptScore || null,
    geminiScore: data.geoIntelligence?.geminiScore || null,
    claudeScore: data.geoIntelligence?.claudeScore || null,
    perplexityScore: data.geoIntelligence?.perplexityScore || null,
    topOpportunities: (data.geoIntelligence?.aiContentOpportunities || []).slice(0, 5).map((o: any) => ({
      opportunity: o.opportunity || o.type || '',
      impact: o.impact || o.priority || 'Medium'
    }))
  };
  const risks = story.mainRisks || [];
  const opportunities = story.mainOpportunities || [];
  const actionPlan = story.actionPlan || {};
  const executiveRecommendation = story.executiveRecommendation || {};

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Company Overview */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Target size={18} /> Company Overview</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <div><strong>Company:</strong> {story.companyOverview?.companyName || 'N/A'}</div>
          <div><strong>Domain:</strong> {story.companyOverview?.domain || 'N/A'}</div>
          <div><strong>Industry:</strong> {story.companyOverview?.industry || 'N/A'}</div>
          <div><strong>Data Sources:</strong> {story.companyOverview?.dataSources?.join(', ') || 'N/A'}</div>
        </div>
      </Card>

      {/* SEO Health Summary */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Shield size={18} /> SEO Health Summary</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <div><strong>Overall Score:</strong> {story.seoHealthSummary?.overallScore !== null ? story.seoHealthSummary.overallScore : 'N/A'}</div>
          <div><strong>Technical Score:</strong> {story.seoHealthSummary?.technicalScore !== null ? story.seoHealthSummary.technicalScore : 'N/A'}</div>
          <div><strong>Content Score:</strong> {story.seoHealthSummary?.contentScore !== null ? story.seoHealthSummary.contentScore : 'N/A'}</div>
          <div><strong>Authority Score:</strong> {story.seoHealthSummary?.authorityScore !== null ? story.seoHealthSummary.authorityScore : 'N/A'}</div>
          <div><strong>AI Visibility Score:</strong> {story.seoHealthSummary?.aiVisibilityScore !== null ? story.seoHealthSummary.aiVisibilityScore : 'N/A'}</div>
          <div><strong>Status:</strong> {story.seoHealthSummary?.status || 'N/A'}</div>
        </div>
      </Card>

      {/* Technical Findings */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Code size={18} /> Technical Findings</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <div><strong>Critical Issues:</strong> {story.technicalFindings?.criticalIssues || 0}</div>
          <div><strong>High Issues:</strong> {story.technicalFindings?.highIssues || 0}</div>
          <div><strong>Performance Score:</strong> {story.technicalFindings?.performanceScore !== null ? story.technicalFindings.performanceScore : 'N/A'}</div>
          <div><strong>SEO Score:</strong> {story.technicalFindings?.seoScore !== null ? story.technicalFindings.seoScore : 'N/A'}</div>
          {story.technicalFindings?.topIssues?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Top Issues:</strong>
              <ul style={{ margin: '5px 0 0 20px', color: '#9aa7bd' }}>
                {story.technicalFindings.topIssues.map((issue: any, i: number) => (
                  <li key={i}>{issue.issue} - {issue.fix}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Keyword Findings */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Search size={18} /> Keyword Findings</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <div><strong>Total Keywords:</strong> {story.keywordFindings?.totalKeywords || 0}</div>
          <div><strong>Primary Keywords:</strong> {story.keywordFindings?.primaryKeywordsCount || 0}</div>
          <div><strong>Opportunities:</strong> {story.keywordFindings?.opportunitiesCount || 0}</div>
          {story.keywordFindings?.topKeywords?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Top Keywords:</strong>
              <ul style={{ margin: '5px 0 0 20px', color: '#9aa7bd' }}>
                {story.keywordFindings.topKeywords.map((kw: any, i: number) => (
                  <li key={i}>{kw.keyword} (Vol: {kw.searchVolume}, Diff: {kw.difficulty})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Competitor Findings */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Target size={18} /> Competitor Findings</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <div><strong>Total Competitors:</strong> {story.competitorFindings?.totalCompetitors || 0}</div>
          <div><strong>Avg Threat Score:</strong> {story.competitorFindings?.avgThreatScore !== null ? story.competitorFindings.avgThreatScore : 'N/A'}</div>
          {story.competitorFindings?.topCompetitors?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Top Competitors:</strong>
              <ul style={{ margin: '5px 0 0 20px', color: '#9aa7bd' }}>
                {story.competitorFindings.topCompetitors.map((comp: any, i: number) => (
                  <li key={i}>{comp.name} (Threat: {comp.threatScore}, Weakness: {comp.weakness})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Content Gap Findings */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><FileText size={18} /> Content Gap Findings</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <div><strong>Total Gaps:</strong> {story.contentGapFindings?.totalGaps || 0}</div>
          <div><strong>Critical Gaps:</strong> {story.contentGapFindings?.criticalGaps || 0}</div>
          <div><strong>High Gaps:</strong> {story.contentGapFindings?.highGaps || 0}</div>
          {story.contentGapFindings?.topGaps?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Top Gaps:</strong>
              <ul style={{ margin: '5px 0 0 20px', color: '#9aa7bd' }}>
                {story.contentGapFindings.topGaps.map((gap: any, i: number) => (
                  <li key={i}>{gap.title} (Priority: {gap.priority})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* AI Visibility Findings */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Cpu size={18} /> AI Visibility Findings</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <div><strong>Overall Score:</strong> {story.aiVisibilityFindings?.overallScore !== null ? story.aiVisibilityFindings.overallScore : 'N/A'}</div>
          <div><strong>ChatGPT Score:</strong> {story.aiVisibilityFindings?.chatGptScore !== null ? story.aiVisibilityFindings.chatGptScore : 'N/A'}</div>
          <div><strong>Gemini Score:</strong> {story.aiVisibilityFindings?.geminiScore !== null ? story.aiVisibilityFindings.geminiScore : 'N/A'}</div>
          <div><strong>Claude Score:</strong> {story.aiVisibilityFindings?.claudeScore !== null ? story.aiVisibilityFindings.claudeScore : 'N/A'}</div>
          <div><strong>Perplexity Score:</strong> {story.aiVisibilityFindings?.perplexityScore !== null ? story.aiVisibilityFindings.perplexityScore : 'N/A'}</div>
          {story.aiVisibilityFindings?.topOpportunities?.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <strong>Top Opportunities:</strong>
              <ul style={{ margin: '5px 0 0 20px', color: '#9aa7bd' }}>
                {story.aiVisibilityFindings.topOpportunities.map((opp: any, i: number) => (
                  <li key={i}>{opp.opportunity} (Impact: {opp.impact})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Main Risks */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><AlertTriangle size={18} color="#ff4757" /> Main Risks</h3>
        <div style={{ marginTop: '15px' }}>
          {story.mainRisks?.length > 0 ? (
            <ul style={{ margin: '0 0 0 20px', color: '#9aa7bd' }}>
              {story.mainRisks.map((risk: any, i: number) => (
                <li key={i}>
                  <strong>{risk.category}:</strong> {risk.risk} (Impact: {risk.impact}) - {risk.recommendation}
                </li>
              ))}
            </ul>
          ) : (
            <span style={{ color: '#9aa7bd' }}>No significant risks identified</span>
          )}
        </div>
      </Card>

      {/* Main Opportunities */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Zap size={18} color="#10e18b" /> Main Opportunities</h3>
        <div style={{ marginTop: '15px' }}>
          {story.mainOpportunities?.length > 0 ? (
            <ul style={{ margin: '0 0 0 20px', color: '#9aa7bd' }}>
              {story.mainOpportunities.map((opp: any, i: number) => (
                <li key={i}>
                  <strong>{opp.category}:</strong> {opp.opportunity} (Potential: {opp.potential}) - {opp.action}
                </li>
              ))}
            </ul>
          ) : (
            <span style={{ color: '#9aa7bd' }}>No significant opportunities identified</span>
          )}
        </div>
      </Card>

      {/* Action Plan */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><LayoutList size={18} /> 7/30/60/90 Day SEO Plan</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '15px' }}>
          <div>
            <h4 style={{ color: '#53a7ff', margin: '0 0 10px 0' }}>Day 7</h4>
            {story.actionPlan?.day7?.length > 0 ? (
              <ul style={{ margin: '0 0 0 20px', color: '#9aa7bd' }}>
                {story.actionPlan.day7.map((action: any, i: number) => (
                  <li key={i}>{action.action} (Priority: {action.priority}) - Source: {action.source}</li>
                ))}
              </ul>
            ) : (
              <span style={{ color: '#9aa7bd' }}>No Day 7 actions</span>
            )}
          </div>
          <div>
            <h4 style={{ color: '#a855f7', margin: '0 0 10px 0' }}>Day 30</h4>
            {story.actionPlan?.day30?.length > 0 ? (
              <ul style={{ margin: '0 0 0 20px', color: '#9aa7bd' }}>
                {story.actionPlan.day30.map((action: any, i: number) => (
                  <li key={i}>{action.action} (Priority: {action.priority}) - Source: {action.source}</li>
                ))}
              </ul>
            ) : (
              <span style={{ color: '#9aa7bd' }}>No Day 30 actions</span>
            )}
          </div>
          <div>
            <h4 style={{ color: '#ffa502', margin: '0 0 10px 0' }}>Day 60</h4>
            {story.actionPlan?.day60?.length > 0 ? (
              <ul style={{ margin: '0 0 0 20px', color: '#9aa7bd' }}>
                {story.actionPlan.day60.map((action: any, i: number) => (
                  <li key={i}>{action.action} (Priority: {action.priority}) - Source: {action.source}</li>
                ))}
              </ul>
            ) : (
              <span style={{ color: '#9aa7bd' }}>No Day 60 actions</span>
            )}
          </div>
          <div>
            <h4 style={{ color: '#10e18b', margin: '0 0 10px 0' }}>Day 90</h4>
            {story.actionPlan?.day90?.length > 0 ? (
              <ul style={{ margin: '0 0 0 20px', color: '#9aa7bd' }}>
                {story.actionPlan.day90.map((action: any, i: number) => (
                  <li key={i}>{action.action} (Priority: {action.priority}) - Source: {action.source}</li>
                ))}
              </ul>
            ) : (
              <span style={{ color: '#9aa7bd' }}>No Day 90 actions</span>
            )}
          </div>
        </div>
      </Card>

      {/* Executive Recommendation */}
      <Card style={{ border: '2px solid #a855f7' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle size={18} color="#a855f7" /> Executive Recommendation</h3>
        <div style={{ marginTop: '15px', display: 'grid', gap: '10px' }}>
          <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.6' }}>{story.executiveRecommendation?.summary || 'No summary available'}</p>
          <div><strong>Priority Actions:</strong></div>
          <ul style={{ margin: '5px 0 0 20px', color: '#9aa7bd' }}>
            {story.executiveRecommendation?.priorityActions?.map((action: string, i: number) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
          <div><strong>Expected Timeline:</strong> {story.executiveRecommendation?.expectedTimeline || 'N/A'}</div>
          <div><strong>Confidence:</strong> {story.executiveRecommendation?.confidence || 'N/A'}</div>
        </div>
      </Card>
    </div>
  );
}

function TechnicalAudit({ data }: { data: any }) {
  // Debug: Log technical audit structure
  if (import.meta.env.DEV) {
    console.log('[Technical Tab] technical keys', Object.keys(data || {}));
    console.log('[Technical Tab] scores', {
      performance: data?.performanceScore ?? data?.technical?.performanceScore ?? data?.auditData?.performanceScore,
      seo: data?.seoScore ?? data?.technical?.seoScore ?? data?.auditData?.seoScore,
      accessibility: data?.accessibilityScore ?? data?.technical?.accessibilityScore ?? data?.auditData?.accessibilityScore,
      bestPractices: data?.bestPracticesScore ?? data?.technical?.bestPracticesScore ?? data?.auditData?.bestPracticesScore,
      mobile: data?.mobileScore ?? data?.technical?.mobileScore ?? data?.auditData?.mobileScore,
      desktop: data?.desktopScore ?? data?.technical?.desktopScore ?? data?.auditData?.desktopScore
    });
  }

  // Read from the canonical normalized paths — check data (spread from seo + seo.technicalAudit)
  // then fall back to data.technical (normalized field), then to data.auditData (raw Prisma JSON)
  const source = data.technical || data;
  const auditData = source.auditData || data.auditData || {};

  // Helper to normalize 0-1 scores to 0-100
  const norm = (v: any) => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  };

  const pickScore = (paths: any[]) => {
    for (const p of paths) {
      const v = norm(p);
      if (v !== null) return v;
    }
    return null;
  };

  const performanceScore = pickScore([
    data.performanceScore,
    data.technical?.performanceScore,
    data.auditData?.performanceScore,
    auditData.performanceScore,
    auditData.pageSpeed?.mobile?.lighthouseScores?.performance,
    auditData.pageSpeed?.desktop?.lighthouseScores?.performance
  ]);

  const seoScore = pickScore([
    data.seoScore,
    data.technical?.seoScore,
    data.auditData?.seoScore,
    auditData.seoScore,
    auditData.pageSpeed?.mobile?.lighthouseScores?.seo,
    auditData.pageSpeed?.desktop?.lighthouseScores?.seo
  ]);

  const accessibilityScore = pickScore([
    data.accessibilityScore,
    data.technical?.accessibilityScore,
    data.auditData?.accessibilityScore,
    auditData.accessibilityScore,
    auditData.pageSpeed?.mobile?.lighthouseScores?.accessibility,
    auditData.pageSpeed?.desktop?.lighthouseScores?.accessibility
  ]);

  const bestPracticesScore = pickScore([
    data.bestPracticesScore,
    data.technical?.bestPracticesScore,
    data.auditData?.bestPracticesScore,
    auditData.bestPracticesScore,
    auditData.pageSpeed?.mobile?.lighthouseScores?.bestPractices,
    auditData.pageSpeed?.desktop?.lighthouseScores?.bestPractices
  ]);

  const mobileScore = pickScore([
    data.mobileScore,
    data.technical?.mobileScore,
    data.auditData?.mobileScore,
    auditData.mobileScore
  ]);

  const desktopScore = pickScore([
    data.desktopScore,
    data.technical?.desktopScore,
    data.auditData?.desktopScore,
    auditData.desktopScore
  ]);

  // Read issues/recommendations from the same source chain
  const coreWebVitals = data.coreWebVitals || data.technical?.coreWebVitals || auditData.coreWebVitals || null;
  const criticalIssues = data.criticalIssues || data.technical?.criticalIssues || auditData.criticalIssues || [];
  const highIssues = data.highIssues || data.technical?.highIssues || auditData.highIssues || [];
  const recommendations = data.recommendations || data.technical?.recommendations || auditData.recommendations || [];
  const pageSpeed = data.pageSpeed || data.technical?.pageSpeed || auditData.pageSpeed || null;
  
  // Deduplicate issues by normalized title/source/severity
  function deduplicateIssues(issueArray: any[]) {
    if (!Array.isArray(issueArray)) return [];
    const seen = new Set();
    return issueArray.filter(issue => {
      const key = `${asText(issue.title || issue.description || issue)}-${asText(issue.source || issue.category || issue.severity)}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const critical = deduplicateIssues(asArray(criticalIssues));
  const high = deduplicateIssues(asArray(highIssues));
  const recs = deduplicateIssues(asArray(recommendations));

  // Get PageSpeed scores from canonical pageSpeed structure
  const mobileScores = pageSpeed?.mobile?.lighthouseScores || pageSpeed?.mobile?.scores;
  const desktopScores = pageSpeed?.desktop?.lighthouseScores || pageSpeed?.desktop?.scores;

  if (import.meta.env.DEV) { console.log('[Technical Tab] resolved scores', { performanceScore, seoScore, accessibilityScore, bestPracticesScore, mobileScore, desktopScore }); }
  
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="score-grid">
        <ScoreCard label="Performance" value={performanceScore} tone="pink" />
        <ScoreCard label="SEO Score" value={seoScore} tone="green" />
        <ScoreCard label="Accessibility" value={accessibilityScore} tone="blue" />
        <ScoreCard label="Best Practices" value={bestPracticesScore} tone="yellow" />
      </div>

      {/* PageSpeed Data Section */}
      {pageSpeed && (
        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} /> PageSpeed Insights Data
            <Badge className="green">PageSpeed API</Badge>
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
            {/* Mobile Scores */}
            <div style={{ padding: '15px', background: '#0b1220', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#53a7ff' }}>Mobile Scores</h4>
              {mobileScores ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9aa7bd' }}>Performance:</span>
                    <span style={{ color: mobileScores.performance >= 90 ? '#10e18b' : mobileScores.performance >= 50 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                      {mobileScores.performance !== null ? mobileScores.performance : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9aa7bd' }}>SEO:</span>
                    <span style={{ color: mobileScores.seo >= 90 ? '#10e18b' : mobileScores.seo >= 50 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                      {mobileScores.seo !== null ? mobileScores.seo : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9aa7bd' }}>Accessibility:</span>
                    <span style={{ color: mobileScores.accessibility >= 90 ? '#10e18b' : mobileScores.accessibility >= 50 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                      {mobileScores.accessibility !== null ? mobileScores.accessibility : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9aa7bd' }}>Best Practices:</span>
                    <span style={{ color: mobileScores.bestPractices >= 90 ? '#10e18b' : mobileScores.bestPractices >= 50 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                      {mobileScores.bestPractices !== null ? mobileScores.bestPractices : 'Unavailable'}
                    </span>
                  </div>
                </div>
              ) : (
                <span style={{ color: '#9aa7bd' }}>Unavailable</span>
              )}
            </div>
            
            {/* Desktop Scores */}
            <div style={{ padding: '15px', background: '#0b1220', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#a855f7' }}>Desktop Scores</h4>
              {desktopScores ? (
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9aa7bd' }}>Performance:</span>
                    <span style={{ color: desktopScores.performance >= 90 ? '#10e18b' : desktopScores.performance >= 50 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                      {desktopScores.performance !== null ? desktopScores.performance : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9aa7bd' }}>SEO:</span>
                    <span style={{ color: desktopScores.seo >= 90 ? '#10e18b' : desktopScores.seo >= 50 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                      {desktopScores.seo !== null ? desktopScores.seo : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9aa7bd' }}>Accessibility:</span>
                    <span style={{ color: desktopScores.accessibility >= 90 ? '#10e18b' : desktopScores.accessibility >= 50 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                      {desktopScores.accessibility !== null ? desktopScores.accessibility : 'Unavailable'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9aa7bd' }}>Best Practices:</span>
                    <span style={{ color: desktopScores.bestPractices >= 90 ? '#10e18b' : desktopScores.bestPractices >= 50 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                      {desktopScores.bestPractices !== null ? desktopScores.bestPractices : 'Unavailable'}
                    </span>
                  </div>
                </div>
              ) : (
                <span style={{ color: '#9aa7bd' }}>Unavailable</span>
              )}
            </div>
          </div>
          
          {/* Core Web Vitals */}
          {coreWebVitals && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#0b1220', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#10e18b' }}>Core Web Vitals</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div>
                  <span style={{ color: '#9aa7bd', fontSize: '12px' }}>FCP:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '8px' }}>
                    {formatInt(coreWebVitals.fcp)}ms
                  </span>
                </div>
                <div>
                  <span style={{ color: '#9aa7bd', fontSize: '12px' }}>LCP:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '8px' }}>
                    {formatInt(coreWebVitals.lcp)}ms
                  </span>
                </div>
                <div>
                  <span style={{ color: '#9aa7bd', fontSize: '12px' }}>CLS:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '8px' }}>
                    {formatNumber(coreWebVitals.cls)}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#9aa7bd', fontSize: '12px' }}>INP:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '8px' }}>
                    {formatInt(coreWebVitals.inp)}ms
                  </span>
                </div>
                <div>
                  <span style={{ color: '#9aa7bd', fontSize: '12px' }}>TTFB:</span>
                  <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '8px' }}>
                    {formatInt(coreWebVitals.ttfb)}ms
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <Card>
          <h3 style={{ color: '#ff4757', display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={18} /> Critical Issues</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {critical.length ? critical.map((c: any, i: number) => (
              <div key={i} style={{ padding: '15px', background: '#1a1014', border: '1px solid #ff4757', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: '#ff8a8a', fontSize: '15px' }}>{asText(c.issue || c.title || c)}</strong>
                  <Badge className="pink">Critical</Badge>
                </div>
                {c.source && <Badge className="blue" style={{ fontSize: '10px', marginBottom: '8px' }}>{c.source}</Badge>}
                <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '10px' }}>
                  Impact: <b>High</b> - Immediate fix required.
                </div>
                {c.recommendation && (
                  <div style={{ padding: '10px', background: '#0b1220', borderRadius: '6px', fontSize: '13px', borderLeft: '3px solid #10e18b' }}>
                    <span style={{ color: '#10e18b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Fix Implementation:</span>
                    {asText(c.recommendation)}
                  </div>
                )}
              </div>
            )) : (
              <div style={{ padding: '15px', background: '#0f1f1a', borderRadius: '8px', color: '#10e18b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18}/> No critical issues found! Your technical foundation is solid.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 style={{ color: '#ffa502', display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={18} /> High Priority Fixes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {high.length ? high.map((h: any, i: number) => (
              <div key={i} style={{ padding: '15px', background: '#1a1810', border: '1px solid #ffa502', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ color: '#ffb347', fontSize: '15px' }}>{asText(h.issue || h.title || h)}</strong>
                  <Badge className="blue">High</Badge>
                </div>
                {h.source && <Badge className="blue" style={{ fontSize: '10px', marginBottom: '8px' }}>{h.source}</Badge>}
                {h.recommendation && (
                  <div style={{ padding: '10px', background: '#0b1220', borderRadius: '6px', fontSize: '13px', borderLeft: '3px solid #53a7ff', marginTop: '10px' }}>
                    <span style={{ color: '#53a7ff', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Recommended Action:</span>
                    {asText(h.recommendation)}
                  </div>
                )}
              </div>
            )) : <p style={{ color: '#9aa7bd' }}>No high priority issues found.</p>}
          </div>
        </Card>

        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code size={18} /> Technical Recommendations</h3>
          <div className="result-grid" style={{ marginTop: '15px' }}>
            {recs.map((r: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', borderLeft: '3px solid #53a7ff' }}>
                <strong style={{ display: 'block', marginBottom: '5px' }}>{asText(r.recommendation || r.fix || r.title || r)}</strong>
                <span style={{ fontSize: '12px', color: '#9aa7bd' }}>{asText(r.area || r.impact || r.reason || 'General improvement')}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function KeywordIntelligence({ data }: { data: any }) {
  if (import.meta.env.DEV) {
    console.log('===== TAB: KeywordIntelligence =====');
    console.log('data keys:', Object.keys(data || {}));
    console.log('primaryKeywords count:', (data?.primaryKeywords || []).length);
    console.log('secondaryKeywords count:', (data?.secondaryKeywords || []).length);
    console.log('longTailKeywords count:', (data?.longTailKeywords || []).length);
    console.log('questionKeywords count:', (data?.questionKeywords || []).length);
    console.log('clusters count:', (data?.clusters || []).length);
    console.log('===== END TAB: KeywordIntelligence =====');
  }
  if (!data || Object.keys(data).length === 0) return <EmptyState title="No Keyword Intelligence" text="No verified keyword data available." />;
  
  // Filter out irrelevant brand/competitor keyword pollution
  const pollutedTerms = ['canva', 'semrush', 'wix', 'wordpress', 'shopify', 'squarespace', 'godaddy', 'weebly', 'joomla', 'magento', 'clickfunnels', 'unbounce', 'leadpages', 'instapage', 'landingi'];
  const isRelevantKeyword = (k: any) => {
    const kw = (k.keyword || k || '').toLowerCase().trim();
    return !pollutedTerms.some(t => kw === t || kw.startsWith(t + ' ') || kw.endsWith(' ' + t) || kw.includes(t + ' vs') || kw.includes(' vs ' + t));
  };
  
  const tables = [
    { title: 'Primary Keywords', data: asArray(data.primaryKeywords).filter(isRelevantKeyword) },
    { title: 'Secondary Keywords', data: asArray(data.secondaryKeywords).filter(isRelevantKeyword) },
    { title: 'Long-Tail Keywords', data: asArray(data.longTailKeywords).filter(isRelevantKeyword) },
    { title: 'Question / FAQ Keywords', data: asArray(data.questionKeywords).filter(isRelevantKeyword) },
  ];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card>
          <h3><Search size={18}/> Topic Clusters (Visual Hierarchy)</h3>
          <div style={{ marginTop: '15px', padding: '10px', background: '#0b1220', borderRadius: '8px' }}>
            {asArray(data.clusters).map((c: any, i) => (
              <div key={i} style={{ marginBottom: '15px', paddingLeft: '10px', borderLeft: '2px solid #293245' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#53a7ff' }}></div>
                  <strong style={{ color: '#53a7ff', fontSize: '15px' }}>{asText(c.name || c.clusterName)}</strong>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', paddingLeft: '16px' }}>
                  {asArray(c.keywords).map((k: any, j) => (
                    <Badge key={j} className="dark" style={{ border: '1px solid #1d2738' }}>{asText(k.keyword || k)}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3><Globe size={18}/> GEO Keywords (AI Overviews)</h3>
          <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
            {asArray(data.geoKeywords).map((g: any, i) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', borderLeft: '3px solid #a855f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <strong>{asText(g.question || g.keyword || g)}</strong>
                  <Badge className="pink">{asText(g.platform || 'AI Overview')}</Badge>
                </div>
                <div style={{ fontSize: '12px', color: '#9aa7bd' }}>
                  Recommended Content: <span style={{ color: '#10e18b' }}>{asText(g.contentRecommendation || 'FAQ / Guide')}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {tables.map(table => table.data.length > 0 && (
        <Card key={table.title} style={{ overflowX: 'auto' }}>
          <h3>{table.title}</h3>
          <table className="styled-table" style={{ width: '100%', minWidth: '900px', textAlign: 'left', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #293245', color: '#9aa7bd', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px' }}>Keyword</th>
                <th style={{ padding: '12px' }}>Intent</th>
                <th style={{ padding: '12px' }}>Volume</th>
                <th style={{ padding: '12px' }}>KD %</th>
                <th style={{ padding: '12px' }}>CPC ($)</th>
                <th style={{ padding: '12px' }}>Content Type</th>
                <th style={{ padding: '12px' }}>Opportunity</th>
              </tr>
            </thead>
            <tbody>
              {table.data.map((k: any, i: number) => {
                const kd = asNumber(k.difficulty, null);
                const kdColor = kd > 70 ? '#ff4757' : kd > 40 ? '#ffa502' : kd !== null ? '#10e18b' : '#9aa7bd';
                const volume = k.searchVolume !== null ? k.searchVolume : null;
                const cpc = k.cpc !== null ? k.cpc : null;
                const hasDataForSEO = k.source === 'DataForSEO';
                
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #1d2738', fontSize: '14px' }}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>
                      {asText(k.keyword || k)}
                      {hasDataForSEO && (
                        <Badge className="green" style={{ fontSize: '10px', marginLeft: '8px' }}>DataForSEO</Badge>
                      )}
                      <div style={{ fontSize: '11px', color: '#9aa7bd', marginTop: '4px', fontWeight: 'normal' }}>
                        URL: {asText(k.suggestedUrl || '/')}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge className={(asText(k.intent) || '').toLowerCase().includes('commercial') ? 'blue' : 'dark'}>
                        {asText(k.intent || k.searchIntent)}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px', color: volume !== null ? '#fff' : '#9aa7bd' }}>
                      {formatNumber(volume)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: kdColor, fontWeight: 'bold' }}>{kd !== null ? kd : 'N/A'}</span>
                        {kd !== null && (
                          <div style={{ width: '40px', height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${kd}%`, height: '100%', background: kdColor }}></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: cpc !== null ? '#9aa7bd' : '#9aa7bd' }}>
                      {formatMoney(cpc)}
                    </td>
                    <td style={{ padding: '12px', color: '#53a7ff' }}>{asText(k.contentType || 'Blog Post')}</td>
                    <td style={{ padding: '12px' }}>
                      <Badge className="green">{asNumber(k.opportunity, 80)}/100</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ))}
    </div>
  );
}

function CompetitorSEO({ data }: { data: any }) {
  if (import.meta.env.DEV) {
    console.log('===== TAB: CompetitorSEO =====');
    console.log('data keys:', Object.keys(data || {}));
    console.log('competitorProfiles count:', (data?.competitorProfiles || []).length);
    console.log('competitors count:', (data?.competitors || []).length);
    console.log('keywordGaps keys:', Object.keys(data?.keywordGaps || {}));
    console.log('contentGaps count:', (data?.contentGaps || []).length);
    console.log('===== END TAB: CompetitorSEO =====');
  }
  if (!data || Object.keys(data).length === 0) return <EmptyState title="No Competitor SEO" text="No verified competitor data available." />;

  // Read competitorProfiles from CompetitorSeoRecord (canonical shape from backend controller)
  const competitorProfiles = asArray(data.competitorProfiles || data.competitors || []);
  // Render all competitorProfiles grouped with estimated flag
  const keywordGaps = data.keywordGaps?.missingKeywords || data.keywordGaps || [];
  const authorityGaps = data.authorityGaps || data.authorityGap || {};
  const contentGaps = data.contentGaps || [];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {competitorProfiles.length > 0 && (
        <Card>
          <h3>Competitors</h3>
          <div className="result-grid">
            {competitorProfiles.map((c: any, i) => (
              <div key={i} style={{ padding: '20px', background: '#151d2b', borderRadius: '12px', borderTop: `4px solid ${i===0?'#a855f7':i===1?'#53a7ff':'#10e18b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '18px', margin: 0 }}>{asText(c.name || c.title || c.domain)}</h4>
                  {c.competitorType === 'estimated' || c.source === 'CategoryFallback' || c.isEstimated === true ? (
                    <Badge className="yellow">Estimated</Badge>
                  ) : (
                    <Badge className="green">Direct Competitor</Badge>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#9aa7bd', margin: '0 0 15px 0', minHeight: '40px' }}>{asText(c.positioning || c.description || c.snippet || c.overlapReason)}</p>
                {c.source === 'DataForSEO_SERP' && (
                  <Badge className="blue" style={{ fontSize: '10px', marginBottom: '10px' }}>DataForSEO SERP</Badge>
                )}
                {c.isFallback || c.source === 'CategoryFallback' ? (
                  <Badge className="yellow" style={{ fontSize: '10px', marginBottom: '10px' }}>Estimated</Badge>
                ) : null}
                {c.domainDataSource && c.domainDataSource !== 'Unavailable' && (
                  <Badge className="green" style={{ fontSize: '10px', marginBottom: '10px' }}>{c.domainDataSource}</Badge>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ padding: '10px', background: '#0b1220', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase' }}>Authority Score</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#a855f7' }}>
                      {c.estimatedAuthority !== null && c.estimatedAuthority !== undefined ? c.estimatedAuthority : 'Unavailable'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b1220', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase' }}>Est. Traffic</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#53a7ff' }}>
                      {formatNumber(c.estimatedTraffic)}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b1220', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase' }}>Backlinks</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10e18b' }}>
                      {formatNumber(c.backlinks)}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b1220', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase' }}>Referring Domains</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffa502' }}>
                      {formatNumber(c.referringDomains)}
                    </div>
                  </div>
                </div>
                <div className="list-row" style={{ borderTop: '1px solid #1d2738', paddingTop: '10px' }}>
                  <b style={{ fontSize: '12px', color: '#9aa7bd' }}>Overlap Reason:</b> 
                  <span style={{ fontSize: '12px', color: '#10e18b', marginLeft: '8px' }}>{asText(c.overlapReason || c.reason || c.description)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {competitorProfiles.length === 0 && (
        <EmptyState title="No competitors found" text="No verified direct competitors found from available SERP data." />
      )}

      {keywordGaps.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card>
            <h3>Keyword Gaps (High Value)</h3>
            <table className="styled-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginTop: '15px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #293245', color: '#9aa7bd', fontSize: '12px' }}>
                  <th style={{ padding: '10px' }}>Keyword</th>
                  <th style={{ padding: '10px' }}>Volume</th>
                  <th style={{ padding: '10px' }}>KD</th>
                </tr>
              </thead>
              <tbody>
                {keywordGaps.slice(0, 8).map((k: any, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1d2738', fontSize: '13px' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>{asText(k.keyword || k)}</td>
                    <td style={{ padding: '10px', color: '#10e18b' }}>{formatNumber(k.searchVolume)}</td>
                    <td style={{ padding: '10px', color: '#ffa502' }}>{asNumber(k.difficulty) ?? "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <h3>Authority & Link Gaps</h3>
            <ul style={{ paddingLeft: '20px', marginTop: '15px' }}>
              {asArray(authorityGaps.backlinkOpportunities || authorityGaps).map((a: any, i) => (
                <li key={i} style={{ color: '#53a7ff', marginBottom: '10px', fontSize: '14px' }}>
                  <b>{asText(a.opportunity || a.domain || a)}</b>
                  {a.reason && <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9aa7bd' }}>{asText(a.reason)}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function ContentGaps({ data }: { data: any }) {
  if (import.meta.env.DEV) {
    console.log('===== TAB: ContentGaps =====');
    console.log('data keys:', Object.keys(data || {}));
    console.log('contentGaps count:', asArray(data?.contentGaps || []).length);
    console.log('landingPageIdeas count:', asArray(data?.landingPageIdeas || []).length);
    console.log('comparisonPageIdeas count:', asArray(data?.comparisonPageIdeas || []).length);
    console.log('===== END TAB: ContentGaps =====');
  }
  if (!data || Object.keys(data).length === 0) return <EmptyState title="No Content Gaps" text="No verified content gap data available." />;

  // Use canonical field paths from contract
  const contentGaps = asArray(data.contentGaps || []);
  const landingPageIdeas = asArray(data.landingPageIdeas || []);
  const comparisonPageIdeas = asArray(data.comparisonPageIdeas || []);
  const faqOpportunities = asArray(data.faqOpportunities || []);
  const geoContentIdeas = asArray(data.geoContentIdeas || []);
  const resourcePageIdeas = asArray(data.resourcePageIdeas || []);

  const hasData = contentGaps.length > 0 || landingPageIdeas.length > 0 ||
                 comparisonPageIdeas.length > 0 || resourcePageIdeas.length > 0 ||
                 faqOpportunities.length > 0 || geoContentIdeas.length > 0;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="score-grid">
        <ScoreCard label="Total Content Gaps" value={contentGaps.length || 0} tone="pink" />
        <ScoreCard label="Landing Page Ideas" value={landingPageIdeas.length || 0} tone="blue" />
        <ScoreCard label="Comparison Pages" value={comparisonPageIdeas.length || 0} tone="green" />
        <ScoreCard label="Resource Pages" value={resourcePageIdeas.length || 0} tone="yellow" />
      </div>

      {!hasData && (
        <Card>
          <h3><LayoutList size={18} /> Content Gap Analysis</h3>
          <p style={{ color: '#9aa7bd', marginTop: '15px' }}>
            No verified content gap data available from current data sources.
          </p>
        </Card>
      )}

      {hasData && (
        <Card>
          <h3><LayoutList size={18} /> Top Content Gaps</h3>
          <div className="result-grid">
            {contentGaps.map((g: any, i) => (
              <div key={i} className="list-row" style={{ borderLeft: '4px solid #ff4757', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', background: '#151d2b', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <b style={{ fontSize: '15px' }}>{asText(g.title || g.pageTitle || g)}</b>
                  <Badge className="pink">{asText(g.priority || 'High')}</Badge>
                </div>
                {g.source && g.source !== 'Unavailable' && (
                  <Badge className="blue" style={{ fontSize: '10px' }}>{g.source}</Badge>
                )}
                <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#9aa7bd', background: '#0b1220', padding: '10px', borderRadius: '6px', width: '100%' }}>
                  {g.targetKeyword && <span>🎯 <b>Keyword:</b> <span style={{ color: '#fff' }}>{g.targetKeyword}</span></span>}
                  {g.searchVolume !== null && g.searchVolume !== undefined && <span>📊 <b>Volume:</b> <span style={{ color: '#10e18b' }}>{formatNumber(g.searchVolume)}</span></span>}
                  {g.searchVolume === null && <span>📊 <b>Volume:</b> <span style={{ color: '#9aa7bd' }}>Unavailable</span></span>}
                  {g.keywordDifficulty !== null && g.keywordDifficulty !== undefined && <span>📈 <b>KD:</b> <span style={{ color: '#ffa502' }}>{g.keywordDifficulty}</span></span>}
                  {g.keywordDifficulty === null && <span>📈 <b>KD:</b> <span style={{ color: '#9aa7bd' }}>Unavailable</span></span>}
                  {g.intent && <span>💡 <b>Intent:</b> <span style={{ color: '#53a7ff' }}>{g.intent}</span></span>}
                </div>
                {g.confidence && (
                  <div style={{ fontSize: '12px', color: '#9aa7bd' }}>
                    <b>Confidence:</b> <span style={{ color: g.confidence > 80 ? '#10e18b' : g.confidence > 60 ? '#ffa502' : '#ff4757' }}>{g.confidence}%</span>
                  </div>
                )}
                <div style={{ fontSize: '13px', color: '#9aa7bd', lineHeight: '1.5' }}>{asText(g.evidence || g.whyItMatters || g.reason || g.contentType)}</div>
                {g.recommendedSections && (
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#53a7ff', borderTop: '1px solid #1d2738', paddingTop: '8px', width: '100%' }}>
                    <b>Recommended Sections:</b> {Array.isArray(g.recommendedSections) ? g.recommendedSections.join(' • ') : g.recommendedSections}
                  </div>
                )}
                {g.competitorEvidence && g.competitorEvidence.length > 0 && (
                  <div style={{ fontSize: '12px', marginTop: '4px', color: '#ffa502' }}>
                    <b>Competitor Evidence:</b> {Array.isArray(g.competitorEvidence) ? g.competitorEvidence.join(', ') : g.competitorEvidence}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {landingPageIdeas.length > 0 && (
        <Card>
          <h3>Landing Pages to Build</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {landingPageIdeas.map((l: any, i) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', borderLeft: '3px solid #53a7ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <b style={{ fontSize: '14px' }}>{asText(l.title || l.pageTitle || l)}</b>
                  {l.source && l.source !== 'Unavailable' && <Badge className="blue" style={{ fontSize: '10px' }}>{l.source}</Badge>}
                </div>
                <div style={{ fontSize: '12px', color: '#9aa7bd' }}>Target: <span style={{ color: '#10e18b' }}>{asText(l.targetKeyword || '')}</span></div>
                {l.searchVolume !== null && <div style={{ fontSize: '12px', color: '#9aa7bd' }}>Volume: <span style={{ color: '#10e18b' }}>{formatNumber(l.searchVolume)}</span></div>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function GeoIntelligence({ data }: { data: any }) {
  if (import.meta.env.DEV) {
    console.log('===== TAB: GeoIntelligence =====');
    console.log('data keys:', Object.keys(data || {}));
    console.log('aiVisibilityScore:', data?.aiVisibilityScore);
    console.log('entities count:', (data?.entities || []).length);
    console.log('===== END TAB: GeoIntelligence =====');
  }
  if (!data || Object.keys(data).length === 0) return <EmptyState title="No GEO Intelligence" text="No verified GEO intelligence data available." />;

  // Use canonical field paths from contract
  const aiVisibilityScore = data.aiVisibilityScore || null;
  const citationReadinessScore = data.citationReadinessScore || null;
  const answerabilityScore = data.answerabilityScore || null;
  const entityCoverageScore = data.entityCoverageScore || 60;
  const geoKeywords = asArray(data.geoKeywords || []);
  const aiContentOpportunities = asArray(data.aiContentOpportunities || data.citationOpportunities || []);

  const chartData = [
    { name: 'ChatGPT', score: asNumber(data.chatGptScore || aiVisibilityScore, 40) },
    { name: 'Gemini', score: asNumber(data.geminiScore, 45) },
    { name: 'Claude', score: asNumber(data.claudeScore, 30) },
    { name: 'Perplexity', score: asNumber(data.perplexityScore, 50) },
    { name: 'Google AI', score: asNumber(data.googleAiOverviewScore, 60) },
  ];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card style={{ height: '380px' }}>
          <h3><Cpu size={18} /> AI Engine Visibility</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
              <XAxis dataKey="name" tick={{ fill: '#9aa7bd', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#9aa7bd', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#1a2335' }} contentStyle={{ background: '#101622', border: '1px solid #293245', borderRadius: '8px' }} />
              <Bar dataKey="score" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3><Globe size={18} /> Entity & Knowledge Graph</h3>
          <div className="result-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1220', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #10e18b' }}>
              <div>
                <b style={{ display: 'block', fontSize: '14px' }}>Entity Coverage</b>
                <span style={{ fontSize: '12px', color: '#9aa7bd' }}>Brand presence in LLM training data</span>
              </div>
              <strong style={{ fontSize: '20px', color: '#10e18b' }}>{asNumber(entityCoverageScore, 60)}/100</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1220', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #ff4757' }}>
              <div>
                <b style={{ display: 'block', fontSize: '14px' }}>Citation Readiness</b>
                <span style={{ fontSize: '12px', color: '#9aa7bd' }}>Probability of being cited as source</span>
              </div>
              <strong style={{ fontSize: '20px', color: '#ff4757' }}>{asNumber(citationReadinessScore, 40)}/100</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1220', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #53a7ff' }}>
              <div>
                <b style={{ display: 'block', fontSize: '14px' }}>Answerability</b>
                <span style={{ fontSize: '12px', color: '#9aa7bd' }}>How well content resolves user queries</span>
              </div>
              <strong style={{ fontSize: '20px', color: '#53a7ff' }}>{asNumber(answerabilityScore, 55)}/100</strong>
            </div>
          </div>
        </Card>
      </div>
      
      <Card>
        <h3>AI Content & Citation Opportunities</h3>
        <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
          {aiContentOpportunities.map((c: any, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#151d2b', padding: '15px', borderRadius: '8px' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
                <Zap size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <b style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>{asText(c.opportunity || c.type || c)}</b>
                <span style={{ color: '#9aa7bd', fontSize: '13px' }}>{asText(c.reason || c.impact)}</span>
              </div>
              <button className="primary-btn" style={{ padding: '8px 16px', fontSize: '12px' }}>Add to Sprint</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BlogIntelligence({ data }: { data: any }) {
  if (import.meta.env.DEV) {
    console.log('===== TAB: BlogIntelligence =====');
    console.log('data keys:', Object.keys(data || {}));
    console.log('blogIdeas count:', asArray(data?.blogIdeas || []).length);
    console.log('blogClusters count:', asArray(data?.blogClusters || []).length);
    console.log('===== END TAB: BlogIntelligence =====');
  }
  if (!data || Object.keys(data).length === 0) return <EmptyState title="No Blog Intelligence" text="No verified blog intelligence data available." />;

  // Filter out weak/generic keywords that pollute results
  const weakKeywords = ['general', 'account', 'semrush', 'competitors', 'alternatives', 'sign up', 'login', 'pricing', 'demo', 'free trial', 'contact us', 'about us', 'template', 'download', 'gallery', 'canva', 'wix', 'wordpress', 'shopify', 'squarespace', 'godaddy', 'weebly', 'started', 'daily', 'alerts', 'outlier', 'research', 'content', 'data', 'credits', 'what', 'manage'];
  const blogIdeasRaw = asArray(data.blogIdeas || []);
  const blogIdeas = blogIdeasRaw.filter((b: any) => {
    const keyword = (b.targetKeyword || b.keyword || '').toLowerCase().trim();
    return !weakKeywords.some(wk => keyword === wk || keyword.startsWith(wk + ' ') || keyword.endsWith(' ' + wk));
  });
  const blogClusters = asArray(data.blogClusters || []);
  const totalIdeas = blogIdeas.length || 0;
  const hasData = totalIdeas > 0;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="score-grid">
        <ScoreCard label="Blog Ideas" value={totalIdeas} tone="blue" />
        <ScoreCard label="Clusters" value={blogClusters.length || 0} tone="green" />
        <ScoreCard label="High Priority" value={blogIdeas.filter((b: any) => b.priority === 'high' || b.priority === 'critical').length || 0} tone="pink" />
      </div>

      {!hasData && (
        <Card>
          <h3><FileText size={18} /> Blog Intelligence</h3>
          <p style={{ color: '#9aa7bd', marginTop: '15px' }}>
            No verified blog ideas available from current data sources.
          </p>
        </Card>
      )}

      {hasData && (
        <Card style={{ overflowX: 'auto' }}>
          <h3><FileText size={18} /> Content Strategy & Blog Ideas</h3>
          <table className="styled-table" style={{ width: '100%', minWidth: '900px', textAlign: 'left', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #293245', color: '#9aa7bd', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px', width: '30%' }}>Title & Outline</th>
                <th style={{ padding: '12px' }}>Target Keyword</th>
                <th style={{ padding: '12px' }}>Volume</th>
                <th style={{ padding: '12px' }}>KD</th>
                <th style={{ padding: '12px' }}>Intent</th>
                <th style={{ padding: '12px' }}>Source</th>
                <th style={{ padding: '12px' }}>Confidence</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {blogIdeas.slice(0, 25).map((b: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #1d2738' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <b style={{ color: '#fff', fontSize: '14px' }}>{asText(b.title || b)}</b>
                      {b.source && b.source !== 'Unavailable' && (
                        <Badge className="blue" style={{ fontSize: '10px' }}>{b.source}</Badge>
                      )}
                    </div>
                    {b.outline && (
                      <div style={{ fontSize: '12px', color: '#9aa7bd', lineHeight: '1.4' }}>
                        {Array.isArray(b.outline) ? b.outline.join(' • ') : b.outline}
                      </div>
                    )}
                    {b.evidence && (
                      <div style={{ fontSize: '11px', color: '#ffa502', marginTop: '4px' }}>
                        {asText(b.evidence)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px', color: '#53a7ff', fontWeight: 'bold' }}>{asText(b.targetKeyword || '')}</td>
                  <td style={{ padding: '12px', color: b.searchVolume ? '#10e18b' : '#9aa7bd' }}>
                    {formatNumber(b.searchVolume)}
                  </td>
                  <td style={{ padding: '12px', color: b.keywordDifficulty ? '#ffa502' : '#9aa7bd' }}>
                    {b.keywordDifficulty !== null && b.keywordDifficulty !== undefined ? b.keywordDifficulty : 'Unavailable'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Badge className="dark">{asText(b.intent || 'Informational')}</Badge>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {b.source && b.source !== 'Unavailable' ? (
                      <Badge className="blue" style={{ fontSize: '10px' }}>{b.source}</Badge>
                    ) : (
                      <span style={{ color: '#9aa7bd', fontSize: '12px' }}>Unavailable</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {b.confidence ? (
                      <span style={{ color: b.confidence > 80 ? '#10e18b' : b.confidence > 60 ? '#ffa502' : '#ff4757', fontWeight: 'bold' }}>
                        {b.confidence}%
                      </span>
                    ) : (
                      <span style={{ color: '#9aa7bd' }}>Unavailable</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', border: '1px solid #53a7ff', color: '#53a7ff' }}>Add to Sprint</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {hasData && data.blogClusters && data.blogClusters.length > 0 && (
        <Card>
          <h3>Blog Clusters</h3>
          <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
            {asArray(data.blogClusters).map((cluster: any, i: number) => (
              <div key={i} style={{ padding: '15px', background: '#151d2b', borderRadius: '8px', borderLeft: '4px solid #a855f7' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <b style={{ fontSize: '15px' }}>{asText(cluster.clusterName || cluster.topic)}</b>
                  <span style={{ fontSize: '12px', color: '#9aa7bd' }}>{asArray(cluster.blogIdeas).length} ideas</span>
                </div>
                {cluster.totalVolume && (
                  <div style={{ fontSize: '12px', color: '#10e18b', marginBottom: '4px' }}>
                    Total Volume: {formatNumber(cluster.totalVolume)}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: '#9aa7bd' }}>
                  {Array.isArray(cluster.blogIdeas) 
                    ? cluster.blogIdeas.slice(0, 3).map((idea: any) => typeof idea === 'string' ? idea : idea.title || idea.keyword || JSON.stringify(idea)).join(', ')
                    : typeof cluster.blogIdeas === 'string' 
                      ? cluster.blogIdeas 
                      : typeof cluster.blogIdeas === 'object' 
                        ? (cluster.blogIdeas.title || cluster.blogIdeas.keyword || 'Blog cluster data')
                        : 'Blog cluster data'
                  }
                  {Array.isArray(cluster.blogIdeas) && cluster.blogIdeas.length > 3 && '...'}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ActionPlan({ data }: { data: any }) {
  // Filter out weak/generic single-word keywords from action items
  const weakKeywords = new Set(['started', 'daily', 'alerts', 'outlier', 'research', 'content', 'data', 'credits', 'what', 'manage', 'tool', 'seo', 'competitor', 'keyword', 'general', 'account']);
  const weakActionPhrases = [
    'review technical seo audit',
    'review ai search visibility baseline',
    'target competitor keyword:',
    'target keyword missing',
    'review ai search visibility',
  ];
  const isStrongKeyword = (kw: string) => {
    if (!kw) return false;
    const lower = kw.toLowerCase().trim();
    if (weakKeywords.has(lower)) return false;
    if (lower.split(' ').length <= 1) return false;
    if (weakActionPhrases.some(phrase => lower.includes(phrase))) return false;
    return true;
  };
  // Build plan from multiple fallback sources when executiveDashboard is missing
  const plan = data.actionPlan || 
               data.executiveDashboard?.executiveActionPlan || 
               data.executiveStory?.actionPlan ||
               data.executiveDashboard?.metadata?.executiveStory?.actionPlan ||
               // Build a basic plan from other data sources if no formal plan exists
               (data.technicalAudit?.recommendations || data.contentGaps?.contentGaps || data.blogIntelligence?.blogIdeas ? {
                 immediate: (data.technicalAudit?.recommendations || []).slice(0, 3).map((r: any) => ({ 
                   title: r.recommendation || r.title || r.issue || String(r), 
                   priority: 'High', 
                   reason: r.impact || r.area || 'Technical improvement' 
                 })),
                 day7: (data.contentGaps?.contentGaps || data.contentGaps || []).slice(0, 3).map((g: any) => ({ 
                   title: g.title || g.topic || String(g), 
                   priority: g.severity || g.priority || 'Medium', 
                   reason: g.reason || g.description || g.opportunity || 'Content gap to address' 
                 })),
                 day30: (data.keywordIntelligence?.contentOpportunities || []).filter((o: any) => isStrongKeyword(o.title || o.keyword || '')).slice(0, 3).map((o: any) => ({ 
                   title: o.title || o.keyword || String(o), 
                   priority: 'Medium', 
                   reason: o.reason || 'Keyword opportunity' 
                 })),
                 day60: [],
                 day90: []
               } : {}) ||
               {};

  // Filter weak action items from all buckets
  const filterWeakActions = (items: any[]) => (items || []).filter((item: any) => {
    const title = (item.title || item.action || item.task || item.step || item.name || '').toLowerCase().trim();
    if (!title || title.split(' ').length <= 1) return false;
    if (weakKeywords.has(title)) return false;
    if (weakActionPhrases.some(phrase => title.includes(phrase))) return false;
    return true;
  });
  ['immediate', 'day7', 'day30', 'day60', 'day90'].forEach(bucket => {
    if (plan[bucket]) plan[bucket] = filterWeakActions(plan[bucket]);
  });

  if (import.meta.env.DEV) { console.log('[SEO Page] actionPlan buckets', Object.keys(plan || {})); }
  const totalActionPlanItems =
    (plan.immediate?.length || 0) +
    (plan.day7?.length || 0) +
    (plan.day30?.length || 0) +
    (plan.day60?.length || 0) +
    (plan.day90?.length || 0);
  if (import.meta.env.DEV) { console.log('[SEO Page] actionPlan count', totalActionPlanItems); }

  // Check if plan has any items in any bucket
  const hasPlan = totalActionPlanItems > 0;

  if (!hasPlan) {
    return <EmptyState title="Action Plan Not Available" />;
  }
  
  // Normalize to phases using canonical structure
  const phases = [
    { label: 'Immediate', items: asArray(plan.immediate) },
    { label: 'Day 7', items: asArray(plan.day7) },
    { label: 'Day 30', items: asArray(plan.day30) },
    { label: 'Day 60', items: asArray(plan.day60) },
    { label: 'Day 90', items: asArray(plan.day90) }
  ];
  
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}><CheckCircle size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} /> SEO & GEO Execution Sprints</h3>
        <button className="primary-btn" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} /> Send to Growth Workspace
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '10px' }}>
        {phases.map((phaseData, idx) => {
          const { label, items } = phaseData;
          if (items.length === 0) return null;
          
          return (
            <Card key={label} style={{ background: '#0b1220', border: '1px solid #1d2738', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #293245' }}>
                <h4 style={{ color: '#a855f7', margin: 0, fontSize: '16px' }}>Sprint: {label}</h4>
                <Badge className="dark">{items.length} tasks</Badge>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {items.map((item: any, i: number) => (
                  <div key={i} style={{ background: '#151d2b', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #53a7ff', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <b style={{ fontSize: '14px', lineHeight: '1.4' }}>{asText(item.title || item.action || item.task || item.step)}</b>
                      <Badge className={(asText(item.priority || 'High') || '').toLowerCase().includes('high') ? 'pink' : 'blue'}>
                        {asText(item.priority || 'High')}
                      </Badge>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#9aa7bd', lineHeight: '1.5' }}>
                      {asText(item.reason || item.description || item.impact || item.detail)}
                    </p>
                    {item.assignedTo && (
                      <div style={{ marginTop: '10px', fontSize: '11px', color: '#53a7ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={12} /> Asssigned to: {asText(item.assignedTo)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


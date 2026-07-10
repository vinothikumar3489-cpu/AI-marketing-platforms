import { useEffect, useState, useMemo, useCallback } from 'react';
import { api, downloadReport } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asNumber, asText, asInsight, renderSafeValue } from '../lib/normalizers';
import { Badge, Card, EmptyState, Loading, PageHeader, ScoreCard, SectionTitle, InsightCard, PersonaCard, CompetitorCard, EvidenceBadge, DataQualityPanel, ReportPreview } from '../components/UI';
import { TechnologyCard } from '../components/IntelligenceCards';
import { KPIDashboard, EnterpriseCompetitorCard, EnterpriseAudienceCard, EnterpriseInsightCard, Timeline, SmartNavigation, SearchBar, LoadingSkeleton, EnterpriseEmptyState, ProgressBar, StatusBadge, ConfidenceBadge, PriorityChip, ScoreSection, MiniRadarLegend, StorySection, ExpandableSection } from '../components/EnterpriseComponents';
import { ExecutiveSummaryCards, BusinessHealthScore, AIDecisionPanel, RecommendationPriorities, CrossModuleInsights, ExplainButton, CompareResults, OpportunityMatrix, RiskMatrix, ConfidenceVisualization, InteractiveFilters, SmartSearch, EnterpriseReportPreview, ProductivityBar, ExecutiveCommandCenter, StoryDrivenResults, AIBusinessAdvisor, DecisionSimulator, CompetitorPositioningMap, MarketOpportunityHeatmap, BusinessTimeline, ExecutiveKPIDashboard, InsightRelationships, EvidenceExplorer, ReportPreview20, PresentationMode, useWorkspaceMemory, SmartEmptyState } from '../components/EnterpriseDecisionSuite';
import { EnterpriseActionWorkspace } from '../components/EnterpriseActionWorkspace';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { Shield, Target, Users, TrendingUp, Zap, Map, Info, Box, Briefcase, Activity, CheckCircle, Flame, Droplets, Snowflake, DollarSign, Clock, AlertTriangle, Building, Star, Code, PieChart, ExternalLink, ChevronDown, ChevronUp, FileText, Search, Eye, Layers, Sliders, GripHorizontal } from 'lucide-react';

const defaults: any = {
  websiteUrl: '',
  brandName: '',
  companyName: '',
  description: '',
  industry: '',
  businessType: '',
  targetCountries: [],
  ageGroups: [],
  audienceTypes: [],
  campaignGoals: [],
  customGoal: '',
  budget: '',
  currency: 'USD',
  preferredChannels: [],
  competitors: '',
  additionalNotes: '',
};

const tabs = ['Executive Snapshot', 'Executive Story', 'Product DNA', 'Market Intelligence', 'Audience Intelligence', 'Competitor Intelligence', 'Intent Prediction', 'Positioning Strategy', 'Campaign Strategy', 'Channel Strategy', 'Action Plan', 'Report Preview'];

export default function GrowthWorkspacePage() {
  const { selectedChatId, createChat, loadFullResults, fullResults } = useProject();
  const [form, setForm] = useState(defaults);
  const [activeTab, setActiveTab] = useWorkspaceMemory('gw-activeTab', 'Executive Snapshot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>({});
  const [creatingChat, setCreatingChat] = useState(false);
  type Status = 'idle' | 'input_required' | 'running' | 'completed' | 'failed';
  const [status, setStatus] = useState<Status>('idle');

  function hasRealContent(obj: any): boolean {
    return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
  }

  useEffect(() => {
    let cancelled = false;
    const r = fullResults.growth || {};
    const hasGrowthData = fullResults.hasGrowthWorkspace === true ||
      hasRealContent(r.product) || hasRealContent(r.market) || hasRealContent(r.audience) ||
      hasRealContent(r.competitor) || hasRealContent(r.intent) || hasRealContent(r.positioning) ||
  hasRealContent(r.campaign) || hasRealContent(r.channel) || hasRealContent(r.executiveStory) ||
  hasRealContent(r.actionPlan) || hasRealContent(r.evidence);

    if (!cancelled) {
      if (hasGrowthData) {
        setResults(r);
        setStatus('completed');
      } else {
        setResults({});
        if (selectedChatId) {
          setStatus('input_required');
        } else {
          setStatus('idle');
        }
        setStep(1);
      }
    }
    return () => { cancelled = true; };
  }, [fullResults, selectedChatId]);

  async function run() {
    if (!form.websiteUrl) {
      setError('Website URL is required.');
      return;
    }
    setError(''); 
    setLoading(true);
    setStatus('running');
    try {
      let chatId = selectedChatId;
      if (!chatId) {
        setCreatingChat(true);
        chatId = await createChat('New Growth Analysis');
        setCreatingChat(false);
      }
      
      const res: any = await api.post(`/chats/${chatId}/growth-workspace/run-full-analysis`, form);
      
      await loadFullResults(chatId);
      
      setStatus('completed');
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleNewAnalysis() {
    if (creatingChat) return;
    setCreatingChat(true);
    setForm(defaults);
    setResults({});
    setError('');
    setStatus('input_required');
    setStep(1);
    try {
      await createChat('New Growth Analysis');
    } catch {
    } finally {
      setCreatingChat(false);
    }
  }

  function hasContent(obj: any): boolean {
    return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
  }

  const hasData = 
    hasContent(results.product) || hasContent(results.market) || hasContent(results.audience) ||
    hasContent(results.competitor) || hasContent(results.intent) || hasContent(results.positioning) ||
    hasContent(results.campaign) || hasContent(results.channel) || hasContent(results.executiveStory) ||
    hasContent(results.actionPlan) || hasContent(results.evidence);

  const [step, setStep] = useState(1);

  const toggleArray = (field: string, val: string) => {
    setForm((prev: any) => {
      const arr = prev[field] || [];
      if (arr.includes(val)) return { ...prev, [field]: arr.filter((x: string) => x !== val) };
      return { ...prev, [field]: [...arr, val] };
    });
  };

  const renderChips = (field: string, options: string[], multi = true) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
      {options.map(o => {
        const active = multi ? form[field]?.includes(o) : form[field] === o;
        return (
          <button 
            key={o} 
            onClick={() => multi ? toggleArray(field, o) : setForm({...form, [field]: o})}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
              border: active ? '1px solid #53a7ff' : '1px solid #293245',
              background: active ? 'rgba(83,167,255,0.1)' : 'transparent',
              color: active ? '#53a7ff' : '#9aa7bd'
            }}
          >
            {o}
          </button>
        )
      })}
    </div>
  );

  return (
    <div>
      <Card style={{ marginBottom: '20px' }}>
        <EnterpriseActionWorkspace />
      </Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
        <PageHeader eyebrow="All-in-one Analysis Command Center" title="Growth Workspace" subtitle="Generate a multi-stage, validated business intelligence report." />
        {(status === 'completed' || status === 'failed') && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="dropdown" style={{ position: 'relative' }}>
              <button className="secondary-btn" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} /> Download Report ▾
              </button>
              <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', background: '#101622', border: '1px solid #293245', borderRadius: '8px', padding: '4px', zIndex: 100, display: 'none', minWidth: '160px' }}>
                {['pdf', 'docx', 'pptx', 'json', 'csv', 'markdown'].map(f => (
                  <button key={f} onClick={() => { const id = selectedChatId || fullResults?.chat?.id; if (id) downloadReport(id, 'growth', f); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: '#9aa7bd', cursor: 'pointer', fontSize: '13px', borderRadius: '4px' }} onMouseEnter={e => (e.target as HTMLElement).style.background = '#1a2335'} onMouseLeave={e => (e.target as HTMLElement).style.background = 'none'}>{f.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <button onClick={handleNewAnalysis} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} /> New Growth Analysis
            </button>
          </div>
        )}
        <style>{`.dropdown:hover .dropdown-menu { display: block !important; }`}</style>
      </div>
      
      {error && (
        <Card style={{ background: 'rgba(255, 71, 87, 0.1)', borderColor: '#ff4757', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: '#ff4757' }}>Analysis Failed</h4>
              <p style={{ margin: 0, color: '#ff8a8a' }}>{error}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={run} className="secondary-btn" disabled={loading}>Retry</button>
              <button onClick={handleNewAnalysis} className="ghost-btn">New Analysis</button>
            </div>
          </div>
        </Card>
      )}
      
      {(status === 'input_required' || status === 'idle') && !loading && !creatingChat && (
        <Card style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #293245', paddingBottom: '15px' }}>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '20px' }}>Project Configuration (Step {step} of 7)</h2>
            <div style={{ color: '#53a7ff', fontWeight: 'bold' }}>{Math.round((step/7)*100)}%</div>
          </div>

          {step === 1 && (
            <div>
              <SectionTitle title="Website / Product URL" subtitle="The core domain we will analyze." />
              <label>Website URL (Required)
                <input value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://yourbrand.com" />
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <SectionTitle title="Brand Basics" subtitle="Optional. We will auto-detect if left blank." />
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <label>Brand/Product Name <input value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })} placeholder="e.g. Acme SaaS" /></label>
                <label>Company Name <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="e.g. Acme Corp" /></label>
              </div>
              <label style={{ marginTop: '15px' }}>Short Description
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the product..." rows={2}></textarea>
              </label>
              <label style={{ marginTop: '15px' }}>Industry / Category
                {renderChips('industry', ['SaaS', 'Ecommerce', 'Education', 'Healthcare', 'Finance', 'Food', 'Real Estate', 'Creator Brand', 'Local Business', 'Other'], false)}
              </label>
              <label style={{ marginTop: '15px' }}>Business Type
                {renderChips('businessType', ['B2B', 'B2C', 'B2B2C', 'D2C', 'Marketplace', 'Agency'], false)}
              </label>
            </div>
          )}

          {step === 3 && (
            <div>
              <SectionTitle title="Target Audience" subtitle="Who are we trying to reach?" />
              <label>Target Countries {renderChips('targetCountries', ['India', 'USA', 'UK', 'Canada', 'UAE', 'Global'])}</label>
              <label style={{ marginTop: '15px' }}>Age Groups {renderChips('ageGroups', ['18-24', '25-34', '35-44', '45+'])}</label>
              <label style={{ marginTop: '15px' }}>Audience Types {renderChips('audienceTypes', ['Students', 'Job Seekers', 'Founders', 'Marketers', 'SMBs', 'Enterprises', 'Parents', 'Creators', 'Developers'])}</label>
            </div>
          )}

          {step === 4 && (
            <div>
              <SectionTitle title="Campaign Goal" subtitle="What is the primary objective?" />
              <label>Goals {renderChips('campaignGoals', ['Get more leads', 'Increase sales', 'Improve SEO', 'Build brand awareness', 'Launch new product', 'Beat competitors', 'Improve conversions', 'Get app downloads'])}</label>
              <label style={{ marginTop: '15px' }}>Custom Goal (Optional)
                <input value={form.customGoal} onChange={e => setForm({ ...form, customGoal: e.target.value })} placeholder="Specific KPI or objective..." />
              </label>
            </div>
          )}

          {step === 5 && (
            <div>
              <SectionTitle title="Budget & Channels" subtitle="Resource allocation and preferred mediums." />
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} style={{ width: '100px' }}>
                  <option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="INR">INR (₹)</option>
                </select>
                <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="Monthly Budget (e.g. 5000)" style={{ flex: 1 }} />
              </div>
              <label style={{ marginTop: '15px' }}>Preferred Channels {renderChips('preferredChannels', ['SEO', 'Google Ads', 'LinkedIn', 'Instagram', 'YouTube', 'Email', 'Influencer Marketing', 'Content Marketing', 'Affiliate Marketing'])}</label>
            </div>
          )}

          {step === 6 && (
            <div>
              <SectionTitle title="Competitors" subtitle="Optional. Separate multiple by commas." />
              <label>Competitor URLs or Names
                <textarea value={form.competitors} onChange={e => setForm({ ...form, competitors: e.target.value })} placeholder="https://competitor.com, OtherBrand" rows={3}></textarea>
              </label>
              <p style={{ color: '#9aa7bd', fontSize: '13px', marginTop: '10px' }}>Leave blank to auto-detect top competitors via AI.</p>
              
              <label style={{ marginTop: '15px' }}>Additional Notes
                <textarea value={form.additionalNotes} onChange={e => setForm({ ...form, additionalNotes: e.target.value })} placeholder="Any specific instructions or context for the AI..." rows={3}></textarea>
              </label>
            </div>
          )}

          {step === 7 && (
            <div>
              <SectionTitle title="Final Confirmation" subtitle="Review your configuration before launching the intelligence pipeline." />
              <div style={{ background: '#151d2b', padding: '15px', borderRadius: '8px', display: 'grid', gap: '10px', fontSize: '14px', color: '#9aa7bd' }}>
                <div><strong style={{ color: '#fff' }}>Website:</strong> {form.websiteUrl}</div>
                <div><strong style={{ color: '#fff' }}>Brand/Company:</strong> {form.brandName || form.companyName || 'Auto-detect'}</div>
                <div><strong style={{ color: '#fff' }}>Industry:</strong> {form.industry || 'Auto-detect'}</div>
                <div><strong style={{ color: '#fff' }}>Audience:</strong> {form.audienceTypes.join(', ') || 'Auto-detect'}</div>
                <div><strong style={{ color: '#fff' }}>Goals:</strong> {form.campaignGoals.join(', ')} {form.customGoal}</div>
                <div><strong style={{ color: '#fff' }}>Budget:</strong> {form.budget ? `${form.currency} ${form.budget}` : 'Auto-detect'}</div>
                <div><strong style={{ color: '#fff' }}>Channels:</strong> {form.preferredChannels.join(', ') || 'Auto-detect'}</div>
                <div><strong style={{ color: '#fff' }}>Competitors:</strong> {form.competitors || 'Auto-detect'}</div>
                <div><strong style={{ color: '#fff' }}>Notes:</strong> {form.additionalNotes || 'None'}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #293245' }}>
            <button className="ghost-btn" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Back</button>
            {step < 7 ? (
              <button className="primary-btn" onClick={() => setStep(step + 1)}>Next Step</button>
            ) : (
              <button onClick={run} className="primary-btn" disabled={loading} style={{ background: '#10e18b', color: '#000' }}>Run Business Intelligence Pipeline</button>
            )}
          </div>
        </Card>
      )}
      
      {status === 'running' && (
        <div style={{ display: 'grid', gap: '20px' }}>
          <LoadingSkeleton type="table" count={3} />
          <LoadingSkeleton type="card" count={3} />
          <LoadingSkeleton type="list" count={4} />
        </div>
      )}
      
      {status === 'completed' && hasData && (
        <Card>
          <SmartNavigation items={tabs.map(t => ({ id: t, label: t }))} activeId={activeTab} onNavigate={setActiveTab} />
          <div style={{ marginBottom: '16px' }}>
            <SearchBar onSearch={() => {}} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {tabs.map(t => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t)} 
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: activeTab === t ? '1px solid #2aa3ff' : '1px solid #293245',
                  background: activeTab === t ? 'rgba(42, 163, 255, 0.1)' : '#101622',
                  color: activeTab === t ? '#2aa3ff' : '#9aa7bd',
                  cursor: 'pointer',
                  fontWeight: activeTab === t ? 600 : 400,
                  transition: 'all 0.2s ease',
                  fontSize: '13px'
                }}
              >
                {t}
              </button>
            ))}
          </div>
          
          <div className="tab-content" style={{ marginTop: '20px' }}>
            {activeTab === 'Executive Snapshot' && <ExecutiveSnapshot results={results} />}
            {activeTab === 'Executive Story' && <ExecutiveStory data={results.executiveStory} />}
            {activeTab === 'Product DNA' && <ProductDNA data={results.product} />}
            {activeTab === 'Market Intelligence' && <MarketIntelligence data={results.market} />}
            {activeTab === 'Audience Intelligence' && <AudienceIntelligence data={results.audience} />}
            {activeTab === 'Competitor Intelligence' && <CompetitorIntelligence data={results.competitor} />}
            {activeTab === 'Intent Prediction' && <IntentPrediction data={results.intent} />}
            {activeTab === 'Positioning Strategy' && <PositioningStrategy data={results.positioning} />}
            {activeTab === 'Campaign Strategy' && <CampaignStrategy data={results.campaign} />}
            {activeTab === 'Channel Strategy' && <ChannelStrategy data={results.channel} />}
            {activeTab === 'Action Plan' && <ActionPlan data={results.actionPlan} />}
            {activeTab === 'Report Preview' && <ReportView data={results} chatId={selectedChatId || fullResults?.chat?.id} />}
          </div>
        </Card>
      )}

      {status === 'completed' && !hasData && (
        <Card>
          <EmptyState 
            title="No Verified Growth Data Available" 
            text="The analysis completed but did not produce verified data. This can happen when the AI could not extract sufficient information from the provided inputs. Try again with more detailed information."
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'center' }}>
            <button onClick={handleNewAnalysis} className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} /> New Growth Analysis
            </button>
          </div>
        </Card>
      )}

    </div>
  );
}

// ================================================================
// TAB COMPONENTS
// ================================================================

// ------------ Executive Snapshot (Phase 6C Enhanced) ------------
function ExecutiveSnapshot({ results }: { results: any }) {
  const [showDecisionPanel, setShowDecisionPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModules, setSearchModules] = useState<string[]>(['Growth', 'SEO', 'Automation', 'Reports', 'Competitors', 'Audience']);

  const sum = results.summary || results.growthSummary || null;
  const execStory = results.executiveStory || null;
  const swot = execStory?.swot || null;
  const keyFindings = execStory?.keyFindings || null;
  const topPriorities = execStory?.topPriorities || null;
  const execRecommendation = execStory?.executiveRecommendation || null;
  
  const hasScores = sum && (
    sum.overallGrowthScore != null ||
    sum.marketOpportunityScore != null ||
    sum.campaignViabilityScore != null
  );
  
  const radarData = hasScores ? [
    { subject: 'Product Fit', A: asNumber(sum.productFitScore || results.product?.confidenceScore), fullMark: 100 },
    { subject: 'Market Size', A: asNumber(sum.marketSizeScore || results.market?.confidenceScore), fullMark: 100 },
    { subject: 'Audience Clarity', A: asNumber(sum.audienceClarityScore || results.audience?.confidenceScore), fullMark: 100 },
    { subject: 'Competitive Defense', A: asNumber(sum.competitiveDefensibilityScore || results.competitor?.confidenceScore), fullMark: 100 },
    { subject: 'Campaign Readiness', A: asNumber(sum.campaignReadinessScore || results.campaign?.confidenceScore), fullMark: 100 },
  ].filter(d => d.A !== null) : [];

  // Phase 6C: Build executive summary data from existing results
  const execSummaryData = useMemo(() => {
    const findings = (keyFindings || []).slice(0, 5).map((f: any, i: number) => ({
      text: f.finding || f.value || f.description || f || '',
      confidence: f.confidence ?? null,
      impact: f.impact || 'Medium'
    }));

    const risks = (swot?.weaknesses || swot?.threats || []).slice(0, 5).map((r: any) => ({
      text: r.value || r.finding || r || '',
      severity: 'warning',
      probability: typeof r.confidence === 'number' ? r.confidence : null
    }));

    const opportunities = (swot?.opportunities || []).slice(0, 5).map((o: any) => ({
      text: o.value || o.finding || o || '',
      roi: null,
      effort: 'Medium'
    }));

    const gs = sum?.overallGrowthScore != null ? asNumber(sum?.overallGrowthScore) : null;
    const ms = sum?.marketOpportunityScore != null ? asNumber(sum?.marketOpportunityScore) : null;
    const cs = sum?.campaignViabilityScore != null ? asNumber(sum?.campaignViabilityScore) : null;
    const validScores = [gs, ms, cs].filter(s => s != null);
    const overall = {
      score: validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null,
      label: '',
      color: '#53a7ff'
    };
    overall.label = overall.score >= 80 ? 'Excellent' : overall.score >= 60 ? 'Good' : overall.score >= 40 ? 'Needs Improvement' : 'Critical';
    overall.color = overall.score >= 80 ? '#10e18b' : overall.score >= 60 ? '#53a7ff' : overall.score >= 40 ? '#ffb347' : '#ff4757';

    return {
      keyFindings: findings.length > 0 ? findings : undefined,
      biggestRisks: risks.length > 0 ? risks : undefined,
      biggestOpportunities: opportunities.length > 0 ? opportunities : undefined,
      overallHealth: overall,
      executiveRecommendation: execRecommendation ? {
        text: execRecommendation.recommendation || '',
        reasoning: execRecommendation.basedOn || execRecommendation.nextSteps?.join('. ') || '',
        confidence: typeof execRecommendation.confidenceLevel === 'number' ? execRecommendation.confidenceLevel : 85
      } : undefined
    };
  }, [keyFindings, swot, sum, execRecommendation]);

  // Phase 6C: Build health score data
  const healthScoreData = useMemo(() => ({
    overall: sum?.overallGrowthScore != null ? asNumber(sum?.overallGrowthScore) : null,
    components: [
      { label: 'Growth', value: sum?.overallGrowthScore != null ? asNumber(sum?.overallGrowthScore) : null, color: '#10e18b' },
      { label: 'Market Opportunity', value: sum?.marketOpportunityScore != null ? asNumber(sum?.marketOpportunityScore) : null, color: '#53a7ff' },
      { label: 'Audience Clarity', value: sum?.audienceClarityScore != null ? asNumber(sum?.audienceClarityScore) : null, color: '#a855f7' },
      { label: 'Competitive Defense', value: sum?.competitiveDefensibilityScore != null ? asNumber(sum?.competitiveDefensibilityScore) : null, color: '#ff6b35' },
      { label: 'Campaign Readiness', value: sum?.campaignReadinessScore != null ? asNumber(sum?.campaignReadinessScore) : null, color: '#ffb347' },
      { label: 'Data Confidence', value: sum?.dataConfidenceScore != null ? asNumber(sum?.dataConfidenceScore) : null, color: '#818cf8' },
    ]
  }), [sum]);

  // Phase 6C: Build decision items
  const decisions = useMemo(() => {
    const items: any[] = [];
    const growth = sum?.overallGrowthScore != null ? asNumber(sum?.overallGrowthScore) : null;
    const market = sum?.marketOpportunityScore != null ? asNumber(sum?.marketOpportunityScore) : null;
    const competition = sum?.competitiveDefensibilityScore != null ? asNumber(sum?.competitiveDefensibilityScore) : null;
    const campaignReadiness = sum?.campaignReadinessScore != null ? asNumber(sum?.campaignReadinessScore) : null;
    if (growth != null) {
      if (growth >= 70) items.push({ label: 'Should Invest?', question: 'Should the company invest more?', answer: 'Yes' as const, reasoning: `Growth score of ${growth}% indicates strong potential for additional investment.`, confidence: growth });
      else if (growth >= 50) items.push({ label: 'Should Invest?', question: 'Should the company invest more?', answer: 'Likely' as const, reasoning: `Growth score of ${growth}% suggests cautious investment.`, confidence: growth });
      else items.push({ label: 'Should Invest?', question: 'Should the company invest more?', answer: 'Unlikely' as const, reasoning: `Growth score of ${growth}% is below threshold. Focus on fundamentals first.`, confidence: growth });
    }
    if (market != null) {
      if (market >= 60) items.push({ label: 'Should Scale?', question: 'Should operations be scaled?', answer: 'Likely' as const, reasoning: `Market opportunity score of ${market}% supports scaling efforts.`, confidence: market });
      else items.push({ label: 'Should Scale?', question: 'Should operations be scaled?', answer: 'Unlikely' as const, reasoning: `Market opportunity score of ${market}% is below scaling threshold.`, confidence: market });
    }
    if (competition != null) {
      if (competition < 50) items.push({ label: 'Should Pivot?', question: 'Should the strategy pivot?', answer: 'Likely' as const, reasoning: `Competitive defensibility of ${competition}% suggests considering a pivot.`, confidence: competition });
      else items.push({ label: 'Should Pivot?', question: 'Should the strategy pivot?', answer: 'No' as const, reasoning: `Competitive defensibility of ${competition}% is adequate.`, confidence: competition });
    }
    items.push({ label: 'Should Improve SEO?', question: 'Should SEO be prioritized?', answer: 'Yes' as const, reasoning: 'SEO is a high-ROI channel with compounding returns over time.', confidence: 85 });
    if (campaignReadiness != null) items.push({ label: 'Should Launch Campaign?', question: 'Should a campaign be launched?', answer: 'Yes' as const, reasoning: `Campaign readiness of ${campaignReadiness}% supports launching immediately.`, confidence: campaignReadiness });
    return items;
  }, [sum]);

  // Phase 6C: Cross-module insights
  const crossModuleItems = useMemo(() => {
    const items: any[] = [];
    const audience = results.audience || {};
    const competitor = results.competitor || {};
    const campaign = results.campaign || {};
    if (audience.painPoints?.length && !campaign.creativeAngles?.length) {
      items.push({ title: 'Audience Insights Not Used in Campaign', description: 'Audience pain points identified but not reflected in campaign creative angles.', sourceModule: 'Audience', targetModule: 'Automation', impact: 'medium' as const, type: 'Missing Connection' });
    }
    if (competitor.weaknesses?.length && !campaign.copyHooks?.length) {
      items.push({ title: 'Competitor Weaknesses Not Leveraged', description: 'Competitor weaknesses identified but no ad copy leveraging them.', sourceModule: 'Competitors', targetModule: 'Automation', impact: 'high' as const, type: 'Opportunity' });
    }
    return items.length > 0 ? items : undefined;
  }, [results]);

  // Phase 6C: Recommendations
  const recommendations = useMemo(() => {
    if (!topPriorities) return [];
    return topPriorities.slice(0, 10).map((p: any, i: number) => ({
      title: p.action || p.title || `Priority ${i+1}`,
      description: p.rationale || p.reason || '',
      group: i < 2 ? 'Critical' as const : i < 4 ? 'High ROI' as const : i < 6 ? 'Quick Wins' as const : 'Long-Term' as const,
      priority: i < 2 ? 'Critical' as const : i < 4 ? 'High' as const : i < 6 ? 'Medium' as const : 'Low' as const,
      difficulty: Math.round(30 + Math.random() * 40),
      roi: p.roi || '150%',
      timeline: p.timeline || '30 days',
      owner: p.owner || 'Marketing Team',
      confidence: p.confidence ?? null
    }));
  }, [topPriorities]);

  // Phase 6C: Risk matrix items
  const riskItems = useMemo(() => {
    const items: any[] = [];
    (swot?.weaknesses || []).slice(0, 3).forEach((w: any) => {
      items.push({ title: w.value || w.finding || w || '', category: 'Business' as const, probability: w.confidence ?? null, impact: 'high' as const, mitigation: 'Address through strategic planning and resource allocation.', owner: 'Executive Team' });
    });
    (swot?.threats || []).slice(0, 3).forEach((t: any) => {
      items.push({ title: t.value || t.finding || t || '', category: 'Competition' as const, probability: t.confidence ?? null, impact: 'medium' as const, mitigation: 'Monitor and develop counter-strategies.', owner: 'Competitive Intelligence' });
    });
    return items;
  }, [swot]);

  // Phase 6C: Confidence data
  const confidenceData = useMemo(() => [
    sum?.overallGrowthScore != null ? { section: 'Growth Analysis', confidence: asNumber(sum?.overallGrowthScore), evidenceStrength: null, sourceCount: results.evidence?.sources?.length || 0, dataFreshness: 'Today' } : null,
    sum?.marketOpportunityScore != null ? { section: 'Market Intelligence', confidence: asNumber(sum?.marketOpportunityScore), evidenceStrength: null, sourceCount: results.market?.sources?.length || 0, dataFreshness: 'Today' } : null,
    sum?.audienceClarityScore != null ? { section: 'Audience Intelligence', confidence: asNumber(sum?.audienceClarityScore), evidenceStrength: null, sourceCount: results.audience?.sources?.length || 0, dataFreshness: 'Today' } : null,
    sum?.competitiveDefensibilityScore != null ? { section: 'Competitor Intelligence', confidence: asNumber(sum?.competitiveDefensibilityScore), evidenceStrength: null, sourceCount: results.competitor?.sources?.length || 0, dataFreshness: 'Today' } : null,
  ].filter(Boolean), [sum, results]);

  const filterOptions = [
    { key: 'confidence', label: 'Confidence', values: ['High (70%+)', 'Medium (40-70%)', 'Low (<40%)'] },
    { key: 'impact', label: 'Impact', values: ['High', 'Medium', 'Low'] },
    { key: 'timeline', label: 'Timeline', values: ['Immediate', '30 Days', '60 Days', '90 Days'] },
    { key: 'department', label: 'Department', values: ['Marketing', 'Sales', 'Product', 'Executive'] },
  ];

  const handleFilterChange = (key: string, values: string[]) => {
    setActiveFilters(prev => ({ ...prev, [key]: values }));
  };

  const handleSearch = (query: string, modules: string[]) => {
    setSearchQuery(query);
    setSearchModules(modules);
  };

  const productivityItems = [
    { label: 'Executive Summary', content: execSummaryData.executiveRecommendation?.text || '' },
    { label: 'Key Findings', content: (execSummaryData.keyFindings || []).map(f => f.text).join('\n') },
    { label: 'Top Recommendations', content: recommendations.map(r => r.title).join('\n') },
  ];

  if (!hasScores) {
    return (
      <div>
        <EnterpriseEmptyState 
          title="Executive Snapshot Not Available"
          message="Run Growth Workspace analysis to generate executive snapshot scores and recommendations."
          icon={Layers}
        />
      </div>
    );
  }

  const kpiItems = [
    sum.overallGrowthScore != null ? { label: 'Growth Index', value: `${asNumber(sum.overallGrowthScore)}%`, icon: TrendingUp, color: '#10e18b' } : null,
    sum.marketOpportunityScore != null ? { label: 'Market Opportunity', value: `${asNumber(sum.marketOpportunityScore)}%`, icon: Target, color: '#53a7ff' } : null,
    sum.campaignViabilityScore != null ? { label: 'Campaign Viability', value: `${asNumber(sum.campaignViabilityScore)}%`, icon: Zap, color: '#ffb347' } : null,
    sum.dataConfidenceScore != null ? { label: 'Data Confidence', value: `${asNumber(sum.dataConfidenceScore)}%`, icon: Shield, color: '#a855f7' } : null,
  ].filter(Boolean);

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Phase 6C: Smart Search */}
      <SmartSearch modules={['Growth', 'SEO', 'Automation', 'Reports', 'Competitors', 'Audience']} onSearch={handleSearch} />

      {/* Phase 6C: Interactive Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={() => setShowFilters(!showFilters)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245', background: showFilters ? 'rgba(129,140,248,0.1)' : '#0f1729', cursor: 'pointer', fontSize: '11px', color: showFilters ? '#818cf8' : '#9aa7bd', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sliders size={12} /> Filters {Object.values(activeFilters).some(v => v.length > 0) ? 'Active' : ''}
        </button>
        <button onClick={() => setShowDecisionPanel(true)}
          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #818cf8', background: 'rgba(129,140,248,0.1)', cursor: 'pointer', fontSize: '11px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <GripHorizontal size={12} /> AI Decisions
        </button>
      </div>
      {showFilters && <InteractiveFilters options={filterOptions} activeFilters={activeFilters} onFilterChange={handleFilterChange} />}

      {/* Phase 6C: Executive Summary AI Cards */}
      <ExecutiveSummaryCards data={execSummaryData} />

      {/* Evidence Data Quality */}
      {results.evidence?.sourceSummary && (
        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={18} style={{ color: '#10e18b' }} /> Evidence-Backed Data</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '10px' }}>
            <div style={{ padding: '10px', background: '#151d2b', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Data Completeness</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: results.evidence.sourceSummary.completenessScore >= 70 ? '#10e18b' : results.evidence.sourceSummary.completenessScore >= 40 ? '#ffb347' : '#ff4757' }}>
                {results.evidence.sourceSummary.completenessScore != null ? `${results.evidence.sourceSummary.completenessScore}%` : 'N/A'}
              </div>
            </div>
            <div style={{ padding: '10px', background: '#151d2b', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Evidence Sources</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#53a7ff' }}>
                {results.evidence.sourceSummary.sourcesCollected != null ? `${results.evidence.sourceSummary.sourcesCollected}/${results.evidence.sourceSummary.totalSources || '?'}` : 'N/A'}
              </div>
            </div>
            <div style={{ padding: '10px', background: '#151d2b', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Growth Signals</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#a855f7' }}>
                {results.evidence.growthSignals?.length || 0}
              </div>
            </div>
            <div style={{ padding: '10px', background: '#151d2b', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>Features Extracted</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffb347' }}>
                {results.evidence.productIntelligence?.features?.length || 0}
              </div>
            </div>
          </div>
          {results.evidence.growthSignals?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h4 style={{ fontSize: '13px', color: '#a855f7', marginBottom: '8px' }}>Growth Signals from Evidence</h4>
              <div style={{ display: 'grid', gap: '6px' }}>
                {results.evidence.growthSignals.map((s: any, i: number) => (
                  <div key={i} style={{ padding: '8px 10px', background: '#0b1220', borderRadius: '6px', borderLeft: '3px solid #a855f7', fontSize: '12px', color: '#e5e7eb' }}>
                    <div>{s.signal}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Source: {s.source}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Phase 6C: Productivity Bar */}
      <ProductivityBar items={productivityItems} />

      {/* Phase 6C: Business Health Score + Existing KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <BusinessHealthScore data={healthScoreData} />
        <div>
          <KPIDashboard items={kpiItems} columns={2} />
        </div>
      </div>

      {/* Existing: Data Quality Panel */}
      <DataQualityPanel evidence={results.evidence} />

      {/* Existing: Radar + Insight Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card style={{ height: '350px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Map size={18} /> Business Readiness Radar</h3>
          <MiniRadarLegend items={radarData.map(d => ({ label: d.subject, value: d.A }))} />
          <ResponsiveContainer width="100%" height="70%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#293245" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9aa7bd', fontSize: 12 }} />
              <Radar name="Confidence Score" dataKey="A" stroke="#10e18b" fill="#10e18b" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          <EnterpriseInsightCard insight={{
            title: 'Top Recommendation',
            description: asText(sum.topRecommendation?.value || sum.topRecommendation || ''),
            severity: 'positive',
            confidence: sum.topRecommendation?.confidence ?? null,
            whyItMatters: 'This recommendation is based on the highest-impact opportunity identified across all intelligence modules.'
          }} />
          <EnterpriseInsightCard insight={{
            title: 'Primary Risk',
            description: asText(sum.primaryRisk?.value || sum.primaryRisk || ''),
            severity: 'critical',
            confidence: sum.primaryRisk?.confidence ?? null,
            whyItMatters: 'Addressing this risk is critical before executing growth strategies to avoid resource waste.'
          }} />
          <EnterpriseInsightCard insight={{
            title: 'Immediate Action',
            description: asText(sum.immediateAction?.value || sum.immediateAction || ''),
            severity: 'warning',
            confidence: sum.immediateAction?.confidence ?? null,
            whyItMatters: 'This action should be prioritized in the first 7 days to establish momentum.'
          }} />
        </div>
      </div>

      {/* Phase 6C: Opportunity Matrix + Risk Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <OpportunityMatrix items={[
          { title: 'Expand to new markets', impact: 85, effort: 60 },
          { title: 'Improve conversion rate', impact: 70, effort: 30 },
          { title: 'Content marketing program', impact: 65, effort: 40 },
          { title: 'Enterprise sales team', impact: 50, effort: 80 },
          { title: 'Basic SEO fixes', impact: 40, effort: 20 },
        ]} />
        <RiskMatrix items={riskItems} />
      </div>

      {/* Phase 6C: Cross Module Insights */}
      {crossModuleItems && <CrossModuleInsights items={crossModuleItems} />}

      {/* Phase 6C: Recommendation Priorities */}
      {recommendations.length > 0 && <RecommendationPriorities items={recommendations} />}

      {/* Phase 6C: Compare Results (placeholder) */}
      <CompareResults metrics={[
        sum?.overallGrowthScore != null ? { label: 'Growth Score', current: asNumber(sum?.overallGrowthScore), previous: asNumber(sum?.previousGrowthScore || 0) } : null,
        sum?.marketOpportunityScore != null ? { label: 'Market Opportunity', current: asNumber(sum?.marketOpportunityScore), previous: asNumber(sum?.previousMarketScore || 0) } : null,
        sum?.audienceClarityScore != null ? { label: 'Audience Clarity', current: asNumber(sum?.audienceClarityScore), previous: asNumber(sum?.previousAudienceScore || 0) } : null,
      ].filter(Boolean)} />

      {/* Phase 6C: Confidence Visualization */}
      <ConfidenceVisualization items={confidenceData} />

      {/* Phase 6C: AI Decision Panel (Floating) */}
      {showDecisionPanel && (
        <AIDecisionPanel decisions={decisions} onClose={() => setShowDecisionPanel(false)} />
      )}
    </div>
  );
}

// ------------ Executive Story (PART 1) ------------
function ExecutiveStory({ data }: { data: any }) {
  const story = data || {};
  if (!story || Object.keys(story).length === 0) return <EmptyState title="No Executive Story" />;
  
  const { executiveSummary, companyOverview, businessModel, revenueModel, growthStage, productMaturity, marketPosition, swot, keyFindings, topPriorities, executiveRecommendation } = story;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Report Header */}
      <Card style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1a1040 100%)', border: '1px solid #a855f7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#a855f7', fontSize: '20px' }}>{renderSafeValue(executiveSummary?.title) || 'Enterprise Business Intelligence Report'}</h2>
            <p style={{ margin: 0, color: '#9aa7bd', fontSize: '13px' }}>{renderSafeValue(executiveSummary?.methodology)?.slice(0, 120)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge tone={executiveSummary?.confidenceLevel === 'High' ? 'green' : executiveSummary?.confidenceLevel === 'Medium' ? 'blue' : 'yellow'}>
              {executiveSummary?.confidenceLevel || 'Unknown'} Confidence
            </Badge>
            {executiveSummary?.assessmentDate && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{renderSafeValue(executiveSummary.assessmentDate)}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '15px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: '#9aa7bd' }}><strong>Sources:</strong> {renderSafeValue(executiveSummary?.evidenceSourcesUsed) || 0}</div>
          <div style={{ fontSize: '12px', color: '#9aa7bd' }}><strong>Data Gaps:</strong> {renderSafeValue(executiveSummary?.dataGaps) || 0}</div>
          <div style={{ fontSize: '12px', color: '#9aa7bd' }}><strong>Version:</strong> {renderSafeValue(executiveSummary?.version) || '2.0.0'}</div>
        </div>
      </Card>

      {/* Company Overview */}
      {companyOverview && <SectionBlock icon={Building} title="Company Overview" color="#a855f7" data={companyOverview} />}

      {/* Business Model */}
      {businessModel && <SectionBlock icon={Briefcase} title="Business Model" color="#10e18b" data={businessModel} />}

      {/* Revenue Model */}
      {revenueModel && (
        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><DollarSign size={18} style={{ color: '#ffb347' }} /> Revenue Model</h3>
          {revenueModel.evidence && <EvidenceBadge evidence={revenueModel.evidence} size="sm" />}
          <div style={{ marginTop: '12px', display: 'grid', gap: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {revenueModel.pricingTiers?.map((t: any, i: number) => (
                <span key={i} style={{ padding: '4px 10px', background: '#151d2b', borderRadius: '6px', fontSize: '13px', color: '#e5e7eb' }}>{renderSafeValue(t.name || t)}</span>
              ))}
              {revenueModel.hasFreeTier && <Badge tone="green">Free Tier</Badge>}
              {revenueModel.hasFreeTrial && <Badge tone="blue">Free Trial</Badge>}
              {revenueModel.hasEnterprise && <Badge tone="pink">Enterprise</Badge>}
              {revenueModel.hasCustomPricing && <Badge tone="yellow">Custom Pricing</Badge>}
            </div>
            <div style={{ fontSize: '13px', color: '#9aa7bd' }}>
              {revenueModel.currency && <span><strong>Currency:</strong> {renderSafeValue(revenueModel.currency)} </span>}
              {revenueModel.billingPeriods?.length > 0 && <span><strong>Billing:</strong> {revenueModel.billingPeriods.join(', ')}</span>}
            </div>
          </div>
        </Card>
      )}

      {/* Growth Stage */}
      {growthStage && <SectionBlock icon={TrendingUp} title="Growth Stage" color="#53a7ff" data={growthStage} />}

      {/* Product Maturity */}
      {productMaturity && <SectionBlock icon={Code} title="Product Maturity" color="#ff4757" data={productMaturity} />}

      {/* Market Position */}
      {marketPosition && <SectionBlock icon={Target} title="Market Position" color="#ffb347" data={marketPosition} />}

      {/* SWOT */}
      {swot && (
        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={18} style={{ color: '#a855f7' }} /> SWOT Analysis</h3>
          {swot.evidence && <EvidenceBadge evidence={swot.evidence} size="sm" />}
          <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ padding: '12px', background: 'rgba(16,225,139,0.05)', borderRadius: '8px', border: '1px solid rgba(16,225,139,0.2)' }}>
              <h4 style={{ color: '#10e18b', margin: '0 0 8px 0', fontSize: '14px' }}>Strengths</h4>
              {swot.strengths?.map((s: any, i: number) => <InsightCard key={i} insight={asInsight(s, `Strength ${i+1}`)} icon={Zap} />)}
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,71,87,0.05)', borderRadius: '8px', border: '1px solid rgba(255,71,87,0.2)' }}>
              <h4 style={{ color: '#ff4757', margin: '0 0 8px 0', fontSize: '14px' }}>Weaknesses</h4>
              {swot.weaknesses?.map((w: any, i: number) => <InsightCard key={i} insight={asInsight(w, `Weakness ${i+1}`)} icon={AlertTriangle} />)}
            </div>
            <div style={{ padding: '12px', background: 'rgba(42,163,255,0.05)', borderRadius: '8px', border: '1px solid rgba(42,163,255,0.2)' }}>
              <h4 style={{ color: '#53a7ff', margin: '0 0 8px 0', fontSize: '14px' }}>Opportunities</h4>
              {swot.opportunities?.map((o: any, i: number) => <InsightCard key={i} insight={asInsight(o, `Opportunity ${i+1}`)} icon={Target} />)}
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,179,71,0.05)', borderRadius: '8px', border: '1px solid rgba(255,179,71,0.2)' }}>
              <h4 style={{ color: '#ffb347', margin: '0 0 8px 0', fontSize: '14px' }}>Threats</h4>
              {swot.threats?.map((t: any, i: number) => <InsightCard key={i} insight={asInsight(t, `Threat ${i+1}`)} icon={Shield} />)}
            </div>
          </div>
        </Card>
      )}

      {/* Key Findings */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={18} style={{ color: '#53a7ff' }} /> Key Findings</h3>
        <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
          {keyFindings?.map((f: any, i: number) => (
            <div key={i} style={{ padding: '10px 14px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#e5e7eb', marginBottom: '4px' }}>{renderSafeValue(f.finding || f.value) || ''}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Evidence: {renderSafeValue(f.evidence) || ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                {f.confidence && <EvidenceBadge evidence={{ source: f.evidence || 'AI', confidence: f.confidence }} size="sm" />}
                {f.impact && <Badge tone={f.impact === 'High' ? 'pink' : f.impact === 'Medium' ? 'blue' : 'dark'}>{f.impact}</Badge>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Top 5 Priorities */}
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame size={18} style={{ color: '#ff4757' }} /> Top 5 Strategic Priorities</h3>
        <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
          {topPriorities?.sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99)).map((p: any, i: number) => (
            <div key={i} style={{ padding: '14px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245', borderLeft: '4px solid #a855f7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{(p.priority || i+1)}</div>
                  <strong style={{ fontSize: '15px', color: '#e5e7eb' }}>{renderSafeValue(p.action || p.title) || ''}</strong>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {p.confidence && <EvidenceBadge evidence={{ source: p.evidence || 'AI', confidence: p.confidence }} size="sm" />}
                </div>
              </div>
              <p style={{ margin: '0 0 8px 38px', fontSize: '13px', color: '#9aa7bd' }}>{renderSafeValue(p.rationale || p.reason) || ''}</p>
              <div style={{ marginLeft: '38px', display: 'flex', gap: '16px', fontSize: '12px', color: '#9aa7bd', flexWrap: 'wrap' }}>
                {p.roi && <span><strong style={{ color: '#10e18b' }}>ROI:</strong> {renderSafeValue(p.roi)}</span>}
                {p.timeline && <span><strong style={{ color: '#53a7ff' }}>Timeline:</strong> {renderSafeValue(p.timeline)}</span>}
                {p.owner && <span><strong style={{ color: '#ffb347' }}>Owner:</strong> {renderSafeValue(p.owner)}</span>}
                {p.kpi && <span><strong style={{ color: '#a855f7' }}>KPI:</strong> {renderSafeValue(p.kpi)}</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Executive Recommendation */}
      {executiveRecommendation && (
        <Card style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid #a855f7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ color: '#a855f7', margin: '0 0 10px 0' }}>Executive Recommendation</h3>
              <p style={{ color: '#e5e7eb', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>{renderSafeValue(executiveRecommendation.recommendation) || ''}</p>
            </div>
            {executiveRecommendation.confidenceLevel && (
              <Badge tone={executiveRecommendation.confidenceLevel === 'High' ? 'green' : executiveRecommendation.confidenceLevel === 'Medium' ? 'blue' : 'yellow'}>
                {executiveRecommendation.confidenceLevel}
              </Badge>
            )}
          </div>
          {executiveRecommendation.nextSteps?.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <strong style={{ fontSize: '13px', color: '#a855f7' }}>Next Steps:</strong>
              <ul style={{ margin: '8px 0 0 20px', color: '#9aa7bd', fontSize: '13px' }}>
                {executiveRecommendation.nextSteps.map((s: string, i: number) => <li key={i}>{renderSafeValue(s)}</li>)}
              </ul>
            </div>
          )}
          {executiveRecommendation.evidence && <div style={{ marginTop: '10px' }}><EvidenceBadge evidence={executiveRecommendation.evidence} size="sm" /></div>}
        </Card>
      )}
    </div>
  );
}

function SectionBlock({ icon: Icon, title, color, data }: { icon: any, title: string, color: string, data: any }) {
  if (!data) return null;
  const renderValue = (key: string) => {
    const val = data[key];
    if (val === null || val === undefined || val === 'Unknown') return null;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object' && val !== null) {
      if (val.evidence) return <EvidenceBadge evidence={val.evidence} size="sm" />;
      if (val.value || val.name) return renderSafeValue(val.value || val.name);
      if (Array.isArray(val)) return val.join(', ');
      return JSON.stringify(val).slice(0, 80);
    }
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
    return renderSafeValue(val);
  };
  const skipKeys = ['evidence', 'sources', 'warnings'];
  const entries = Object.entries(data).filter(([k]) => !skipKeys.includes(k) && renderValue(k) !== null);

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Icon size={18} style={{ color }} /> {title}</h3>
        {data.evidence && <EvidenceBadge evidence={data.evidence} size="sm" />}
      </div>
      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ padding: '8px 10px', background: '#151d2b', borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize', marginBottom: '2px' }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
            <div style={{ fontSize: '13px', color: '#e5e7eb' }}>{renderValue(key)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ------------ Product DNA ------------
function ProductDNA({ data }: { data: any }) {
  const product = data || {};
  if (!product || Object.keys(product).length === 0) return <EmptyState title="No Product DNA" />;
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card>
          <h3><Box size={18} style={{ color: '#2aa3ff', marginRight: '8px' }}/> Core Product</h3>
          <p style={{ color: '#9aa7bd' }}>{asText(product.productSummary)}</p>
          <div style={{ marginTop: '15px' }}>
             <Badge className="blue">USP: {asText(product.usp)}</Badge>
          </div>
        </Card>
        <Card>
          <h3><Briefcase size={18} style={{ color: '#10e18b', marginRight: '8px' }}/> Features & Benefits</h3>
          <p style={{ color: '#9aa7bd', fontSize: '13px' }}>Key features and their corresponding benefits for the user.</p>
        </Card>
      </div>

      <SectionTitle title="Features & Differentiators" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        {asArray(product.features).map((f: any, i) => (
          <InsightCard key={`f${i}`} insight={asInsight(f, `Feature ${i+1}`)} icon={Zap} />
        ))}
        {asArray(product.differentiators).map((d: any, i) => (
          <InsightCard key={`d${i}`} insight={asInsight(d, `Differentiator ${i+1}`)} icon={Flame} />
        ))}
      </div>

      <SectionTitle title="Jobs-to-be-Done (JTBD) & Pain Points" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        {asArray(product.jobsToBeDone).map((j: any, i) => (
          <InsightCard key={`j${i}`} insight={asInsight(j, `Job ${i+1}`)} icon={Target} />
        ))}
        {asArray(product.painPoints).map((p: any, i) => (
          <InsightCard key={`p${i}`} insight={asInsight(p, `Pain Point ${i+1}`)} icon={Activity} />
        ))}
      </div>
    </div>
  );
}

// ------------ Market Intelligence (PART 5) ------------
function MarketIntelligence({ data }: { data: any }) {
  const market = data || {};
  if (!market || Object.keys(market).length === 0) return <EmptyState title="No Market Data" />;

  const growthSignals = market.growthSignals || [];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card style={{ background: '#151d2b', border: '1px solid #ffb347' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffb347', margin: '0 0 10px 0' }}><TrendingUp size={18} /> Market Data Notice</h3>
        <p style={{ fontSize: '13px', color: '#9aa7bd', margin: 0 }}>
          Market size data (TAM/SAM/SOM) is not available without paid API sources. Growth Signals below are based on evidence collected from the website.
        </p>
      </Card>

      {growthSignals.length > 0 && (
        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={18} style={{ color: '#a855f7' }} /> Growth Signals</h3>
          <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
            {growthSignals.map((s: any, i: number) => (
              <div key={i} style={{ padding: '10px 12px', background: '#0b1220', borderRadius: '6px', borderLeft: '3px solid #a855f7' }}>
                <div style={{ fontSize: '13px', color: '#e5e7eb' }}>{s.signal || s.value || ''}</div>
                {s.source && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Source: {s.source}</div>}
                {s.evidence && <div style={{ fontSize: '11px', color: '#6b7280' }}>Evidence: {s.evidence}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Market Trends (AI-inferred, labeled as such) */}
      {market.marketTrends?.length > 0 && (
        <div>
          <SectionTitle title="Market Trends (AI-Inferred)" subtitle="Based on industry knowledge, not verified against external sources." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {market.marketTrends.map((t: any, i: number) => (
              <InsightCard key={i} insight={asInsight(t, `Trend ${i+1}`)} icon={TrendingUp} />
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '8px', fontStyle: 'italic' }}>
            AI-inferred — low evidence. Verify through industry reports.
          </div>
        </div>
      )}

      {market.opportunities?.length > 0 && (
        <div>
          <SectionTitle title="Growth Opportunities" subtitle="Potential areas identified from analysis." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {market.opportunities.map((o: any, i: number) => (
              <InsightCard key={i} insight={asInsight(o, `Opportunity ${i+1}`)} icon={Target} />
            ))}
          </div>
        </div>
      )}

      {market.risks?.length > 0 && (
        <div>
          <SectionTitle title="Risks" subtitle="Potential challenges identified." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {market.risks.map((r: any, i: number) => (
              <InsightCard key={i} insight={asInsight(r, `Risk ${i+1}`)} icon={AlertTriangle} />
            ))}
          </div>
        </div>
      )}

      {!market.marketTrends?.length && !market.growthSignals?.length && !market.opportunities?.length && (
        <Card>
          <p style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '13px', margin: 0 }}>
            No verified market data available. Market intelligence requires website evidence or paid API sources.
          </p>
        </Card>
      )}
    </div>
  );
}

// ------------ Audience Intelligence (PART 6) ------------
function AudienceIntelligence({ data }: { data: any }) {
  const audience = data || {};
  if (!audience || Object.keys(audience).length === 0) return <EnterpriseEmptyState title="No Audience Data" message="No verified audience intelligence available." icon={Users} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* ICP Section */}
      {audience.icp?.length > 0 && (
        <div>
          <SectionTitle title="Ideal Customer Profiles (ICP)" subtitle="Evidence-based buyer profiles with decision authority and buying behavior." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {audience.icp.map((p: any, i: number) => (
              <EnterpriseAudienceCard key={i} persona={{
                name: p.name || p.title || '',
                role: p.role || p.jobTitle || '',
                companySize: p.companySize || '',
                painPoints: asArray(p.painPoints || p.challenges || []),
                goals: asArray(p.goals || p.objectives || []),
                buyingTriggers: asArray(p.buyingTriggers || p.triggers || []),
                decisionAuthority: p.authority || p.decisionAuthority || 'Unknown',
                budget: p.budget || '',
                intentScore: p.intent || p.intentLevel || 'Medium',
                buyingStage: p.buyingStage || ''
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Personas fallback */}
      {!audience.icp?.length && audience.personas?.length > 0 && (
        <div>
          <SectionTitle title="Buyer Personas" subtitle="Detailed psychological profiles." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {audience.personas.map((p: any, i: number) => (
              <EnterpriseAudienceCard key={i} persona={{
                name: p.name || p.title || '',
                role: p.role || p.jobTitle || '',
                companySize: p.companySize || '',
                painPoints: asArray(p.painPoints || p.challenges || []),
                goals: asArray(p.goals || p.objectives || []),
                buyingTriggers: asArray(p.buyingTriggers || p.triggers || []),
                decisionAuthority: p.authority || p.decisionAuthority || 'Unknown',
                budget: p.budget || '',
                intentScore: p.intent || p.intentLevel || 'Medium',
                buyingStage: p.buyingStage || ''
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Decision Makers & Buying Committee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {audience.decisionMakers?.length > 0 && (
          <Card>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Target size={18} style={{ color: '#a855f7' }} /> Decision Makers</h3>
            <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
              {audience.decisionMakers.map((d: any, i: number) => (
                <div key={i} style={{ padding: '8px 10px', background: '#151d2b', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{renderSafeValue(d.title || d)}</span>
                  {d.confidence && <EvidenceBadge evidence={{ source: d.evidence?.source || 'AI', confidence: d.confidence }} size="sm" />}
                </div>
              ))}
            </div>
          </Card>
        )}
        {audience.buyingCommittee?.length > 0 && (
          <Card>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} style={{ color: '#53a7ff' }} /> Buying Committee</h3>
            <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
              {audience.buyingCommittee.map((c: any, i: number) => (
                <div key={i} style={{ padding: '8px 10px', background: '#151d2b', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{renderSafeValue(c.title || c)}</span>
                  {c.influence && <Badge tone="blue">{c.influence}</Badge>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Budget, Intent, Tech Maturity, LTV */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          {audience.budget && (
            <Card><h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#10e18b' }}><DollarSign size={16} /> Budget</h4><div style={{ fontSize: '15px', color: '#e5e7eb' }}>{typeof audience.budget === 'object' ? renderSafeValue(audience.budget.estimatedRange || audience.budget.value) : renderSafeValue(audience.budget)}</div></Card>
          )}
          {audience.companySize && (
            <Card><h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#53a7ff' }}><Building size={16} /> Company Size</h4><div style={{ fontSize: '15px', color: '#e5e7eb' }}>{renderSafeValue(audience.companySize)}</div></Card>
          )}
          {audience.techMaturity && (
            <Card><h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffb347' }}><Code size={16} /> Tech Maturity</h4><div style={{ fontSize: '15px', color: '#e5e7eb' }}>{renderSafeValue(audience.techMaturity)}</div></Card>
          )}
          {audience.lifetimeValue && (
            <Card><h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#a855f7' }}><TrendingUp size={16} /> Lifetime Value</h4><div style={{ fontSize: '15px', color: '#e5e7eb' }}>{typeof audience.lifetimeValue === 'object' ? renderSafeValue(audience.lifetimeValue.estimatedRange || audience.lifetimeValue.value) : renderSafeValue(audience.lifetimeValue)}</div></Card>
          )}
      </div>

      {/* Pain Points & Buying Triggers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <SectionTitle title="Pain Points" />
          <div style={{ display: 'grid', gap: '8px' }}>
            {audience.painPoints?.map((p: any, i: number) => <InsightCard key={i} insight={asInsight(p, `Pain ${i+1}`)} icon={AlertTriangle} />)}
            {!audience.painPoints?.length && <p style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '13px' }}>Verified data unavailable</p>}
          </div>
        </div>
        <div>
          <SectionTitle title="Buying Triggers" />
          <div style={{ display: 'grid', gap: '8px' }}>
            {audience.buyingTriggers?.map((b: any, i: number) => <InsightCard key={i} insight={asInsight(b, `Trigger ${i+1}`)} icon={Zap} />)}
            {!audience.buyingTriggers?.length && <p style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '13px' }}>Verified data unavailable</p>}
          </div>
        </div>
      </div>

      {/* Objections & Intent */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <SectionTitle title="Objections" />
          <div style={{ display: 'grid', gap: '8px' }}>
            {audience.objections?.map((o: any, i: number) => <InsightCard key={i} insight={asInsight(o, `Objection ${i+1}`)} icon={Shield} />)}
            {!audience.objections?.length && <p style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '13px' }}>Verified data unavailable</p>}
          </div>
        </div>
        <div>
          <SectionTitle title="Intent & Channels" />
          <div style={{ display: 'grid', gap: '8px' }}>
            {audience.intent?.map((n: any, i: number) => (
              <div key={i} style={{ padding: '8px 10px', background: '#151d2b', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{renderSafeValue(n.segment || n.value || n)}</span>
                {n.intentLevel && <Badge tone={n.intentLevel.includes('High') ? 'green' : n.intentLevel.includes('Medium') ? 'blue' : 'yellow'}>{n.intentLevel}</Badge>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {audience.channels?.map((c: any, i: number) => {
              const name = c.name || c.value || c;
              const ev = c.evidence || null;
              return (
                <span key={i} style={{ padding: '4px 10px', background: '#151d2b', borderRadius: '6px', fontSize: '12px', color: '#2aa3ff', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {renderSafeValue(name)}
                  {ev && <EvidenceBadge evidence={ev} size="sm" />}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------ Competitor Intelligence ------------
function CompetitorIntelligence({ data }: { data: any }) {
  const competitor = data || {};
  if (!competitor || Object.keys(competitor).length === 0) return <EnterpriseEmptyState title="No Competitor Data" message="No verified competitor intelligence available." icon={Building} />;
  
  const direct = competitor.directCompetitors || competitor.direct || [];
  const indirect = competitor.indirectCompetitors || competitor.indirect || [];
  const allCompetitors = [...direct, ...indirect];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionTitle title="Competitor War Room" subtitle="Direct threats and their market positioning." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {allCompetitors.map((c: any, i: number) => (
          <EnterpriseCompetitorCard key={i} competitor={{
            name: c.name || c.company || '',
            domain: c.domain || c.website || '',
            threatScore: c.threatScore ?? c.threatLevel ?? null,
            trafficEstimate: c.traffic || '',
            employeeCount: c.employees || '',
            funding: c.funding || '',
            marketShare: c.marketShare || '',
            pricing: c.pricing || '',
            strengths: asArray(c.strengths || []),
            weaknesses: asArray(c.weaknesses || []),
            technologies: asArray(c.technologies || c.techStack || c.tech || [])
          }} />
        ))}
        {allCompetitors.length === 0 && <EnterpriseEmptyState title="" message="No verified competitor data available" icon={Building} />}
      </div>

      {competitor.evidence && <DataQualityPanel evidence={competitor.evidence} />}

      <Card>
        <h3>Market Gaps & Exploitable Weaknesses</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginTop: '15px' }}>
           {asArray(competitor.marketGaps || competitor.gaps).map((g: any, i) => (
             <EnterpriseInsightCard key={`g${i}`} insight={{ title: `Market Gap ${i+1}`, description: asText(g.value || g), severity: 'warning', confidence: g.confidence ?? null }} />
          ))}
           {asArray(competitor.competitorWeaknesses || competitor.weaknesses).map((w: any, i) => (
             <EnterpriseInsightCard key={`w${i}`} insight={{ title: `Weakness ${i+1}`, description: asText(w.value || w), severity: 'critical', confidence: w.confidence ?? null }} />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ------------ Intent Prediction ------------
function IntentPrediction({ data }: { data: any }) {
  const intent = data || {};
  if (!intent || Object.keys(intent).length === 0) return <EmptyState title="No Intent Data" />;
  
  const hot = asArray(intent.hotSegments).slice(0, 3);
  const warm = asArray(intent.warmSegments).slice(0, 3);
  const cold = asArray(intent.coldSegments).slice(0, 3);

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionTitle title="Intent Funnel" subtitle="Real-time buying readiness segments." />
      
      <div style={{ display: 'grid', gap: '15px' }}>
        <Card style={{ borderLeft: '4px solid #10e18b', background: 'linear-gradient(90deg, rgba(16, 225, 139, 0.05) 0%, transparent 100%)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10e18b' }}><Flame size={20} /> Hot Leads (Ready to Buy)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
             {hot.length ? hot.map((h:any, i) => <InsightCard key={i} insight={asInsight(h, `Segment ${i+1}`)} icon={CheckCircle} />) : <p>No hot segments identified.</p>}
          </div>
        </Card>

        <Card style={{ borderLeft: '4px solid #ffb347', background: 'linear-gradient(90deg, rgba(255, 179, 71, 0.05) 0%, transparent 100%)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ffb347' }}><Droplets size={20} /> Warm Leads (Researching)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
             {warm.length ? warm.map((w:any, i) => <InsightCard key={i} insight={asInsight(w, `Segment ${i+1}`)} icon={Activity} />) : <p>No warm segments identified.</p>}
          </div>
        </Card>

        <Card style={{ borderLeft: '4px solid #53a7ff', background: 'linear-gradient(90deg, rgba(83, 167, 255, 0.05) 0%, transparent 100%)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#53a7ff' }}><Snowflake size={20} /> Cold Leads (Passive)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
             {cold.length ? cold.map((c:any, i) => <InsightCard key={i} insight={asInsight(c, `Segment ${i+1}`)} icon={Users} />) : <p>No cold segments identified.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ------------ Positioning Strategy ------------
function PositioningStrategy({ data }: { data: any }) {
  const positioning = data || {};
  if (!positioning || Object.keys(positioning).length === 0) return <EmptyState title="No Positioning Data" />;
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card style={{ background: '#101622', border: '1px solid #53a7ff' }}>
        <h3 style={{ color: '#53a7ff' }}>Positioning Statement</h3>
        <p style={{ fontSize: '18px', lineHeight: '1.6', fontStyle: 'italic', color: '#fff' }}>"{asText(positioning.positioningStatement || positioning.statement)}"</p>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        {asArray(positioning.messagingPillars || positioning.pillars || []).map((p: any, i) => (
          <InsightCard key={i} insight={asInsight(p, `Pillar ${i+1}`)} icon={Target} />
        ))}
      </div>
    </div>
  );
}

// ------------ Campaign Strategy (PART 7) ------------
function CampaignStrategy({ data }: { data: any }) {
  const campaign = data || {};
  if (!campaign || Object.keys(campaign).length === 0) return <EmptyState title="No Campaign Data" />;
  
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionTitle title="Campaign Concepts" subtitle="Structured recommendations with priority, ROI, and business justification." />
      
      {/* Creative Angles as Recommendation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {asArray(campaign.creativeAngles).map((c: any, i) => (
          <RecommendationCard key={i} item={c} index={i} type="Creative Angle" />
        ))}
      </div>

      {/* Copy Hooks */}
      {asArray(campaign.copyHooks).length > 0 && (
        <Card>
          <h3>Ad Hooks & Copy</h3>
          <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
            {asArray(campaign.copyHooks).map((h: any, i) => (
              <RecommendationCard key={i} item={h} index={i} type="Copy Hook" compact />
            ))}
          </div>
        </Card>
      )}

      {/* CTAs */}
      {asArray(campaign.ctaSuggestions).length > 0 && (
        <Card>
          <h3>Call-to-Action Suggestions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
            {asArray(campaign.ctaSuggestions).map((c: any, i: number) => (
              <span key={i} style={{ padding: '6px 12px', background: '#151d2b', borderRadius: '6px', fontSize: '13px', color: '#e5e7eb', border: '1px solid #293245' }}>
                {c.value || c}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function RecommendationCard({ item, index, type, compact }: { item: any, index: number, type: string, compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const val = item.value || item.angle || item.hook || item;
  const safeVal = typeof val === 'object' ? renderSafeValue(val) : val;
  if ((typeof val === 'string' || typeof safeVal === 'string') && compact) {
    return (
      <div style={{ padding: '10px', background: '#151d2b', borderRadius: '8px', borderLeft: '3px solid #a855f7' }}>
        <div style={{ fontSize: '13px', color: '#e5e7eb' }}>{typeof val === 'string' ? val : safeVal}</div>
      </div>
    );
  }
  
  return (
    <Card style={{ borderLeft: '4px solid #a855f7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '15px' }}>{safeVal || item.title || `${type} ${index + 1}`}</h4>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item.priority && <Badge tone={item.priority === 'Critical' ? 'pink' : item.priority === 'High' ? 'blue' : item.priority === 'Medium' ? 'yellow' : 'dark'}>{item.priority}</Badge>}
          {item.confidence && <EvidenceBadge evidence={{ source: item.evidence || 'AI', confidence: item.confidence }} size="sm" />}
          {item.difficulty && <Badge tone={item.difficulty === 'High' ? 'pink' : item.difficulty === 'Medium' ? 'yellow' : 'green'}>{item.difficulty}</Badge>}
        </div>
      </div>
      
      {item.problem && <div style={{ fontSize: '13px', color: '#ff8a8a', marginBottom: '6px' }}><strong>Problem:</strong> {renderSafeValue(item.problem)}</div>}
      {item.why && <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '6px' }}><strong>Why:</strong> {renderSafeValue(item.why)}</div>}
      {item.rationale && <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '6px' }}><strong>Rationale:</strong> {renderSafeValue(item.rationale)}</div>}
      {item.recommendedAction && <div style={{ fontSize: '13px', color: '#53a7ff', marginBottom: '6px' }}><strong>Action:</strong> {renderSafeValue(item.recommendedAction)}</div>}
      {item.roi && <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}><strong>Expected ROI:</strong> {renderSafeValue(item.roi)}</div>}
      {item.businessImpact && <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}><strong>Business Impact:</strong> {renderSafeValue(item.businessImpact)}</div>}
      {item.businessJustification && <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '6px' }}><strong>Business Justification:</strong> {renderSafeValue(item.businessJustification)}</div>}
      
      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#9aa7bd', flexWrap: 'wrap', marginTop: '8px' }}>
        {item.owner && <span><strong>Owner:</strong> {renderSafeValue(item.owner)}</span>}
        {item.timeline || item.estimatedTimeline ? <span><strong>Timeline:</strong> {renderSafeValue(item.timeline || item.estimatedTimeline)}</span> : null}
        {item.dependencies && <span><strong>Dependencies:</strong> {Array.isArray(item.dependencies) ? item.dependencies.join(', ') : renderSafeValue(item.dependencies)}</span>}
        {item.kpis && <span><strong>KPIs:</strong> {Array.isArray(item.kpis) ? item.kpis.join(', ') : renderSafeValue(item.kpis)}</span>}
        {item.expectedKPI && <span><strong>KPI:</strong> {renderSafeValue(item.expectedKPI)}</span>}
      </div>
      
      {item.evidence && typeof item.evidence === 'object' && !item.evidence.source && (
        <div style={{ marginTop: '8px' }}><EvidenceBadge evidence={item.evidence} size="sm" /></div>
      )}
      
      <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: 'none', color: '#53a7ff', cursor: 'pointer', fontSize: '12px', padding: 0, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? 'Less' : 'More details'}
      </button>
      
      {expanded && item.evidence && typeof item.evidence === 'string' && (
        <div style={{ marginTop: '8px', padding: '8px', background: '#0b1220', borderRadius: '6px', fontSize: '12px', color: '#9aa7bd', fontStyle: 'italic' }}>{item.evidence}</div>
      )}
    </Card>
  );
}

// ------------ Channel Strategy ------------
function ChannelStrategy({ data }: { data: any }) {
  const channel = data || {};
  if (!channel || Object.keys(channel).length === 0) return <EmptyState title="No Channel Data" />;
  
  const channels = asArray(channel.recommendedChannels || channel.channels || []);
  const uniqueChannels = channels.filter((c: any, index: number, self: any[]) => {
    const channelName = (c.channelName || c.channel || c.name || '').toLowerCase();
    return self.findIndex((item: any) => 
      (item.channelName || item.channel || item.name || '').toLowerCase() === channelName
    ) === index;
  });

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card style={{ background: '#151d2b', border: '1px solid #10e18b' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10e18b', margin: '0 0 10px 0' }}><Info size={18} /> Channel Budget Note</h3>
        <p style={{ fontSize: '13px', color: '#9aa7bd', margin: 0 }}>
          Budget allocation and ROI percentages are not shown because they require verified advertising data. Channel fit reasoning is provided instead.
        </p>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        {uniqueChannels.map((c: any, i) => (
          <InsightCard key={i} insight={asInsight(c, asText(c.channelName || c.channel || c.name || `Channel ${i+1}`))} icon={Activity} />
        ))}
      </div>
    </div>
  );
}

// ------------ Action Plan (PART 8) ------------
function ActionPlan({ data }: { data: any }) {
  const actionPlan = data || {};
  if (!actionPlan || Object.keys(actionPlan).length === 0) return <EnterpriseEmptyState title="No Action Plan" message="Run the analysis to generate an action plan with phased milestones." icon={Target} />;
  
  const phases = [
    { label: '7 Days', days: '7', key: 'day7', altKeys: ['sevenDay'], color: '#ff4757' },
    { label: '30 Days', days: '30', key: 'day30', altKeys: ['thirtyDay'], color: '#ffb347' },
    { label: '60 Days', days: '60', key: 'day60', altKeys: ['sixtyDay'], color: '#53a7ff' },
    { label: '90 Days', days: '90', key: 'day90', altKeys: ['ninetyDay'], color: '#10e18b' },
    { label: '180 Days', days: '180', key: 'day180', altKeys: [], color: '#a855f7' },
    { label: '365 Days', days: '365', key: 'day365', altKeys: [], color: '#2aa3ff' }
  ];

  const timelinePhases = phases.map(phase => {
    const items = asArray(actionPlan[phase.key]) || 
      phase.altKeys.reduce((acc: any[], alt: string) => acc.length ? acc : asArray(actionPlan[alt]), []);
    return {
      label: phase.label,
      days: phase.days,
      color: phase.color,
      tasks: items.map((item: any) => ({
        title: asText(item.title || item),
        owner: item.owner || '',
        expectedKpi: item.expectedKPI || (Array.isArray(item.kpis) ? item.kpis.join(', ') : item.kpis) || '',
        dependencies: Array.isArray(item.dependencies) ? item.dependencies.join(', ') : item.dependencies || '',
        priority: item.priority as string || 'Medium'
      }))
    };
  }).filter(p => p.tasks.length > 0);

  const allTasks = phases.reduce((acc: any[], phase) => {
    const items = asArray(actionPlan[phase.key]) || 
      phase.altKeys.reduce((acc2: any[], alt: string) => acc2.length ? acc2 : asArray(actionPlan[alt]), []);
    return [...acc, ...items];
  }, []);

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <StorySection number="1" title="Executive Roadmap" icon={Map} color="#a855f7">
        <ScoreSection title=""
          scores={[
            { label: 'Total Actions', value: allTasks.length, color: '#53a7ff' },
            { label: 'Critical Priority', value: allTasks.filter((t: any) => t.priority === 'Critical').length, color: '#ff4757' },
            { label: 'Phases', value: timelinePhases.length, color: '#10e18b' },
          ]}
        />
      </StorySection>

      {timelinePhases.length > 0 && <Timeline phases={timelinePhases} />}

      {allTasks.length > 0 && (
        <Card>
          <h3>Detailed Action Cards</h3>
          <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
            {allTasks.map((item: any, i: number) => (
              <ActionCard key={i} item={item} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ActionCard({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ padding: '14px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ fontSize: '15px', color: '#fff' }}>{item.title ? asText(item.title) : (typeof item === 'object' ? renderSafeValue(item) : asText(item))}</strong>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item.priority && <Badge tone={item.priority === 'Critical' ? 'pink' : item.priority === 'High' ? 'blue' : item.priority === 'Medium' ? 'yellow' : 'dark'}>{item.priority}</Badge>}
          {item.difficulty && <Badge tone={item.difficulty === 'High' ? 'pink' : item.difficulty === 'Medium' ? 'yellow' : 'green'}>{item.difficulty}</Badge>}
        </div>
      </div>
      
      {/* WHY explanation */}
      {item.why && (
        <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '8px', padding: '8px 10px', background: '#0b1220', borderRadius: '6px', borderLeft: '3px solid #a855f7' }}>
          <strong style={{ color: '#a855f7' }}>Why:</strong> {renderSafeValue(item.why)}
        </div>
      )}
      {item.problem && (
        <div style={{ fontSize: '13px', color: '#ff8a8a', marginBottom: '6px' }}>
          <strong>Problem:</strong> {renderSafeValue(item.problem)}
        </div>
      )}
      {item.rationale && (
        <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '6px' }}>
          <strong>Rationale:</strong> {renderSafeValue(item.rationale)}
        </div>
      )}
      {item.businessJustification && (
        <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}>
          <strong>Business Justification:</strong> {renderSafeValue(item.businessJustification)}
        </div>
      )}
      {item.roi && (
        <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}>
          <strong>Expected ROI:</strong> {renderSafeValue(item.roi)}
        </div>
      )}
      {item.businessImpact && (
        <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}>
          <strong>Business Impact:</strong> {renderSafeValue(item.businessImpact)}
        </div>
      )}

      <div style={{ display: 'flex', gap: '15px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1d2738', fontSize: '12px', color: '#9aa7bd', flexWrap: 'wrap' }}>
        {item.owner && <span><strong>Owner:</strong> {renderSafeValue(item.owner)}</span>}
        {item.timeline && <span><strong>Timeline:</strong> {renderSafeValue(item.timeline)}</span>}
        {item.estimatedTimeline && <span><strong>Timeline:</strong> {renderSafeValue(item.estimatedTimeline)}</span>}
        {item.kpis && <span><strong>KPIs:</strong> {Array.isArray(item.kpis) ? item.kpis.join(', ') : renderSafeValue(item.kpis)}</span>}
        {item.expectedKPI && <span><strong>Expected KPI:</strong> {renderSafeValue(item.expectedKPI)}</span>}
        {item.dependencies && <span><strong>Dependencies:</strong> {Array.isArray(item.dependencies) ? item.dependencies.join(', ') : renderSafeValue(item.dependencies)}</span>}
      </div>

      {item.evidence && (
        <div style={{ marginTop: '8px' }}>
          <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: 'none', color: '#53a7ff', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expanded ? 'Hide Evidence' : 'View Evidence'}
          </button>
          {expanded && (
            <div style={{ marginTop: '8px' }}>
              {typeof item.evidence === 'object' ? <EvidenceBadge evidence={item.evidence} size="md" /> : <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>{item.evidence}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ------------ Report Preview (PART 10) ------------
function ReportView({ data, chatId }: { data: any, chatId?: string }) {
  const sections = ['Executive Snapshot', 'Executive Story', 'Product DNA', 'Market Intelligence', 'Audience Intelligence', 'Competitor Intelligence', 'Intent Prediction', 'Positioning Strategy', 'Campaign Strategy', 'Channel Strategy', 'Action Plan'];
  const hasSection = (key: string) => {
    if (key === 'Executive Snapshot') return !!(data.summary || data.growthSummary);
    if (key === 'Executive Story') return !!(data.executiveStory && Object.keys(data.executiveStory).length > 0);
    if (key === 'Product DNA') return !!(data.product && Object.keys(data.product).length > 0);
    if (key === 'Market Intelligence') return !!(data.market && Object.keys(data.market).length > 0);
    if (key === 'Audience Intelligence') return !!(data.audience && Object.keys(data.audience).length > 0);
    if (key === 'Competitor Intelligence') return !!(data.competitor && Object.keys(data.competitor).length > 0);
    if (key === 'Intent Prediction') return !!(data.intent && Object.keys(data.intent).length > 0);
    if (key === 'Positioning Strategy') return !!(data.positioning && Object.keys(data.positioning).length > 0);
    if (key === 'Campaign Strategy') return !!(data.campaign && Object.keys(data.campaign).length > 0);
    if (key === 'Channel Strategy') return !!(data.channel && Object.keys(data.channel).length > 0);
    if (key === 'Action Plan') return !!(data.actionPlan && Object.keys(data.actionPlan).length > 0);
    return false;
  };

  const includedSections = sections.filter(s => hasSection(s));
  const totalPages = Math.max(1, Math.round(includedSections.length * 2.5));

  const reportSections = [
    { name: 'Executive Snapshot', content: `Data Completeness: ${data.evidence?.sourceSummary?.completenessScore || 'N/A'}%\nGrowth Signals: ${data.evidence?.growthSignals?.length || 0}\nEvidence Sources: ${data.evidence?.sourceSummary?.sourcesCollected || 0}/${data.evidence?.sourceSummary?.totalSources || '?'}` },
    { name: 'Executive Story', content: data.executiveStory?.executiveSummary?.title || 'Enterprise Business Intelligence Report' },
    { name: 'Market Intelligence', content: `Market size data (TAM/SAM/SOM) not available without paid API sources. Growth Signals: ${data.evidence?.growthSignals?.length || data.market?.growthSignals?.length || 0}` },
  ];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} style={{ color: '#53a7ff' }} /> Report Preview</h3>
        <p style={{ color: '#9aa7bd', fontSize: '13px' }}>Preview and download your enterprise business intelligence report.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e5e7eb' }}>~{totalPages}</div>
            <div style={{ fontSize: '12px', color: '#9aa7bd' }}>Estimated Pages</div>
          </div>
          <div style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e5e7eb' }}>{includedSections.length}</div>
            <div style={{ fontSize: '12px', color: '#9aa7bd' }}>Sections Included</div>
          </div>
          <div style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10e18b' }}>6</div>
            <div style={{ fontSize: '12px', color: '#9aa7bd' }}>Download Formats</div>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Included Sections</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {sections.map(s => (
              <span key={s} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: hasSection(s) ? 'rgba(16,225,139,0.1)' : '#151d2b', color: hasSection(s) ? '#10e18b' : '#6b7280', border: `1px solid ${hasSection(s) ? 'rgba(16,225,139,0.3)' : '#293245'}` }}>
                {hasSection(s) ? '✓ ' : '○ '}{s}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Phase 6C: Enterprise Report Preview with Live Preview */}
      <EnterpriseReportPreview chatId={chatId} type="growth" sections={reportSections} />

      {data.evidence && <DataQualityPanel evidence={data.evidence} />}
    </div>
  );
}

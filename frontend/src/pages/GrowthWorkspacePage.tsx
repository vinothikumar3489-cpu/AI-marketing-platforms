import { useEffect, useState, useMemo } from 'react';
import { api, downloadReport } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asNumber, asText, asInsight } from '../lib/normalizers';
import { Badge, Card, EmptyState, Loading, PageHeader, ScoreCard, SectionTitle, InsightCard, PersonaCard, CompetitorCard, EvidenceBadge, DataQualityPanel, ReportPreview } from '../components/UI';
import { TechnologyCard } from '../components/IntelligenceCards';
import { KPIDashboard, EnterpriseCompetitorCard, EnterpriseAudienceCard, EnterpriseInsightCard, Timeline, SmartNavigation, SearchBar, LoadingSkeleton, EnterpriseEmptyState, ProgressBar, StatusBadge, ConfidenceBadge, PriorityChip, ScoreSection, MiniRadarLegend, StorySection, ExpandableSection } from '../components/EnterpriseComponents';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { Shield, Target, Users, TrendingUp, Zap, Map, Info, Box, Briefcase, Activity, CheckCircle, Flame, Droplets, Snowflake, DollarSign, Clock, AlertTriangle, Building, Star, Code, PieChart, ExternalLink, ChevronDown, ChevronUp, FileText, Search, Eye, Layers } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('Executive Snapshot');
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
      hasRealContent(r.actionPlan);

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
    hasContent(results.actionPlan);

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

// ------------ Executive Snapshot ------------
function ExecutiveSnapshot({ results }: { results: any }) {
  const sum = results.summary || results.growthSummary || null;
  
  const hasScores = sum && (
    sum.overallGrowthScore !== null ||
    sum.marketOpportunityScore !== null ||
    sum.campaignViabilityScore !== null
  );
  
  const radarData = hasScores ? [
    { subject: 'Product Fit', A: asNumber(sum.productFitScore || results.product?.confidenceScore), fullMark: 100 },
    { subject: 'Market Size', A: asNumber(sum.marketSizeScore || results.market?.confidenceScore), fullMark: 100 },
    { subject: 'Audience Clarity', A: asNumber(sum.audienceClarityScore || results.audience?.confidenceScore), fullMark: 100 },
    { subject: 'Competitive Defense', A: asNumber(sum.competitiveDefensibilityScore || results.competitor?.confidenceScore), fullMark: 100 },
    { subject: 'Campaign Readiness', A: asNumber(sum.campaignReadinessScore || results.campaign?.confidenceScore), fullMark: 100 },
  ].filter(d => d.A !== null) : [];

  if (!hasScores) {
    return (
      <EnterpriseEmptyState 
        title="Executive Snapshot Not Available"
        message="Run Growth Workspace analysis to generate executive snapshot scores and recommendations."
        icon={Layers}
      />
    );
  }

  const kpiItems = [
    { label: 'Growth Index', value: `${asNumber(sum.overallGrowthScore || results.product?.confidenceScore)}%`, icon: TrendingUp, color: '#10e18b' },
    { label: 'Market Opportunity', value: `${asNumber(sum.marketOpportunityScore || results.market?.demandScore)}%`, icon: Target, color: '#53a7ff' },
    { label: 'Campaign Viability', value: `${asNumber(sum.campaignViabilityScore || results.campaign?.confidenceScore)}%`, icon: Zap, color: '#ffb347' },
    { label: 'Data Confidence', value: `${asNumber(sum.dataConfidenceScore || 75)}%`, icon: Shield, color: '#a855f7' },
  ];

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <DataQualityPanel evidence={results.evidence} />
      
      <KPIDashboard items={kpiItems} />

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
            confidence: sum.topRecommendation?.confidence || 85,
            whyItMatters: 'This recommendation is based on the highest-impact opportunity identified across all intelligence modules.'
          }} />
          <EnterpriseInsightCard insight={{
            title: 'Primary Risk',
            description: asText(sum.primaryRisk?.value || sum.primaryRisk || ''),
            severity: 'critical',
            confidence: sum.primaryRisk?.confidence || 75,
            whyItMatters: 'Addressing this risk is critical before executing growth strategies to avoid resource waste.'
          }} />
          <EnterpriseInsightCard insight={{
            title: 'Immediate Action',
            description: asText(sum.immediateAction?.value || sum.immediateAction || ''),
            severity: 'warning',
            confidence: sum.immediateAction?.confidence || 80,
            whyItMatters: 'This action should be prioritized in the first 7 days to establish momentum.'
          }} />
        </div>
      </div>
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
            <h2 style={{ margin: '0 0 5px 0', color: '#a855f7', fontSize: '20px' }}>{executiveSummary?.title || 'Enterprise Business Intelligence Report'}</h2>
            <p style={{ margin: 0, color: '#9aa7bd', fontSize: '13px' }}>{executiveSummary?.methodology?.slice(0, 120)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge tone={executiveSummary?.confidenceLevel === 'High' ? 'green' : executiveSummary?.confidenceLevel === 'Medium' ? 'blue' : 'yellow'}>
              {executiveSummary?.confidenceLevel || 'Unknown'} Confidence
            </Badge>
            {executiveSummary?.assessmentDate && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{executiveSummary.assessmentDate}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '15px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: '#9aa7bd' }}><strong>Sources:</strong> {executiveSummary?.evidenceSourcesUsed || 0}</div>
          <div style={{ fontSize: '12px', color: '#9aa7bd' }}><strong>Data Gaps:</strong> {executiveSummary?.dataGaps || 0}</div>
          <div style={{ fontSize: '12px', color: '#9aa7bd' }}><strong>Version:</strong> {executiveSummary?.version || '2.0.0'}</div>
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
                <span key={i} style={{ padding: '4px 10px', background: '#151d2b', borderRadius: '6px', fontSize: '13px', color: '#e5e7eb' }}>{t.name || t}</span>
              ))}
              {revenueModel.hasFreeTier && <Badge tone="green">Free Tier</Badge>}
              {revenueModel.hasFreeTrial && <Badge tone="blue">Free Trial</Badge>}
              {revenueModel.hasEnterprise && <Badge tone="pink">Enterprise</Badge>}
              {revenueModel.hasCustomPricing && <Badge tone="yellow">Custom Pricing</Badge>}
            </div>
            <div style={{ fontSize: '13px', color: '#9aa7bd' }}>
              {revenueModel.currency && <span><strong>Currency:</strong> {revenueModel.currency} </span>}
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
                <div style={{ fontSize: '13px', color: '#e5e7eb', marginBottom: '4px' }}>{f.finding || f.value || ''}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>Evidence: {f.evidence || ''}</div>
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
                  <strong style={{ fontSize: '15px', color: '#e5e7eb' }}>{p.action || p.title || ''}</strong>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {p.confidence && <EvidenceBadge evidence={{ source: p.evidence || 'AI', confidence: p.confidence }} size="sm" />}
                </div>
              </div>
              <p style={{ margin: '0 0 8px 38px', fontSize: '13px', color: '#9aa7bd' }}>{p.rationale || p.reason || ''}</p>
              <div style={{ marginLeft: '38px', display: 'flex', gap: '16px', fontSize: '12px', color: '#9aa7bd', flexWrap: 'wrap' }}>
                {p.roi && <span><strong style={{ color: '#10e18b' }}>ROI:</strong> {p.roi}</span>}
                {p.timeline && <span><strong style={{ color: '#53a7ff' }}>Timeline:</strong> {p.timeline}</span>}
                {p.owner && <span><strong style={{ color: '#ffb347' }}>Owner:</strong> {p.owner}</span>}
                {p.kpi && <span><strong style={{ color: '#a855f7' }}>KPI:</strong> {p.kpi}</span>}
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
              <p style={{ color: '#e5e7eb', fontSize: '15px', lineHeight: '1.6', margin: 0 }}>{executiveRecommendation.recommendation || ''}</p>
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
                {executiveRecommendation.nextSteps.map((s: string, i: number) => <li key={i}>{s}</li>)}
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
      if (val.value || val.name) return val.value || val.name;
      if (Array.isArray(val)) return val.join(', ');
      return JSON.stringify(val).slice(0, 80);
    }
    return val;
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

  const tamValue = market.tam || market.tam?.value || 'Unknown';
  const samValue = market.sam || market.sam?.value || 'Unknown';
  const somValue = market.som || market.som?.value || 'Unknown';

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="score-grid">
        <ScoreCard label="TAM (Total Addressable)" value={tamValue === 'Unknown' ? 'Verified data unavailable' : tamValue} tone="purple" />
        <ScoreCard label="SAM (Serviceable)" value={samValue === 'Unknown' ? 'Verified data unavailable' : samValue} tone="blue" />
        <ScoreCard label="SOM (Obtainable)" value={somValue === 'Unknown' ? 'Verified data unavailable' : somValue} tone="green" />
        <ScoreCard label="Growth Rate" value={market.growthRate && market.growthRate !== 'Unknown' ? market.growthRate : 'Verified data unavailable'} tone="pink" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building size={18} style={{ color: '#2aa3ff' }} /> Industry Size</h3>
          <div style={{ fontSize: '15px', color: market.industrySize && market.industrySize !== 'Unknown' ? '#e5e7eb' : '#6b7280', fontStyle: market.industrySize === 'Unknown' ? 'italic' : 'normal' }}>
            {market.industrySize && market.industrySize !== 'Unknown' ? market.industrySize : 'Verified data unavailable'}
          </div>
          {market.evidence && <div style={{ marginTop: '8px' }}><EvidenceBadge evidence={market.evidence} size="sm" /></div>}
        </Card>
        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18} style={{ color: '#10e18b' }} /> Investment Trends</h3>
          <div style={{ display: 'grid', gap: '6px' }}>
            {market.investmentTrends?.length > 0 ? market.investmentTrends.map((t: any, i: number) => (
              <div key={i} style={{ fontSize: '13px', color: '#9aa7bd', padding: '6px 8px', background: '#151d2b', borderRadius: '4px' }}>
                {t.trend || t.value || t}
                {t.evidence && <div style={{ marginTop: '4px' }}><EvidenceBadge evidence={t.evidence} size="sm" /></div>}
              </div>
            )) : <span style={{ fontStyle: 'italic', color: '#6b7280', fontSize: '13px' }}>Verified data unavailable</span>}
          </div>
        </Card>
        {market.regulations?.length > 0 && (
          <Card>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={18} style={{ color: '#ff4757' }} /> Regulations</h3>
            <div style={{ display: 'grid', gap: '6px' }}>
              {market.regulations.map((r: any, i: number) => (
                <div key={i} style={{ fontSize: '13px', color: '#9aa7bd', padding: '6px 8px', background: '#151d2b', borderRadius: '4px' }}>{r.value || r}</div>
              ))}
            </div>
          </Card>
        )}
        {market.seasonality?.length > 0 && (
          <Card>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={18} style={{ color: '#ffb347' }} /> Seasonality</h3>
            <div style={{ display: 'grid', gap: '6px' }}>
              {market.seasonality.map((s: any, i: number) => (
                <div key={i} style={{ fontSize: '13px', color: '#9aa7bd', padding: '6px 8px', background: '#151d2b', borderRadius: '4px' }}>{s.value || s}</div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <SectionTitle title="Market Trends" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        {market.trends?.length > 0 ? market.trends.map((t: any, i: number) => (
          <InsightCard key={i} insight={asInsight(t, `Trend ${i+1}`)} icon={TrendingUp} />
        )) : <p style={{ fontStyle: 'italic', color: '#6b7280' }}>Verified data unavailable</p>}
      </div>
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
                  <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{d.title || d}</span>
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
                  <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{c.title || c}</span>
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
          <Card><h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#10e18b' }}><DollarSign size={16} /> Budget</h4><div style={{ fontSize: '15px', color: '#e5e7eb' }}>{typeof audience.budget === 'object' ? audience.budget.estimatedRange || audience.budget.value : audience.budget}</div></Card>
        )}
        {audience.companySize && (
          <Card><h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#53a7ff' }}><Building size={16} /> Company Size</h4><div style={{ fontSize: '15px', color: '#e5e7eb' }}>{audience.companySize}</div></Card>
        )}
        {audience.techMaturity && (
          <Card><h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#ffb347' }}><Code size={16} /> Tech Maturity</h4><div style={{ fontSize: '15px', color: '#e5e7eb' }}>{audience.techMaturity}</div></Card>
        )}
        {audience.lifetimeValue && (
          <Card><h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#a855f7' }}><TrendingUp size={16} /> Lifetime Value</h4><div style={{ fontSize: '15px', color: '#e5e7eb' }}>{typeof audience.lifetimeValue === 'object' ? audience.lifetimeValue.estimatedRange || audience.lifetimeValue.value : audience.lifetimeValue}</div></Card>
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
                <span>{n.segment || n.value || n}</span>
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
                  {name}
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
            threatScore: c.threatScore || c.threatLevel || 50,
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
            <EnterpriseInsightCard key={`g${i}`} insight={{ title: `Market Gap ${i+1}`, description: asText(g.value || g), severity: 'warning', confidence: g.confidence || 70 }} />
          ))}
           {asArray(competitor.competitorWeaknesses || competitor.weaknesses).map((w: any, i) => (
            <EnterpriseInsightCard key={`w${i}`} insight={{ title: `Weakness ${i+1}`, description: asText(w.value || w), severity: 'critical', confidence: w.confidence || 70 }} />
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
  if (typeof val === 'string' && compact) {
    return (
      <div style={{ padding: '10px', background: '#151d2b', borderRadius: '8px', borderLeft: '3px solid #a855f7' }}>
        <div style={{ fontSize: '13px', color: '#e5e7eb' }}>{val}</div>
      </div>
    );
  }
  
  return (
    <Card style={{ borderLeft: '4px solid #a855f7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '15px' }}>{val || item.title || `${type} ${index + 1}`}</h4>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item.priority && <Badge tone={item.priority === 'Critical' ? 'pink' : item.priority === 'High' ? 'blue' : item.priority === 'Medium' ? 'yellow' : 'dark'}>{item.priority}</Badge>}
          {item.confidence && <EvidenceBadge evidence={{ source: item.evidence || 'AI', confidence: item.confidence }} size="sm" />}
          {item.difficulty && <Badge tone={item.difficulty === 'High' ? 'pink' : item.difficulty === 'Medium' ? 'yellow' : 'green'}>{item.difficulty}</Badge>}
        </div>
      </div>
      
      {item.problem && <div style={{ fontSize: '13px', color: '#ff8a8a', marginBottom: '6px' }}><strong>Problem:</strong> {item.problem}</div>}
      {item.why && <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '6px' }}><strong>Why:</strong> {item.why}</div>}
      {item.rationale && <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '6px' }}><strong>Rationale:</strong> {item.rationale}</div>}
      {item.recommendedAction && <div style={{ fontSize: '13px', color: '#53a7ff', marginBottom: '6px' }}><strong>Action:</strong> {item.recommendedAction}</div>}
      {item.roi && <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}><strong>Expected ROI:</strong> {item.roi}</div>}
      {item.businessImpact && <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}><strong>Business Impact:</strong> {item.businessImpact}</div>}
      {item.businessJustification && <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '6px' }}><strong>Business Justification:</strong> {item.businessJustification}</div>}
      
      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#9aa7bd', flexWrap: 'wrap', marginTop: '8px' }}>
        {item.owner && <span><strong>Owner:</strong> {item.owner}</span>}
        {item.timeline || item.estimatedTimeline ? <span><strong>Timeline:</strong> {item.timeline || item.estimatedTimeline}</span> : null}
        {item.dependencies && <span><strong>Dependencies:</strong> {Array.isArray(item.dependencies) ? item.dependencies.join(', ') : item.dependencies}</span>}
        {item.kpis && <span><strong>KPIs:</strong> {Array.isArray(item.kpis) ? item.kpis.join(', ') : item.kpis}</span>}
        {item.expectedKPI && <span><strong>KPI:</strong> {item.expectedKPI}</span>}
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
  
  const chartData = uniqueChannels.map((c:any) => {
    const budgetStr = (c.budgetAllocation || c.budget || '20%').toString();
    const budgetNum = asNumber(budgetStr.replace('%', ''));
    const roiStr = (c.expectedRoi || c.roi || '150%').toString();
    const roiNum = asNumber(roiStr.replace('%', '').replace('x', ''));
    return {
      name: asText(c.channelName || c.channel || c.name || c),
      budget: budgetNum,
      roi: roiNum
    };
  });

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card style={{ height: '350px' }}>
        <h3>Budget Allocation & Expected ROI</h3>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: '#9aa7bd', fontSize: 12 }} />
            <YAxis tick={{ fill: '#9aa7bd', fontSize: 12 }} />
            <Tooltip cursor={{ fill: '#1a2335' }} contentStyle={{ background: '#101622', border: '1px solid #293245' }} />
            <Bar dataKey="budget" fill="#53a7ff" name="Budget %" radius={[4, 4, 0, 0]} />
            <Bar dataKey="roi" fill="#10e18b" name="Expected ROI %" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
        <strong style={{ fontSize: '15px', color: '#fff' }}>{asText(item.title || item)}</strong>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item.priority && <Badge tone={item.priority === 'Critical' ? 'pink' : item.priority === 'High' ? 'blue' : item.priority === 'Medium' ? 'yellow' : 'dark'}>{item.priority}</Badge>}
          {item.difficulty && <Badge tone={item.difficulty === 'High' ? 'pink' : item.difficulty === 'Medium' ? 'yellow' : 'green'}>{item.difficulty}</Badge>}
        </div>
      </div>
      
      {/* WHY explanation */}
      {item.why && (
        <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '8px', padding: '8px 10px', background: '#0b1220', borderRadius: '6px', borderLeft: '3px solid #a855f7' }}>
          <strong style={{ color: '#a855f7' }}>Why:</strong> {item.why}
        </div>
      )}
      {item.problem && (
        <div style={{ fontSize: '13px', color: '#ff8a8a', marginBottom: '6px' }}>
          <strong>Problem:</strong> {item.problem}
        </div>
      )}
      {item.rationale && (
        <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '6px' }}>
          <strong>Rationale:</strong> {item.rationale}
        </div>
      )}
      {item.businessJustification && (
        <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}>
          <strong>Business Justification:</strong> {item.businessJustification}
        </div>
      )}
      {item.roi && (
        <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}>
          <strong>Expected ROI:</strong> {item.roi}
        </div>
      )}
      {item.businessImpact && (
        <div style={{ fontSize: '13px', color: '#10e18b', marginBottom: '6px' }}>
          <strong>Business Impact:</strong> {item.businessImpact}
        </div>
      )}

      <div style={{ display: 'flex', gap: '15px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1d2738', fontSize: '12px', color: '#9aa7bd', flexWrap: 'wrap' }}>
        {item.owner && <span><strong>Owner:</strong> {item.owner}</span>}
        {item.timeline && <span><strong>Timeline:</strong> {item.timeline}</span>}
        {item.estimatedTimeline && <span><strong>Timeline:</strong> {item.estimatedTimeline}</span>}
        {item.kpis && <span><strong>KPIs:</strong> {Array.isArray(item.kpis) ? item.kpis.join(', ') : item.kpis}</span>}
        {item.expectedKPI && <span><strong>Expected KPI:</strong> {item.expectedKPI}</span>}
        {item.dependencies && <span><strong>Dependencies:</strong> {Array.isArray(item.dependencies) ? item.dependencies.join(', ') : item.dependencies}</span>}
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

      <Card>
        <h4 style={{ marginBottom: '15px' }}>Download Report</h4>
        <ReportPreview chatId={chatId} />
      </Card>

      {data.evidence && <DataQualityPanel evidence={data.evidence} />}
    </div>
  );
}

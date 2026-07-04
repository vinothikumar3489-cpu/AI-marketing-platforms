import { useEffect, useState } from 'react';
import { api, downloadReport } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asNumber, asText, asInsight } from '../lib/normalizers';
import { Badge, Card, EmptyState, Loading, PageHeader, ScoreCard, SectionTitle, InsightCard, PersonaCard, CompetitorCard } from '../components/UI';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { Shield, Target, Users, TrendingUp, Zap, Map, Info, Box, Briefcase, Activity, CheckCircle, Flame, Droplets, Snowflake } from 'lucide-react';

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

const tabs = ['Executive Snapshot', 'Executive Story', 'Product DNA', 'Market Intelligence', 'Audience Intelligence', 'Competitor Intelligence', 'Intent Prediction', 'Positioning Strategy', 'Campaign Strategy', 'Channel Strategy', 'Action Plan'];

export default function GrowthWorkspacePage() {
  const { selectedChatId, createChat, loadFullResults, fullResults, clearSelection } = useProject();
  const [form, setForm] = useState(defaults);
  const [activeTab, setActiveTab] = useState('Executive Snapshot');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>({});
  const [mode, setMode] = useState<'form' | 'running' | 'results' | 'error'>('form');

  useEffect(() => {
    let cancelled = false;
    const r = fullResults.growth || {};
    
    const hasGrowthData = 
      r.product || r.market || r.audience || r.competitor || r.intent || r.positioning || r.campaign || r.channel || r.executiveStory || r.actionPlan;
    
    if (!cancelled) {
      if (hasGrowthData) {
        setResults(r);
        setMode('results');
      } else {
        setResults({});
        setMode('form');
        setStep(1);
      }
    }
    return () => { cancelled = true; };
  }, [fullResults]);

  async function run() {
    if (!form.websiteUrl) {
      setError('Website URL is required.');
      return;
    }
    setError(''); 
    setLoading(true);
    setMode('running');
    try {
      let chatId = selectedChatId;
      // Force create a new chat if URL changes
      const projectUrl = fullResults?.profile?.websiteUrl || fullResults?.chat?.websiteUrl;
      if (!chatId || (projectUrl && !form.websiteUrl.includes(projectUrl.replace(/^https?:\/\//, '').split('/')[0]))) {
        chatId = await createChat(form.websiteUrl.replace(/^https?:\/\//, '').split('/')[0]);
      }
      
      const res: any = await api.post(`/chats/${chatId}/growth-workspace/run-full-analysis`, form);
      const data = res.results || res.data?.results || res;
      setResults(data);
      
      // CRITICAL: Load full results from database after analysis completes
      await loadFullResults(chatId);
      
      // Only set mode to results after full results are loaded
      setMode('results');
    } catch (e: any) {
      setError(e.message || 'Analysis failed');
      setMode('error');
    } finally {
      setLoading(false);
    }
  }

  function handleNewAnalysis() {
    clearSelection();
    setForm(defaults);
    setResults({});
    setError('');
    setMode('form');
    setStep(1);
  }

  const hasData = 
    results.product || 
    results.market || 
    results.audience || 
    results.competitor || 
    results.intent || 
    results.positioning || 
    results.campaign || 
    results.channel || 
    results.executiveStory || 
    results.actionPlan;

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
        {mode === 'results' && (
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
      
      {mode === 'form' && !loading && (
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
      
      {mode === 'running' && <Loading text="Agentic pipeline active: Scraping web -> Normalizing -> Extracting Insights -> Cross-referencing evidence..." />}
      
      {mode === 'results' && hasData && (
        <Card>
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
          </div>
        </Card>
      )}


    </div>
  );
}

// ----------------------------------------------------------------------
// TAB COMPONENTS
// ----------------------------------------------------------------------

function ExecutiveSnapshot({ results }: { results: any }) {
  const sum = results.summary || results.growthSummary || null;
  
  // Only show scores if summary exists with actual values
  const hasScores = sum && (
    sum.overallGrowthScore !== null ||
    sum.marketOpportunityScore !== null ||
    sum.campaignViabilityScore !== null ||
    sum.productFitScore !== null ||
    sum.marketSizeScore !== null ||
    sum.audienceClarityScore !== null ||
    sum.competitiveDefensibilityScore !== null ||
    sum.campaignReadinessScore !== null
  );
  
  const radarData = hasScores ? [
    { subject: 'Product Fit', A: asNumber(sum.productFitScore || results.product?.confidenceScore), fullMark: 100 },
    { subject: 'Market Size', A: asNumber(sum.marketSizeScore || results.market?.confidenceScore), fullMark: 100 },
    { subject: 'Audience Clarity', A: asNumber(sum.audienceClarityScore || results.audience?.confidenceScore), fullMark: 100 },
    { subject: 'Competitive Defensibility', A: asNumber(sum.competitiveDefensibilityScore || results.competitor?.confidenceScore), fullMark: 100 },
    { subject: 'Campaign Readiness', A: asNumber(sum.campaignReadinessScore || results.campaign?.confidenceScore), fullMark: 100 },
  ].filter(d => d.A !== null) : [];

  if (!hasScores) {
    return (
      <EmptyState 
        title="Executive Snapshot Not Available" 
        text="Run Growth Workspace analysis to generate executive snapshot scores and recommendations."
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="score-grid">
        <ScoreCard label="Growth Index" value={asNumber(sum.overallGrowthScore || results.product?.confidenceScore)} />
        <ScoreCard label="Market Opportunity" value={asNumber(sum.marketOpportunityScore || results.market?.demandScore)} tone="blue" />
        <ScoreCard label="Campaign Viability" value={asNumber(sum.campaignViabilityScore || results.campaign?.confidenceScore)} tone="green" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <Card style={{ height: '350px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Map size={18} /> Business Readiness Radar</h3>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#293245" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9aa7bd', fontSize: 12 }} />
              <Radar name="Confidence Score" dataKey="A" stroke="#10e18b" fill="#10e18b" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        
        <div style={{ display: 'grid', gap: '20px' }}>
          <InsightCard insight={asInsight(sum.topRecommendation, 'Top Recommendation')} icon={Zap} />
          <InsightCard insight={asInsight(sum.primaryRisk, 'Primary Risk')} icon={Shield} />
          <InsightCard insight={asInsight(sum.immediateAction, 'Immediate Action')} icon={Target} />
        </div>
      </div>
    </div>
  );
}

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

function MarketIntelligence({ data }: { data: any }) {
  const market = data || {};
  if (!market || Object.keys(market).length === 0) return <EmptyState title="No Market Data" />;
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div className="score-grid">
        <ScoreCard label="TAM (Total Addressable)" value={asText(market.tam || 'N/A')} tone="purple" />
        <ScoreCard label="SAM (Serviceable)" value={asText(market.sam || 'N/A')} tone="blue" />
        <ScoreCard label="SOM (Obtainable)" value={asText(market.som || 'N/A')} tone="green" />
        <ScoreCard label="Industry CAGR" value={asText(market.cagr || 'N/A')} tone="pink" />
      </div>

      <SectionTitle title="Macro Trends (PESTEL)" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        {asArray(market.marketTrends).map((t: any, i) => (
          <InsightCard key={i} insight={asInsight(t, `Trend ${i+1}`)} icon={TrendingUp} />
        ))}
      </div>

      <SectionTitle title="Market Opportunities & Risks" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
        {asArray(market.opportunities).map((o: any, i) => (
          <InsightCard key={`o${i}`} insight={asInsight(o, `Opportunity ${i+1}`)} icon={Target} />
        ))}
        {asArray(market.risks).map((r: any, i) => (
          <InsightCard key={`r${i}`} insight={asInsight(r, `Risk ${i+1}`)} icon={Shield} />
        ))}
      </div>
    </div>
  );
}

function AudienceIntelligence({ data }: { data: any }) {
  const audience = data || {};
  if (!audience || Object.keys(audience).length === 0) return <EmptyState title="No Audience Data" />;
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionTitle title="Buyer Personas" subtitle="Detailed psychological profiles of your Ideal Customer Profiles (ICPs)." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {asArray(audience.buyerPersonas || audience.personas || []).map((p: any, i) => (
          <PersonaCard key={i} persona={p} />
        ))}
      </div>
    </div>
  );
}

function CompetitorIntelligence({ data }: { data: any }) {
  const competitor = data || {};
  if (!competitor || Object.keys(competitor).length === 0) return <EmptyState title="No Competitor Data" />;
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionTitle title="Competitor War Room" subtitle="Direct threats and their market positioning." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {asArray(competitor.directCompetitors).map((c: any, i) => (
          <CompetitorCard key={i} competitor={c} />
        ))}
      </div>

      <Card>
        <h3>Market Gaps & Exploitable Weaknesses</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginTop: '15px' }}>
           {asArray(competitor.marketGaps).map((g: any, i) => (
            <InsightCard key={`g${i}`} insight={asInsight(g, `Market Gap ${i+1}`)} icon={Activity} />
          ))}
           {asArray(competitor.competitorWeaknesses).map((w: any, i) => (
            <InsightCard key={`w${i}`} insight={asInsight(w, `Weakness ${i+1}`)} icon={Shield} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function IntentPrediction({ data }: { data: any }) {
  const intent = data || {};
  if (!intent || Object.keys(intent).length === 0) return <EmptyState title="No Intent Data" />;
  
  const hot = asArray(intent.hotSegments).slice(0, 3);
  const warm = asArray(intent.warmSegments).slice(0, 3);
  const cold = asArray(intent.coldSegments).slice(0, 3);

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionTitle title="Intent Funnel" subtitle="Real-time buying readiness segments based on predictive AI." />
      
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

function CampaignStrategy({ data }: { data: any }) {
  const campaign = data || {};
  if (!campaign || Object.keys(campaign).length === 0) return <EmptyState title="No Campaign Data" />;
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <SectionTitle title="Campaign Concepts" subtitle="Creative directions with projected CTR and CPA." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        {asArray(campaign.creativeAngles).map((c: any, i) => (
          <Card key={i}>
             <h3>Angle {i+1}</h3>
             <p style={{ color: '#9aa7bd', fontSize: '13px' }}>{asText(c.value || c.angle || c)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h3>Ad Hooks & Copy</h3>
        <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
          {asArray(campaign.copyHooks).map((h: any, i) => (
            <div key={i} style={{ padding: '10px', background: '#151d2b', borderRadius: '8px', borderLeft: '3px solid #a855f7' }}>
              {asText(h.value || h.hook || h)}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ChannelStrategy({ data }: { data: any }) {
  const channel = data || {};
  if (!channel || Object.keys(channel).length === 0) return <EmptyState title="No Channel Data" />;
  
  // Deduplicate channels by channelName
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

function ExecutiveStory({ data }: { data: any }) {
  const story = data || {};
  if (!story || Object.keys(story).length === 0) return <EmptyState title="No Executive Story" />;
  
  if (import.meta.env.DEV) { console.log('[Growth Page] Executive Story keys', Object.keys(story || {})); }
  
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card>
        <h3>Executive Story</h3>
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {story.companyOverview && (
            <div>
              <h4 style={{ color: '#a855f7', margin: '0 0 10px 0' }}>Company Overview</h4>
              <div style={{ padding: '15px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245' }}>
                <p style={{ margin: 0, color: '#9aa7bd' }}>
                  <strong>Name:</strong> {asText(story.companyOverview.name)}<br/>
                  <strong>Website:</strong> {asText(story.companyOverview.website)}<br/>
                  <strong>Industry:</strong> {asText(story.companyOverview.industry)}
                </p>
              </div>
            </div>
          )}
          
          {story.productSummary && (
            <div>
              <h4 style={{ color: '#10e18b', margin: '0 0 10px 0' }}>Product Summary</h4>
              <div style={{ padding: '15px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245' }}>
                <p style={{ margin: '0 0 10px', color: '#9aa7bd' }}>
                  <strong>USP:</strong> {asText(story.productSummary.usp)}
                </p>
                {asArray(story.productSummary.features).length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <strong style={{ color: '#fff' }}>Key Features:</strong>
                    <ul style={{ margin: '5px 0 0 20px', color: '#9aa7bd' }}>
                      {asArray(story.productSummary.features).map((f: any, i: number) => (
                        <li key={i}>{asText(f.value || f)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {story.marketSummary && (
            <div>
              <h4 style={{ color: '#53a7ff', margin: '0 0 10px 0' }}>Market Summary</h4>
              <div style={{ padding: '15px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245' }}>
                <p style={{ margin: 0, color: '#9aa7bd' }}>
                  <strong>Demand Score:</strong> {asNumber(story.marketSummary.demandScore)}/100<br/>
                  <strong>TAM:</strong> {asText(story.marketSummary.tam)}
                </p>
              </div>
            </div>
          )}

          {story.finalRecommendation && (
            <div style={{ padding: '20px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '8px', border: '1px solid #a855f7' }}>
              <h4 style={{ color: '#a855f7', margin: '0 0 10px 0' }}>Final Recommendation</h4>
              <p style={{ margin: 0, color: '#fff', fontSize: '15px' }}>{asText(story.finalRecommendation)}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function ActionPlan({ data }: { data: any }) {
  const actionPlan = data || {};
  if (!actionPlan || Object.keys(actionPlan).length === 0) return <EmptyState title="No Action Plan" />;
  
  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card>
        <h3>Executive Roadmap</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          {[
            { label: 'Immediate', items: asArray(actionPlan.immediate) },
            { label: 'Day 7', items: asArray(actionPlan.day7 || actionPlan.sevenDay) },
            { label: 'Day 30', items: asArray(actionPlan.day30 || actionPlan.thirtyDay) },
            { label: 'Day 60', items: asArray(actionPlan.day60 || actionPlan.sixtyDay) },
            { label: 'Day 90', items: asArray(actionPlan.day90 || actionPlan.ninetyDay) }
          ].map((phase, idx) => {
            if (phase.items.length === 0) return null;
            
            return (
              <div key={phase.label} style={{ borderLeft: '4px solid #a855f7', paddingLeft: '20px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-12px', top: '0', width: '20px', height: '20px', background: '#a855f7', borderRadius: '50%' }}></div>
                <h4 style={{ color: '#a855f7', margin: '0 0 10px 0' }}>{phase.label}</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {phase.items.map((item: any, i) => (
                    <div key={i} style={{ padding: '15px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '15px', color: '#fff' }}>{asText(item.title || item)}</strong>
                        <Badge className="blue">{asText(item.priority || 'High')}</Badge>
                      </div>
                      {item.problem && (
                        <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '8px' }}>
                          <span style={{ color: '#ff4757', fontWeight: 'bold' }}>Problem:</span> {asText(item.problem)}
                        </div>
                      )}
                      {item.businessImpact && (
                        <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '8px' }}>
                          <span style={{ color: '#10e18b', fontWeight: 'bold' }}>Impact:</span> {asText(item.businessImpact)}
                        </div>
                      )}
                      {item.expectedGain && (
                        <div style={{ fontSize: '13px', color: '#9aa7bd', marginBottom: '8px' }}>
                          <span style={{ color: '#53a7ff', fontWeight: 'bold' }}>Expected Gain:</span> {asText(item.expectedGain)}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '15px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1d2738', fontSize: '12px', color: '#9aa7bd' }}>
                        {item.difficulty && <span><b>Difficulty:</b> {asText(item.difficulty)}</span>}
                        {item.estimatedTimeline && <span><b>Timeline:</b> {asText(item.estimatedTimeline)}</span>}
                        {item.owner && <span><b>Owner:</b> {asText(item.owner)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
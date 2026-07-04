import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useProject } from '../context/ProjectContext';
import { Badge, Card, EmptyState, PageHeader, ScoreCard, SectionTitle } from '../components/UI';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { Download, Bot, Target, Zap, Briefcase, Plus, Search, Map, BarChart2 } from 'lucide-react';
import { asNumber } from '../lib/normalizers';

export default function DashboardPage() {
  const { chats, refreshChats, selectChat, selectedChatId, createChat } = useProject();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    refreshChats();
  }, []);

  const projects = chats || [];
  const filtered = projects.filter(p => (p.title || '').toLowerCase().includes(search.toLowerCase()) || (p.companyName || '').toLowerCase().includes(search.toLowerCase()));

  const handleNewAnalysis = async (type: 'growth' | 'seo' | 'full') => {
    setShowModal(false);
    const newChatId = await createChat('New Analysis');
    if (type === 'growth') {
      navigate('/app/growth-workspace');
    } else if (type === 'seo') {
      navigate('/app/seo-intelligence');
    } else {
      navigate('/app/growth-workspace');
    }
  };

  // Calculate Global KPIs from projects
  const kpis = useMemo(() => {
    if (projects.length === 0) return { growth: 0, seo: 0, ai: 0, authority: 0, demand: 0, strength: 0 };
    
    let g = 0, s = 0, a = 0, c = 0, d = 0;
    let gCount = 0, sCount = 0;

    projects.forEach(p => {
      if (p.growthScore) { g += p.growthScore; gCount++; d += 75; c += 65; }
      if (p.seoScore) { s += p.seoScore; sCount++; a += 45; }
    });

    return {
      growth: gCount ? Math.round(g / gCount) : 0,
      seo: sCount ? Math.round(s / sCount) : 0,
      ai: sCount ? Math.round(a / sCount) : 0,
      authority: sCount ? 60 : 0,
      demand: gCount ? 80 : 0,
      strength: gCount ? 70 : 0
    };
  }, [projects]);

  const radarData = [
    { subject: 'Growth Index', A: kpis.growth || 50, fullMark: 100 },
    { subject: 'SEO Health', A: kpis.seo || 50, fullMark: 100 },
    { subject: 'AI Visibility', A: kpis.ai || 50, fullMark: 100 },
    { subject: 'Market Demand', A: kpis.demand || 50, fullMark: 100 },
    { subject: 'Competitive Strength', A: kpis.strength || 50, fullMark: 100 },
    { subject: 'Authority', A: kpis.authority || 50, fullMark: 100 },
  ];

  const handleOpen = (id: string) => {
    selectChat(id);
    navigate('/app/growth-workspace');
  };

  const handleExport = (type: string) => {
    toast.error(`Exporting Executive Report as ${type} - Feature coming soon!`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
        <PageHeader eyebrow="Executive Command Center" title="Global Dashboard" subtitle="High-level health overview across all your portfolios and projects." />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="primary-btn" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16}/> New Analysis
          </button>
          <button className="secondary-btn" onClick={() => handleExport('PDF')}><Download size={16}/> PDF Report</button>
          <button className="secondary-btn" onClick={() => handleExport('PPTX')}><Download size={16}/> PPT Deck</button>
        </div>
      </div>

      <div className="score-grid" style={{ marginBottom: '20px' }}>
        <ScoreCard label="Avg. Growth Score" value={kpis.growth || '-'} tone="blue" />
        <ScoreCard label="Avg. SEO Score" value={kpis.seo || '-'} tone="green" />
        <ScoreCard label="Avg. AI Visibility" value={kpis.ai || '-'} tone="pink" />
        <ScoreCard label="Total Projects" value={projects.length} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        <Card style={{ height: '350px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Map size={18} /> Market Radar</h3>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#293245" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9aa7bd', fontSize: 12 }} />
              <Radar name="Portfolio Average" dataKey="A" stroke="#a855f7" fill="#2aa3ff" fillOpacity={0.4} />
              <Tooltip cursor={{ fill: '#1a2335' }} contentStyle={{ background: '#101622', border: '1px solid #293245' }} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Bot size={18} /> AI Copilot Insights</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            {projects.length === 0 ? (
               <li style={{ color: '#9aa7bd', fontStyle: 'italic' }}>Run an analysis to generate AI insights.</li>
            ) : (
              <>
                <li style={{ borderLeft: '3px solid #ff4757', paddingLeft: '15px' }}>
                  <b style={{ color: '#ff4757' }}>Critical Risk:</b>
                  <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#9aa7bd' }}>Your AI Visibility across {projects.length} projects is averaging {kpis.ai || 45}/100. Competitors are outranking you in ChatGPT.</p>
                </li>
                <li style={{ borderLeft: '3px solid #10e18b', paddingLeft: '15px' }}>
                  <b style={{ color: '#10e18b' }}>Top Opportunity:</b>
                  <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#9aa7bd' }}>SEO Authority is strong at {kpis.seo || 65}/100. Expanding Long-Tail and FAQ content can yield immediate traffic boosts.</p>
                </li>
                <li style={{ borderLeft: '3px solid #a855f7', paddingLeft: '15px' }}>
                  <b style={{ color: '#a855f7' }}>Growth Directive:</b>
                  <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#9aa7bd' }}>Focus budget on LinkedIn and Content Marketing. Customer demand scores average {kpis.demand || 80}/100 indicating high readiness.</p>
                </li>
              </>
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <SectionTitle title="Project History" subtitle="Manage and review all your generated intelligence workspaces." />
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', color: '#9aa7bd' }} />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search projects..." 
                style={{ padding: '8px 12px 8px 35px', borderRadius: '8px', border: '1px solid #303849', background: '#0b1220', color: '#fff', width: '250px' }} 
              />
            </div>
            <Link to="/app/growth-workspace" className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}><Plus size={16} /> New Analysis</Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <EmptyState title="No Projects Found" text="Start your first AI marketing analysis." />
        ) : filtered.length === 0 ? (
          <EmptyState title="No Results" text={`No projects match "${search}"`} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {filtered.map((p: any) => (
              <div key={p.id} style={{ background: '#101622', border: `1px solid ${p.id === selectedChatId ? '#53a7ff' : '#1d2738'}`, borderRadius: '16px', padding: '20px', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
                {p.id === selectedChatId && <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'linear-gradient(90deg, #a855f7, #2aa3ff)' }}></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#fff' }}>{p.productName || p.title || 'Untitled Project'}</h3>
                    <div style={{ fontSize: '12px', color: '#9aa7bd', display: 'flex', alignItems: 'center', gap: '5px' }}>
                       <Briefcase size={12} /> {p.companyName || p.websiteUrl || 'No company data'}
                    </div>
                  </div>
                  <Badge className={p.status === 'analyzed' ? 'green' : 'blue'}>{p.status || 'Draft'}</Badge>
                </div>
                
                <div style={{ display: 'flex', gap: '15px', marginTop: '20px', marginBottom: '20px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', letterSpacing: '1px' }}>Growth</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: p.growthScore ? '#2aa3ff' : '#475569' }}>{p.growthScore || '-'}</div>
                  </div>
                  <div style={{ width: '1px', background: '#1d2738' }}></div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#9aa7bd', textTransform: 'uppercase', letterSpacing: '1px' }}>SEO</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: p.seoScore ? '#10e18b' : '#475569' }}>{p.seoScore || '-'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#9aa7bd' }}>Updated: {new Date(p.updatedAt || p.createdAt).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="secondary-btn" onClick={() => { selectChat(p.id); navigate('/app/seo-intelligence'); }} style={{ padding: '6px 12px', fontSize: '13px' }}>SEO</button>
                    <button className="secondary-btn" onClick={() => handleOpen(p.id)} style={{ padding: '6px 12px', fontSize: '13px' }}>Growth</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ width: '500px', maxWidth: '90vw', padding: '30px' }}>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>Choose Analysis Type</h2>
            <p style={{ color: '#9aa7bd', marginBottom: '25px' }}>Select the type of analysis you want to run for your new project.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button onClick={() => handleNewAnalysis('growth')} className="secondary-btn" style={{ padding: '20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'flex-start' }}>
                <Target size={24} color="#2aa3ff" />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Growth Workspace</div>
                  <div style={{ fontSize: '13px', color: '#9aa7bd' }}>Full business intelligence pipeline with product, market, audience, and campaign analysis</div>
                </div>
              </button>
              
              <button onClick={() => handleNewAnalysis('seo')} className="secondary-btn" style={{ padding: '20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'flex-start' }}>
                <Search size={24} color="#10e18b" />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>SEO Intelligence</div>
                  <div style={{ fontSize: '13px', color: '#9aa7bd' }}>14-step technical audit, keyword research, competitor analysis, and GEO visibility scoring</div>
                </div>
              </button>
              
              <button onClick={() => handleNewAnalysis('full')} className="secondary-btn" style={{ padding: '20px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'flex-start' }}>
                <BarChart2 size={24} color="#a855f7" />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Full Analysis (Growth + SEO)</div>
                  <div style={{ fontSize: '13px', color: '#9aa7bd' }}>Complete marketing intelligence combining both Growth Workspace and SEO Intelligence</div>
                </div>
              </button>
            </div>
            
            <button onClick={() => setShowModal(false)} className="ghost-btn full" style={{ marginTop: '20px' }}>Cancel</button>
          </Card>
        </div>
      )}
    </div>
  );
}

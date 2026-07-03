import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asText } from '../lib/normalizers';
import { Badge, Card, EmptyState, PageHeader, Status } from '../components/UI';

const tabs = ['Plan','Email','LinkedIn','Instagram','Creative','Video','Leads','Approval','Accounts','Workflow'];

function renderPlanTab(data: any) {
  if (!data || !data.campaignName) return <EmptyState title="No plan generated" text="Click Generate Automation Plan." />;
  return (
    <div>
      <Card>
        <h3>{data.campaignName}</h3>
        <p><b>Objective:</b> {data.campaignObjective || 'N/A'}</p>
        {data.targetAudience && (
          <div>
            <p><b>Target Audience:</b> {data.targetAudience.primary || asText(data.targetAudience)}</p>
            {data.targetAudience.demographics && <p><b>Demographics:</b> {data.targetAudience.demographics}</p>}
            {data.targetAudience.interests && <p><b>Interests:</b> {data.targetAudience.interests.join(', ')}</p>}
            {data.targetAudience.painPoints && <p><b>Pain Points:</b> {data.targetAudience.painPoints.join(', ')}</p>}
          </div>
        )}
      </Card>
      {data.channels && Array.isArray(data.channels) && (
        <Card>
          <h3>Channels</h3>
          {data.channels.map((ch: any, i: number) => (
            <p key={i}>• <b>{ch.channel || ch.name}</b> — {ch.priority || 'medium'} priority{ch.reason ? ` (${ch.reason})` : ''}</p>
          ))}
        </Card>
      )}
      {data.weeklyPlan && (
        <Card>
          <h3>Weekly Plan</h3>
          {Object.entries(data.weeklyPlan).map(([day, task]: any) => (
            <p key={day}><b>{day}:</b> {task}</p>
          ))}
        </Card>
      )}
      {data.kpis && (
        <Card>
          <h3>KPIs</h3>
          {Object.entries(data.kpis).map(([k, v]: any) => (
            <p key={k}><b>{k}:</b> {v}</p>
          ))}
        </Card>
      )}
      {data.budgetSplit && (
        <Card>
          <h3>Budget Split</h3>
          {Object.entries(data.budgetSplit).map(([ch, pct]: any) => (
            <p key={ch}>• {ch}: {pct}</p>
          ))}
        </Card>
      )}
      {data.isFallback && <Badge tone="yellow">Heuristic fallback — AI unavailable</Badge>}
    </div>
  );
}

function renderEmailTab(data: any) {
  const emails = asArray(data.emailSequence);
  if (!emails.length) return <EmptyState title="No email assets" text="Generate an automation plan first." />;
  return (
    <div>
      {emails.map((email: any, i: number) => (
        <Card key={i}>
          <h3>{email.subject || `Email ${i + 1}`}</h3>
          {email.previewText && <p><b>Preview:</b> {email.previewText}</p>}
          <p><b>Body:</b> {email.body?.substring(0, 200)}{email.body?.length > 200 ? '...' : ''}</p>
          {email.cta && <p><b>CTA:</b> {email.cta}</p>}
          {email.day && <p><b>Day:</b> {email.day}</p>}
        </Card>
      ))}
    </div>
  );
}

function renderLinkedInTab(data: any) {
  const posts = asArray(data.linkedInPosts);
  if (!posts.length) return <EmptyState title="No LinkedIn posts" text="Generate an automation plan first." />;
  return (
    <div>
      {posts.map((post: any, i: number) => (
        <Card key={i}>
          <h3>{post.title || `Post ${i + 1}`}</h3>
          {post.format && <p><b>Format:</b> {post.format}</p>}
          <p><b>Content:</b> {post.content?.substring(0, 300)}{post.content?.length > 300 ? '...' : ''}</p>
          {post.bestTime && <p><b>Best Time:</b> {post.bestTime}</p>}
        </Card>
      ))}
    </div>
  );
}

function renderInstagramTab(data: any) {
  const captions = asArray(data.instagramCaptions);
  if (!captions.length) return <EmptyState title="No Instagram content" text="Generate an automation plan first." />;
  return (
    <div>
      {captions.map((cap: any, i: number) => (
        <Card key={i}>
          <h3>{cap.title || `Post ${i + 1}`}</h3>
          {cap.postType && <p><b>Type:</b> {cap.postType}</p>}
          <p><b>Caption:</b> {cap.caption?.substring(0, 250)}{cap.caption?.length > 250 ? '...' : ''}</p>
          {cap.hashtags && Array.isArray(cap.hashtags) && <p><b>Hashtags:</b> {cap.hashtags.join(', ')}</p>}
        </Card>
      ))}
    </div>
  );
}

function renderCreativeTab(data: any) {
  const posters = asArray(data.posterPrompts);
  const images = asArray(data.imageAdIdeas);
  if (!posters.length && !images.length) return <EmptyState title="No creative assets" text="Generate an automation plan first." />;
  return (
    <div>
      {posters.length > 0 && (
        <Card><h3>Poster Prompts</h3>
          {posters.map((p: any, i: number) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <p><b>{p.title}</b> ({p.format || 'N/A'})</p>
              <p>{p.prompt?.substring(0, 200)}{p.prompt?.length > 200 ? '...' : ''}</p>
            </div>
          ))}
        </Card>
      )}
      {images.length > 0 && (
        <Card><h3>Image Ad Ideas</h3>
          {images.map((img: any, i: number) => (
            <p key={i}>• <b>{img.title}</b> — {img.description}</p>
          ))}
        </Card>
      )}
      {data.designStyles && (
        <Card><h3>Design Styles</h3>
          {data.designStyles.colors && <p><b>Colors:</b> {data.designStyles.colors.join(', ')}</p>}
          {data.designStyles.fonts && <p><b>Fonts:</b> {data.designStyles.fonts.join(', ')}</p>}
          {data.designStyles.style && <p><b>Style:</b> {data.designStyles.style}</p>}
          {data.designStyles.mood && <p><b>Mood:</b> {data.designStyles.mood}</p>}
        </Card>
      )}
    </div>
  );
}

function renderVideoTab(data: any) {
  const scripts = asArray(data.videoScripts);
  if (!scripts.length) return <EmptyState title="No video assets" text="Generate an automation plan first." />;
  return (
    <div>
      {scripts.map((vs: any, i: number) => (
        <Card key={i}>
          <h3>{vs.title || `Video ${i + 1}`}</h3>
          {vs.duration && <p><b>Duration:</b> {vs.duration}</p>}
          <p><b>Script:</b> {vs.script?.substring(0, 400)}{vs.script?.length > 400 ? '...' : ''}</p>
          {vs.voiceover && <p><b>Voiceover:</b> {vs.voiceover}</p>}
          {vs.cta && <p><b>CTA:</b> {vs.cta}</p>}
        </Card>
      ))}
    </div>
  );
}

function renderLeadsTab(data: any) {
  if (!data.idealLeadProfile && !asArray(data.sampleLeads).length) {
    return <EmptyState title="No lead data" text="Generate an automation plan first." />;
  }
  return (
    <div>
      {data.idealLeadProfile && (
        <Card><h3>Ideal Lead Profile</h3>
          {Object.entries(data.idealLeadProfile).map(([k, v]: any) => (
            <p key={k}><b>{k}:</b> {Array.isArray(v) ? v.join(', ') : asText(v)}</p>
          ))}
        </Card>
      )}
      {data.leadSources && Array.isArray(data.leadSources) && (
        <Card><h3>Lead Sources</h3>
          {data.leadSources.map((ls: any, i: number) => (
            <p key={i}>• <b>{ls.source}</b> — {ls.priority || 'medium'} priority ({ls.cost || 'N/A'})</p>
          ))}
        </Card>
      )}
      {asArray(data.sampleLeads).length > 0 && (
        <Card><h3>Sample Leads</h3>
          {asArray(data.sampleLeads).map((lead: any, i: number) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <p><b>{lead.name}</b> — {lead.title} at {lead.company} <Badge tone={lead.score === 'A' ? 'green' : 'yellow'}>{lead.score}</Badge></p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function renderApprovalTab(data: any) {
  return (
    <div>
      <Card><h3>Asset Approval Flow</h3>
        <p>Review, approve, or schedule assets from the generated plan.</p>
        <p><b>Plan Status:</b> {data.status || 'N/A'}</p>
        <p><b>Readiness Score:</b> {data.readinessScore != null ? `${data.readinessScore}%` : 'N/A'}</p>
        {data.fallbackUsed && <Badge tone="yellow">Generated from fallback — review carefully</Badge>}
      </Card>
    </div>
  );
}

function renderAccountsTab() {
  return (
    <div className="account-grid">
      {['LinkedIn','Instagram','Gmail','Facebook','Google Ads'].map(a => (
        <Card key={a}>
          <h3>{a}</h3>
          <Badge tone="yellow">Coming soon</Badge>
          <p>OAuth connection will be added later.</p>
        </Card>
      ))}
    </div>
  );
}

function WorkflowTabContent() {
  const { selectedChatId } = useProject();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedChatId) return;
    let cancelled = false;
    api.get(`/chats/${selectedChatId}/workflow/status`).then((r: any) => { if (!cancelled) setStatus(r); }).catch((e) => { if (!cancelled) console.warn('Workflow status load failed:', e); });
    return () => { cancelled = true; };
  }, [selectedChatId]);

  async function startWorkflow() {
    if (!selectedChatId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.post(`/chats/${selectedChatId}/workflow/start`, {});
      setStatus(res);
      if (!res.success && res.error) setError(res.error);
    } catch (e: any) {
      setError(e.message || 'Failed to start workflow');
    }
    setLoading(false);
  }

  async function executeStep(stepType: string) {
    if (!selectedChatId) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/chats/${selectedChatId}/workflow/step`, { stepType });
      const newStatus: any = await api.get(`/chats/${selectedChatId}/workflow/status`);
      setStatus(newStatus);
    } catch (e: any) {
      setError(e.message || 'Failed to execute step');
    }
    setLoading(false);
  }

  const stepTypes = ['check_readiness','automation_plan','asset_review','solution_generate','approval_pending'];
  const steps = status?.steps || [];
  const completedSteps = steps.filter((s: any) => s.status === 'completed').length;

  return (
    <div>
      <Card>
        <h3>Workflow Execution</h3>
        <p>Run a complete marketing workflow or execute individual steps.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
          <button className="primary-btn" onClick={startWorkflow} disabled={loading}>
            {loading ? 'Running...' : 'Start Workflow'}
          </button>
          {stepTypes.map((st) => (
            <button key={st} className="secondary-btn" onClick={() => executeStep(st)} disabled={loading} style={{ fontSize: '0.85em' }}>
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {status?.workflowComplete && <p style={{ color: 'green', marginTop: '8px' }}>Workflow complete.</p>}
      </Card>

      {error && (
        <Card>
          <p style={{ color: 'red', margin: 0 }}>{error}</p>
        </Card>
      )}

      {status?.progress && (
        <Card>
          <h3>Progress</h3>
          <p>{completedSteps} / {status.progress.total} steps completed</p>
        </Card>
      )}

      <Card>
        <h3>Steps</h3>
        {steps.length === 0 ? (
          <p>No workflow steps executed yet. Click "Start Workflow" to begin.</p>
        ) : (
          steps.map((step: any, i: number) => (
            <div key={i} style={{ marginBottom: '10px', borderBottom: i < steps.length - 1 ? '1px solid #eee' : 'none', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <b>{step.step.replace(/_/g, ' ')}</b>
                <Badge tone={step.status === 'completed' ? 'green' : step.status === 'running' ? 'blue' : step.status === 'failed' ? 'red' : 'yellow'}>
                  {step.status}
                </Badge>
                {step.createdAt && <span style={{ fontSize: '0.8em', color: '#888' }}>{new Date(step.createdAt).toLocaleString()}</span>}
              </div>
              {step.output?.error && <p style={{ color: 'red', fontSize: '0.9em', margin: '4px 0 0' }}>{step.output.error}</p>}
              {step.output?.planId && <p style={{ fontSize: '0.85em', color: '#555', margin: '4px 0 0' }}>Plan: {step.output.planId} ({step.output.assetCount} assets)</p>}
              {step.output?.modules && <p style={{ fontSize: '0.85em', color: '#555', margin: '4px 0 0' }}>Modules ready: {step.output.count}/{Object.keys(step.output.modules).length}</p>}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function renderWorkflowTab(_data: any) {
  return <WorkflowTabContent />;
}

const tabRenderers: Record<string, (d: any) => JSX.Element> = {
  Plan: renderPlanTab,
  Email: renderEmailTab,
  LinkedIn: renderLinkedInTab,
  Instagram: renderInstagramTab,
  Creative: renderCreativeTab,
  Video: renderVideoTab,
  Leads: renderLeadsTab,
  Approval: renderApprovalTab,
  Accounts: renderAccountsTab,
  Workflow: renderWorkflowTab,
};

export default function AutomationCenterPage() {
  const { selectedChatId } = useProject();
  const [active, setActive] = useState('Plan');
  const [data, setData] = useState<any>({});
  useEffect(() => {
    if (!selectedChatId) return;
    let cancelled = false;
    api.get(`/automation/${selectedChatId}/plan`).then((r: any) => { if (!cancelled) setData(r.automationPlan || r.data || r); }).catch((e) => { if (!cancelled) console.warn('Failed to load automation plan:', e); });
    return () => { cancelled = true; };
  }, [selectedChatId]);
  async function generate() {
    if (!selectedChatId) return;
    try {
      const res: any = await api.post(`/automation/${selectedChatId}/generate`, {});
      setData(res.automationPlan || res.data || res);
    } catch (e) {
      console.warn('Failed to generate automation plan:', e);
    }
  }
  const renderer = tabRenderers[active] || renderPlanTab;
  return (
    <div>
      <PageHeader eyebrow="Automation Center" title="Automation Command Center" subtitle="Generate and manage cross-channel marketing execution." />
      <Card>
        <div className="readiness">
          <Status ok={!!selectedChatId} label="Project selected" />
          <Status ok={!!data} label="Automation plan ready" />
        </div>
        <button className="primary-btn" onClick={generate}>Generate Automation Plan</button>
      </Card>
      <Card>
        <div className="tab-row">
          {tabs.map(t => (
            <button key={t} className={active === t ? 'active' : ''} onClick={() => setActive(t)}>{t}</button>
          ))}
        </div>
        <h2>{active} Automation</h2>
        {renderer(data)}
      </Card>
    </div>
  );
}

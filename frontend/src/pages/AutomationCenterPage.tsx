import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asText, renderSafeValue } from '../lib/normalizers';
import SafeValue from '../components/SafeValue';
import { Badge, Card, EmptyState, Loading, PageHeader } from '../components/UI';
import { KPIDashboard, SmartNavigation, SearchBar, LoadingSkeleton, EnterpriseEmptyState, ProgressBar, StatusBadge } from '../components/EnterpriseComponents';
import { Zap, Target, TrendingUp, Activity, Map, Clock, AlertTriangle, FileText, Code, Users, Building, Eye, Star, Layers, Info, Sliders, GripHorizontal, Wifi, ChevronUp, ChevronDown, Image, Video, Send, Download, Copy, CheckCircle2, Loader2, FileDown } from 'lucide-react';
import { ExecutiveSummaryCards, BusinessHealthScore, AIDecisionPanel, RecommendationPriorities, CrossModuleInsights, CompareResults, OpportunityMatrix, RiskMatrix, ConfidenceVisualization, InteractiveFilters, SmartSearch, EnterpriseReportPreview, ProductivityBar, ExecutiveCommandCenter, StoryDrivenResults, AIBusinessAdvisor, DecisionSimulator, CompetitorPositioningMap, MarketOpportunityHeatmap, BusinessTimeline, ExecutiveKPIDashboard, InsightRelationships, EvidenceExplorer, ReportPreview20, PresentationMode, useWorkspaceMemory, SmartEmptyState } from '../components/EnterpriseDecisionSuite';
import { EnterpriseActionWorkspace } from '../components/EnterpriseActionWorkspace';
import { getIntegrationHealth, sendTestEmail, generatePosterImage, renderVideo } from '../lib/api';

function formatValue(v: any): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(formatValue).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    const label = v.title || v.name || v.label || v.key || v.value || '';
    if (label) return String(label);
    const keys = Object.keys(v);
    if (keys.length === 0) return '—';
    return keys.map(k => `${k}: ${formatValue(v[k])}`).join(' | ');
  }
  return '—';
}

function formatArray(arr: any[]): string {
  return arr.map(formatValue).filter(Boolean).join(', ');
}

function renderObjectCard(obj: any, fields: string[], labelMap?: Record<string, string>) {
  if (!obj || typeof obj !== 'object') return null;
  const preferredFields = ['title', 'problem', 'owner', 'priority', 'difficulty', 'expectedGain', 'businessImpact', 'evidence', 'estimatedTimeline'];
  const orderedFields = [
    ...preferredFields.filter(f => fields.includes(f) && obj[f] !== undefined && obj[f] !== null),
    ...fields.filter(f => !preferredFields.includes(f) && obj[f] !== undefined && obj[f] !== null)
  ];
  if (orderedFields.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      {orderedFields.map(f => (
        <div key={f}>
          <strong>{(labelMap?.[f] || f).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</strong>{' '}
          {renderValue(obj[f])}
        </div>
      ))}
    </div>
  );
}

function renderValue(v: any): React.ReactNode {
  if (v === null || v === undefined) return <span style={{ color: '#6b7a93', fontStyle: 'italic' }}>Not available</span>;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return <span style={{ color: '#6b7a93', fontStyle: 'italic' }}>None</span>;
    return (
      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
        {v.map((item, i) => (
          <li key={i} style={{ color: '#9aa7bd', fontSize: '13px' }}>{renderValue(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v || {});
    if (keys.length === 0) return <span style={{ color: '#6b7a93', fontStyle: 'italic' }}>Not available</span>;
    const preferredFields = ['title', 'problem', 'owner', 'priority', 'difficulty', 'expectedGain', 'businessImpact', 'evidence', 'estimatedTimeline'];
    const structuredFields = preferredFields.filter(f => keys.includes(f) && v[f] !== undefined && v[f] !== null);
    if (structuredFields.length > 0) return renderObjectCard(v, structuredFields);
    const scoreKeys = ['score', 'reason', 'source', 'category', 'priority'];
    if (scoreKeys.some(k => keys.includes(k))) {
      return <span style={{ color: '#9aa7bd' }}>{renderSafeValue(v)}</span>;
    }
    return renderObjectCard(v, keys);
  }
  return <span style={{ color: '#6b7a93', fontStyle: 'italic' }}>Not available</span>;
}

function PlanTabContent({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) return <EnterpriseEmptyState title="No automation plan" message="Click Generate Automation Plan to create one." icon={Zap} />;

  const sections: { title: string; content: React.ReactNode }[] = [];

  const kpiItems = [
    data.readinessScore != null && data.readinessScore > 0 ? { label: 'Readiness', value: `${data.readinessScore}%`, icon: Zap, color: '#53a7ff' } : null,
    data.campaignName ? { label: 'Campaign', value: data.campaignName.slice(0, 20), icon: Target, color: '#a855f7' } : null,
    data.kpis?.conversionRate ? { label: 'Conversion', value: `${data.kpis.conversionRate}%`, icon: TrendingUp, color: '#10e18b' } : null,
    data.channels?.length ? { label: 'Channels', value: `${data.channels.length}`, icon: Activity, color: '#ffb347' } : null,
    data.budgetSplit ? { label: 'Budget Allocated', value: 'Yes', icon: Map, color: '#ff4757' } : null,
  ].filter(Boolean);

  // Cross module insights derived from real data gaps
  const crossModuleItems = [
    ...(!data.emailSequence?.length ? [{ title: 'No Email Sequences Configured', description: 'Email marketing is a high-ROI automation channel that is not yet configured.', sourceModule: 'Automation' as const, targetModule: 'Growth' as const, impact: 'high' as const, type: 'Missing Channel' }] : []),
    ...(!data.contentCalendar?.length ? [{ title: 'Content Calendar Not Set', description: 'A structured content calendar improves campaign consistency and ROI tracking.', sourceModule: 'Automation' as const, targetModule: 'Reports' as const, impact: 'medium' as const, type: 'Opportunity' }] : []),
  ];

  if (data.campaignName) {
    sections.push({ title: 'Campaign Overview', content: (
      <div style={{ display: 'grid', gap: '12px' }}>
        {kpiItems.length > 0 && <KPIDashboard items={kpiItems} columns={5} />}
        {renderObjectCard(data, ['campaignName', 'campaignObjective', 'readinessScore', 'status'], { readinessScore: 'Readiness Score' })}
        {data.targetAudience && (
          <Card>
            <h4 style={{ margin: '0 0 8px 0', color: '#53a7ff' }}>Target Audience</h4>
            {renderObjectCard(
              typeof data.targetAudience === 'string' ? { primary: data.targetAudience } : data.targetAudience,
              ['primary', 'demographics', 'interests', 'painPoints', 'goals', 'evidence', 'confidence', 'dataSource']
            )}
          </Card>
        )}
      </div>
    )});
  }

  if (data.channels && Array.isArray(data.channels) && data.channels.length > 0) {
    sections.push({ title: 'Channels', content: (
      <div style={{ display: 'grid', gap: '10px' }}>
        {data.channels.map((ch: any, i: number) => (
          <Card key={i} style={{ padding: '12px' }}>
            {renderObjectCard(ch, ['channel', 'name', 'priority', 'reason', 'budgetAllocation', 'expectedReach', 'effort', 'evidence', 'confidence', 'dataSource', 'tool', 'owner'], { budgetAllocation: 'Budget' })}
          </Card>
        ))}
      </div>
    )});
  }

  if (data.kpis && typeof data.kpis === 'object' && Object.keys(data.kpis).length > 0) {
    sections.push({ title: 'KPIs', content: renderObjectCard(data.kpis, Object.keys(data.kpis)) });
  }

  if (data.budgetSplit && typeof data.budgetSplit === 'object' && Object.keys(data.budgetSplit).length > 0) {
    sections.push({ title: 'Budget Split', content: renderObjectCard(data.budgetSplit, Object.keys(data.budgetSplit)) });
  }

  if (data.weeklyPlan && typeof data.weeklyPlan === 'object' && Object.keys(data.weeklyPlan).length > 0) {
    sections.push({ title: 'Weekly Plan', content: (
      <div style={{ display: 'grid', gap: '8px' }}>
        {Object.entries(data.weeklyPlan).map(([day, task]: any) => {
          const taskText = task && typeof task === 'object' ? renderSafeValue(task) : task;
          return (
            <div key={day} style={{ display: 'flex', gap: '8px', padding: '8px', background: '#151d2b', borderRadius: '6px' }}>
              <strong style={{ minWidth: '80px', color: '#53a7ff' }}>{renderSafeValue(day)}:</strong>
              <span style={{ color: '#9aa7bd' }}>{renderSafeValue(renderValue(task))}</span>
            </div>
          );
        })}
      </div>
    )});
  }

  const hasAnyContent = sections.length > 0 || kpiItems.length > 0 || crossModuleItems.length > 0;
  if (!hasAnyContent) return <EnterpriseEmptyState title="No automation plan data" message="Click Generate Automation Plan to create one." icon={Zap} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>{kpiItems.length > 0 && <KPIDashboard items={kpiItems} columns={2} />}</div>
      </div>

      {crossModuleItems.length > 0 && <CrossModuleInsights items={crossModuleItems} />}

      {sections.map((s, i) => (
        <Card key={i}>
          <h3 style={{ margin: '0 0 12px 0' }}>{s.title}</h3>
          {s.content}
        </Card>
      ))}
    </div>
  );
}

function EmailSendSection() {
  const { selectedChatId } = useProject();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const handleSend = async () => {
    if (!selectedChatId) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendTestEmail(selectedChatId, {
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim() || 'Test Email from AI Marketing Platform',
        body: body.trim() || 'This is a test email sent from the Automation Center.',
        approvalChecked,
        senderName: 'AI Marketing Platform',
      });
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Failed to send' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '14px', background: '#101622', borderRadius: '8px', border: '1px solid #293245' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Send size={14} style={{ color: '#53a7ff' }} /> Send Test Email
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        <input value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="Recipient email * (one only)" style={{ width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none' }} />
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" style={{ width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none' }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Email body" rows={4} style={{ width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" id="approval-auto" checked={approvalChecked} onChange={e => setApprovalChecked(e.target.checked)} style={{ accentColor: '#10e18b' }} />
          <label htmlFor="approval-auto" style={{ fontSize: '11px', color: '#9aa7bd' }}>I approve sending this test email. Manual approval only. One recipient.</label>
        </div>
        <button onClick={handleSend} disabled={sending || !recipientEmail.trim() || !approvalChecked || !selectedChatId} style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #a855f7', background: 'rgba(168,85,247,0.15)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
          {sending ? <><Loader2 className="spin" size={14} /> Sending...</> : <><Send size={14} /> Send Test Email</>}
        </button>
        {result && (
          <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'flex-start', gap: '6px', background: result.success ? 'rgba(16,225,139,0.08)' : 'rgba(255,71,87,0.08)', border: `1px solid ${result.success ? 'rgba(16,225,139,0.2)' : 'rgba(255,71,87,0.2)'}` }}>
            {result.success ? <CheckCircle2 size={14} style={{ color: '#10e18b', flexShrink: 0, marginTop: '1px' }} /> : <AlertTriangle size={14} style={{ color: '#ff4757', flexShrink: 0, marginTop: '1px' }} />}
            <div>
              {result.success
                ? <>Sent! ID: {result.messageId} | To: {result.maskedRecipient || result.recipient} | Via: {result.provider}{result.port ? ` (port ${result.port})` : ''}</>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span>Failed: {result.error}</span>
                    {result.code === 'TIMEOUT' && <span style={{ color: '#ffb347', fontSize: '10px' }}>Gmail SMTP timed out from Render. Use port 465 or switch to Brevo/Resend/SendGrid which use HTTP APIs and do not require SMTP ports.</span>}
                    {result.code === 'AUTH_FAILED' && <span style={{ color: '#ffb347', fontSize: '10px' }}>Use a Gmail App Password (16 characters) from https://myaccount.google.com/apppasswords</span>}
                    {result.details ? <span style={{ color: '#9aa7bd', fontSize: '10px' }}>{result.details}</span> : null}
                  </div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderEmailTab(data: any) {
  const emails: any[] = [];
  if (data.emailSequence && Array.isArray(data.emailSequence)) emails.push(...data.emailSequence);
  if (data.emailSubjects && Array.isArray(data.emailSubjects)) emails.push(...data.emailSubjects.map((s: any) => typeof s === 'string' ? { subject: s } : s));
  if (emails.length === 0) return <EnterpriseEmptyState title="No Cold Email Drafts" message="Generate an automation plan first." icon={FileText} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card style={{ background: 'rgba(255, 179, 71, 0.05)', border: '1px solid #ffb347' }}>
        <h4 style={{ color: '#ffb347', margin: '0 0 8px 0' }}>Email Compliance Notice</h4>
        <p style={{ color: '#9aa7bd', fontSize: '13px', margin: 0 }}>
          Review and comply with CAN-SPAM, GDPR, and CASL before sending. All emails are drafts and require manual approval.
          No emails are auto-sent from this system.
        </p>
      </Card>

      <EmailSendSection />

      {emails.map((email: any, i: number) => (
        <Card key={i}>
          <h4 style={{ margin: '0 0 12px 0' }}>{email.subject || email.title || `Email Draft ${i + 1}`}</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            {email.previewText && <div><strong>Preview:</strong> {asText(email.previewText)}</div>}
            {email.body && <div><strong>Body:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{asText(email.body)}</p></div>}
            {email.cta && <div><strong>CTA:</strong> {asText(email.cta)}</div>}
            {email.targetPersona && <div><strong>Target Persona:</strong> {asText(email.targetPersona)}</div>}
            {email.personalizationNotes && <div><strong>Personalization Notes:</strong> {asText(email.personalizationNotes)}</div>}
            {email.complianceNote && <div style={{ color: '#ffb347', fontSize: '12px' }}>{asText(email.complianceNote)}</div>}
            {email.unsubscribeReminder && <div style={{ color: '#9aa7bd', fontSize: '12px' }}>{asText(email.unsubscribeReminder)}</div>}
            {!email.complianceNote && <div style={{ color: '#ffb347', fontSize: '12px' }}>Include unsubscribe link and physical mailing address per CAN-SPAM.</div>}
            {renderObjectCard(email, ['day', 'trigger', 'condition', 'action', 'tool', 'owner', 'evidence', 'confidence', 'dataSource'])}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <Badge tone="yellow">Draft</Badge>
            <span style={{ color: '#9aa7bd', fontSize: '12px' }}>Manual approval required before sending</span>
          </div>
        </Card>
      ))}
    </div>
  );
}

function renderLinkedInTab(data: any) {
  const posts = asArray(data.linkedInPosts);
  const templates = asArray(data.linkedInDmTemplates);
  if (posts.length === 0 && templates.length === 0) return <EnterpriseEmptyState title="No LinkedIn Content" message="Generate an automation plan first." icon={Users} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {posts.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>LinkedIn Posts</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {posts.map((post: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{post.title || `Post ${i + 1}`}</h4>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {post.format && <div><strong>Format:</strong> {asText(post.format)}</div>}
                  {post.content && <div><strong>Content:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{asText(post.content)}</p></div>}
                  {post.bestTime && <div><strong>Best Time:</strong> {asText(post.bestTime)}</div>}
                  {renderObjectCard(post, ['trigger', 'condition', 'action', 'tool', 'owner', 'evidence', 'confidence', 'dataSource'])}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {templates.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>LinkedIn DM Templates</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {templates.map((tmpl: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{tmpl.title || `Template ${i + 1}`}</h4>
                {tmpl.body && <p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap' }}>{asText(tmpl.body)}</p>}
                {tmpl.cta && <div><strong>CTA:</strong> {asText(tmpl.cta)}</div>}
                {renderObjectCard(tmpl, ['trigger', 'condition', 'action', 'tool', 'owner', 'evidence', 'confidence', 'dataSource'])}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function renderInstagramTab(data: any) {
  const captions = asArray(data.instagramCaptions);
  const reelIdeas = asArray(data.instagramReelIdeas);
  if (captions.length === 0 && reelIdeas.length === 0) return <EnterpriseEmptyState title="No Instagram Content" message="Generate an automation plan first." icon={Eye} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {captions.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>Instagram Captions</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {captions.map((cap: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{cap.title || `Post ${i + 1}`}</h4>
                {cap.postType && <div><strong>Type:</strong> {asText(cap.postType)}</div>}
                {cap.caption && <div><strong>Caption:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{asText(cap.caption)}</p></div>}
                {cap.hashtags && Array.isArray(cap.hashtags) && <div><strong>Hashtags:</strong> {cap.hashtags.join(', ')}</div>}
                {renderObjectCard(cap, ['trigger', 'condition', 'action', 'tool', 'owner', 'evidence', 'confidence', 'dataSource'])}
              </div>
            ))}
          </div>
        </Card>
      )}
      {reelIdeas.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>Reel Ideas</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {reelIdeas.map((reel: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{reel.title || `Reel ${i + 1}`}</h4>
                {reel.description && <p style={{ color: '#9aa7bd' }}>{asText(reel.description)}</p>}
                {reel.music && <div><strong>Music:</strong> {asText(reel.music)}</div>}
                {reel.duration && <div><strong>Duration:</strong> {asText(reel.duration)}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function renderGoogleAdsTab(data: any) {
  const ads = asArray(data.googleAds || data.imageAdIdeas).filter(a => a);
  if (ads.length === 0) return <EnterpriseEmptyState title="No Google Ads" message="Generate an automation plan first." icon={Target} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {ads.map((ad: any, i: number) => (
        <Card key={i}>
          <h4 style={{ margin: '0 0 12px 0' }}>{ad.title || ad.headline || `Ad ${i + 1}`}</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            {ad.headline && <div><strong>Headline:</strong> {ad.headline}</div>}
            {ad.description && <div><strong>Description:</strong> {ad.description}</div>}
            {ad.cta && <div><strong>CTA:</strong> {ad.cta}</div>}
            {ad.destinationUrl && <div><strong>Destination URL:</strong> {ad.destinationUrl}</div>}
            {ad.budget && <div><strong>Budget:</strong> {ad.budget}</div>}
            {ad.targeting && <div><strong>Targeting:</strong> {renderValue(ad.targeting)}</div>}
            {renderObjectCard(ad, ['channel', 'priority', 'trigger', 'condition', 'action', 'tool', 'owner', 'evidence', 'confidence', 'dataSource'])}
          </div>
        </Card>
      ))}
    </div>
  );
}

function PosterGenerateSection() {
  const { selectedChatId } = useProject();
  const [prompt, setPrompt] = useState('');
  const [headline, setHeadline] = useState('');
  const [audience, setAudience] = useState('');
  const [cta, setCta] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!selectedChatId || !prompt.trim()) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await generatePosterImage(selectedChatId, {
        prompt: prompt.trim(),
        headline: headline.trim() || undefined,
        cta: cta.trim() || undefined,
        platform: 'linkedin',
        brandColors: ['#2563eb', '#111827'],
        audience: audience.trim() || undefined,
      });
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Failed to generate poster' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ padding: '14px', background: '#101622', borderRadius: '8px', border: '1px solid #293245' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Image size={14} style={{ color: '#f59e0b' }} /> Generate Poster Image
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Image prompt *" rows={2} style={{ width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Headline (optional)" style={{ padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none' }} />
          <input value={cta} onChange={e => setCta(e.target.value)} placeholder="CTA (optional)" style={{ padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none' }} />
        </div>
        <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="Target audience (optional)" style={{ width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none' }} />
        <button onClick={handleGenerate} disabled={generating || !prompt.trim() || !selectedChatId} style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.15)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
          {generating ? <><Loader2 className="spin" size={14} /> Generating...</> : <><Image size={14} /> Generate Poster</>}
        </button>
        {result && (
          <div>
            {result.success ? (
              <div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(16,225,139,0.15)', color: '#10e18b' }}>Provider: {result.provider}</span>
                </div>
                <div style={{ background: '#151d2b', borderRadius: '8px', border: '1px solid #293245', overflow: 'hidden' }}>
                  <img src={result.imageUrl} alt="Generated poster" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', display: 'block' }} />
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <a href={result.imageUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #10e18b', background: 'rgba(16,225,139,0.1)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#10e18b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Download size={12} /> Download</a>
                  <button onClick={() => navigator.clipboard.writeText(result.imageUrl)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #818cf8', background: 'rgba(129,140,248,0.1)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Copy size={12} /> Copy URL</button>
                  <button onClick={() => navigator.clipboard.writeText(result.prompt)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #a855f7', background: 'rgba(168,85,247,0.1)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Copy size={12} /> Copy Prompt</button>
                </div>
                {result.headline && (
                  <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                    <div style={{ padding: '6px 8px', background: '#151d2b', borderRadius: '6px', fontSize: '10px' }}>
                      <div style={{ color: '#9aa7bd', marginBottom: '2px' }}>Headline</div>
                      <div style={{ color: '#e5e7eb', fontWeight: 600 }}>{result.headline}</div>
                    </div>
                    <div style={{ padding: '6px 8px', background: '#151d2b', borderRadius: '6px', fontSize: '10px' }}>
                      <div style={{ color: '#9aa7bd', marginBottom: '2px' }}>Subheadline</div>
                      <div style={{ color: '#e5e7eb' }}>{result.subheadline}</div>
                    </div>
                    <div style={{ padding: '6px 8px', background: '#151d2b', borderRadius: '6px', fontSize: '10px' }}>
                      <div style={{ color: '#9aa7bd', marginBottom: '2px' }}>CTA</div>
                      <div style={{ color: '#e5e7eb', fontWeight: 600 }}>{result.cta}</div>
                    </div>
                  </div>
                )}
                {result.warnings?.map((w: string, i: number) => (
                  <div key={i} style={{ marginTop: '6px', padding: '6px 8px', background: 'rgba(255,179,71,0.08)', borderRadius: '4px', fontSize: '10px', color: '#ffb347', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <AlertTriangle size={10} /> {w}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} style={{ color: '#ff4757' }} /> {result.error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderPosterTab(data: any) {
  const posters = asArray(data.posterPrompts).filter(p => p);
  const images = asArray(data.imageAdIdeas).filter(i => i);
  const designStyles = data.designStyles;
  if (posters.length === 0 && images.length === 0 && !designStyles) return <EnterpriseEmptyState title="No Creative Prompts" message="Generate an automation plan first." icon={Star} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <PosterGenerateSection />

      {posters.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>Poster/Creative Prompts</h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {posters.map((p: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{p.title || `Poster ${i + 1}`}</h4>
                <div style={{ display: 'grid', gap: '6px' }}>
                  {p.campaignGoal && <div><strong>Campaign Goal:</strong> {p.campaignGoal}</div>}
                  {p.targetAudience && <div><strong>Target Audience:</strong> {renderValue(p.targetAudience)}</div>}
                  {p.visualStyle && <div><strong>Visual Style:</strong> {p.visualStyle}</div>}
                  {p.headline && <div><strong>Headline:</strong> {p.headline}</div>}
                  {p.cta && <div><strong>CTA:</strong> {p.cta}</div>}
                  {p.format && <div><strong>Format:</strong> {p.format}</div>}
                  {p.platform && <div><strong>Platform:</strong> {p.platform}</div>}
                  {p.brandNotes && <div><strong>Brand Notes:</strong> {p.brandNotes}</div>}
                  {p.prompt && <div><strong>Prompt:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{p.prompt}</p></div>}
                  {p.description && <div><strong>Description:</strong><p style={{ color: '#9aa7bd', margin: '4px 0' }}>{p.description}</p></div>}
                  {renderObjectCard(p, ['trigger', 'condition', 'action', 'tool', 'owner', 'evidence', 'confidence', 'dataSource'])}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {designStyles && typeof designStyles === 'object' && Object.keys(designStyles).length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>Design Style Guide</h3>
          {renderObjectCard(designStyles, ['colors', 'fonts', 'style', 'mood', 'tone', 'imagery'])}
        </Card>
      )}
    </div>
  );
}

function VideoRenderSection() {
  const { selectedChatId } = useProject();
  const [script, setScript] = useState('');
  const [scenesText, setScenesText] = useState('');
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRender = async () => {
    if (!selectedChatId) return;
    setRendering(true);
    setResult(null);
    try {
      const scenes = scenesText.trim() ? scenesText.split('\n').filter(Boolean).map((line, i) => ({
        title: `Scene ${i + 1}`,
        visual: line,
        voiceover: '',
        duration: 5,
      })) : [{ title: 'Scene 1', visual: script || 'Marketing video scene', voiceover: '', duration: 30 }];
      const res = await renderVideo(selectedChatId, {
        script: script.trim() || 'Marketing video',
        scenes,
        duration: scenes.reduce((sum, s) => sum + s.duration, 0),
        platform: 'linkedin',
        aspectRatio: '16:9',
        prompt: script.trim() || 'Marketing video',
      });
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Failed to render video' });
    } finally {
      setRendering(false);
    }
  };

  return (
    <div style={{ padding: '14px', background: '#101622', borderRadius: '8px', border: '1px solid #293245' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Video size={14} style={{ color: '#ef4444' }} /> Render MP4 Video
      </div>
      <div style={{ display: 'grid', gap: '10px' }}>
        <textarea value={script} onChange={e => setScript(e.target.value)} placeholder="Video script (optional)" rows={3} style={{ width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
        <textarea value={scenesText} onChange={e => setScenesText(e.target.value)} placeholder="Scene visuals (one per line, optional)" rows={3} style={{ width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none', resize: 'vertical' }} />
        <button onClick={handleRender} disabled={rendering || !selectedChatId} style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #ef4444', background: 'rgba(239,68,68,0.15)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start' }}>
          {rendering ? <><Loader2 className="spin" size={14} /> Rendering MP4...</> : <><Video size={14} /> Render MP4</>}
        </button>
        {result && (
          <div>
            {result.success && result.videoUrl ? (
              <div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(16,225,139,0.15)', color: '#10e18b' }}>Provider: {result.provider}</span>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(83,167,255,0.15)', color: '#53a7ff' }}>{result.duration}s</span>
                </div>
                <video controls style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', background: '#000' }}>
                  <source src={result.videoUrl} type="video/mp4" />
                </video>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <a href={result.videoUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #10e18b', background: 'rgba(16,225,139,0.1)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#10e18b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Download size={12} /> Download MP4</a>
                  <button onClick={() => navigator.clipboard.writeText(result.videoUrl)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #818cf8', background: 'rgba(129,140,248,0.1)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Copy size={12} /> Copy URL</button>
                </div>
              </div>
            ) : result.success && result.storyboard ? (
              <div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(255,179,71,0.15)', color: '#ffb347' }}>Provider: {result.provider}</span>
                </div>
                <div style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245', fontSize: '12px', color: '#9aa7bd', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>{result.storyboard}</div>
                <div style={{ marginTop: '6px', fontSize: '10px', color: '#ffb347', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={10} /> MP4 unavailable — showing storyboard fallback
                </div>
                <button onClick={() => { const blob = new Blob([result.storyboard], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `storyboard-${Date.now()}.md`; a.click(); URL.revokeObjectURL(url); }} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #10e18b', background: 'rgba(16,225,139,0.1)', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#10e18b', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}><FileDown size={12} /> Export Storyboard</button>
              </div>
            ) : (
              <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} style={{ color: '#ff4757' }} /> {result.error}
              </div>
            )}
            {result.warnings?.map((w: string, i: number) => (
              <div key={i} style={{ marginTop: '6px', padding: '6px 8px', background: 'rgba(255,179,71,0.08)', borderRadius: '4px', fontSize: '10px', color: '#ffb347', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <AlertTriangle size={10} /> {w}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderVideoTab(data: any) {
  const scripts = asArray(data.videoScripts).filter(s => s);
  if (scripts.length === 0) return <EnterpriseEmptyState title="No Video Ad Scripts" message="Generate an automation plan first." icon={Code} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <VideoRenderSection />

      {scripts.map((vs: any, i: number) => {
        const scenes = asArray(vs.scenes || vs.sceneBySceneBreakdown || vs.sceneBreakdown);
        return (
          <Card key={i}>
            <h4 style={{ margin: '0 0 12px 0' }}>{vs.title || `Video Ad ${i + 1}`}</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
                  {vs.hook && <div><strong>Hook:</strong> {asText(vs.hook)}</div>}
                  {vs.problem && <div><strong>Problem:</strong> {asText(vs.problem)}</div>}
                  {vs.productSolution && <div><strong>Product Solution:</strong> {asText(vs.productSolution)}</div>}
                  {vs.proofEvidence && <div><strong>Proof/Evidence:</strong> {asText(vs.proofEvidence)}</div>}
                  {vs.cta && <div><strong>CTA:</strong> {asText(vs.cta)}</div>}
                  {vs.duration && <div><strong>Duration:</strong> {asText(vs.duration)}</div>}
                  {vs.voiceover && <div><strong>Voiceover:</strong> {asText(vs.voiceover)}</div>}
                  {vs.visualDirection && <div><strong>Visual Direction:</strong> {asText(vs.visualDirection)}</div>}
                  {vs.script && <div><strong>Script:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{asText(vs.script)}</p></div>}

              {scenes.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#53a7ff' }}>Scene-by-Scene Breakdown</h5>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {scenes.map((scene: any, si: number) => (
                      <div key={si} style={{ padding: '8px', background: '#101622', borderRadius: '6px', borderLeft: '3px solid #53a7ff' }}>
                        <strong>Scene {si + 1}:</strong>
                        {scene.description && <p style={{ color: '#9aa7bd', margin: '4px 0' }}>{asText(scene.description)}</p>}
                        {scene.visual && <div><em>Visual:</em> {asText(scene.visual)}</div>}
                        {scene.audio && <div><em>Audio:</em> {asText(scene.audio)}</div>}
                        {scene.duration && <div><em>Duration:</em> {asText(scene.duration)}</div>}
                        {renderValue(scene)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {renderObjectCard(vs, ['trigger', 'condition', 'action', 'tool', 'owner', 'evidence', 'confidence', 'dataSource'])}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function renderContentCalendarTab(data: any) {
  const calendar = data.contentCalendar || data.weeklyPlan || data.emailSchedule || data.linkedInSchedule || data.instagramSchedule || data.videoSchedule || {};
  const calendarEntries: { date: string; channel: string; content: string }[] = [];

  if (data.weeklyPlan && typeof data.weeklyPlan === 'object') {
    Object.entries(data.weeklyPlan).forEach(([day, task]: any) => {
      const taskText = task && typeof task === 'object' ? renderSafeValue(task) : task;
      calendarEntries.push({ date: day, channel: 'multi', content: formatValue(taskText) });
    });
  }

  if (data.emailSequence && Array.isArray(data.emailSequence)) {
    data.emailSequence.forEach((e: any) => {
      if (e.day) calendarEntries.push({ date: `Day ${e.day}`, channel: 'email', content: e.subject || formatValue(e) });
    });
  }

  if (data.linkedInPosts && Array.isArray(data.linkedInPosts)) {
    data.linkedInPosts.forEach((p: any) => {
      if (p.bestTime) calendarEntries.push({ date: p.bestTime, channel: 'linkedin', content: p.title || formatValue(p) });
    });
  }

  if (calendarEntries.length === 0) {
    return <EnterpriseEmptyState title="No Content Calendar" message="Generate an automation plan first." icon={Clock} />;
  }

  return (
    <Card>
      <h3 style={{ margin: '0 0 12px 0' }}>Content Calendar</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #293245' }}>
              <th style={{ padding: '8px', textAlign: 'left', color: '#9aa7bd' }}>Date</th>
              <th style={{ padding: '8px', textAlign: 'left', color: '#9aa7bd' }}>Channel</th>
              <th style={{ padding: '8px', textAlign: 'left', color: '#9aa7bd' }}>Content</th>
            </tr>
          </thead>
          <tbody>
            {calendarEntries.map((entry, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1d2738' }}>
                <td style={{ padding: '8px', color: '#53a7ff' }}>{entry.date}</td>
                <td style={{ padding: '8px' }}><Badge>{entry.channel}</Badge></td>
                <td style={{ padding: '8px', color: '#9aa7bd' }}>{entry.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function renderCrmTab(data: any) {
  const workflows = asArray(data.crmWorkflows || data.workflows || data.outreachAngles).filter(w => w);
  const leadCriteria = data.leadCriteria || data.idealLeadProfile;

  if (workflows.length === 0 && !leadCriteria) return <EnterpriseEmptyState title="No CRM Workflow" message="Generate an automation plan first." icon={Users} />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {leadCriteria && typeof leadCriteria === 'object' && Object.keys(leadCriteria).length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>Lead Criteria & Ideal Profile</h3>
          {renderObjectCard(leadCriteria, typeof leadCriteria === 'object' ? Object.keys(leadCriteria) : ['primary', 'industry', 'jobTitles', 'goals', 'painPoints', 'evidence', 'confidence', 'dataSource'])}
        </Card>
      )}

      {workflows.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>CRM Workflow Steps</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {workflows.map((wf: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', borderLeft: '4px solid #a855f7' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{wf.name || wf.title || wf.step || `Step ${i + 1}`}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                  {wf.trigger && <div><strong>Trigger:</strong> {asText(wf.trigger)}</div>}
                  {wf.condition && <div><strong>Condition:</strong> {asText(wf.condition)}</div>}
                  {wf.action && <div><strong>Action:</strong> {asText(wf.action)}</div>}
                  {wf.tool && <div><strong>Tool:</strong> {asText(wf.tool)}</div>}
                  {wf.owner && <div><strong>Owner:</strong> {asText(wf.owner)}</div>}
                  {wf.priority && <div><strong>Priority:</strong> {asText(wf.priority)}</div>}
                  {wf.difficulty && <div><strong>Difficulty:</strong> {asText(wf.difficulty)}</div>}
                  {wf.expectedKpi && <div><strong>Expected KPI:</strong> {asText(wf.expectedKpi)}</div>}
                  {wf.timeline && <div><strong>Timeline:</strong> {asText(wf.timeline)}</div>}
                  {wf.evidence && <div><strong>Evidence:</strong> {asText(wf.evidence)}</div>}
                  {wf.confidence && <div><strong>Confidence:</strong> {asText(wf.confidence)}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function renderKpiTab(data: any) {
  const kpis = data.kpis || data.metrics || {};

  const overviewCards: { label: string; value: any; tone?: string }[] = [];
  if (data.readinessScore != null) overviewCards.push({ label: 'Readiness Score', value: `${data.readinessScore}%`, tone: data.readinessScore >= 70 ? 'green' : data.readinessScore >= 40 ? 'yellow' : 'red' });
  if (data.campaignName) overviewCards.push({ label: 'Campaign', value: data.campaignName });
  if (data.status) overviewCards.push({ label: 'Status', value: data.status });

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {overviewCards.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {overviewCards.map((card, i) => (
            <div key={i} style={{ flex: '1', minWidth: '150px', padding: '16px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245' }}>
              <div style={{ color: '#9aa7bd', fontSize: '12px', marginBottom: '4px' }}>{card.label}</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: card.tone ? (card.tone === 'green' ? '#10e18b' : card.tone === 'yellow' ? '#ffb347' : '#ff4757') : '#fff' }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      {typeof kpis === 'object' && Object.keys(kpis).length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>KPI Breakdown</h3>
          {renderObjectCard(kpis, Object.keys(kpis))}
        </Card>
      )}

      {data.assets && Array.isArray(data.assets) && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>Asset Summary</h3>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div><strong>Total Assets:</strong> {data.assets.length}</div>
            {data.assets.reduce((acc: Record<string, number>, a: any) => {
              acc[a.status] = (acc[a.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) && (
              <div>
                {Object.entries(data.assets.reduce((acc: Record<string, number>, a: any) => {
                  acc[a.status] = (acc[a.status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).map(([status, count]) => (
                  <span key={String(status)} style={{ marginRight: '12px' }}><Badge>{renderSafeValue(status)}</Badge>: {renderSafeValue(count)}</span>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {overviewCards.length === 0 && Object.keys(kpis).length === 0 && <EnterpriseEmptyState title="No KPIs" message="Generate an automation plan first." icon={Activity} />}
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
    api.get(`/chats/${selectedChatId}/workflow/status`).then((r: any) => { if (!cancelled) setStatus(r); }).catch(() => {});
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

  const stepTypes = ['check_readiness', 'automation_plan', 'asset_review', 'solution_generate', 'approval_pending'];
  const steps = status?.steps || [];
  const completedSteps = steps.filter((s: any) => s.status === 'completed').length;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card>
        <h3 style={{ margin: '0 0 12px 0' }}>Workflow Execution</h3>
        <p style={{ color: '#9aa7bd', margin: '0 0 12px 0' }}>Run a complete marketing workflow or execute individual steps. Each step is evidence-based and uses verified data.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="primary-btn" onClick={startWorkflow} disabled={loading}>
            {loading ? 'Running...' : 'Start Workflow'}
          </button>
          {stepTypes.map((st) => (
            <button key={st} className="secondary-btn" onClick={() => executeStep(st)} disabled={loading} style={{ fontSize: '0.85em' }}>
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        {status?.workflowComplete && <p style={{ color: '#10e18b', marginTop: '8px' }}>Workflow complete.</p>}
      </Card>

      {error && (
        <Card style={{ background: 'rgba(255, 71, 87, 0.1)', borderColor: '#ff4757' }}>
          <p style={{ color: '#ff8a8a', margin: 0 }}>{error}</p>
          <button onClick={startWorkflow} className="secondary-btn" style={{ marginTop: '8px' }}>Retry</button>
        </Card>
      )}

      {status?.progress && (
        <Card>
          <h3 style={{ margin: '0 0 8px 0' }}>Progress</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '8px', background: '#1d2738', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${status.progress.progress || 0}%`, height: '100%', background: '#10e18b', borderRadius: '4px', transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ color: '#9aa7bd' }}>{completedSteps} / {steps.length || status.progress.total || 0}</span>
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{ margin: '0 0 12px 0' }}>Workflow Steps</h3>
        {steps.length === 0 ? (
          <p style={{ color: '#9aa7bd' }}>No workflow steps executed yet. Click "Start Workflow" to begin.</p>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            {steps.map((step: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px', borderLeft: `4px solid ${step.status === 'completed' ? '#10e18b' : step.status === 'running' ? '#53a7ff' : step.status === 'failed' ? '#ff4757' : '#ffb347'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <b>{step.step?.replace(/_/g, ' ') || step.label || `Step ${i + 1}`}</b>
                  <Badge tone={step.status === 'completed' ? 'green' : step.status === 'running' ? 'blue' : step.status === 'failed' ? 'red' : 'yellow'}>
                    {step.status}
                  </Badge>
                  {step.createdAt && <span style={{ fontSize: '0.8em', color: '#9aa7bd' }}>{new Date(step.createdAt).toLocaleString()}</span>}
                </div>
                {step.output && typeof step.output === 'object' && Object.keys(step.output).length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#9aa7bd' }}>
                    {step.output.error && <p style={{ color: '#ff8a8a' }}>Error: {step.output.error}</p>}
                    {step.output.planId && <p>Plan ID: {step.output.planId} ({step.output.assetCount || 0} assets)</p>}
                    {step.output.modules && <p>Modules ready: {step.output.count || 0}/{Object.keys(step.output.modules).length}</p>}
                    {renderObjectCard(step.output, Object.keys(step.output).filter(k => !['error', 'planId', 'assetCount', 'modules', 'count'].includes(k)))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

const logActionColors: Record<string, string> = {
  generated: '#10e18b', approved: '#53a7ff', rejected: '#ff4757',
  email_sent: '#a855f7', poster_generated: '#f59e0b', video_rendered: '#ef4444',
  asset_uploaded: '#10e18b', fallback_used: '#ffb347', error_occurred: '#ff4757',
};

function renderLogsTab(data: any) {
  const logs = asArray(data.logs).filter(l => l);
  if (logs.length === 0) return <EnterpriseEmptyState title="No Automation Logs" message="Generate an automation plan or run integrations to see logs." icon={Activity} />;

  return (
    <Card>
      <h3 style={{ margin: '0 0 12px 0' }}>Automation & Integration History</h3>
      <div style={{ display: 'grid', gap: '8px' }}>
        {logs.map((log: any, i: number) => (
          <div key={i} style={{ padding: '10px', background: '#151d2b', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: `${logActionColors[log.action] || '#9aa7bd'}20`, color: logActionColors[log.action] || '#9aa7bd' }}>{log.action.replace(/_/g, ' ')}</span>
                <span style={{ color: '#fff' }}>{log.message || 'No message'}</span>
              </div>
              {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#9aa7bd' }}>
                  {Object.entries(log.metadata).map(([k, v]) => (
                    <div key={k} style={{ display: 'inline-block', marginRight: '12px' }}><strong>{k}:</strong> {renderSafeValue(v)}</div>
                  ))}
                </div>
              )}
            </div>
            <span style={{ fontSize: '12px', color: '#9aa7bd', whiteSpace: 'nowrap' }}>
              {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// PHASE 6 — MARKETING EXECUTION PLATFORM
// ============================================

function renderContentStudioTab(data: any) {
  const cs = data?.contentStudio;
  if (!cs?.assets || Object.keys(cs.assets).length === 0) return <EnterpriseEmptyState title="Content Studio" message="Generate marketing execution plan to create content assets." icon={FileText} />;
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <Badge tone="green">{renderSafeValue(cs.totalGenerated || 0)} assets generated</Badge>
      </div>
      {Object.entries(cs.assets).map(([type, asset]: any) => (
        <Card key={type} style={{ borderLeft: '4px solid #a855f7' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#a855f7' }}>{renderSafeValue(asset._label || type.replace(/_/g, ' '))}</h4>
          <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
            {asset.title && <div><strong>Title:</strong> {renderSafeValue(asset.title)}</div>}
            {asset.metaDescription && <div><strong>Meta Description:</strong> {renderSafeValue(asset.metaDescription)}</div>}
            {asset.seoKeywords && <div><strong>SEO Keywords:</strong> {renderSafeValue(typeof asset.seoKeywords === 'string' ? asset.seoKeywords : Array.isArray(asset.seoKeywords) ? asset.seoKeywords.join(', ') : '')}</div>}
            {asset.outline && <div><strong>Outline:</strong> <pre style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0', fontSize: '12px' }}>{renderSafeValue(typeof asset.outline === 'string' ? asset.outline : JSON.stringify(asset.outline, null, 2))}</pre></div>}
            {asset.fullContent && <div><strong>Content:</strong> <p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0', maxHeight: '200px', overflow: 'auto' }}>{renderSafeValue(asset.fullContent.substring(0, 1000))}{renderSafeValue(asset.fullContent.length > 1000 ? '...' : '')}</p></div>}
            {asset.internalLinks && <div><strong>Internal Links:</strong> {renderValue(asset.internalLinks)}</div>}
            {asset.cta && <div><strong>CTA:</strong> {renderSafeValue(asset.cta)}</div>}
            {asset.schemaSuggestions && <div><strong>Schema:</strong> {renderValue(asset.schemaSuggestions)}</div>}
            {asset.estimatedReadTime && <div><strong>Read Time:</strong> {renderSafeValue(asset.estimatedReadTime)}</div>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function renderEmailCampaignStudioTab(data: any) {
  const ec = data?.emailCampaigns;
  if (!ec?.campaigns || Object.keys(ec.campaigns).length === 0) return <EnterpriseEmptyState title="Email Campaign Studio" message="Generate marketing execution plan to create email campaigns." icon={FileText} />;
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <Card style={{ background: 'rgba(255, 179, 71, 0.05)', border: '1px solid #ffb347' }}>
        <h4 style={{ color: '#ffb347', margin: '0 0 8px 0' }}>Email Compliance Notice</h4>
        <p style={{ color: '#9aa7bd', fontSize: '13px', margin: 0 }}>Review and comply with CAN-SPAM, GDPR, and CASL before sending. All emails are drafts requiring manual approval. No emails are auto-sent.</p>
      </Card>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <Badge tone="green">{renderSafeValue(ec.totalGenerated || 0)} campaigns generated</Badge>
      </div>
      {Object.entries(ec.campaigns).map(([type, campaign]: any) => (
        <Card key={type} style={{ borderLeft: '4px solid #53a7ff' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#53a7ff' }}>{renderSafeValue(campaign._label || type.replace(/_/g, ' '))}</h4>
          <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
            {campaign.subject && <div><strong>Subject:</strong> <span style={{ color: '#e5e7eb' }}>{renderSafeValue(campaign.subject)}</span></div>}
            {campaign.previewText && <div><strong>Preview:</strong> {renderSafeValue(campaign.previewText)}</div>}
            {campaign.body && <div><strong>Body:</strong> <p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0', maxHeight: '200px', overflow: 'auto' }}>{renderSafeValue(campaign.body)}</p></div>}
            {campaign.cta && <div><strong>CTA:</strong> {renderSafeValue(campaign.cta)}</div>}
            {campaign.personalizationVariables && <div><strong>Personalization Variables:</strong> {renderSafeValue(campaign.personalizationVariables.join(', '))}</div>}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px', padding: '8px', background: '#151d2b', borderRadius: '6px' }}>
              {campaign.spamScore && <div><strong>Spam Score:</strong> <Badge tone={campaign.spamScore === 'Low' ? 'green' : campaign.spamScore === 'Medium' ? 'yellow' : 'red'}>{renderSafeValue(campaign.spamScore)}</Badge></div>}
              {campaign.readingTime && <div><strong>Reading Time:</strong> {renderSafeValue(campaign.readingTime)}</div>}
              <div><strong>Status:</strong> <Badge tone="yellow">Draft</Badge></div>
            </div>
            {campaign.complianceChecklist && (
              <div style={{ marginTop: '8px', padding: '8px', background: '#101622', borderRadius: '6px' }}>
                <strong style={{ color: '#ffb347' }}>Compliance Checklist:</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '4px', fontSize: '12px' }}>
                  {Object.entries(campaign.complianceChecklist).map(([key, val]: any) => (
                    <div key={key} style={{ color: val ? '#10e18b' : '#ff4757' }}>{val ? '✓' : '✗'} {renderSafeValue(key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()))}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function renderCreativeStudioTab(data: any) {
  const cr = data?.creativeStudio;
  if (!cr?.briefs || Object.keys(cr.briefs).length === 0) return <EnterpriseEmptyState title="Creative Studio" message="Generate marketing execution plan to create creative briefs." icon={Star} />;
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <Badge tone="green">{renderSafeValue(cr.totalGenerated || 0)} briefs generated</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '12px' }}>
        {Object.entries(cr.briefs).map(([type, brief]: any) => (
          <Card key={type} style={{ borderLeft: '4px solid #f59e0b' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b' }}>{renderSafeValue(brief._label || type.replace(/_/g, ' '))}</h4>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{renderSafeValue(brief._dimensions || '')}</div>
            <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
              {brief.headline && <div><strong>Headline:</strong> {renderSafeValue(brief.headline)}</div>}
              {brief.visualDirection && <div><strong>Visual Direction:</strong> <p style={{ color: '#9aa7bd', margin: '4px 0', fontSize: '12px' }}>{renderSafeValue(brief.visualDirection)}</p></div>}
              {brief.brandColors && <div><strong>Brand Colors:</strong> <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>{brief.brandColors.map((c: string, i: number) => <span key={i} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: '1px solid #293245', display: 'inline-block' }} title={c} />)}</div></div>}
              {brief.typography && <div><strong>Typography:</strong> {renderSafeValue(brief.typography)}</div>}
              {brief.layout && <div><strong>Layout:</strong> {renderSafeValue(brief.layout)}</div>}
              {brief.cta && <div><strong>CTA:</strong> {renderSafeValue(brief.cta)}</div>}
              {brief.imageGenerationPrompt && (
                <div><strong>Image Generation Prompt:</strong>
                  <pre style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', fontSize: '12px', margin: '4px 0', padding: '8px', background: '#101622', borderRadius: '4px' }}>{renderSafeValue(brief.imageGenerationPrompt)}</pre>
                </div>
              )}
              {brief.dimensions && <div><strong>Dimensions:</strong> {renderSafeValue(brief.dimensions)}</div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function renderVideoStudioTab(data: any) {
  const vs = data?.videoStudio;
  if (!vs?.scripts || Object.keys(vs.scripts).length === 0) return <EnterpriseEmptyState title="Video Campaign Studio" message="Generate marketing execution plan to create video scripts." icon={Code} />;
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <Badge tone="green">{renderSafeValue(vs.totalGenerated || 0)} scripts generated</Badge>
      </div>
      {Object.entries(vs.scripts).map(([type, script]: any) => (
        <Card key={type} style={{ borderLeft: '4px solid #ef4444' }}>
          <h4 style={{ margin: '0 0 4px 0', color: '#ef4444' }}>{renderSafeValue(script._label || type.replace(/_/g, ' '))}</h4>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{renderSafeValue(script._duration || '')}</div>
          <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
            {script.title && <div><strong>Title:</strong> {renderSafeValue(script.title)}</div>}
            {script.hook && <div><strong>Hook (0-3s):</strong> <span style={{ color: '#f59e0b' }}>{renderSafeValue(script.hook)}</span></div>}
            {script.script && <div><strong>Full Script:</strong> <pre style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0', fontSize: '12px', maxHeight: '250px', overflow: 'auto', background: '#101622', padding: '8px', borderRadius: '4px' }}>{renderSafeValue(script.script)}</pre></div>}
            {script.voiceover && <div><strong>Voiceover:</strong> {renderSafeValue(script.voiceover)}</div>}
            {script.camera && <div><strong>Camera:</strong> {renderSafeValue(script.camera)}</div>}
            {script.music && <div><strong>Music:</strong> {renderSafeValue(script.music)}</div>}
            {script.transitions && <div><strong>Transitions:</strong> {renderSafeValue(script.transitions)}</div>}
            {script.cta && <div><strong>CTA:</strong> {renderSafeValue(script.cta)}</div>}
            {script.storyboard && Array.isArray(script.storyboard) && script.storyboard.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <strong>Storyboard:</strong>
                <div style={{ display: 'grid', gap: '6px', marginTop: '6px' }}>
                  {script.storyboard.map((scene: any, i: number) => (
                    <div key={i} style={{ padding: '8px', background: '#151d2b', borderRadius: '6px', borderLeft: '3px solid #53a7ff' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#53a7ff', marginBottom: '4px' }}>Scene {renderSafeValue(scene.scene || i + 1)} {renderSafeValue(scene.duration ? `(${scene.duration})` : '')}</div>
                      {scene.visual && <div style={{ color: '#9aa7bd', fontSize: '12px' }}><em>Visual:</em> {renderSafeValue(scene.visual)}</div>}
                      {scene.audio && <div style={{ color: '#9aa7bd', fontSize: '12px' }}><em>Audio:</em> {renderSafeValue(scene.audio)}</div>}
                      {scene.camera && <div style={{ color: '#9aa7bd', fontSize: '12px' }}><em>Camera:</em> {renderSafeValue(scene.camera)}</div>}
                      {scene.transitions && <div style={{ color: '#9aa7bd', fontSize: '12px' }}><em>Transition:</em> {renderSafeValue(scene.transitions)}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function renderCampaignPlannerTab(data: any) {
  const cp = data?.campaignPlans;
  if (!cp?.plans || Object.keys(cp.plans).length === 0) return <EnterpriseEmptyState title="Campaign Planner" message="Generate marketing execution plan to create campaign plans." icon={Target} />;
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <Badge tone="green">{renderSafeValue(cp.totalGenerated || 0)} plans generated</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '12px' }}>
        {Object.entries(cp.plans).map(([type, plan]: any) => (
          <Card key={type} style={{ borderLeft: '4px solid #10e18b' }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#10e18b' }}>{renderSafeValue(plan._label || type.replace(/_/g, ' '))}</h4>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{renderSafeValue(plan._days || 0)} days</div>
            <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
              {plan.campaignName && <div><strong>Campaign:</strong> {renderSafeValue(plan.campaignName)}</div>}
              {plan.campaignGoal && <div><strong>Goal:</strong> {renderSafeValue(plan.campaignGoal)}</div>}
              {plan.budget && <div><strong>Budget:</strong> <span style={{ color: '#f59e0b' }}>{renderSafeValue(typeof plan.budget === 'object' ? plan.budget.total || JSON.stringify(plan.budget) : plan.budget)}</span></div>}
              {plan.expectedROI && <div><strong>Expected ROI:</strong> {renderSafeValue(plan.expectedROI)}</div>}
              {plan.priority && <div><strong>Priority:</strong> <Badge tone={plan.priority === 'High' ? 'pink' : plan.priority === 'Medium' ? 'yellow' : 'blue'}>{renderSafeValue(plan.priority)}</Badge></div>}
              {plan.owner && <div><strong>Owner:</strong> {renderSafeValue(plan.owner)}</div>}
              {plan.businessJustification && <div><strong>Business Justification:</strong> <p style={{ color: '#9aa7bd', fontSize: '12px', margin: '4px 0' }}>{renderSafeValue(plan.businessJustification)}</p></div>}
              {plan.kpis?.primary && <div><strong>Primary KPIs:</strong> {plan.kpis.primary.map((k: any, i: number) => <div key={i} style={{ fontSize: '12px', color: '#9aa7bd', paddingLeft: '12px' }}>• {renderSafeValue(k.metric)}: {renderSafeValue(k.target)}</div>)}</div>}
              {plan.timeline?.phases && (
                <div><strong>Timeline Phases:</strong>
                  {plan.timeline.phases.map((p: any, i: number) => (
                    <div key={i} style={{ padding: '6px', margin: '4px 0', background: '#151d2b', borderRadius: '4px', fontSize: '12px' }}>
                      <div style={{ color: '#53a7ff' }}>{renderSafeValue(p.phase)} ({renderSafeValue(p.duration)})</div>
                      <div style={{ color: '#9aa7bd' }}>{renderSafeValue(p.activities?.join(', '))}</div>
                    </div>
                  ))}
                </div>
              )}
              {plan.risk?.risks && (
                <div><strong>Risk Assessment:</strong>
                  {plan.risk.risks.map((r: any, i: number) => (
                    <div key={i} style={{ fontSize: '12px', color: '#9aa7bd', padding: '4px 0' }}>• {renderSafeValue(r.risk)} <Badge tone={r.likelihood === 'High' ? 'red' : r.likelihood === 'Medium' ? 'yellow' : 'green'}>{renderSafeValue(r.likelihood)}</Badge></div>
                  ))}
                </div>
              )}
              {plan.dependencies?.length > 0 && <div><strong>Dependencies:</strong> {renderSafeValue(plan.dependencies.join(', '))}</div>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function renderSocialCalendarTab(data: any) {
  const sc = data?.socialCalendars;
  if (!sc?.calendars || Object.keys(sc.calendars).length === 0) return <EnterpriseEmptyState title="Social Calendar" message="Generate marketing execution plan to create social calendars." icon={Clock} />;
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <Badge tone="green">{renderSafeValue(sc.totalGenerated || 0)} calendars generated</Badge>
      </div>
      {Object.entries(sc.calendars).map(([type, cal]: any) => (
        <Card key={type}>
          <h4 style={{ margin: '0 0 4px 0', color: '#53a7ff' }}>{renderSafeValue(cal._label || type.replace(/_/g, ' '))}</h4>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>{renderSafeValue(cal._days || 0)} days</div>
          <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
            {cal.weeklyTheme?.length > 0 && <div><strong>Weekly Themes:</strong> {renderSafeValue(cal.weeklyTheme.join(' → '))}</div>}
            {cal.contentMix && <div><strong>Content Mix:</strong> <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>{Object.entries(cal.contentMix).map(([k, v]: any) => <Badge key={k}>{renderSafeValue(k)}: {renderSafeValue(v)}</Badge>)}</div></div>}
            {cal.bestPostingTimes && <div><strong>Best Posting Times:</strong> <pre style={{ color: '#9aa7bd', fontSize: '12px', margin: '4px 0' }}>{JSON.stringify(cal.bestPostingTimes, null, 2)}</pre></div>}
            {cal.calendar && Array.isArray(cal.calendar) && (
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead><tr style={{ borderBottom: '1px solid #293245', color: '#9aa7bd' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Day</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Platform</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Topic</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Time</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Theme</th>
                  </tr></thead>
                  <tbody>
                    {cal.calendar.slice(0, 30).map((entry: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1d2738' }}>
                        <td style={{ padding: '6px', color: '#53a7ff' }}>Day {renderSafeValue(entry.day)}</td>
                        <td style={{ padding: '6px' }}><Badge>{renderSafeValue(entry.platform)}</Badge></td>
                        <td style={{ padding: '6px', color: '#e5e7eb' }}>{renderSafeValue(entry.topic || entry.caption?.substring(0, 60))}</td>
                        <td style={{ padding: '6px', color: '#9aa7bd' }}>{renderSafeValue(entry.bestPostingTime || '')}</td>
                        <td style={{ padding: '6px', color: '#9aa7bd' }}>{renderSafeValue(entry.contentTheme || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cal.calendar.length > 30 && <div style={{ color: '#9aa7bd', fontSize: '12px', padding: '8px', textAlign: 'center' }}>Showing 30 of {renderSafeValue(cal.calendar.length)} entries</div>}
              </div>
            )}
            {cal.hashtagStrategy && <div><strong>Hashtag Strategy:</strong> {Object.entries(cal.hashtagStrategy).map(([k, v]: any) => <div key={k} style={{ fontSize: '12px', color: '#9aa7bd', paddingLeft: '12px' }}>{renderSafeValue(k)}: {renderSafeValue((Array.isArray(v) ? v : []).join(', '))}</div>)}</div>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AssetLibraryContent({ data }: { data: any }) {
  const plan = data;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const allAssets: { type: string; label: string; items: any[] }[] = [];

  if (plan?.emailSequence) allAssets.push({ type: 'email', label: 'Email Assets', items: plan.emailSequence.map((e: any, i: number) => ({ ...e, _id: `email-${i}`, _type: 'Email' })) });
  if (plan?.linkedInPosts) allAssets.push({ type: 'linkedin', label: 'LinkedIn Posts', items: plan.linkedInPosts.map((p: any, i: number) => ({ ...p, _id: `linkedin-${i}`, _type: 'LinkedIn' })) });
  if (plan?.instagramCaptions) allAssets.push({ type: 'instagram', label: 'Instagram Captions', items: plan.instagramCaptions.map((c: any, i: number) => ({ ...c, _id: `ig-${i}`, _type: 'Instagram' })) });
  if (plan?.videoScripts) allAssets.push({ type: 'video', label: 'Video Scripts', items: plan.videoScripts.map((v: any, i: number) => ({ ...v, _id: `video-${i}`, _type: 'Video' })) });
  if (plan?.posterPrompts) allAssets.push({ type: 'creative', label: 'Creative Prompts', items: plan.posterPrompts.map((p: any, i: number) => ({ ...p, _id: `creative-${i}`, _type: 'Creative' })) });
  if (plan?.googleAds) allAssets.push({ type: 'ad', label: 'Google Ads', items: plan.googleAds.map((a: any, i: number) => ({ ...a, _id: `ad-${i}`, _type: 'Google Ad' })) });

  const contentStudio = plan?.contentStudio?.assets;
  if (contentStudio) {
    Object.entries(contentStudio).forEach(([key, val]: any) => {
      allAssets.push({ type: 'content', label: val._label || key, items: [{ ...val, _id: `content-${key}`, _type: val._label || key }] });
    });
  }

  const flatAssets = allAssets.flatMap(g => g.items);
  if (flatAssets.length === 0) return <EnterpriseEmptyState title="Asset Library" message="Generate automation and execution plans first." icon={Layers} />;

  const filtered = flatAssets.filter(a => {
    if (filterType && a._type !== filterType) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return JSON.stringify(a).toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search assets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px 12px', background: '#151d2b', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '8px 12px', background: '#151d2b', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px' }}>
          <option value="">All Types</option>
          {[...new Set(flatAssets.map(a => a._type))].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Badge tone="blue">{flatAssets.length} total</Badge>
        <Badge tone="green">{filtered.length} shown</Badge>
      </div>
      <div style={{ display: 'grid', gap: '8px', maxHeight: '500px', overflow: 'auto' }}>
        {filtered.map((asset: any) => (
          <div key={asset._id} style={{ padding: '10px', background: '#151d2b', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                <Badge>{asset._type || 'Asset'}</Badge>
                <span style={{ color: '#e5e7eb', fontWeight: 500 }}>{asset.title || asset.subject || asset.headline || `Asset ${asset._id}`}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#9aa7bd' }}>
                {asset.subject && `Subject: ${asset.subject}`}
                {asset.headline && `Headline: ${asset.headline}`}
                {asset.campaignName && `Campaign: ${asset.campaignName}`}
                {asset.cta && ` | CTA: ${asset.cta}`}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: '#9aa7bd', textAlign: 'center', padding: '20px' }}>No assets match your search.</div>}
      </div>
    </div>
  );
}

function renderAssetLibraryTab(data: any) {
  return <AssetLibraryContent data={data} />;
}

function renderAnalyticsTab(data: any) {
  const analytics = data?.analyticsData;
  const plan = data as any;
  const contentCount = plan?.contentStudio?.totalGenerated || 0;
  const emailCount = plan?.emailCampaigns?.totalGenerated || 0;
  const creativeCount = plan?.creativeStudio?.totalGenerated || 0;
  const videoCount = plan?.videoStudio?.totalGenerated || 0;
  const campaignCount = plan?.campaignPlans?.totalGenerated || 0;
  const calendarCount = plan?.socialCalendars?.totalGenerated || 0;
  const totalAssets = contentCount + emailCount + creativeCount + videoCount + campaignCount + calendarCount;

  const assetCounts = [
    { label: 'Content Studio', count: contentCount, color: '#a855f7' },
    { label: 'Email Campaigns', count: emailCount, color: '#53a7ff' },
    { label: 'Creative Studio', count: creativeCount, color: '#f59e0b' },
    { label: 'Video Studio', count: videoCount, color: '#ef4444' },
    { label: 'Campaign Plans', count: campaignCount, color: '#10e18b' },
    { label: 'Social Calendars', count: calendarCount, color: '#ff6b6b' },
  ];

  const existingAssets = plan?.assets?.length || 0;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        <Card><div style={{ padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10e18b' }}>{totalAssets}</div><div style={{ color: '#9aa7bd', fontSize: '12px' }}>Execution Assets</div></div></Card>
        <Card><div style={{ padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#53a7ff' }}>{analytics?.modulesGenerated || 0}</div><div style={{ color: '#9aa7bd', fontSize: '12px' }}>Modules Generated</div></div></Card>
        <Card><div style={{ padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{existingAssets}</div><div style={{ color: '#9aa7bd', fontSize: '12px' }}>Automation Assets</div></div></Card>
        <Card><div style={{ padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#a855f7' }}>{plan?.readinessScore || 0}%</div><div style={{ color: '#9aa7bd', fontSize: '12px' }}>Readiness Score</div></div></Card>
      </div>

      <Card>
        <h3 style={{ margin: '0 0 12px 0' }}>Execution Modules Breakdown</h3>
        <div style={{ display: 'grid', gap: '8px' }}>
          {assetCounts.map(a => (
            <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: '#151d2b', borderRadius: '6px' }}>
              <div style={{ width: '160px', color: '#e5e7eb', fontSize: '13px' }}>{a.label}</div>
              <div style={{ flex: 1, height: '8px', background: '#1d2738', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${totalAssets > 0 ? (a.count / totalAssets) * 100 : 0}%`, height: '100%', background: a.color, borderRadius: '4px', transition: 'width 0.3s' }} />
              </div>
              <div style={{ width: '40px', textAlign: 'right', color: '#e5e7eb', fontSize: '13px', fontWeight: 600 }}>{a.count}</div>
            </div>
          ))}
        </div>
      </Card>

      {analytics?.generatedAt && (
        <Card><div style={{ color: '#9aa7bd', fontSize: '12px' }}>Last generated: {new Date(analytics.generatedAt).toLocaleString()}</div></Card>
      )}
    </div>
  );
}

const tabs = [
  { id: 'Plan', label: 'Automation Overview' },
  { id: 'Email', label: 'Cold Email Drafts' },
  { id: 'LinkedIn', label: 'LinkedIn Outreach' },
  { id: 'Instagram', label: 'Instagram Content' },
  { id: 'GoogleAds', label: 'Google Ads' },
  { id: 'Creative', label: 'Poster/Creative Prompts' },
  { id: 'Video', label: 'Video Ad Scripts' },
  { id: 'Calendar', label: 'Content Calendar' },
  { id: 'CRM', label: 'CRM Workflow' },
  { id: 'KPI', label: 'KPI Dashboard' },
  { id: 'Workflow', label: 'Automation Workflow' },
  { id: 'Logs', label: 'Logs' },
  // Phase 6 — Marketing Execution Platform
  { id: 'ContentStudio', label: 'Content Studio' },
  { id: 'EmailCampaigns', label: 'Email Campaigns' },
  { id: 'CreativeStudio', label: 'Creative Studio' },
  { id: 'VideoStudio', label: 'Video Studio' },
  { id: 'CampaignPlans', label: 'Campaign Planner' },
  { id: 'SocialCalendar', label: 'Social Calendar' },
  { id: 'AssetLibrary', label: 'Asset Library' },
  { id: 'Analytics', label: 'Analytics' },
];

const tabRenderers: Record<string, (d: any) => JSX.Element> = {
  Plan: (d: any) => <PlanTabContent data={d} />,
  Email: renderEmailTab,
  LinkedIn: renderLinkedInTab,
  Instagram: renderInstagramTab,
  GoogleAds: renderGoogleAdsTab,
  Creative: renderPosterTab,
  Video: renderVideoTab,
  Calendar: renderContentCalendarTab,
  CRM: renderCrmTab,
  KPI: renderKpiTab,
  Workflow: () => <WorkflowTabContent />,
  Logs: renderLogsTab,
  // Phase 6 — Marketing Execution Platform
  ContentStudio: renderContentStudioTab,
  EmailCampaigns: renderEmailCampaignStudioTab,
  CreativeStudio: renderCreativeStudioTab,
  VideoStudio: renderVideoStudioTab,
  CampaignPlans: renderCampaignPlannerTab,
  SocialCalendar: renderSocialCalendarTab,
  AssetLibrary: renderAssetLibraryTab,
  Analytics: renderAnalyticsTab,
};

export default function AutomationCenterPage() {
  const { selectedChatId, fullResults } = useProject();
  const [active, setActive] = useWorkspaceMemory('auto-activeTab', 'Plan');
  const [data, setData] = useState<any>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [execData, setExecData] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [showHealth, setShowHealth] = useState(true);
  const [emailSending, setEmailSending] = useState<string | null>(null);
  const [emailResult, setEmailResult] = useState<any>(null);
  const [posterGenerating, setPosterGenerating] = useState<string | null>(null);
  const [posterResult, setPosterResult] = useState<any>(null);
  const [videoRendering, setVideoRendering] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<any>(null);

  useEffect(() => {
    getIntegrationHealth().then(d => setHealth(d)).catch(() => {});
    if (!selectedChatId) { setData(null); setExecData(null); return; }
    let cancelled = false;
    api.get(`/automation/${selectedChatId}/plan`)
      .then((r: any) => { if (!cancelled) setData(r.automationPlan || r.data || r); })
      .catch(() => { if (!cancelled) setData(null); });
    api.get(`/automation/${selectedChatId}/logs`)
      .then((r: any) => { if (!cancelled) setLogs(r.logs || []); })
      .catch(() => {});
    api.get(`/automation/${selectedChatId}/execution`)
      .then((r: any) => { if (!cancelled && r.exists) setExecData(r.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedChatId]);

  async function generate() {
    if (!selectedChatId) return;
    setGenLoading(true);
    setGenError(null);
    try {
      const res: any = await api.post(`/automation/${selectedChatId}/generate`, {});
      if (res.success === false && res.error) {
        setGenError(res.error);
      } else {
        setData(res.automationPlan || res.data || res);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e.message || 'Failed to generate automation plan';
      setGenError(msg);
    }
    setGenLoading(false);
  }

  async function executeAll() {
    if (!selectedChatId) return;
    setExecLoading(true);
    setGenError(null);
    try {
      const res: any = await api.post(`/automation/${selectedChatId}/execute`, {});
      if (res.success === false && res.error) {
        setGenError(res.error);
      } else {
        setExecData(res.data);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e.message || 'Failed to generate execution modules';
      setGenError(msg);
    }
    setExecLoading(false);
  }

  const planData = data ? { ...data, logs, ...execData } : { logs, ...execData };

  return (
    <div>
      <Card style={{ marginBottom: '20px' }}>
        <EnterpriseActionWorkspace />
      </Card>
      <PageHeader eyebrow="Automation Center" title="Automation Command Center" subtitle="Generate and manage cross-channel marketing execution." />

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <button onClick={() => setShowHealth(!showHealth)} style={{ background: 'none', border: 'none', color: '#9aa7bd', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {showHealth ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Provider Health
          </button>
        </div>
        {showHealth && health && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', background: '#151d2b', borderRadius: '8px', border: '1px solid #293245' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa7bd', display: 'flex', alignItems: 'center', gap: '4px' }}><Wifi size={12} /> Integration Status:</div>
            {(() => {
              const p = health.providers;
              const reasonMap: Record<string, string> = {
                missing_api_key: 'Missing API key', missing_from_email: 'Missing from email',
                init_failed: 'Init failed', missing_env_vars: 'Missing config',
                pollinations_only: 'Pollinations only', pollinations_fal_configured: 'Pollinations + Fal',
                shotstack_configured: 'Shotstack', creatomate_configured: 'Creatomate',
                no_video_provider: 'No provider',
              };
              const emailPortInfo = p.email.provider === 'gmail' ? ` (587:${p.email.port587 || '?'}, 465:${p.email.port465 || '?'})` : '';
              const emailDesc = p.email.configured ? (p.email.provider === 'gmail' ? `Gmail SMTP${emailPortInfo}` : p.email.provider === 'resend' ? 'Resend' : p.email.provider || 'Configured') : (reasonMap[p.email.reason] || p.email.reason || 'Not configured');
              const imgPollinations = p.image?.pollinations?.configured !== false;
              const imgFal = p.image?.fal?.configured === true;
              const imgDesc = imgPollinations && imgFal ? 'Pollinations + Fal' : imgPollinations ? 'Pollinations' : imgFal ? 'Fal' : (reasonMap[p.image.reason] || 'None');
              const storageDesc = p.storage.configured ? 'Cloudinary' : (reasonMap[p.storage.reason] || 'Not configured');
              const vidShotstack = p.video?.shotstack?.configured === true;
              const vidCreatomate = p.video?.creatomate?.configured === true;
              const videoDesc = vidShotstack ? 'Shotstack' : vidCreatomate ? 'Creatomate' : (reasonMap[p.video.reason] || 'Not available');
              return [
                { label: 'Email', ok: p.email.configured, detail: emailDesc, reason: p.email.reason },
                { label: 'Image', ok: imgPollinations || imgFal, detail: imgDesc, reason: p.image.reason },
                { label: 'Storage', ok: p.storage.configured, detail: storageDesc, reason: p.storage.reason },
                { label: 'Video', ok: vidShotstack || vidCreatomate, detail: videoDesc, reason: p.video.reason },
                { label: 'AI', ok: p.ai?.gemini || p.ai?.groq, detail: `${p.ai?.gemini ? 'Gemini' : ''}${p.ai?.gemini && p.ai?.groq ? ' + ' : ''}${p.ai?.groq ? 'Groq' : ''}${!p.ai?.gemini && !p.ai?.groq ? 'None' : ''}` },
              ];
            })().map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', background: item.ok ? 'rgba(16,225,139,0.08)' : 'rgba(255,179,71,0.08)', border: `1px solid ${item.ok ? 'rgba(16,225,139,0.2)' : 'rgba(255,179,71,0.2)'}` }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.ok ? '#10e18b' : '#ffb347' }} />
                <span style={{ fontSize: '10px', color: item.ok ? '#10e18b' : '#ffb347', fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: '9px', color: '#6b7280' }}>{item.detail}{item.reason ? ` (${item.reason})` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {!selectedChatId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffb347' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffb347', display: 'inline-block' }} />
                No project selected
              </div>
            )}
            {selectedChatId && data && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10e18b' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10e18b', display: 'inline-block' }} />
                Plan ready
              </div>
            )}
            {selectedChatId && execData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', display: 'inline-block' }} />
                Execution ready
              </div>
            )}
            {selectedChatId && !data && !genLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9aa7bd' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9aa7bd', display: 'inline-block' }} />
                No plan generated
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="primary-btn" onClick={generate} disabled={genLoading || !selectedChatId}>
              {genLoading ? 'Generating...' : 'Generate Automation Plan'}
            </button>
            <button className="secondary-btn" onClick={executeAll} disabled={execLoading || !selectedChatId} style={{ borderColor: '#a855f7', color: '#a855f7' }}>
              {execLoading ? 'Generating...' : 'Execute All Modules'}
            </button>
          </div>
        </div>
        {genError && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ff8a8a' }}>{genError}</span>
            <button onClick={() => { setGenError(null); generate(); }} className="secondary-btn" disabled={genLoading}>Retry</button>
          </div>
        )}
      </Card>

      {!selectedChatId && (
        <EnterpriseEmptyState title="No Project Selected" message="Select a project from the dropdown above, then generate an automation plan." icon={Map} />
      )}

      {genLoading && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <Card><LoadingSkeleton type="table" count={3} /></Card>
          <Card><LoadingSkeleton type="card" count={2} /></Card>
        </div>
      )}
      {execLoading && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <Card><LoadingSkeleton type="card" count={4} /></Card>
          <Card><LoadingSkeleton type="list" count={3} /></Card>
        </div>
      )}

      {selectedChatId && !genLoading && (
        <Card>
          <SmartNavigation items={tabs.map(t => ({ id: t.id, label: t.label }))} activeId={active} onNavigate={setActive} />
          <div style={{ marginBottom: '16px' }}>
            <SearchBar onSearch={() => {}} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #293245', paddingBottom: '12px' }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  border: active === t.id ? '1px solid #53a7ff' : '1px solid #293245',
                  background: active === t.id ? 'rgba(83, 167, 255, 0.1)' : 'transparent',
                  color: active === t.id ? '#53a7ff' : '#9aa7bd',
                  fontWeight: active === t.id ? 600 : 400,
                  transition: 'all 0.2s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div>
            {tabRenderers[active] ? tabRenderers[active](planData) : <PlanTabContent data={planData} />}
          </div>
        </Card>
      )}
    </div>
  );
}





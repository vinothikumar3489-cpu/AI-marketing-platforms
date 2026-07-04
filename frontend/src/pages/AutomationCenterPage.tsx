import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useProject } from '../context/ProjectContext';
import { asArray, asText } from '../lib/normalizers';
import { Badge, Card, EmptyState, Loading, PageHeader } from '../components/UI';

function formatValue(v: any): string {
  if (v === null || v === undefined) return 'Unavailable';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(formatValue).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    const label = v.title || v.name || v.label || v.key || v.value || '';
    if (label) return String(label);
    const keys = Object.keys(v);
    if (keys.length === 0) return 'Unavailable';
    return keys.map(k => `${k}: ${formatValue(v[k])}`).join(' | ');
  }
  return 'Unavailable';
}

function formatArray(arr: any[]): string {
  return arr.map(formatValue).filter(Boolean).join(', ');
}

function renderObjectCard(obj: any, fields: string[], labelMap?: Record<string, string>) {
  if (!obj || typeof obj !== 'object') return null;
  const entries = fields.filter(f => obj[f] !== undefined && obj[f] !== null);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      {entries.map(f => (
        <div key={f}>
          <strong>{(labelMap?.[f] || f).replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</strong>{' '}
          {renderValue(obj[f])}
        </div>
      ))}
    </div>
  );
}

function renderValue(v: any): React.ReactNode {
  if (v === null || v === undefined) return <span style={{ color: '#9aa7bd' }}>Unavailable</span>;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return <span style={{ color: '#9aa7bd' }}>None</span>;
    return (
      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
        {v.map((item, i) => (
          <li key={i} style={{ color: '#9aa7bd', fontSize: '13px' }}>{renderValue(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return <span style={{ color: '#9aa7bd' }}>Unavailable</span>;
    return renderObjectCard(v, keys);
  }
  return <span style={{ color: '#9aa7bd' }}>Unavailable</span>;
}

function renderPlanTab(data: any) {
  if (!data || Object.keys(data).length === 0) return <EmptyState title="No automation plan" text="Click Generate Automation Plan to create one." />;

  const sections: { title: string; content: React.ReactNode }[] = [];

  if (data.campaignName) {
    sections.push({ title: 'Campaign Overview', content: (
      <div style={{ display: 'grid', gap: '12px' }}>
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
        {Object.entries(data.weeklyPlan).map(([day, task]: any) => (
          <div key={day} style={{ display: 'flex', gap: '8px', padding: '8px', background: '#151d2b', borderRadius: '6px' }}>
            <strong style={{ minWidth: '80px', color: '#53a7ff' }}>{day}:</strong>
            <span style={{ color: '#9aa7bd' }}>{renderValue(task)}</span>
          </div>
        ))}
      </div>
    )});
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {sections.map((s, i) => (
        <Card key={i}>
          <h3 style={{ margin: '0 0 12px 0' }}>{s.title}</h3>
          {s.content}
        </Card>
      ))}
      {sections.length === 0 && <EmptyState title="No plan data" text="Generate an automation plan first." />}
    </div>
  );
}

function renderEmailTab(data: any) {
  const emails: any[] = [];
  if (data.emailSequence && Array.isArray(data.emailSequence)) emails.push(...data.emailSequence);
  if (data.emailSubjects && Array.isArray(data.emailSubjects)) emails.push(...data.emailSubjects.map((s: any) => typeof s === 'string' ? { subject: s } : s));
  if (emails.length === 0) return <EmptyState title="No Cold Email Drafts" text="Generate an automation plan first." />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <Card style={{ background: 'rgba(255, 179, 71, 0.05)', border: '1px solid #ffb347' }}>
        <h4 style={{ color: '#ffb347', margin: '0 0 8px 0' }}>Email Compliance Notice</h4>
        <p style={{ color: '#9aa7bd', fontSize: '13px', margin: 0 }}>
          Review and comply with CAN-SPAM, GDPR, and CASL before sending. All emails are drafts and require manual approval.
          No emails are auto-sent from this system.
        </p>
      </Card>

      {emails.map((email: any, i: number) => (
        <Card key={i}>
          <h4 style={{ margin: '0 0 12px 0' }}>{email.subject || email.title || `Email Draft ${i + 1}`}</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            {email.previewText && <div><strong>Preview:</strong> {email.previewText}</div>}
            {email.body && <div><strong>Body:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{email.body}</p></div>}
            {email.cta && <div><strong>CTA:</strong> {email.cta}</div>}
            {email.targetPersona && <div><strong>Target Persona:</strong> {email.targetPersona}</div>}
            {email.personalizationNotes && <div><strong>Personalization Notes:</strong> {email.personalizationNotes}</div>}
            {email.complianceNote && <div style={{ color: '#ffb347', fontSize: '12px' }}>{email.complianceNote}</div>}
            {email.unsubscribeReminder && <div style={{ color: '#9aa7bd', fontSize: '12px' }}>{email.unsubscribeReminder}</div>}
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
  if (posts.length === 0 && templates.length === 0) return <EmptyState title="No LinkedIn Content" text="Generate an automation plan first." />;

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
                  {post.format && <div><strong>Format:</strong> {post.format}</div>}
                  {post.content && <div><strong>Content:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{post.content}</p></div>}
                  {post.bestTime && <div><strong>Best Time:</strong> {post.bestTime}</div>}
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
                {tmpl.body && <p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap' }}>{tmpl.body}</p>}
                {tmpl.cta && <div><strong>CTA:</strong> {tmpl.cta}</div>}
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
  if (captions.length === 0 && reelIdeas.length === 0) return <EmptyState title="No Instagram Content" text="Generate an automation plan first." />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {captions.length > 0 && (
        <Card>
          <h3 style={{ margin: '0 0 12px 0' }}>Instagram Captions</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {captions.map((cap: any, i: number) => (
              <div key={i} style={{ padding: '12px', background: '#151d2b', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>{cap.title || `Post ${i + 1}`}</h4>
                {cap.postType && <div><strong>Type:</strong> {cap.postType}</div>}
                {cap.caption && <div><strong>Caption:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{cap.caption}</p></div>}
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
                {reel.description && <p style={{ color: '#9aa7bd' }}>{reel.description}</p>}
                {reel.music && <div><strong>Music:</strong> {reel.music}</div>}
                {reel.duration && <div><strong>Duration:</strong> {reel.duration}</div>}
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
  if (ads.length === 0) return <EmptyState title="No Google Ads" text="Generate an automation plan first." />;

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

function renderPosterTab(data: any) {
  const posters = asArray(data.posterPrompts).filter(p => p);
  const images = asArray(data.imageAdIdeas).filter(i => i);
  const designStyles = data.designStyles;
  if (posters.length === 0 && images.length === 0 && !designStyles) return <EmptyState title="No Creative Prompts" text="Generate an automation plan first." />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
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

function renderVideoTab(data: any) {
  const scripts = asArray(data.videoScripts).filter(s => s);
  if (scripts.length === 0) return <EmptyState title="No Video Ad Scripts" text="Generate an automation plan first." />;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {scripts.map((vs: any, i: number) => {
        const scenes = asArray(vs.scenes || vs.sceneBySceneBreakdown || vs.sceneBreakdown);
        return (
          <Card key={i}>
            <h4 style={{ margin: '0 0 12px 0' }}>{vs.title || `Video Ad ${i + 1}`}</h4>
            <div style={{ display: 'grid', gap: '8px' }}>
              {vs.hook && <div><strong>Hook:</strong> {vs.hook}</div>}
              {vs.problem && <div><strong>Problem:</strong> {vs.problem}</div>}
              {vs.productSolution && <div><strong>Product Solution:</strong> {vs.productSolution}</div>}
              {vs.proofEvidence && <div><strong>Proof/Evidence:</strong> {vs.proofEvidence}</div>}
              {vs.cta && <div><strong>CTA:</strong> {vs.cta}</div>}
              {vs.duration && <div><strong>Duration:</strong> {vs.duration}</div>}
              {vs.voiceover && <div><strong>Voiceover:</strong> {vs.voiceover}</div>}
              {vs.visualDirection && <div><strong>Visual Direction:</strong> {vs.visualDirection}</div>}
              {vs.script && <div><strong>Script:</strong><p style={{ color: '#9aa7bd', whiteSpace: 'pre-wrap', margin: '4px 0' }}>{vs.script}</p></div>}

              {scenes.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <h5 style={{ margin: '0 0 8px 0', color: '#53a7ff' }}>Scene-by-Scene Breakdown</h5>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {scenes.map((scene: any, si: number) => (
                      <div key={si} style={{ padding: '8px', background: '#101622', borderRadius: '6px', borderLeft: '3px solid #53a7ff' }}>
                        <strong>Scene {si + 1}:</strong>
                        {scene.description && <p style={{ color: '#9aa7bd', margin: '4px 0' }}>{scene.description}</p>}
                        {scene.visual && <div><em>Visual:</em> {scene.visual}</div>}
                        {scene.audio && <div><em>Audio:</em> {scene.audio}</div>}
                        {scene.duration && <div><em>Duration:</em> {scene.duration}</div>}
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
      calendarEntries.push({ date: day, channel: 'multi', content: formatValue(task) });
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
    return <EmptyState title="No Content Calendar" text="Generate an automation plan first." />;
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

  if (workflows.length === 0 && !leadCriteria) return <EmptyState title="No CRM Workflow" text="Generate an automation plan first." />;

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
                  {wf.trigger && <div><strong>Trigger:</strong> {wf.trigger}</div>}
                  {wf.condition && <div><strong>Condition:</strong> {wf.condition}</div>}
                  {wf.action && <div><strong>Action:</strong> {wf.action}</div>}
                  {wf.tool && <div><strong>Tool:</strong> {wf.tool}</div>}
                  {wf.owner && <div><strong>Owner:</strong> {wf.owner}</div>}
                  {wf.priority && <div><strong>Priority:</strong> {wf.priority}</div>}
                  {wf.difficulty && <div><strong>Difficulty:</strong> {wf.difficulty}</div>}
                  {wf.expectedKpi && <div><strong>Expected KPI:</strong> {wf.expectedKpi}</div>}
                  {wf.timeline && <div><strong>Timeline:</strong> {wf.timeline}</div>}
                  {wf.evidence && <div><strong>Evidence:</strong> {wf.evidence}</div>}
                  {wf.confidence && <div><strong>Confidence:</strong> {wf.confidence}</div>}
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
                  <span key={status} style={{ marginRight: '12px' }}><Badge>{status}</Badge>: {count}</span>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {overviewCards.length === 0 && Object.keys(kpis).length === 0 && <EmptyState title="No KPIs" text="Generate an automation plan first." />}
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

function renderLogsTab(data: any) {
  const logs = asArray(data.logs).filter(l => l);
  if (logs.length === 0) return <EmptyState title="No Automation Logs" text="Generate an automation plan to see logs." />;

  return (
    <Card>
      <h3 style={{ margin: '0 0 12px 0' }}>Automation History</h3>
      <div style={{ display: 'grid', gap: '8px' }}>
        {logs.map((log: any, i: number) => (
          <div key={i} style={{ padding: '10px', background: '#151d2b', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Badge tone={log.action === 'generated' ? 'green' : log.action === 'approved' ? 'blue' : log.action === 'rejected' ? 'red' : 'yellow'}>{log.action}</Badge>
                <span style={{ color: '#fff' }}>{log.message || 'No message'}</span>
              </div>
              {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#9aa7bd' }}>
                  {renderObjectCard(log.metadata, Object.keys(log.metadata))}
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
];

const tabRenderers: Record<string, (d: any) => JSX.Element> = {
  Plan: renderPlanTab,
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
};

export default function AutomationCenterPage() {
  const { selectedChatId, fullResults } = useProject();
  const [active, setActive] = useState('Plan');
  const [data, setData] = useState<any>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedChatId) { setData(null); return; }
    let cancelled = false;
    api.get(`/automation/${selectedChatId}/plan`)
      .then((r: any) => { if (!cancelled) setData(r.automationPlan || r.data || r); })
      .catch(() => { if (!cancelled) setData(null); });
    api.get(`/automation/${selectedChatId}/logs`)
      .then((r: any) => { if (!cancelled) setLogs(r.logs || []); })
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

  const planData = data ? { ...data, logs } : { logs };

  return (
    <div>
      <PageHeader eyebrow="Automation Center" title="Automation Command Center" subtitle="Generate and manage cross-channel marketing execution." />

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
            {selectedChatId && !data && !genLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9aa7bd' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#9aa7bd', display: 'inline-block' }} />
                No plan generated
              </div>
            )}
          </div>
          <button className="primary-btn" onClick={generate} disabled={genLoading || !selectedChatId}>
            {genLoading ? 'Generating...' : 'Generate Automation Plan'}
          </button>
        </div>
        {genError && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255, 71, 87, 0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ff8a8a' }}>{genError}</span>
            <button onClick={generate} className="secondary-btn" disabled={genLoading}>Retry</button>
          </div>
        )}
      </Card>

      {!selectedChatId && (
        <EmptyState title="No Project Selected" text="Select a project from the dropdown above, then generate an automation plan." />
      )}

      {genLoading && <Loading text="Generating automation plan from verified data..." />}

      {selectedChatId && !genLoading && (
        <Card>
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
            {tabRenderers[active] ? tabRenderers[active](planData) : renderPlanTab(planData)}
          </div>
        </Card>
      )}
    </div>
  );
}

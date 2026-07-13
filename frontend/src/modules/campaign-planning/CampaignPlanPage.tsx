import { useMemo } from 'react';
import {
  Zap, Target, TrendingUp, Activity, Map, Clock, AlertTriangle,
  Users, Eye, Star, Layers, FileText, CheckCircle2, ArrowRight,
  ChevronDown, ChevronUp, Lightbulb, Shield, BarChart3, List,
  UserCheck, Radio, Filter, ShoppingCart, Heart, Share2,
} from 'lucide-react';

interface CampaignPlanPageProps {
  plan: any;
}

function Section({ title, icon: Icon, color, children, empty }: {
  title: string;
  icon: any;
  color: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  if (empty) return null;

  return (
    <div style={{
      background: '#101622',
      border: '1px solid #293245',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '16px 20px',
        borderBottom: '1px solid #1d2738',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color }} />
        </div>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#e5e7eb' }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, reason, evidence }: {
  label: string;
  value: any;
  reason?: string;
  evidence?: string;
}) {
  if (!value && value !== 0) return null;

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa7bd', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', color: '#e5e7eb', lineHeight: 1.5 }}>
        {typeof value === 'object' ? (value.value || JSON.stringify(value)) : String(value)}
      </div>
      {(reason || evidence) && (
        <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {reason && <span style={{ fontSize: '11px', color: '#53a7ff' }}>Reason: {reason}</span>}
          {evidence && <span style={{ fontSize: '11px', color: '#a855f7' }}>Evidence: {evidence}</span>}
        </div>
      )}
    </div>
  );
}

function ChannelCard({ channel }: { channel: any }) {
  if (!channel) return null;

  return (
    <div style={{
      padding: '12px',
      background: '#151d2b',
      borderRadius: '8px',
      border: '1px solid #293245',
      borderLeft: `4px solid ${
        channel.fit === 'high' ? '#10e18b' : channel.fit === 'medium' ? '#ffb347' : '#ff4757'
      }`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', color: '#e5e7eb' }}>{channel.channel}</h4>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            background: channel.fit === 'high' ? 'rgba(16,225,139,0.15)' : channel.fit === 'medium' ? 'rgba(255,179,71,0.15)' : 'rgba(255,71,87,0.15)',
            color: channel.fit === 'high' ? '#10e18b' : channel.fit === 'medium' ? '#ffb347' : '#ff4757',
          }}>
            {channel.fit} fit
          </span>
          <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            background: channel.priority === 'high' ? 'rgba(168,85,247,0.15)' : channel.priority === 'medium' ? 'rgba(83,167,255,0.15)' : 'rgba(255,179,71,0.15)',
            color: channel.priority === 'high' ? '#a855f7' : channel.priority === 'medium' ? '#53a7ff' : '#ffb347',
          }}>
            {channel.priority}
          </span>
          {channel.organicOrPaid && (
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 600,
              background: channel.organicOrPaid === 'organic' ? 'rgba(16,225,139,0.15)' : 'rgba(83,167,255,0.15)',
              color: channel.organicOrPaid === 'organic' ? '#10e18b' : '#53a7ff',
            }}>
              {channel.organicOrPaid}
            </span>
          )}
        </div>
      </div>
      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#9aa7bd', lineHeight: 1.5 }}>
        {channel.reason}
      </p>
      {channel.recommendedContent && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
          <strong>Content:</strong> {channel.recommendedContent}
        </div>
      )}
      {channel.recommendedCTA && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
          <strong>CTA:</strong> {channel.recommendedCTA}
        </div>
      )}
      {channel.evidence && (
        <div style={{ fontSize: '11px', color: '#a855f7' }}>Evidence: {channel.evidence}</div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  if (!task) return null;

  return (
    <div style={{
      padding: '10px',
      background: '#151d2b',
      borderRadius: '6px',
      borderLeft: '3px solid #53a7ff',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb', marginBottom: '4px' }}>
        {task.title}
      </div>
      {task.description && (
        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#9aa7bd' }}>{task.description}</p>
      )}
      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7280', flexWrap: 'wrap' }}>
        {task.dependency && <span>Depends on: {task.dependency}</span>}
        {task.ownerRole && <span>Owner: {task.ownerRole}</span>}
        {task.evidence && <span style={{ color: '#a855f7' }}>Evidence: {task.evidence}</span>}
      </div>
    </div>
  );
}

function FunnelStage({ stage, data }: { stage: string; data: any }) {
  if (!data) return null;

  const icons: Record<string, any> = {
    awareness: Eye, interest: Star, consideration: Filter,
    conversion: ShoppingCart, retention: Heart, advocacy: Share2,
  };

  const IconComponent = icons[stage] || Eye;

  return (
    <div style={{
      padding: '12px',
      background: '#151d2b',
      borderRadius: '8px',
      border: '1px solid #293245',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <IconComponent size={14} style={{ color: '#53a7ff' }} />
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#e5e7eb', textTransform: 'capitalize' }}>
          {stage}
        </h4>
      </div>
      {data.objective && <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#9aa7bd' }}>{data.objective}</p>}
      {data.channels?.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
          {data.channels.map((ch: string, i: number) => (
            <span key={i} style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: 'rgba(83,167,255,0.1)', color: '#53a7ff' }}>{ch}</span>
          ))}
        </div>
      )}
      {data.content && <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Content: {data.content}</div>}
      {data.cta && <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>CTA: {data.cta}</div>}
      {data.measurement && <div style={{ fontSize: '11px', color: '#a855f7' }}>Measure: {data.measurement}</div>}
    </div>
  );
}

const funnelStages = ['awareness', 'interest', 'consideration', 'conversion', 'retention', 'advocacy'];

export function CampaignPlanPage({ plan }: CampaignPlanPageProps) {
  if (!plan) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        color: '#9aa7bd',
        textAlign: 'center',
      }}>
        <Layers size={48} style={{ color: '#293245', marginBottom: '16px' }} />
        <h3 style={{ color: '#6b7280', margin: '0 0 8px 0' }}>No Campaign Plan Yet</h3>
        <p style={{ margin: 0, fontSize: '13px', maxWidth: '400px' }}>
          Generate a campaign intelligence plan to see your evidence-based marketing strategy.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Executive Summary */}
      {plan.executiveSummary && (
        <Section title="Executive Summary" icon={Zap} color="#a855f7">
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '14px', background: '#151d2b', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Campaign Name</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#e5e7eb' }}>{plan.executiveSummary.campaignName || '—'}</div>
              </div>
              <div style={{ padding: '14px', background: '#151d2b', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Goal</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#10e18b' }}>{plan.executiveSummary.campaignGoal || '—'}</div>
              </div>
              <div style={{ padding: '14px', background: '#151d2b', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Duration</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#53a7ff' }}>{plan.executiveSummary.recommendedDuration || '—'}</div>
              </div>
              <div style={{ padding: '14px', background: '#151d2b', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#9aa7bd', marginBottom: '4px' }}>Theme</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#f59e0b' }}>{plan.executiveSummary.campaignTheme || '—'}</div>
              </div>
            </div>

            {plan.executiveSummary.primaryAudience && (
              <Field label="Primary Audience" value={plan.executiveSummary.primaryAudience.value} reason={plan.executiveSummary.primaryAudience.reason} evidence={plan.executiveSummary.primaryAudience.evidence} />
            )}

            {plan.executiveSummary.primaryChannels?.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa7bd', textTransform: 'uppercase', marginBottom: '8px' }}>Primary Channels</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {plan.executiveSummary.primaryChannels.map((ch: any, i: number) => (
                    <span key={i} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: 'rgba(83,167,255,0.1)', color: '#53a7ff', border: '1px solid rgba(83,167,255,0.2)' }}>
                      {ch.channel || ch.value || ch}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Business Goal */}
      {plan.businessGoal && plan.businessGoal.goal && (
        <Section title="Business Goal" icon={Target} color="#10e18b">
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '18px',
                fontWeight: 700,
                background: 'rgba(16,225,139,0.1)',
                color: '#10e18b',
                border: '1px solid rgba(16,225,139,0.3)',
              }}>
                {plan.businessGoal.goal}
              </span>
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                background: plan.businessGoal.confidence === 'high' ? 'rgba(16,225,139,0.15)' : plan.businessGoal.confidence === 'medium' ? 'rgba(255,179,71,0.15)' : 'rgba(255,71,87,0.15)',
                color: plan.businessGoal.confidence === 'high' ? '#10e18b' : plan.businessGoal.confidence === 'medium' ? '#ffb347' : '#ff4757',
              }}>
                {plan.businessGoal.confidence} confidence
              </span>
            </div>
            {plan.businessGoal.reason && <Field label="Reason" value={plan.businessGoal.reason} />}
            {plan.businessGoal.evidence && <Field label="Evidence" value={plan.businessGoal.evidence} />}
          </div>
        </Section>
      )}

      {/* Campaign Objective */}
      {plan.campaignObjective && plan.campaignObjective.primary?.value && (
        <Section title="Campaign Objective" icon={TrendingUp} color="#53a7ff">
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <Field label="Primary Objective" value={plan.campaignObjective.primary} reason={plan.campaignObjective.primary?.reason} evidence={plan.campaignObjective.primary?.evidence} />
            {plan.campaignObjective.secondary?.value && <Field label="Secondary Objective" value={plan.campaignObjective.secondary} reason={plan.campaignObjective.secondary?.reason} evidence={plan.campaignObjective.secondary?.evidence} />}
            {plan.campaignObjective.successDefinition?.value && <Field label="Success Definition" value={plan.campaignObjective.successDefinition} reason={plan.campaignObjective.successDefinition?.reason} evidence={plan.campaignObjective.successDefinition?.evidence} />}
            {plan.campaignObjective.targetAudience?.value && <Field label="Target Audience" value={plan.campaignObjective.targetAudience} reason={plan.campaignObjective.targetAudience?.reason} evidence={plan.campaignObjective.targetAudience?.evidence} />}
            {plan.campaignObjective.timeline?.value && <Field label="Timeline" value={plan.campaignObjective.timeline} reason={plan.campaignObjective.timeline?.reason} evidence={plan.campaignObjective.timeline?.evidence} />}
            {plan.campaignObjective.priority && <Field label="Priority" value={plan.campaignObjective.priority} />}
          </div>
          {plan.campaignObjective.dependencies?.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa7bd', marginBottom: '8px' }}>Dependencies</div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {plan.campaignObjective.dependencies.map((d: any, i: number) => (
                  <div key={i} style={{ padding: '8px', background: '#151d2b', borderRadius: '6px', fontSize: '12px', color: '#9aa7bd' }}>
                    {d.dependency || d}
                    {d.reason && <span style={{ color: '#6b7280' }}> — {d.reason}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Audience Selection */}
      {plan.audienceSelection && plan.audienceSelection.primaryAudience?.value && (
        <Section title="Audience Selection" icon={Users} color="#f59e0b">
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div>
              <Field label="Primary Audience" value={plan.audienceSelection.primaryAudience.value} reason={plan.audienceSelection.primaryAudience.reason} evidence={plan.audienceSelection.primaryAudience.evidence} />
              {plan.audienceSelection.secondaryAudience?.value && <Field label="Secondary Audience" value={plan.audienceSelection.secondaryAudience.value} reason={plan.audienceSelection.secondaryAudience.reason} evidence={plan.audienceSelection.secondaryAudience.evidence} />}
              {plan.audienceSelection.buyingStage?.value && <Field label="Buying Stage" value={plan.audienceSelection.buyingStage.value} reason={plan.audienceSelection.buyingStage.reason} evidence={plan.audienceSelection.buyingStage.evidence} />}
            </div>
            <div>
              {plan.audienceSelection.painPoints?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa7bd', marginBottom: '4px' }}>Pain Points</div>
                  {plan.audienceSelection.painPoints.map((p: any, i: number) => (
                    <div key={i} style={{ fontSize: '12px', color: '#6b7280', padding: '2px 0' }}>• {p.value || p} {p.evidence && <span style={{ color: '#a855f7' }}>({p.evidence})</span>}</div>
                  ))}
                </div>
              )}
              {plan.audienceSelection.decisionDrivers?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa7bd', marginBottom: '4px' }}>Decision Drivers</div>
                  {plan.audienceSelection.decisionDrivers.map((d: any, i: number) => (
                    <div key={i} style={{ fontSize: '12px', color: '#6b7280', padding: '2px 0' }}>• {d.value || d} {d.evidence && <span style={{ color: '#a855f7' }}>({d.evidence})</span>}</div>
                  ))}
                </div>
              )}
              {plan.audienceSelection.objections?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa7bd', marginBottom: '4px' }}>Objections</div>
                  {plan.audienceSelection.objections.map((o: any, i: number) => (
                    <div key={i} style={{ fontSize: '12px', color: '#ffb347', padding: '2px 0' }}>• {o.value || o}</div>
                  ))}
                </div>
              )}
              {plan.audienceSelection.contentPreferences?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9aa7bd', marginBottom: '4px' }}>Content Preferences</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {plan.audienceSelection.contentPreferences.map((c: any, i: number) => (
                      <span key={i} style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', background: 'rgba(83,167,255,0.1)', color: '#53a7ff' }}>
                        {c.value || c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Channel Recommendations */}
      {plan.channelRecommendations?.length > 0 && (
        <Section title={`Channel Recommendations (${plan.channelRecommendations.length})`} icon={Radio} color="#a855f7">
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {plan.channelRecommendations.map((ch: any, i: number) => (
              <ChannelCard key={i} channel={ch} />
            ))}
          </div>
        </Section>
      )}

      {/* Campaign Timeline */}
      {plan.timeline && (
        <Section title="Campaign Timeline" icon={Clock} color="#53a7ff">
          <div style={{ display: 'grid', gap: '16px' }}>
            {Object.entries(plan.timeline).map(([period, tasks]: [string, any]) => {
              if (!Array.isArray(tasks) || tasks.length === 0) return null;
              return (
                <div key={period}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#10e18b',
                    textTransform: 'capitalize',
                  }}>
                    {period.replace(/([a-z])(\d)/, '$1 $2')}
                  </h4>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {tasks.map((task: any, i: number) => (
                      <TaskCard key={i} task={task} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Marketing Funnel */}
      {plan.marketingFunnel && (
        <Section title="Marketing Funnel" icon={Filter} color="#10e18b">
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {funnelStages.map(stage => (
              <FunnelStage key={stage} stage={stage} data={plan.marketingFunnel[stage]} />
            ))}
          </div>
        </Section>
      )}

      {/* KPI Framework */}
      {plan.kpiFramework?.length > 0 && (
        <Section title={`KPI Framework (${plan.kpiFramework.length})`} icon={BarChart3} color="#ffb347">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #293245' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#9aa7bd', fontWeight: 600 }}>KPI</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#9aa7bd', fontWeight: 600 }}>How to Measure</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#9aa7bd', fontWeight: 600 }}>Tool</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#9aa7bd', fontWeight: 600 }}>Frequency</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#9aa7bd', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {plan.kpiFramework.map((kpi: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1d2738' }}>
                    <td style={{ padding: '10px 12px', color: '#e5e7eb' }}>{kpi.kpi}</td>
                    <td style={{ padding: '10px 12px', color: '#9aa7bd' }}>{kpi.howToMeasure}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{kpi.tool}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{kpi.frequency}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: kpi.status === 'Measured' ? 'rgba(16,225,139,0.15)' : kpi.status === 'Estimated' ? 'rgba(255,179,71,0.15)' : 'rgba(255,71,87,0.15)',
                        color: kpi.status === 'Measured' ? '#10e18b' : kpi.status === 'Estimated' ? '#ffb347' : '#ff4757',
                      }}>
                        {kpi.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Risk Assessment */}
      {plan.riskAssessment?.length > 0 && (
        <Section title={`Risk Assessment (${plan.riskAssessment.length})`} icon={Shield} color="#ff4757">
          <div style={{ display: 'grid', gap: '12px' }}>
            {plan.riskAssessment.map((r: any, i: number) => (
              <div key={i} style={{
                padding: '12px',
                background: '#151d2b',
                borderRadius: '8px',
                border: '1px solid #293245',
                borderLeft: `4px solid ${
                  r.severity === 'high' ? '#ff4757' : r.severity === 'medium' ? '#ffb347' : '#53a7ff'
                }`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#e5e7eb' }}>{r.risk}</h4>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: r.severity === 'high' ? 'rgba(255,71,87,0.15)' : r.severity === 'medium' ? 'rgba(255,179,71,0.15)' : 'rgba(83,167,255,0.15)',
                    color: r.severity === 'high' ? '#ff4757' : r.severity === 'medium' ? '#ffb347' : '#53a7ff',
                  }}>
                    {r.severity}
                  </span>
                </div>
                {r.cause && <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9aa7bd' }}>{r.cause}</p>}
                {r.evidence && <div style={{ fontSize: '11px', color: '#a855f7', marginBottom: '4px' }}>Evidence: {r.evidence}</div>}
                {r.mitigation && (
                  <div style={{ fontSize: '12px', color: '#10e18b', marginTop: '4px' }}>
                    Mitigation: {r.mitigation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Opportunity Assessment */}
      {plan.opportunityAssessment?.length > 0 && (
        <Section title={`Opportunity Assessment (${plan.opportunityAssessment.length})`} icon={Lightbulb} color="#10e18b">
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {plan.opportunityAssessment.map((o: any, i: number) => (
              <div key={i} style={{
                padding: '12px',
                background: '#151d2b',
                borderRadius: '8px',
                border: '1px solid #293245',
                borderLeft: '4px solid #10e18b',
              }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#e5e7eb' }}>{o.opportunity}</h4>
                {o.reason && <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#9aa7bd' }}>{o.reason}</p>}
                {o.evidence && <div style={{ fontSize: '11px', color: '#a855f7', marginBottom: '6px' }}>Evidence: {o.evidence}</div>}
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#6b7280' }}>
                  {o.effort && <span>Effort: {o.effort}</span>}
                  {o.priority && <span>Priority: {o.priority}</span>}
                </div>
                {o.expectedBusinessImpact && (
                  <div style={{ fontSize: '11px', color: '#53a7ff', marginTop: '4px' }}>
                    Impact: {o.expectedBusinessImpact}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Next Actions */}
      {plan.executiveSummary?.nextActions?.length > 0 && (
        <Section title="Next Actions" icon={List} color="#a855f7">
          <div style={{ display: 'grid', gap: '8px' }}>
            {plan.executiveSummary.nextActions.map((a: any, i: number) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                background: '#151d2b',
                borderRadius: '6px',
              }}>
                <ArrowRight size={14} style={{ color: '#53a7ff', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#e5e7eb', fontSize: '13px' }}>{a.action}</span>
                  {a.owner && <span style={{ color: '#6b7280', fontSize: '11px', marginLeft: '8px' }}>— {a.owner}</span>}
                </div>
                {a.priority && (
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: a.priority === 'high' ? 'rgba(168,85,247,0.15)' : a.priority === 'medium' ? 'rgba(83,167,255,0.15)' : 'rgba(255,179,71,0.15)',
                    color: a.priority === 'high' ? '#a855f7' : a.priority === 'medium' ? '#53a7ff' : '#ffb347',
                  }}>
                    {a.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Metadata */}
      {plan._metadata && (
        <div style={{
          padding: '12px 16px',
          background: '#0a0f1a',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#4a5568',
          border: '1px solid #1d2738',
        }}>
          Generated via {plan._metadata.provider || 'unknown'}
          {plan._metadata.fallbackUsed && ' (fallback)'} —
          {new Date(plan._metadata.generatedAt || Date.now()).toLocaleString()}
        </div>
      )}
    </div>
  );
}

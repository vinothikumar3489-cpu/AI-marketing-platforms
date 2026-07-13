import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { User, Target, Calendar, Activity, Sparkles, Loader2, AlertTriangle, ChevronLeft, TrendingUp, CheckCircle2, Zap } from 'lucide-react';
import { Card, Badge, Loading } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { getCRMContact, updateCRMContact, generateLeadJourney, getLeadJourney } from '../../lib/api';
import { CRMLoadingState } from './CRMLoadingState';

type Tab = 'overview' | 'deals' | 'tasks' | 'activity' | 'lead-journey';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  deals: 'Deals',
  tasks: 'Tasks',
  activity: 'Activity',
  'lead-journey': 'Lead Journey',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#0f1729', border: '1px solid #293245',
  borderRadius: '6px', color: '#e5e7eb', fontSize: '13px', outline: 'none',
};

export function CRMContactDetail({ contactId, onBack }: { contactId: string; onBack: () => void }) {
  const { selectedChatId } = useProject();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [deals, setDeals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [journeyData, setJourneyData] = useState<any>(null);
  const [generatingJourney, setGeneratingJourney] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (!selectedChatId || !contactId) { setLoading(false); return; }
    loadContact();
  }, [selectedChatId, contactId]);

  async function loadContact() {
    if (!selectedChatId) return;
    setLoading(true); setError(null);
    try {
      const result = await getCRMContact(selectedChatId, contactId);
      setContact(result);
      setEditForm({
        firstName: result.firstName || '',
        lastName: result.lastName || '',
        email: result.email || '',
        phone: result.phone || '',
        jobTitle: result.jobTitle || '',
        lifecycleStage: result.lifecycleStage || 'lead',
        consentStatus: result.consentStatus || 'not_collected',
      });
      if (result.deals) setDeals(Array.isArray(result.deals) ? result.deals : []);
      if (result.tasks) setTasks(Array.isArray(result.tasks) ? result.tasks : []);
      if (result.activities) setActivities(Array.isArray(result.activities) ? result.activities : []);
      loadJourney();
    } catch (err: any) {
      setError(err.message || 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  }

  async function loadJourney() {
    if (!selectedChatId) return;
    try {
      const result = await getLeadJourney(selectedChatId, contactId);
      setJourneyData(result);
    } catch {
      setJourneyData(null);
    }
  }

  async function handleSave() {
    if (!selectedChatId || !contact) return;
    setSaving(true);
    try {
      await updateCRMContact(selectedChatId, contactId, editForm);
      toast.success('Contact updated');
      setEditing(false);
      await loadContact();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateJourney() {
    if (!selectedChatId) return;
    setGeneratingJourney(true);
    try {
      const result = await generateLeadJourney(selectedChatId, contactId);
      setJourneyData(result);
      toast.success('Lead journey generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate journey');
    } finally {
      setGeneratingJourney(false);
    }
  }

  if (loading) return <CRMLoadingState message="Loading contact..." />;
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 20px', background: '#0f1729', borderRadius: '12px', border: '1px solid rgba(255,71,87,0.2)' }}>
        <AlertTriangle size={36} style={{ color: '#ff4757' }} />
        <div style={{ color: '#ff8a8a', fontSize: '14px' }}>{error}</div>
        <button onClick={loadContact} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff', background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '12px' }}>Retry</button>
      </div>
    );
  }
  if (!contact) return null;

  const tabs: Tab[] = ['overview', 'deals', 'tasks', 'activity', 'lead-journey'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onBack} style={{
          padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245',
          background: '#101622', color: '#9aa7bd', cursor: 'pointer', fontSize: '12px',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}><ChevronLeft size={14} /> Back</button>
        <span style={{ color: '#6b7a93', fontSize: '12px' }}>/</span>
        <span style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>
          {contact.firstName} {contact.lastName}
        </span>
        <Badge tone={contact.lifecycleStage === 'customer' ? 'green' : contact.lifecycleStage === 'lead' ? 'blue' : 'yellow'}>{contact.lifecycleStage}</Badge>
      </div>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #293245', paddingBottom: '4px' }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', borderRadius: '6px 6px 0 0', border: 'none',
            background: activeTab === tab ? 'rgba(83,167,255,0.12)' : 'transparent',
            color: activeTab === tab ? '#53a7ff' : '#6b7a93',
            borderBottom: activeTab === tab ? '2px solid #53a7ff' : '2px solid transparent',
            cursor: 'pointer', fontSize: '12px', fontWeight: activeTab === tab ? 600 : 400,
          }}>
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: '#e5e7eb', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} style={{ color: '#53a7ff' }} /> Contact Information
              </h4>
              <button onClick={() => setEditing(!editing)} style={{
                padding: '4px 10px', borderRadius: '4px', border: '1px solid #293245',
                background: '#101622', color: '#53a7ff', cursor: 'pointer', fontSize: '11px',
              }}>
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>First Name</label>
                    <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Last Name</label>
                    <input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email</label>
                    <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone</label>
                    <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Job Title</label>
                    <input value={editForm.jobTitle} onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Lifecycle Stage</label>
                    <select value={editForm.lifecycleStage} onChange={e => setEditForm({ ...editForm, lifecycleStage: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {['lead', 'mql', 'sql', 'opportunity', 'customer', 'churned'].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#9aa7bd', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Consent Status</label>
                    <select value={editForm.consentStatus} onChange={e => setEditForm({ ...editForm, consentStatus: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      {['not_collected', 'granted', 'withdrawn', 'pending'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleSave} disabled={saving} style={{
                    padding: '8px 16px', borderRadius: '6px', border: '1px solid #53a7ff',
                    background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    {saving ? <Loader2 className="spin" size={14} /> : null}
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div><span style={{ color: '#9aa7bd' }}>Email:</span> <span style={{ color: '#e5e7eb' }}>{contact.email || 'Not available'}</span></div>
                <div><span style={{ color: '#9aa7bd' }}>Phone:</span> <span style={{ color: '#e5e7eb' }}>{contact.phone || 'Not available'}</span></div>
                <div><span style={{ color: '#9aa7bd' }}>Job Title:</span> <span style={{ color: '#e5e7eb' }}>{contact.jobTitle || 'Not available'}</span></div>
                <div><span style={{ color: '#9aa7bd' }}>Company:</span>
                  <span style={{ color: contact.company?.name ? '#53a7ff' : '#6b7a93' }}>
                    {contact.company?.name || 'Not available'}
                  </span>
                </div>
                <div><span style={{ color: '#9aa7bd' }}>Lifecycle Stage:</span> <span style={{ color: '#e5e7eb' }}>{contact.lifecycleStage}</span></div>
                <div><span style={{ color: '#9aa7bd' }}>Consent Status:</span>
                  <Badge tone={contact.consentStatus === 'granted' ? 'green' : contact.consentStatus === 'withdrawn' ? 'red' : 'gray'}>
                    {contact.consentStatus?.replace(/_/g, ' ') || 'Not collected'}
                  </Badge>
                </div>
                <div><span style={{ color: '#9aa7bd' }}>Source:</span> <span style={{ color: '#e5e7eb' }}>{contact.source || 'Not available'}</span></div>
                <div><span style={{ color: '#9aa7bd' }}>Status:</span> <span style={{ color: '#e5e7eb' }}>{contact.status || 'active'}</span></div>
                <div><span style={{ color: '#9aa7bd' }}>Created:</span> <span style={{ color: '#e5e7eb' }}>{contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : 'Not available'}</span></div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'deals' && (
        <Card>
          <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={14} style={{ color: '#10e18b' }} /> Deals ({deals.length})
          </h4>
          {deals.length === 0 ? (
            <div style={{ color: '#6b7a93', fontSize: '12px', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>No associated deals</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {deals.map((deal: any) => (
                <div key={deal.id} style={{ padding: '10px 12px', background: '#101622', borderRadius: '6px', border: '1px solid #1d2738' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600 }}>{deal.name}</div>
                    <Badge tone={deal.status === 'won' ? 'green' : deal.status === 'lost' ? 'red' : 'blue'}>{deal.status}</Badge>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#6b7a93', marginTop: '4px' }}>
                    {deal.value != null && <span>{deal.currency || '$'}{deal.value.toLocaleString()}</span>}
                    {deal.stage?.name && <span>{deal.stage.name}</span>}
                    {deal.expectedCloseDate && <span>Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} style={{ color: '#ffb347' }} /> Tasks ({tasks.length})
          </h4>
          {tasks.length === 0 ? (
            <div style={{ color: '#6b7a93', fontSize: '12px', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>No associated tasks</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {tasks.map((task: any) => (
                <div key={task.id} style={{ padding: '10px 12px', background: '#101622', borderRadius: '6px', border: '1px solid #1d2738', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600, textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>{task.title}</div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#6b7a93', marginTop: '2px' }}>
                      {task.priority && <Badge tone={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'blue'}>{task.priority}</Badge>}
                      {task.dueAt && <span><Calendar size={10} /> {new Date(task.dueAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {task.status === 'completed' && <CheckCircle2 size={16} style={{ color: '#10e18b' }} />}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'activity' && (
        <Card>
          <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} style={{ color: '#53a7ff' }} /> Activity Timeline ({activities.length})
          </h4>
          {activities.length === 0 ? (
            <div style={{ color: '#6b7a93', fontSize: '12px', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>No recent activities</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '500px', overflow: 'auto' }}>
              {activities.slice(0, 30).map((act: any, i: number) => (
                <div key={act.id || i} style={{
                  padding: '10px 12px', background: '#101622', borderRadius: '6px',
                  borderLeft: '3px solid #53a7ff',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: '#53a7ff', fontSize: '12px', fontWeight: 600 }}>{act.activityType}</div>
                      <div style={{ color: '#e5e7eb', fontSize: '13px', marginTop: '2px' }}>{act.title}</div>
                      {act.description && <div style={{ color: '#9aa7bd', fontSize: '11px', marginTop: '2px' }}>{act.description}</div>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7a93', flexShrink: 0 }}>
                      {act.activityDate ? new Date(act.activityDate).toLocaleDateString() : ''}
                    </div>
                  </div>
                  {act.outcome && <div style={{ marginTop: '4px', fontSize: '11px', color: '#ffb347' }}>Outcome: {act.outcome}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'lead-journey' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#e5e7eb', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={14} style={{ color: '#a855f7' }} /> AI Lead Journey
            </h4>
            <button onClick={handleGenerateJourney} disabled={generatingJourney} style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #a855f7',
              background: 'rgba(168,85,247,0.15)', color: '#a855f7', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              {generatingJourney ? <Loader2 className="spin" size={14} /> : <Sparkles size={14} />}
              {generatingJourney ? 'Generating...' : 'Generate Journey'}
            </button>
          </div>

          {generatingJourney && <Loading text="Generating lead journey recommendations..." />}

          {!generatingJourney && !journeyData && (
            <Card>
              <div style={{ color: '#6b7a93', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                No lead journey data available. Click "Generate Journey" to create AI-powered recommendations.
              </div>
            </Card>
          )}

          {journeyData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {journeyData.currentState && (
                <Card>
                  <h4 style={{ margin: '0 0 8px 0', color: '#e5e7eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={14} style={{ color: '#53a7ff' }} /> Current State
                  </h4>
                  <div style={{ color: '#e5e7eb', fontSize: '13px' }}>
                    {typeof journeyData.currentState === 'string' ? journeyData.currentState : journeyData.currentState.description || JSON.stringify(journeyData.currentState)}
                  </div>
                  {journeyData.currentState.inferenceStatus && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7a93' }}>
                      <Badge tone={journeyData.currentState.inferenceStatus === 'EVIDENCE_BACKED' ? 'green' : 'yellow'}>
                        {journeyData.currentState.inferenceStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}
                </Card>
              )}

              {journeyData.recommendedNextAction && (
                <Card>
                  <h4 style={{ margin: '0 0 8px 0', color: '#e5e7eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} style={{ color: '#10e18b' }} /> Recommended Next Action
                  </h4>
                  <div style={{ color: '#e5e7eb', fontSize: '13px' }}>
                    {typeof journeyData.recommendedNextAction === 'string' ? journeyData.recommendedNextAction : journeyData.recommendedNextAction.action || journeyData.recommendedNextAction.description || JSON.stringify(journeyData.recommendedNextAction)}
                  </div>
                  {journeyData.recommendedNextAction.inferenceStatus && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7a93' }}>
                      <Badge tone={journeyData.recommendedNextAction.inferenceStatus === 'EVIDENCE_BACKED' ? 'green' : 'yellow'}>
                        {journeyData.recommendedNextAction.inferenceStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}
                </Card>
              )}

              {journeyData.journeySteps && Array.isArray(journeyData.journeySteps) && journeyData.journeySteps.length > 0 && (
                <Card>
                  <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} style={{ color: '#a855f7' }} /> Journey Steps
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {journeyData.journeySteps.map((step: any, i: number) => (
                      <div key={i} style={{
                        padding: '10px 12px', background: '#101622', borderRadius: '6px',
                        borderLeft: '3px solid #a855f7',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            background: 'rgba(168,85,247,0.15)', color: '#a855f7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '12px',
                          }}>{i + 1}</div>
                          <div style={{ color: '#e5e7eb', fontWeight: 600, fontSize: '13px' }}>{step.name || step.action || `Step ${i + 1}`}</div>
                        </div>
                        {step.description && <div style={{ color: '#9aa7bd', fontSize: '12px', marginLeft: '32px' }}>{step.description}</div>}
                        {step.inferenceStatus && (
                          <div style={{ marginTop: '4px', marginLeft: '32px' }}>
                            <Badge tone={step.inferenceStatus === 'EVIDENCE_BACKED' ? 'green' : 'yellow'}>
                              {step.inferenceStatus.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {journeyData.riskAssessment && (
                <Card>
                  <h4 style={{ margin: '0 0 8px 0', color: '#e5e7eb', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} style={{ color: '#ffb347' }} /> Risk Assessment
                  </h4>
                  <div style={{ color: '#e5e7eb', fontSize: '13px' }}>
                    {typeof journeyData.riskAssessment === 'string' ? journeyData.riskAssessment : journeyData.riskAssessment.summary || JSON.stringify(journeyData.riskAssessment)}
                  </div>
                  {journeyData.riskAssessment.inferenceStatus && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7a93' }}>
                      <Badge tone={journeyData.riskAssessment.inferenceStatus === 'EVIDENCE_BACKED' ? 'green' : 'yellow'}>
                        {journeyData.riskAssessment.inferenceStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

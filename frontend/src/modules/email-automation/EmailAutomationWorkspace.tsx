import { useEffect, useState, useRef } from 'react';
import { Mail, Send, CheckCircle2, AlertTriangle, Loader2, Clock, FileText, Eye, Edit3, RotateCcw, History, ThumbsUp, XCircle, Undo, Sparkles, Zap, Target, TrendingUp, Users, Building, Activity, Copy, Download, Smartphone, Monitor, Moon, Calendar, ChevronDown, ChevronUp, CheckSquare } from 'lucide-react';
import { Card, Badge, Loading, EmptyState } from '../../components/UI';
import { useProject } from '../../context/ProjectContext';
import { generateEmailCampaign, getEmailCampaign, listEmailCampaigns, updateEmailItem, regenerateEmailItem, submitCampaignForReview, approveEmailCampaign, requestCampaignChanges, createEmailCampaignVersion, restoreEmailCampaignVersion, getCampaignPlan, sendTestCampaignEmail, sendCampaignEmails } from '../../lib/api';

const LOADING_STAGES = [
  'Loading campaign plan and evidence data...',
  'Analysing target audience and pain points...',
  'Checking channel fit and email readiness...',
  'Building email sequence structure...',
  'Generating email 1: Introduction & Value Proposition...',
  'Generating email 2: Social Proof & Credibility...',
  'Generating email 3: Detailed Solution & Deep Dive...',
  'Generating email 4: Case Study & Use Case...',
  'Generating email 5: Objection Handling...',
  'Generating email 6: Final CTA & Urgency...',
  'Validating claims and evidence compliance...',
  'Finalising email campaign...',
];

export function EmailAutomationWorkspace() {
  const { selectedChatId } = useProject();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [regeneratingItem, setRegeneratingItem] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingReal, setSendingReal] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const [testSendResult, setTestSendResult] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'dark'>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(0);

  useEffect(() => {
    if (!selectedChatId) return;
    loadCampaigns();
  }, [selectedChatId]);

  async function loadCampaigns() {
    if (!selectedChatId) return;
    try {
      const result = await listEmailCampaigns(selectedChatId);
      setCampaigns(Array.isArray(result) ? result : []);
    } catch { setCampaigns([]); }
  }

  async function handleGenerate() {
    if (!selectedChatId) return;
    setGenerating(true);
    setError(null);
    setLoadingStage(0);

    const stageInterval = setInterval(() => {
      setLoadingStage(prev => Math.min(prev + 1, LOADING_STAGES.length - 1));
    }, 800);

    try {
      const planList = await listEmailCampaigns(selectedChatId);
      let planId: string | null = null;

      try {
        const planResp = await getCampaignPlan(selectedChatId);
        if (planResp?.id) planId = planResp.id;
        if (planResp?.campaignPlan?.id) planId = planResp.campaignPlan.id;
        if (planResp?.data?.id) planId = planResp.data.id;
      } catch {}

      if (!planId) {
        setError('No Campaign Plan found. Generate a campaign plan first.');
        setGenerating(false);
        clearInterval(stageInterval);
        return;
      }

      const result = await generateEmailCampaign(selectedChatId, planId);
      setSelectedCampaign(result.campaign || result);
      setView('detail');
      setShowWorkflow(true);
      setWorkflowStep(1);
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || 'Failed to generate email campaign');
    } finally {
      setGenerating(false);
      clearInterval(stageInterval);
    }
  }

  async function openCampaign(campaignId: string) {
    if (!selectedChatId) return;
    setLoading(true);
    try {
      const result = await getEmailCampaign(selectedChatId, campaignId);
      setSelectedCampaign(result);
      setView('detail');
    } catch (err: any) {
      setError(err.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }

  async function handleEditItem(itemId: string, field: string, value: string) {
    if (!selectedChatId || !selectedCampaign) return;
    try {
      const updated = await updateEmailItem(selectedChatId, selectedCampaign.id, itemId, { [field]: value });
      setSelectedCampaign((prev: any) => ({
        ...prev,
        sequenceItems: (prev.sequenceItems || []).map((item: any) =>
          item.id === itemId ? { ...item, ...updated } : item
        ),
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
    }
    setEditItemId(null);
    setEditField(null);
  }

  async function handleRegenerateItem(itemId: string) {
    if (!selectedChatId || !selectedCampaign) return;
    setRegeneratingItem(itemId);
    try {
      const updated = await regenerateEmailItem(selectedChatId, selectedCampaign.id, itemId);
      setSelectedCampaign((prev: any) => ({
        ...prev,
        sequenceItems: (prev.sequenceItems || []).map((item: any) =>
          item.id === itemId ? { ...item, ...updated } : item
        ),
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate item');
    } finally {
      setRegeneratingItem(null);
    }
  }

  async function handleSubmitReview() {
    if (!selectedChatId || !selectedCampaign) return;
    try {
      const result = await submitCampaignForReview(selectedChatId, selectedCampaign.id);
      setSelectedCampaign((prev: any) => ({ ...prev, ...result }));
      setWorkflowStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to submit for review');
    }
  }

  async function handleApprove() {
    if (!selectedChatId || !selectedCampaign) return;
    try {
      const result = await approveEmailCampaign(selectedChatId, selectedCampaign.id);
      setSelectedCampaign((prev: any) => ({ ...prev, ...result }));
      setWorkflowStep(3);
    } catch (err: any) {
      setError(err.message || 'Failed to approve');
    }
  }

  async function handleRequestChanges() {
    if (!selectedChatId || !selectedCampaign || !feedbackText.trim()) return;
    try {
      const result = await requestCampaignChanges(selectedChatId, selectedCampaign.id, feedbackText);
      setSelectedCampaign((prev: any) => ({ ...prev, ...result }));
      setFeedbackText('');
      setWorkflowStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to request changes');
    }
  }

  async function handleCreateVersion() {
    if (!selectedChatId || !selectedCampaign) return;
    try {
      await createEmailCampaignVersion(selectedChatId, selectedCampaign.id, 'Manual save from workspace');
    } catch (err: any) {
      setError(err.message || 'Failed to create version');
    }
  }

  async function handleRestoreVersion(versionId: string) {
    if (!selectedChatId || !selectedCampaign) return;
    try {
      await restoreEmailCampaignVersion(selectedChatId, selectedCampaign.id, versionId);
      await openCampaign(selectedCampaign.id);
    } catch (err: any) {
      setError(err.message || 'Failed to restore version');
    }
  }

  async function handleTestSend() {
    if (!selectedChatId || !selectedCampaign || !testRecipient.trim()) return;
    setSendingTest(true);
    setTestSendResult(null);
    try {
      const result = await sendTestCampaignEmail(selectedChatId, selectedCampaign.id, testRecipient.trim());
      setTestSendResult(result);
      await openCampaign(selectedCampaign.id);
    } catch (err: any) {
      setTestSendResult({ success: false, error: err.message || 'Failed to send test' });
    } finally {
      setSendingTest(false);
    }
  }

  async function handleRealSend() {
    if (!selectedChatId || !selectedCampaign) return;
    setSendingReal(true);
    setSendResult(null);
    try {
      const result = await sendCampaignEmails(selectedChatId, selectedCampaign.id);
      setSendResult(result);
      await openCampaign(selectedCampaign.id);
      setWorkflowStep(7);
    } catch (err: any) {
      setSendResult({ success: false, error: err.message || 'Failed to send campaign' });
    } finally {
      setSendingReal(false);
    }
  }

  async function handleSchedule() {
    if (!selectedChatId || !selectedCampaign || !scheduleDate) return;
    setScheduling(true);
    try {
      const response = await fetch(`/api/chats/${selectedChatId}/email-campaign/${selectedCampaign.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        body: JSON.stringify({ scheduledDate: new Date(scheduleDate).toISOString() })
      });
      const result = await response.json();
      if (result.success) {
        setSelectedCampaign((prev: any) => ({ ...prev, status: 'scheduled', scheduledAt: scheduleDate }));
        setWorkflowStep(5);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to schedule');
    } finally {
      setScheduling(false);
    }
  }

  function copyHtml(html: string) {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadHtml(html: string, filename: string) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadText(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function backToList() {
    setView('list');
    setSelectedCampaign(null);
    setShowVersionHistory(false);
    setShowPreview(false);
    setShowWorkflow(false);
    loadCampaigns();
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '16px',
    padding: '20px', maxWidth: '1200px', margin: '0 auto',
  };

  if (generating) {
    return (
      <div style={containerStyle}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px', gap: '24px',
          background: '#0f1729', borderRadius: '12px', border: '1px solid #293245',
        }}>
          <div style={{ position: 'relative', width: '80px', height: '80px' }}>
            <Mail size={80} style={{ color: '#53a7ff', opacity: 0.15 }} />
            <Loader2 size={32} className="spin" style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', color: '#53a7ff',
            }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
              Generating Email Campaign
            </div>
            <div style={{ color: '#9aa7bd', fontSize: '13px' }}>
              {LOADING_STAGES[loadingStage]}
            </div>
          </div>
          <div style={{
            width: '300px', height: '4px', background: '#1d2738', borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              width: `${((loadingStage + 1) / LOADING_STAGES.length) * 100}%`,
              height: '100%', background: 'linear-gradient(90deg, #53a7ff, #a855f7)',
              borderRadius: '2px', transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ color: '#6b7a93', fontSize: '11px' }}>
            Analysing evidence and generating AI-powered email content
          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedCampaign) {
    const campaign = selectedCampaign;
    const items: any[] = campaign.sequenceItems || [];
    const versions: any[] = campaign.versions || [];
    const logs: any[] = campaign.logs || [];
    const channelFit = campaign.channelFit;
    const firstItem = items[0] || {};
    const preview = firstItem.preview || {};
    const sectionTexts = preview?.sections || {};

    function getPreviewHtml() {
      if (previewMode === 'desktop') return preview?.desktopPreview?.html || firstItem.emailBodyHtml || '';
      if (previewMode === 'mobile') return preview?.mobilePreview?.html || firstItem.responsiveHtml || '';
      if (previewMode === 'dark') return preview?.darkModePreview?.html || preview?.desktopPreview?.html || '';
      return '';
    }

    function getWordCount() {
      return preview?.plainText?.words || firstItem.emailBodyText?.split(/\s+/).filter(Boolean).length || 0;
    }

    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <button onClick={backToList} style={{
            padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245',
            background: '#101622', color: '#9aa7bd', cursor: 'pointer', fontSize: '12px',
          }}>{'< Back to Campaigns'}</button>
          <span style={{ color: '#6b7a93', fontSize: '12px' }}>/</span>
          <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600 }}>{campaign.name || 'Email Campaign'}</span>
          <StatusBadge status={campaign.status} approvalStatus={campaign.approvalStatus} />
        </div>

        {showWorkflow && (
          <WorkflowBar currentStep={workflowStep} onStepClick={setWorkflowStep} />
        )}

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: '8px', color: '#ff4757', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: '14px' }}>x</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 450px' : '1fr 300px', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <OverviewCard campaign={campaign} channelFit={channelFit} />

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowPreview(!showPreview)} style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid #7c3aed',
                background: showPreview ? 'rgba(124,58,237,0.15)' : '#101622',
                color: '#a855f7', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <Eye size={14} /> {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                <button onClick={() => setPreviewMode('desktop')} style={{
                  padding: '6px 10px', borderRadius: '4px', border: previewMode === 'desktop' ? '1px solid #53a7ff' : '1px solid #293245',
                  background: previewMode === 'desktop' ? 'rgba(83,167,255,0.15)' : '#101622',
                  color: previewMode === 'desktop' ? '#53a7ff' : '#6b7a93', cursor: 'pointer', fontSize: '11px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}><Monitor size={12} /> Desktop</button>
                <button onClick={() => setPreviewMode('mobile')} style={{
                  padding: '6px 10px', borderRadius: '4px', border: previewMode === 'mobile' ? '1px solid #53a7ff' : '1px solid #293245',
                  background: previewMode === 'mobile' ? 'rgba(83,167,255,0.15)' : '#101622',
                  color: previewMode === 'mobile' ? '#53a7ff' : '#6b7a93', cursor: 'pointer', fontSize: '11px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}><Smartphone size={12} /> Mobile</button>
                <button onClick={() => setPreviewMode('dark')} style={{
                  padding: '6px 10px', borderRadius: '4px', border: previewMode === 'dark' ? '1px solid #a855f7' : '1px solid #293245',
                  background: previewMode === 'dark' ? 'rgba(168,85,247,0.15)' : '#101622',
                  color: previewMode === 'dark' ? '#a855f7' : '#6b7a93', cursor: 'pointer', fontSize: '11px',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}><Moon size={12} /> Dark</button>
              </div>
            </div>

            <TimelineSection
              items={items}
              editItemId={editItemId}
              editField={editField}
              editValue={editValue}
              regeneratingItem={regeneratingItem}
              onStartEdit={(itemId, field, value) => {
                setEditItemId(itemId);
                setEditField(field);
                setEditValue(value || '');
              }}
              onEditChange={setEditValue}
              onSaveEdit={handleEditItem}
              onCancelEdit={() => { setEditItemId(null); setEditField(null); }}
              onRegenerate={handleRegenerateItem}
              onAddVersion={handleCreateVersion}
              onCopyHtml={() => copyHtml(firstItem.responsiveHtml || firstItem.emailBodyHtml || '')}
              onDownloadHtml={() => downloadHtml(firstItem.responsiveHtml || firstItem.emailBodyHtml || '', `${campaign.name || 'email'}-${firstItem.subjectLine || 'campaign'}`)}
              onDownloadText={() => downloadText(firstItem.emailBodyText || '', `${campaign.name || 'email'}-${firstItem.subjectLine || 'campaign'}`)}
              copied={copied}
              wordCount={getWordCount()}
            />
            {showVersionHistory && versions.length > 0 && (
              <VersionHistorySection versions={versions} onRestore={handleRestoreVersion} />
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <ApprovalPanel
              status={campaign.status}
              approvalStatus={campaign.approvalStatus}
              onSubmitReview={handleSubmitReview}
              onApprove={handleApprove}
              feedbackText={feedbackText}
              onFeedbackChange={setFeedbackText}
              onRequestChanges={handleRequestChanges}
            />

            <SchedulePanel
              scheduledAt={campaign.scheduledAt}
              scheduleDate={scheduleDate}
              onScheduleDateChange={setScheduleDate}
              onSchedule={handleSchedule}
              scheduling={scheduling}
              approvalStatus={campaign.approvalStatus}
            />

            <EvidencePanel campaign={campaign} />

            <SenderPanel
              campaign={campaign}
              testRecipient={testRecipient}
              onTestRecipientChange={setTestRecipient}
              onTestSend={handleTestSend}
              onRealSend={handleRealSend}
              sendingTest={sendingTest}
              sendingReal={sendingReal}
              testSendResult={testSendResult}
              sendResult={sendResult}
              approvalStatus={campaign.approvalStatus}
              item={firstItem}
              onCopyHtml={() => copyHtml(firstItem.responsiveHtml || firstItem.emailBodyHtml || '')}
              onDownloadHtml={() => downloadHtml(firstItem.responsiveHtml || firstItem.emailBodyHtml || '', `${campaign.name || 'email'}-${firstItem.subjectLine || 'campaign'}`)}
              onDownloadText={() => downloadText(firstItem.emailBodyText || '', `${campaign.name || 'email'}-${firstItem.subjectLine || 'campaign'}`)}
              copied={copied}
            />

            <div style={{ fontSize: '11px', color: '#6b7a93', padding: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button onClick={() => setShowVersionHistory(!showVersionHistory)} style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245',
                  background: '#101622', color: '#53a7ff', cursor: 'pointer', fontSize: '11px',
                  display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center',
                }}>
                  <History size={12} /> {showVersionHistory ? 'Hide' : 'Show'} Versions ({versions.length})
                </button>
                <button onClick={handleCreateVersion} style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #293245',
                  background: '#101622', color: '#9aa7bd', cursor: 'pointer', fontSize: '11px',
                  display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center',
                }}>
                  <RotateCcw size={12} /> Save Version
                </button>
              </div>
              {logs.length > 0 && (
                <details>
                  <summary style={{ cursor: 'pointer', color: '#9aa7bd', fontSize: '12px' }}>Activity Log ({logs.length})</summary>
                  <div style={{ marginTop: '8px', maxHeight: '200px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {logs.map((log: any, i: number) => (
                      <div key={i} style={{ fontSize: '11px', color: '#6b7a93', padding: '4px 0', borderBottom: '1px solid #1d2738' }}>
                        <span style={{ color: '#53a7ff' }}>{log.action}</span>
                        {log.message && <span>: {log.message}</span>}
                        <div style={{ fontSize: '10px', color: '#4a5568' }}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>

        {showPreview && (
          <div style={{
            background: '#0f1729', borderRadius: '8px', border: '1px solid #293245', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid #293245',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={14} style={{ color: '#a855f7' }} /> Email Preview
                <span style={{ fontSize: '11px', color: '#6b7a93', fontWeight: 400 }}>
                  ({previewMode === 'desktop' ? 'Desktop' : previewMode === 'mobile' ? 'Mobile' : 'Dark Mode'})
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '11px', color: '#6b7a93' }}>
                <span>{getWordCount()} words</span>
                <span>|</span>
                <span>{Math.max(1, Math.round(getWordCount() / 200))} min read</span>
              </div>
            </div>
            <div style={{
              padding: '20px', maxHeight: '600px', overflow: 'auto',
              display: 'flex', justifyContent: 'center',
              background: previewMode === 'dark' ? '#0a0a14' : '#f0f0f5',
            }}>
              <div style={{
                width: previewMode === 'mobile' ? '375px' : '100%',
                maxWidth: previewMode === 'mobile' ? '375px' : '600px',
                background: previewMode === 'dark' ? '#1a1a2e' : '#ffffff',
                borderRadius: '8px', overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {firstItem.emailBodyHtml ? (
                  <iframe
                    srcDoc={getPreviewHtml()}
                    title="Email Preview"
                    style={{
                      width: '100%', border: 'none',
                      height: previewMode === 'mobile' ? '700px' : '500px',
                    }}
                  />
                ) : (
                  <div style={{ padding: '24px', color: '#6b7a93', fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                    {firstItem.emailBodyText || 'No email content available'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} style={{ color: '#53a7ff' }} /> Email Automation
          </div>
          <div style={{ color: '#6b7a93', fontSize: '12px', marginTop: '2px' }}>
            AI-powered email sequences with evidence-backed claims and approval workflow
          </div>
        </div>
        <button onClick={handleGenerate} disabled={generating || !selectedChatId} style={{
          padding: '10px 20px', borderRadius: '8px', border: '1px solid #53a7ff',
          background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer',
          fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
          opacity: generating || !selectedChatId ? 0.5 : 1,
        }}>
          {generating ? <Loader2 className="spin" size={14} /> : <Sparkles size={14} />}
          {generating ? 'Generating...' : 'Generate Email Campaign'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: '8px', color: '#ff4757', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: '14px' }}>x</button>
        </div>
      )}

      {loading && <Loading />}

      {!loading && campaigns.length === 0 && !generating && (
        <EmptyState
          title="No Email Campaigns Yet"
          text="Generate a campaign plan first, then click 'Generate Email Campaign' to create AI-powered email sequences with evidence-backed claims."
        />
      )}

      {!loading && campaigns.length > 0 && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {campaigns.map((c: any) => (
            <div key={c.id} onClick={() => openCampaign(c.id)} style={{
              padding: '14px 16px', background: '#0f1729', borderRadius: '8px',
              border: '1px solid #293245', cursor: 'pointer', transition: 'border-color 0.2s',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#53a7ff'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#293245'}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>{c.name || 'Untitled Campaign'}</div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7a93' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {c._count?.sequenceItems || c.totalEmails || 0} emails</span>
                  {c.objective && <span>{c.objective}</span>}
                  <span>{new Date(c.updatedAt || c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <StatusBadge status={c.status} approvalStatus={c.approvalStatus} />
                <Eye size={14} style={{ color: '#6b7a93' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowBar({ currentStep, onStepClick }: { currentStep: number; onStepClick: (step: number) => void }) {
  const steps = [
    { num: 1, label: 'Generate', desc: 'AI generates email' },
    { num: 2, label: 'Approve', desc: 'Review & approve' },
    { num: 3, label: 'Preview', desc: 'Preview email' },
    { num: 4, label: 'Audience', desc: 'Choose audience' },
    { num: 5, label: 'Schedule', desc: 'Set schedule' },
    { num: 6, label: 'Save', desc: 'Save automation' },
    { num: 7, label: 'Send', desc: 'Send campaign' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '12px 16px', background: '#0f1729', borderRadius: '8px',
      border: '1px solid #293245', overflow: 'auto',
    }}>
      {steps.map((s, i) => (
        <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '80px' }}>
          <button onClick={() => onStepClick(s.num)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 10px', borderRadius: '6px', border: 'none',
            background: currentStep === s.num ? 'rgba(83,167,255,0.15)' : currentStep > s.num ? 'rgba(16,225,139,0.12)' : 'transparent',
            color: currentStep === s.num ? '#53a7ff' : currentStep > s.num ? '#10e18b' : '#6b7a93',
            cursor: 'pointer', fontSize: '11px', fontWeight: currentStep >= s.num ? 600 : 400,
            width: '100%',
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '50%',
              background: currentStep > s.num ? '#10e18b' : currentStep === s.num ? '#53a7ff' : '#293245',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700, flexShrink: 0,
            }}>
              {currentStep > s.num ? <CheckSquare size={12} /> : s.num}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
              <span style={{ fontSize: '11px' }}>{s.label}</span>
              <span style={{ fontSize: '9px', color: '#4a5568' }}>{s.desc}</span>
            </div>
          </button>
          {i < steps.length - 1 && (
            <ChevronRight size={12} style={{ color: '#293245', flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ChevronRight({ size, style }: { size: number; style?: React.CSSProperties }) {
  return <ChevronDown size={size} style={{ transform: 'rotate(-90deg)', ...style }} />;
}

function StatusBadge({ status, approvalStatus }: { status?: string; approvalStatus?: string }) {
  const toneMap: Record<string, any> = {
    DRAFT: { tone: 'blue', label: 'Draft' },
    GENERATED: { tone: 'green', label: 'Generated' },
    PARTIALLY_GENERATED: { tone: 'yellow', label: 'Partial' },
    READY_FOR_REVIEW: { tone: 'yellow', label: 'Ready' },
    APPROVED: { tone: 'green', label: 'Approved' },
    SCHEDULED: { tone: 'purple', label: 'Scheduled' },
    PAUSED: { tone: 'yellow', label: 'Paused' },
    ARCHIVED: { tone: 'gray', label: 'Archived' },
    FAILED: { tone: 'red', label: 'Failed' },
    NOT_SUBMITTED: { tone: 'blue', label: 'Not Submitted' },
    PENDING_REVIEW: { tone: 'yellow', label: 'Pending Review' },
    CHANGES_REQUESTED: { tone: 'pink', label: 'Changes Requested' },
    REJECTED: { tone: 'red', label: 'Rejected' },
    SENT: { tone: 'green', label: 'Sent' },
    DELIVERED: { tone: 'green', label: 'Delivered' },
    OPENED: { tone: 'blue', label: 'Opened' },
    CLICKED: { tone: 'purple', label: 'Clicked' },
  };
  const s = toneMap[status || ''] || toneMap[approvalStatus || ''] || { tone: 'gray' as const, label: status || approvalStatus || 'Unknown' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function OverviewCard({ campaign, channelFit }: { campaign: any; channelFit?: any }) {
  const ev = campaign.evidenceSummary || {};
  return (
    <Card>
      <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Target size={14} style={{ color: '#53a7ff' }} /> Campaign Overview
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
        <div><strong style={{ color: '#9aa7bd' }}>Objective:</strong><span style={{ color: '#e5e7eb', marginLeft: '6px' }}>{campaign.objective || 'Not specified'}</span></div>
        <div><strong style={{ color: '#9aa7bd' }}>Audience:</strong><span style={{ color: '#e5e7eb', marginLeft: '6px' }}>{campaign.audienceSummary || 'Not specified'}</span></div>
        <div><strong style={{ color: '#9aa7bd' }}>Funnel Stage:</strong><span style={{ color: '#e5e7eb', marginLeft: '6px' }}>{campaign.funnelStage || 'Not specified'}</span></div>
        <div><strong style={{ color: '#9aa7bd' }}>Sequence Type:</strong><span style={{ color: '#e5e7eb', marginLeft: '6px' }}>{campaign.sequenceType || 'Not specified'}</span></div>
        <div><strong style={{ color: '#9aa7bd' }}>Total Emails:</strong><span style={{ color: '#e5e7eb', marginLeft: '6px' }}>{campaign.totalEmails || 0}</span></div>
        <div><strong style={{ color: '#9aa7bd' }}>AI Provider:</strong><span style={{ color: '#e5e7eb', marginLeft: '6px' }}>{campaign.aiProvider || 'Not recorded'}</span></div>
      </div>
      {ev && Object.keys(ev).length > 0 && (
        <div style={{ marginTop: '12px', padding: '10px', background: '#101622', borderRadius: '6px' }}>
          <strong style={{ color: '#9aa7bd', fontSize: '12px' }}>Evidence Summary:</strong>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap', fontSize: '12px', color: '#6b7a93' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={12} /> Sources: {ev.sourcesUsed?.length || 0}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Evidence items: {ev.evidenceCount || 0}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} style={{ color: ev.missingEvidence > 0 ? '#ffb347' : '#10e18b' }} /> Missing: {ev.missingEvidence || 0}</span>
          </div>
        </div>
      )}
      {channelFit && (
        <div style={{ marginTop: '8px', padding: '8px 12px', background: channelFit.isRecommended ? 'rgba(16,225,139,0.05)' : 'rgba(255,179,71,0.05)', borderRadius: '6px', fontSize: '12px', border: `1px solid ${channelFit.isRecommended ? 'rgba(16,225,139,0.15)' : 'rgba(255,179,71,0.15)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <strong style={{ color: channelFit.isRecommended ? '#10e18b' : '#ffb347' }}>Channel Fit:</strong>
            <span style={{ color: '#9aa7bd' }}>{channelFit.isRecommended ? `Recommended (${channelFit.fit || 'medium'})` : 'Not recommended'}</span>
          </div>
          {channelFit.reason && channelFit.reason !== 'Not available' && <div style={{ color: '#6b7a93', marginTop: '2px' }}>{channelFit.reason}</div>}
        </div>
      )}
    </Card>
  );
}

function TimelineSection({
  items, editItemId, editField, editValue, regeneratingItem,
  onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onRegenerate, onAddVersion,
  onCopyHtml, onDownloadHtml, onDownloadText, copied, wordCount,
}: {
  items: any[]; editItemId: string | null; editField: string | null; editValue: string;
  regeneratingItem: string | null;
  onStartEdit: (itemId: string, field: string, value: string) => void;
  onEditChange: (value: string) => void;
  onSaveEdit: (itemId: string, field: string, value: string) => void;
  onCancelEdit: () => void;
  onRegenerate: (itemId: string) => void;
  onAddVersion: () => void;
  onCopyHtml: () => void;
  onDownloadHtml: () => void;
  onDownloadText: () => void;
  copied: boolean;
  wordCount: number;
}) {
  if (!items || items.length === 0) return null;

  const fieldLabels: Record<string, string> = {
    subjectLine: 'Subject Line',
    previewText: 'Preview Text',
    emailBodyText: 'Email Body',
    primaryCta: 'Primary CTA',
    secondaryCta: 'Secondary CTA',
    greetingStrategy: 'Greeting',
  };

  function renderField(item: any, field: string) {
    const isEditing = editItemId === item.id && editField === field;
    const value = item[field] || '';

    if (isEditing) {
      const isMultiline = field === 'emailBodyText';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {isMultiline ? (
            <textarea value={editValue} onChange={e => onEditChange(e.target.value)} rows={4}
              style={{ width: '100%', padding: '6px 10px', background: '#0f1729', border: '1px solid #53a7ff', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px', resize: 'vertical' }}
            />
          ) : (
            <input value={editValue} onChange={e => onEditChange(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', background: '#0f1729', border: '1px solid #53a7ff', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }}
            />
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => onSaveEdit(item.id, field, editValue)} style={{ padding: '3px 10px', background: '#53a7ff', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>Save</button>
            <button onClick={onCancelEdit} style={{ padding: '3px 10px', background: '#293245', border: 'none', borderRadius: '4px', color: '#9aa7bd', cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
          </div>
        </div>
      );
    }

    if (!value) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#6b7a93', fontStyle: 'italic', fontSize: '12px' }}>Not generated</span>
          <button onClick={() => onStartEdit(item.id, field, '')}
            style={{ padding: '2px 8px', background: '#101622', border: '1px dashed #293245', borderRadius: '4px', color: '#53a7ff', cursor: 'pointer', fontSize: '10px' }}
          >Add</button>
        </div>
      );
    }

    const isLongText = field === 'emailBodyText';
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, color: '#e5e7eb', fontSize: '13px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {isLongText ? (value.length > 300 ? value.substring(0, 300) + '...' : value) : value}
        </div>
        <button onClick={() => onStartEdit(item.id, field, value)}
          style={{ padding: '2px 6px', background: 'none', border: '1px solid #293245', borderRadius: '4px', color: '#6b7a93', cursor: 'pointer', fontSize: '10px', flexShrink: 0 }}
        ><Edit3 size={10} /></button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item: any, index: number) => {
        const daysDelay = item.delayAfterPreviousDays || 0;
        const cumulativeDays = index === 0 ? 0 : items.slice(0, index).reduce((sum, it) => sum + (it.delayAfterPreviousDays || 0), 0);

        const evidenceList: any[] = item.evidenceUsed || [];
        const hasEvidence = evidenceList.length > 0;
        const evidenceBacked = evidenceList.filter((e: any) => e.inferenceStatus === 'EVIDENCE_BACKED').length;
        const aiInferred = evidenceList.filter((e: any) => e.inferenceStatus === 'AI_INFERRED').length;
        const itemWordCount = item.emailBodyText?.split(/\s+/).filter(Boolean).length || 0;

        return (
          <Card key={item.id} style={{ borderLeft: `4px solid ${item.status === 'approved' ? '#10e18b' : item.status === 'rejected' ? '#ff4757' : '#53a7ff'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(83,167,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#53a7ff', fontWeight: 700, fontSize: '13px',
                }}>{item.sequenceOrder}</div>
                <div>
                  <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600 }}>{item.emailName || item.purpose || `Email ${item.sequenceOrder}`}</div>
                  <div style={{ fontSize: '12px', color: '#6b7a93', display: 'flex', gap: '8px' }}>
                    <span>{item.purpose || ''}</span>
                    {daysDelay > 0 && <span><Clock size={10} /> D+{cumulativeDays}</span>}
                    <span style={{ color: itemWordCount >= 500 ? '#10e18b' : '#ffb347', fontSize: '10px' }}>{itemWordCount} words</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {item.responsiveHtml && (
                  <button onClick={onCopyHtml} style={{
                    padding: '4px 8px', background: '#101622', border: '1px solid #293245', borderRadius: '4px',
                    color: copied ? '#10e18b' : '#6b7a93', cursor: 'pointer', fontSize: '10px',
                    display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    <Copy size={10} /> {copied ? 'Copied!' : 'Copy HTML'}
                  </button>
                )}
                {item.responsiveHtml && (
                  <button onClick={onDownloadHtml} style={{
                    padding: '4px 8px', background: '#101622', border: '1px solid #293245', borderRadius: '4px',
                    color: '#6b7a93', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    <Download size={10} /> HTML
                  </button>
                )}
                {item.emailBodyText && (
                  <button onClick={onDownloadText} style={{
                    padding: '4px 8px', background: '#101622', border: '1px solid #293245', borderRadius: '4px',
                    color: '#6b7a93', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    <FileText size={10} /> Text
                  </button>
                )}
                <button onClick={() => onRegenerate(item.id)} disabled={regeneratingItem === item.id}
                  style={{ padding: '4px 8px', background: '#101622', border: '1px solid #293245', borderRadius: '4px', color: regeneratingItem === item.id ? '#6b7a93' : '#a855f7', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {regeneratingItem === item.id ? <Loader2 className="spin" size={10} /> : <RotateCcw size={10} />} Regenerate
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7a93', fontWeight: 600, marginBottom: '2px' }}>{fieldLabels.subjectLine}</div>
                {renderField(item, 'subjectLine')}
              </div>
              {item.alternativeSubjectLines && item.alternativeSubjectLines.length > 0 && (
                <div style={{ fontSize: '11px', color: '#6b7a93' }}>
                  <strong>Alternatives:</strong> {item.alternativeSubjectLines.join(' | ')}
                </div>
              )}
              <div>
                <div style={{ fontSize: '11px', color: '#6b7a93', fontWeight: 600, marginBottom: '2px' }}>{fieldLabels.previewText}</div>
                {renderField(item, 'previewText')}
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#6b7a93', fontWeight: 600, marginBottom: '2px' }}>{fieldLabels.emailBodyText}</div>
                {renderField(item, 'emailBodyText')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7a93', fontWeight: 600, marginBottom: '2px' }}>{fieldLabels.primaryCta}</div>
                  {renderField(item, 'primaryCta')}
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6b7a93', fontWeight: 600, marginBottom: '2px' }}>Greeting</div>
                  <span style={{ color: item.greetingStrategy ? '#e5e7eb' : '#6b7a93', fontStyle: item.greetingStrategy ? undefined : 'italic', fontSize: '13px' }}>
                    {item.greetingStrategy || 'Default'}
                  </span>
                </div>
              </div>
              {hasEvidence && (
                <div style={{ marginTop: '4px', padding: '8px', background: '#101622', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '11px' }}>
                    <span style={{ color: evidenceBacked > 0 ? '#10e18b' : '#6b7a93' }}>Evidence-backed: {evidenceBacked}</span>
                    <span style={{ color: aiInferred > 0 ? '#ffb347' : '#6b7a93' }}>AI-inferred: {aiInferred}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ApprovalPanel({
  status, approvalStatus, onSubmitReview, onApprove, feedbackText, onFeedbackChange, onRequestChanges,
}: {
  status?: string; approvalStatus?: string;
  onSubmitReview: () => void; onApprove: () => void;
  feedbackText: string; onFeedbackChange: (v: string) => void;
  onRequestChanges: () => void;
}) {
  const isPending = approvalStatus === 'PENDING_REVIEW';
  const isApproved = approvalStatus === 'APPROVED' || status === 'APPROVED';
  const isChangesRequested = approvalStatus === 'CHANGES_REQUESTED';
  const canSubmit = status === 'GENERATED' || status === 'PARTIALLY_GENERATED' || status === 'draft';
  const canApprove = isPending;

  return (
    <Card>
      <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
        <CheckCircle2 size={14} style={{ color: '#10e18b' }} /> Approval Workflow
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {canSubmit && (
            <button onClick={onSubmitReview} style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #ffb347',
              background: 'rgba(255,179,71,0.12)', color: '#ffb347', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center',
            }}>
              <Send size={12} /> Submit for Review
            </button>
          )}
          {canApprove && (
            <button onClick={onApprove} style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #10e18b',
              background: 'rgba(16,225,139,0.12)', color: '#10e18b', cursor: 'pointer',
              fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center',
            }}>
              <ThumbsUp size={12} /> Approve
            </button>
          )}
          {isApproved && <div style={{ padding: '8px', color: '#10e18b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Approved</div>}
        </div>
        {isPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <textarea value={feedbackText} onChange={e => onFeedbackChange(e.target.value)}
              placeholder="Request changes or leave feedback..."
              rows={3} style={{
                width: '100%', padding: '8px 10px', background: '#0f1729', border: '1px solid #293245',
                borderRadius: '6px', color: '#e5e7eb', fontSize: '12px', resize: 'vertical',
              }}
            />
            <button onClick={onRequestChanges} disabled={!feedbackText.trim()} style={{
              padding: '6px 14px', borderRadius: '6px', border: '1px solid #ff4757',
              background: 'rgba(255,71,87,0.1)', color: '#ff4757', cursor: 'pointer',
              fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
              opacity: feedbackText.trim() ? 1 : 0.5, alignSelf: 'flex-start',
            }}>
              <XCircle size={12} /> Request Changes
            </button>
          </div>
        )}
        {isChangesRequested && (
          <div style={{ padding: '8px', background: 'rgba(255,179,71,0.08)', borderRadius: '6px', fontSize: '12px', color: '#ffb347' }}>
            Changes requested. Edit items and resubmit.
          </div>
        )}
      </div>
    </Card>
  );
}

function SchedulePanel({
  scheduledAt, scheduleDate, onScheduleDateChange, onSchedule, scheduling, approvalStatus,
}: {
  scheduledAt?: string; scheduleDate: string; onScheduleDateChange: (v: string) => void;
  onSchedule: () => void; scheduling: boolean; approvalStatus?: string;
}) {
  const isApproved = approvalStatus === 'APPROVED';
  const isScheduled = !!scheduledAt;

  return (
    <Card>
      <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
        <Calendar size={14} style={{ color: '#7c3aed' }} /> Schedule
      </h4>
      {isScheduled ? (
        <div style={{ color: '#10e18b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle2 size={14} /> Scheduled for {new Date(scheduledAt).toLocaleString()}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input type="datetime-local" value={scheduleDate} onChange={e => onScheduleDateChange(e.target.value)}
            style={{ padding: '6px 10px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
          />
          <button onClick={onSchedule} disabled={scheduling || !scheduleDate || !isApproved} style={{
            padding: '8px 16px', borderRadius: '6px', border: '1px solid #7c3aed',
            background: 'rgba(124,58,237,0.12)', color: '#a855f7', cursor: 'pointer', fontSize: '12px',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center',
            opacity: scheduling || !scheduleDate || !isApproved ? 0.5 : 1,
          }}>
            {scheduling ? <Loader2 className="spin" size={14} /> : <Calendar size={14} />}
            {scheduling ? 'Scheduling...' : 'Schedule Campaign'}
          </button>
          {!isApproved && <div style={{ fontSize: '10px', color: '#ffb347' }}>Approve the campaign before scheduling.</div>}
        </div>
      )}
    </Card>
  );
}

function SenderPanel({
  campaign, testRecipient, onTestRecipientChange, onTestSend, onRealSend,
  sendingTest, sendingReal, testSendResult, sendResult, approvalStatus, item,
  onCopyHtml, onDownloadHtml, onDownloadText, copied,
}: {
  campaign: any; testRecipient: string; onTestRecipientChange: (v: string) => void;
  onTestSend: () => void; onRealSend: () => void;
  sendingTest: boolean; sendingReal: boolean; testSendResult: any; sendResult: any;
  approvalStatus?: string; item: any;
  onCopyHtml: () => void; onDownloadHtml: () => void; onDownloadText: () => void; copied: boolean;
}) {
  const isApproved = approvalStatus === 'APPROVED';

  return (
    <Card>
      <h4 style={{ margin: '0 0 12px 0', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
        <Send size={14} style={{ color: '#a855f7' }} /> Send & Export
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {item?.responsiveHtml && (
            <button onClick={onCopyHtml} style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #293245',
              background: '#101622', color: copied ? '#10e18b' : '#6b7a93', cursor: 'pointer', fontSize: '11px',
              display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center',
            }}>
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy HTML'}
            </button>
          )}
          {item?.responsiveHtml && (
            <button onClick={onDownloadHtml} style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #293245',
              background: '#101622', color: '#6b7a93', cursor: 'pointer', fontSize: '11px',
              display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center',
            }}>
              <Download size={12} /> HTML
            </button>
          )}
          {item?.emailBodyText && (
            <button onClick={onDownloadText} style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #293245',
              background: '#101622', color: '#6b7a93', cursor: 'pointer', fontSize: '11px',
              display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center',
            }}>
              <FileText size={12} /> Text
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <input value={testRecipient} onChange={e => onTestRecipientChange(e.target.value)} placeholder="test@example.com" style={{
            flex: 1, padding: '6px 10px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px',
            color: '#e5e7eb', fontSize: '11px',
          }} />
          <button onClick={onTestSend} disabled={sendingTest || !testRecipient.trim() || !isApproved} style={{
            padding: '6px 12px', borderRadius: '4px', border: '1px solid #53a7ff',
            background: 'rgba(83,167,255,0.15)', color: '#53a7ff', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
            opacity: sendingTest || !testRecipient.trim() || !isApproved ? 0.5 : 1, whiteSpace: 'nowrap',
          }}>
            {sendingTest ? <><Loader2 className="spin" size={12} /> Sending...</> : 'Test Send'}
          </button>
        </div>
        {!isApproved && (
          <div style={{ fontSize: '10px', color: '#ffb347' }}>Approve the campaign before sending.</div>
        )}
        {testSendResult && (
          <div style={{ padding: '6px 10px', borderRadius: '4px', fontSize: '11px', background: testSendResult.success ? 'rgba(16,225,139,0.08)' : 'rgba(255,71,87,0.08)', border: `1px solid ${testSendResult.success ? 'rgba(16,225,139,0.2)' : 'rgba(255,71,87,0.2)'}` }}>
            {testSendResult.success ? <>Submitted to Brevo (ID: {testSendResult.providerMessageId || testSendResult.data?.providerMessageId})</> : <>Failed: {testSendResult.error}</>}
          </div>
        )}
        <button onClick={onRealSend} disabled={sendingReal || !isApproved} style={{
          padding: '8px 16px', borderRadius: '6px', border: '1px solid #10e18b',
          background: 'rgba(16,225,139,0.12)', color: '#10e18b', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center',
          opacity: sendingReal || !isApproved ? 0.5 : 1,
        }}>
          {sendingReal ? <><Loader2 className="spin" size={14} /> Sending...</> : <><Send size={14} /> Send Campaign</>}
        </button>
        {sendResult && (
          <div style={{ padding: '6px 10px', borderRadius: '4px', fontSize: '11px', background: sendResult.success ? 'rgba(16,225,139,0.08)' : 'rgba(255,71,87,0.08)', border: `1px solid ${sendResult.success ? 'rgba(16,225,139,0.2)' : 'rgba(255,71,87,0.2)'}` }}>
            {sendResult.success ? <>Sent {sendResult.sentCount || 0} emails to {sendResult.totalRecipients || 0} recipients.</> : <>Failed: {sendResult.error}</>}
          </div>
        )}
      </div>
    </Card>
  );
}

function EvidencePanel({ campaign }: { campaign: any }) {
  const items: any[] = campaign.sequenceItems || [];
  const allEvidence = items.flatMap((item: any) =>
    (item.evidenceUsed || []).map((ev: any) => ({ ...ev, emailOrder: item.sequenceOrder, emailName: item.emailName }))
  );
  const total = allEvidence.length;
  const backed = allEvidence.filter((e: any) => e.inferenceStatus === 'EVIDENCE_BACKED').length;
  const inferred = allEvidence.filter((e: any) => e.inferenceStatus === 'AI_INFERRED').length;
  const notMeasured = allEvidence.filter((e: any) => e.inferenceStatus === 'NOT_MEASURED').length;

  if (total === 0) return null;

  return (
    <Card>
      <h4 style={{ margin: '0 0 10px 0', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
        <Activity size={14} style={{ color: '#a855f7' }} /> Claims & Evidence
      </h4>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '12px' }}>
        <Badge tone="green">{backed} Backed</Badge>
        <Badge tone="yellow">{inferred} Inferred</Badge>
        {notMeasured > 0 && <Badge tone="red">{notMeasured} Not Measured</Badge>}
      </div>
      <div style={{ maxHeight: '200px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {allEvidence.slice(0, 10).map((ev: any, i: number) => (
          <div key={i} style={{ fontSize: '11px', padding: '6px', background: '#101622', borderRadius: '4px' }}>
            <div style={{ color: '#9aa7bd' }}>{ev.claim?.substring(0, 100)}</div>
            <div style={{ color: '#6b7a93', fontSize: '10px', marginTop: '2px' }}>
              Source: {ev.source?.substring(0, 50)} | [{ev.inferenceStatus}]
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function VersionHistorySection({ versions, onRestore }: {
  versions: any[]; onRestore: (versionId: string) => void;
}) {
  return (
    <Card>
      <h4 style={{ margin: '0 0 10px 0', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <History size={14} style={{ color: '#a855f7' }} /> Version History ({versions.length})
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {versions.map((v: any) => (
          <div key={v.id} style={{
            padding: '8px 10px', background: '#101622', borderRadius: '6px',
            border: '1px solid #1d2738', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600 }}>v{v.versionNumber}</div>
              <div style={{ color: '#6b7a93', fontSize: '11px' }}>{v.changeReason || 'No reason'}</div>
              <div style={{ color: '#4a5568', fontSize: '10px' }}>{v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}</div>
            </div>
            <button onClick={() => onRestore(v.id)} style={{
              padding: '4px 10px', borderRadius: '4px', border: '1px solid #293245',
              background: '#101622', color: '#53a7ff', cursor: 'pointer', fontSize: '10px',
              display: 'flex', alignItems: 'center', gap: '3px',
            }}>
              <Undo size={10} /> Restore
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

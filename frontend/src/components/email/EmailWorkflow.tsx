import { useState, useEffect } from 'react';
import { Mail, Loader2, Sparkles, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, Send, Save, Eye, Smartphone, Code, FileText, ThumbsUp, RefreshCw, Calendar, Activity, Settings } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  generateEmailContent,
  saveEmailDraft,
  updateEmailTemplate,
  approveEmailTemplate,
  rejectEmailTemplate,
  sendTestEmailContent,
  sendEmailNow,
  scheduleEmailContent,
  cancelScheduledEmail,
  getEmailDeliveryStatus,
  generateEmailHtml,
  generateEmailPlainText,
} from '../../lib/api';
import { EmailEditor } from './EmailEditor';

const FIELD_LABELS: Record<string, string> = {
  greeting: 'Greeting', headline: 'Headline', opening: 'Opening',
  bodyParagraphs: 'Body', callToAction: 'CTA', closing: 'Closing',
  signature: 'Signature', footer: 'Footer', subject: 'Subject',
  previewText: 'Preview Text', painPoint: 'Pain Point', solution: 'Solution',
  benefits: 'Benefits', socialProof: 'Social Proof', complianceFooter: 'Compliance Footer',
  unsubscribeText: 'Unsubscribe Text', postscript: 'Postscript',
};

const EMAIL_TYPES = ['Product Announcement', 'Promotional', 'Newsletter', 'Welcome', 'Re-engagement', 'Abandoned Cart', 'Transactional', 'Nurture', 'Event Invitation', 'Survey'];
const GOALS = ['Product Adoption', 'Lead Generation', 'Brand Awareness', 'Customer Retention', 'Sales Conversion', 'Event Registration', 'Feedback Collection', 'Content Promotion'];
const TONES = ['Professional', 'Friendly', 'Formal', 'Casual', 'Urgent', 'Inspirational', 'Educational', 'Persuasive'];

function SectionCard({ title, icon, defaultOpen = true, children }: { title: string; icon?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#151d2b', borderRadius: '8px', border: '1px solid #293245', overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', cursor: 'pointer', borderBottom: open ? '1px solid #293245' : 'none' }}>
        {icon}<span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{title}</span>
        {open ? <ChevronUp size={14} color="#9aa7bd" /> : <ChevronDown size={14} color="#9aa7bd" />}
      </div>
      {open && <div style={{ padding: '16px' }}>{children}</div>}
    </div>
  );
}

function replacePersonalization(text: string, vars: Record<string, string>): string {
  if (!text) return '';
  return Object.entries(vars).reduce((t, [k, v]) => t.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || `{{${k}}}`), text);
}

export function EmailWorkflow({ content: initialContent }: { content?: any }) {
  const { selectedChatId } = useProject();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emailConfig, setEmailConfig] = useState({
    emailType: initialContent?.emailType || 'Product Announcement',
    goal: initialContent?.goal || 'Product Adoption',
    tone: initialContent?.tone || 'Professional',
    audience: initialContent?.audience || '',
    sender: { name: initialContent?.sender?.name || '', email: initialContent?.sender?.email || '', replyTo: initialContent?.sender?.replyTo || '' },
  });

  const [recipient, setRecipient] = useState({
    email: initialContent?.recipient?.email || '',
    firstName: initialContent?.recipient?.firstName || '',
    lastName: initialContent?.recipient?.lastName || '',
    companyName: initialContent?.recipient?.companyName || '',
  });

  const [emailData, setEmailData] = useState<any>(initialContent || null);
  const [html, setHtml] = useState(initialContent?._htmlTemplate || initialContent?.html || '');
  const [plainText, setPlainText] = useState(initialContent?._plainText || initialContent?.plainText || '');
  const [templateId, setTemplateId] = useState<string | null>(initialContent?.templateId || null);
  const [approvalStatus, setApprovalStatus] = useState<'DRAFT' | 'APPROVED' | 'REJECTED'>(initialContent?._approvalStatus || initialContent?.approvalStatus || 'DRAFT');
  const [previewTab, setPreviewTab] = useState<'visual' | 'mobile' | 'html' | 'plain'>('visual');

  const [editMode, setEditMode] = useState<'edit' | 'preview'>('edit');
  const [sendMode, setSendMode] = useState<'now' | 'schedule' | 'test'>('now');
  const [sendEmail, setSendEmail] = useState('');
  const [sendDate, setSendDate] = useState('');
  const [sendTime, setSendTime] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  const personalizationVars: Record<string, string> = {
    firstName: recipient.firstName, lastName: recipient.lastName,
    company: recipient.companyName, companyName: recipient.companyName,
    sender: emailConfig.sender.name, senderName: emailConfig.sender.name,
    product: '', website: '',
  };

  const handleGenerate = async () => {
    if (!selectedChatId) return;
    setGenerating(true); setError(null);
    try {
      const result = await generateEmailContent(selectedChatId, {
        productIdentity: {},
        emailType: emailConfig.emailType, goal: emailConfig.goal,
        tone: emailConfig.tone, audience: emailConfig.audience,
        sender: emailConfig.sender, recipient,
        senderName: emailConfig.sender.name,
        senderEmail: emailConfig.sender.email,
        ctaUrl: window.location.origin,
      });
      if (result.success) {
        setEmailData(result.email);
        const h = await generateEmailHtml(result.email);
        if (h.success) setHtml(h.html);
        const p = await generateEmailPlainText(result.email);
        if (p.success) setPlainText(p.plainText);
      }
    } catch (err: any) { setError(err.message || 'Failed to generate email'); }
    finally { setGenerating(false); }
  };

  useEffect(() => {
    if (initialContent && !emailData) {
      setEmailData(initialContent);
      setHtml(initialContent._htmlTemplate || initialContent.html || '');
      setPlainText(initialContent._plainText || initialContent.plainText || '');
      setTemplateId(initialContent.templateId || null);
      setApprovalStatus(initialContent._approvalStatus || initialContent.approvalStatus || 'DRAFT');
      if (initialContent.emailType) setEmailConfig(p => ({ ...p, emailType: initialContent.emailType, goal: initialContent.goal || p.goal, tone: initialContent.tone || p.tone, audience: initialContent.audience || p.audience }));
    }
  }, [initialContent]);

  useEffect(() => {
    if (emailData && templateId) loadDeliveries();
  }, [templateId]);

  const loadDeliveries = async () => {
    if (!templateId) return;
    setDeliveryLoading(true);
    try { const r = await getEmailDeliveryStatus(templateId); if (r.success) setDeliveries(r.data || []); }
    finally { setDeliveryLoading(false); }
  };

  const handleSaveDraft = async () => {
    if (!selectedChatId || !emailData) return;
    try {
      const dataToSave = { ...emailData, html, plainText, config: emailConfig, recipient };
      const result = templateId ? await updateEmailTemplate(templateId, dataToSave) : await saveEmailDraft(selectedChatId, dataToSave);
      if (result.success) { setTemplateId(result.template?.id || result.data?.id); setApprovalStatus('DRAFT'); }
    } catch (err: any) { setError(err.message || 'Failed to save draft'); }
  };

  const handleApprove = async () => {
    if (!templateId) return;
    try {
      const r = await approveEmailTemplate(templateId);
      if (r.success) setApprovalStatus('APPROVED');
    } catch (err: any) { setError(err.message || 'Approve failed'); }
  };

  const handleReject = async () => {
    if (!templateId) return;
    try {
      const r = await rejectEmailTemplate(templateId, 'Rejected by user');
      if (r.success) setApprovalStatus('REJECTED');
    } catch (err: any) { setError(err.message || 'Reject failed'); }
  };

  const handleSendAction = async () => {
    if (!selectedChatId || !templateId || !sendEmail) return;
    setSending(true); setSendResult(null);
    try {
      if (sendMode === 'test') {
        await sendTestEmailContent(selectedChatId, { templateId, recipientEmail: sendEmail });
        setSendResult({ success: true, message: 'Test email sent' });
      } else if (sendMode === 'now') {
        await sendEmailNow(selectedChatId, { templateId, recipientEmail: sendEmail });
        setSendResult({ success: true, message: 'Email sent' });
      } else {
        const scheduledAt = `${sendDate}T${sendTime}:00`;
        await scheduleEmailContent(selectedChatId, { templateId, recipientEmail: sendEmail, scheduledAt });
        setSendResult({ success: true, message: `Scheduled for ${scheduledAt}` });
      }
    } catch { setSendResult({ success: false, message: 'Send failed' }); }
    finally { setSending(false); }
  };

  const isApproved = approvalStatus === 'APPROVED';
  const canSend = isApproved && !!templateId;

  if (!selectedChatId) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#9aa7bd' }}>
      <Mail size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
      <div style={{ fontSize: '16px', marginBottom: '8px' }}>No chat selected</div>
      <div style={{ fontSize: '13px' }}>Select a chat to create emails</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(255,71,87,0.1)', borderRadius: '6px', border: '1px solid #ff4757', color: '#ff4757', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} />{error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: '12px' }}>Dismiss</button>
        </div>
      )}

      {/* SECTION 1: Generate Button */}
      {!emailData && (
        <button onClick={handleGenerate} disabled={generating} style={{ padding: '14px', background: '#53a7ff', border: '1px solid #53a7ff', borderRadius: '8px', color: 'white', cursor: generating ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: generating ? 0.5 : 1 }}>
          {generating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
          {generating ? 'Generating...' : 'Generate Email'}
        </button>
      )}

      {emailData && <>
        {/* SECTION 1: Config (email type + sender + recipient) */}
        <SectionCard title="Configuration" icon={<Settings size={14} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <select value={emailConfig.emailType} onChange={e => setEmailConfig(p => ({ ...p, emailType: e.target.value }))} style={{ padding: '7px 10px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '12px' }}>{EMAIL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <select value={emailConfig.goal} onChange={e => setEmailConfig(p => ({ ...p, goal: e.target.value }))} style={{ padding: '7px 10px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '12px' }}>{GOALS.map(g => <option key={g} value={g}>{g}</option>)}</select>
            <select value={emailConfig.tone} onChange={e => setEmailConfig(p => ({ ...p, tone: e.target.value }))} style={{ padding: '7px 10px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '12px' }}>{TONES.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <input type="text" value={emailConfig.audience} onChange={e => setEmailConfig(p => ({ ...p, audience: e.target.value }))} placeholder="Target audience" style={{ padding: '7px 10px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '12px' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div><label style={{ fontSize: '10px', color: '#9aa7bd', marginBottom: '2px', display: 'block' }}>Sender Name</label><input type="text" value={emailConfig.sender.name} onChange={e => setEmailConfig(p => ({ ...p, sender: { ...p.sender, name: e.target.value } }))} style={{ width: '100%', padding: '6px 8px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }} /></div>
            <div><label style={{ fontSize: '10px', color: '#9aa7bd', marginBottom: '2px', display: 'block' }}>Sender Email</label><input type="text" value={emailConfig.sender.email} onChange={e => setEmailConfig(p => ({ ...p, sender: { ...p.sender, email: e.target.value } }))} style={{ width: '100%', padding: '6px 8px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }} /></div>
            <div><label style={{ fontSize: '10px', color: '#9aa7bd', marginBottom: '2px', display: 'block' }}>Recipient Email</label><input type="email" value={recipient.email} onChange={e => setRecipient(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" style={{ width: '100%', padding: '6px 8px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div><label style={{ fontSize: '10px', color: '#9aa7bd', marginBottom: '2px', display: 'block' }}>First Name</label><input type="text" value={recipient.firstName} onChange={e => setRecipient(p => ({ ...p, firstName: e.target.value }))} placeholder="John" style={{ width: '100%', padding: '6px 8px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }} /></div>
            <div><label style={{ fontSize: '10px', color: '#9aa7bd', marginBottom: '2px', display: 'block' }}>Last Name</label><input type="text" value={recipient.lastName} onChange={e => setRecipient(p => ({ ...p, lastName: e.target.value }))} placeholder="Smith" style={{ width: '100%', padding: '6px 8px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }} /></div>
            <div><label style={{ fontSize: '10px', color: '#9aa7bd', marginBottom: '2px', display: 'block' }}>Company</label><input type="text" value={recipient.companyName} onChange={e => setRecipient(p => ({ ...p, companyName: e.target.value }))} placeholder="Acme Inc" style={{ width: '100%', padding: '6px 8px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }} /></div>
          </div>
        </SectionCard>

        {/* SECTION 2: Email Editor */}
        <SectionCard title="Email Editor" icon={<Mail size={14} />}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setEditMode('edit')} style={{ padding: '6px 14px', background: editMode === 'edit' ? '#53a7ff' : '#293245', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Edit</button>
            <button onClick={() => setEditMode('preview')} style={{ padding: '6px 14px', background: editMode === 'preview' ? '#53a7ff' : '#293245', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Personalized Preview</button>
          </div>
          {editMode === 'edit' ? (
            <EmailEditor emailData={emailData} onChange={(f, v) => setEmailData(p => ({ ...p, [f]: v }))} onSave={handleSaveDraft} />
          ) : (
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#e5e7eb' }}>
              <div style={{ marginBottom: '8px' }}><strong>Subject:</strong> {replacePersonalization(emailData?.subject || '', personalizationVars)}</div>
              {emailData?.greeting && <div style={{ marginBottom: '4px' }}>{replacePersonalization(emailData.greeting, personalizationVars)}</div>}
              {emailData?.headline && <div style={{ marginBottom: '4px', fontWeight: 600, fontSize: '15px' }}>{replacePersonalization(emailData.headline, personalizationVars)}</div>}
              {emailData?.opening && <div style={{ marginBottom: '4px' }}>{replacePersonalization(emailData.opening, personalizationVars)}</div>}
              {(emailData?.bodyParagraphs || []).map((p: string, i: number) => <div key={i} style={{ marginBottom: '4px' }}>{replacePersonalization(p, personalizationVars)}</div>)}
              {emailData?.closing && <div style={{ marginBottom: '4px' }}>{replacePersonalization(emailData.closing, personalizationVars)}</div>}
              {emailData?.signature && <div style={{ marginBottom: '4px' }}>{replacePersonalization(emailData.signature, personalizationVars)}</div>}
              <div style={{ marginTop: '12px', padding: '10px', background: '#0f1729', borderRadius: '6px', fontSize: '11px', color: '#9aa7bd', fontFamily: 'monospace' }}>
                {Object.entries(personalizationVars).map(([k, v]) => <div key={k}>{{`{{${k}}}`}} → {v || <span style={{ color: '#ffb347' }}>Not set</span>}</div>)}
              </div>
            </div>
          )}
        </SectionCard>

        {/* SECTION 3: Preview */}
        <SectionCard title="Preview" icon={<Eye size={14} />}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid #293245' }}>
            {(['visual', 'mobile', 'html', 'plain'] as const).map(tab => (
              <button key={tab} onClick={() => setPreviewTab(tab)} style={{ padding: '8px 14px', background: previewTab === tab ? '#1e293b' : 'transparent', border: 'none', borderBottom: previewTab === tab ? '2px solid #53a7ff' : '2px solid transparent', borderRadius: '6px 6px 0 0', color: previewTab === tab ? '#e5e7eb' : '#9aa7bd', cursor: 'pointer', fontSize: '12px', fontWeight: previewTab === tab ? 600 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {tab === 'visual' && <Eye size={13} />}{tab === 'mobile' && <Smartphone size={13} />}{tab === 'html' && <Code size={13} />}{tab === 'plain' && <FileText size={13} />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {previewTab === 'visual' || previewTab === 'mobile' ? (
            <div style={{ maxWidth: previewTab === 'mobile' ? '375px' : '600px', margin: '0 auto', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #293245' }}>
              <iframe srcDoc={html} title="Email Preview" style={{ width: '100%', height: '500px', border: 'none' }} sandbox="allow-same-origin" />
            </div>
          ) : previewTab === 'html' ? (
            <pre style={{ background: '#0f1729', color: '#e5e7eb', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', maxHeight: '500px', whiteSpace: 'pre-wrap' }}>{html}</pre>
          ) : (
            <pre style={{ background: '#0f1729', color: '#e5e7eb', padding: '16px', borderRadius: '6px', fontSize: '13px', lineHeight: 1.6, overflow: 'auto', maxHeight: '500px', whiteSpace: 'pre-wrap' }}>{plainText}</pre>
          )}
        </SectionCard>

        {/* SECTION 4: Quality (Advisory) */}
        <SectionCard title="Quality" icon={<CheckCircle2 size={14} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ padding: '10px', background: '#0f1729', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: (emailData?._qualityScore || 0) >= 90 ? '#10e18b' : (emailData?._qualityScore || 0) >= 80 ? '#ffb347' : '#ff4757' }}>{emailData?._qualityScore || 0}</div>
              <div style={{ fontSize: '10px', color: '#9aa7bd' }}>{emailData?._qualityLabel || 'Score'}</div>
            </div>
            <div style={{ padding: '10px', background: '#0f1729', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#53a7ff' }}>{emailData?.spamScore?.score || 0}</div>
              <div style={{ fontSize: '10px', color: '#9aa7bd' }}>Spam</div>
            </div>
            <div style={{ padding: '10px', background: '#0f1729', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#818cf8' }}>{emailData?.readabilityScore?.score || 0}</div>
              <div style={{ fontSize: '10px', color: '#9aa7bd' }}>Readability</div>
            </div>
            <div style={{ padding: '10px', background: '#0f1729', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10e18b' }}>{emailData?._qualityDetails?.length || 0}</div>
              <div style={{ fontSize: '10px', color: '#9aa7bd' }}>Checks</div>
            </div>
          </div>
          {(emailData?._qualityScore || 0) < 90 && (
            <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(255,179,71,0.1)', borderRadius: '4px', border: '1px solid #ffb347', fontSize: '12px', color: '#ffb347', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={14} /> Suggestions available — quality can be improved
            </div>
          )}
        </SectionCard>

        {/* SECTION 5: Approval */}
        <SectionCard title="Approval" icon={<ThumbsUp size={14} />}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9aa7bd' }}>Status:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: isApproved ? '#10e18b' : approvalStatus === 'REJECTED' ? '#ff4757' : '#ffb347', padding: '3px 8px', background: isApproved ? 'rgba(16,225,139,0.1)' : approvalStatus === 'REJECTED' ? 'rgba(255,71,87,0.1)' : 'rgba(255,179,71,0.1)', borderRadius: '4px', border: `1px solid ${isApproved ? '#10e18b' : approvalStatus === 'REJECTED' ? '#ff4757' : '#ffb347'}` }}>
              {approvalStatus}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleSaveDraft} style={{ padding: '8px 16px', background: '#293245', border: '1px solid #3b4d61', borderRadius: '6px', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={14} /> Save Draft</button>
            {approvalStatus !== 'APPROVED' && <button onClick={handleApprove} disabled={!templateId} style={{ padding: '8px 16px', background: templateId ? '#10e18b' : '#293245', border: templateId ? '1px solid #10e18b' : '1px solid #3b4d61', borderRadius: '6px', color: templateId ? '#0f1729' : '#9aa7bd', cursor: templateId ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: templateId ? 1 : 0.5 }}><CheckCircle2 size={14} /> Approve</button>}
            {approvalStatus !== 'REJECTED' && <button onClick={handleReject} disabled={!templateId} style={{ padding: '8px 16px', background: templateId ? '#ff4757' : '#293245', border: templateId ? '1px solid #ff4757' : '1px solid #3b4d61', borderRadius: '6px', color: templateId ? 'white' : '#9aa7bd', cursor: templateId ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: templateId ? 1 : 0.5 }}><XCircle size={14} /> Reject</button>}
            <button onClick={handleGenerate} style={{ padding: '8px 16px', background: '#818cf8', border: '1px solid #818cf8', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={14} /> Regenerate</button>
          </div>
          {approvalStatus !== 'APPROVED' && <div style={{ marginTop: '8px', fontSize: '11px', color: '#9aa7bd' }}>{!templateId ? 'Save a draft before approving' : 'Approve to enable sending'}</div>}
        </SectionCard>

        {/* SECTION 5b: Improve Content (manual, always available) */}
        <SectionCard title="Improve Content" icon={<RefreshCw size={14} />}>
          <div style={{ fontSize: '12px', color: '#9aa7bd', marginBottom: '8px' }}>
            Click below to request an AI-powered quality improvement pass. The current content is preserved if the rewrite fails.
          </div>
          <button onClick={handleGenerate} style={{ padding: '10px 16px', background: '#818cf8', border: '1px solid #818cf8', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} /> Improve Content
          </button>
        </SectionCard>

        {/* SECTION 6: Send */}
        <SectionCard title="Send" icon={<Send size={14} />}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: '#0f1729', padding: '3px', borderRadius: '6px' }}>
            {(['test', 'now', 'schedule'] as const).map(m => (
              <button key={m} onClick={() => { setSendMode(m); setSendResult(null); }} style={{ flex: 1, padding: '7px', background: sendMode === m ? '#53a7ff' : 'transparent', border: 'none', borderRadius: '4px', color: sendMode === m ? 'white' : '#9aa7bd', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                {m === 'test' ? <Mail size={12} /> : m === 'now' ? <Send size={12} /> : <Calendar size={12} />}
                {m === 'test' ? 'Test' : m === 'now' ? 'Send Now' : 'Schedule'}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: '12px' }}>
            <input type="email" value={sendEmail || recipient.email} onChange={e => setSendEmail(e.target.value)} placeholder="recipient@example.com" style={{ width: '100%', padding: '8px 10px', background: '#0f1729', border: '1px solid #293245', borderRadius: '6px', color: '#e5e7eb', fontSize: '13px' }} />
          </div>
          {sendMode === 'schedule' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <input type="date" value={sendDate} onChange={e => setSendDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ padding: '8px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }} />
              <input type="time" value={sendTime} onChange={e => setSendTime(e.target.value)} style={{ padding: '8px', background: '#0f1729', border: '1px solid #293245', borderRadius: '4px', color: '#e5e7eb', fontSize: '12px' }} />
            </div>
          )}
          {!isApproved && <div style={{ marginTop: '8px', marginBottom: '8px', fontSize: '11px', color: '#ffb347', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Approve the email before sending</div>}
          <button onClick={handleSendAction} disabled={!canSend || sending || !sendEmail} style={{ width: '100%', padding: '10px', background: canSend ? '#10e18b' : '#293245', border: canSend ? '1px solid #10e18b' : '1px solid #3b4d61', borderRadius: '6px', color: canSend ? '#0f1729' : '#9aa7bd', cursor: canSend ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 600, opacity: canSend ? 1 : 0.5 }}>
            {sending ? 'Sending...' : sendMode === 'test' ? 'Send Test Email' : sendMode === 'now' ? 'Send Now' : 'Schedule Email'}
          </button>
          {sendResult && <div style={{ marginTop: '8px', padding: '8px 12px', background: sendResult.success ? 'rgba(16,225,139,0.1)' : 'rgba(255,71,87,0.1)', borderRadius: '4px', border: `1px solid ${sendResult.success ? '#10e18b' : '#ff4757'}`, fontSize: '12px', color: sendResult.success ? '#10e18b' : '#ff4757', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {sendResult.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}{sendResult.message}
          </div>}
        </SectionCard>

        {/* SECTION 7: Analytics */}
        {templateId && (
          <SectionCard title="Analytics" icon={<Activity size={14} />}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#9aa7bd' }}>Tracking for template #{templateId.slice(-8)}</span>
              <button onClick={loadDeliveries} disabled={deliveryLoading} style={{ padding: '5px 10px', background: '#293245', border: '1px solid #3b4d61', borderRadius: '4px', color: '#e5e7eb', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={12} className={deliveryLoading ? 'spin' : ''} /> Refresh</button>
            </div>
            {deliveries.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9aa7bd', fontSize: '12px' }}>No delivery records yet</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '12px' }}>
                {['QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED'].map(s => {
                  const count = deliveries.filter((d: any) => d.status === s).length;
                  const colors: Record<string, string> = { QUEUED: '#9aa7bd', SENT: '#53a7ff', DELIVERED: '#10e18b', OPENED: '#53a7ff', CLICKED: '#818cf8' };
                  return <div key={s} style={{ padding: '10px', background: '#0f1729', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: colors[s] }}>{count}</div>
                    <div style={{ fontSize: '10px', color: '#9aa7bd', marginTop: '2px' }}>{s}</div>
                  </div>;
                })}
              </div>
            )}
          </SectionCard>
        )}
      </>}
    </div>
  );
}

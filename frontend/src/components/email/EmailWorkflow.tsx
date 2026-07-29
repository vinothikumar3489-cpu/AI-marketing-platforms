import { useState, useEffect } from 'react';
import { Mail, Loader2, Sparkles, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, Send, Save, Eye, Smartphone, Code, FileText, ThumbsUp, RefreshCw, Calendar, Activity, Settings } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  generateEmailContent, saveEmailDraft, updateEmailTemplate,
  approveEmailTemplate, rejectEmailTemplate, sendTestEmailContent,
  sendEmailNow, scheduleEmailContent, getEmailDeliveryStatus,
  generateEmailHtml, generateEmailPlainText, getEmailTemplate,
} from '../../lib/api';
import { EmailEditor } from './EmailEditor';
import { QualityCheck } from './QualityCheck';

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
  const withDefaults: Record<string, string> = {
    firstName: vars.firstName || 'there',
    lastName: vars.lastName || '',
    companyName: vars.companyName || 'your company',
    productName: vars.productName || 'our platform',
    senderName: vars.senderName || 'our team',
    company: vars.company || vars.companyName || 'your company',
    sender: vars.sender || vars.senderName || 'our team',
    product: vars.product || vars.productName || 'our platform',
    website: vars.website || vars.domain || '',
  };
  const combined = { ...withDefaults, ...vars };
  return Object.entries(combined).reduce((t, [k, v]) => t.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v || `{{${k}}}`), text);
}

export function EmailWorkflow({ content: initialContent }: { content?: any }) {
  const { selectedChatId } = useProject();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single canonical email asset
  const [asset, setAsset] = useState<any>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'DRAFT' | 'APPROVED' | 'REJECTED'>('DRAFT');
  const [html, setHtml] = useState('');
  const [plainText, setPlainText] = useState('');

  const [emailConfig, setEmailConfig] = useState({
    emailType: 'Product Announcement', goal: 'Product Adoption',
    tone: 'Professional', audience: '',
    sender: { name: '', email: '', replyTo: '' },
  });

  const [recipient, setRecipient] = useState({
    email: '', firstName: '', lastName: '', companyName: '',
  });

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

  // Validation state for approval — driven ONLY by backend responses
  const [schemaValid, setSchemaValid] = useState(false);
  const [assetPersisted, setAssetPersisted] = useState(false);
  const [validation, setValidation] = useState<any>(null);
  const [claimValidation, setClaimValidation] = useState<any>(null);

  // Derive personalization vars from asset data + recipient + product identity
  const personalizationVars: Record<string, string> = {
    firstName: recipient.firstName || asset?.recipient?.firstName || '',
    lastName: recipient.lastName || asset?.recipient?.lastName || '',
    companyName: recipient.companyName || asset?.recipient?.companyName || '',
    productName: asset?.productIdentity?.displayName || asset?._productName || '',
    senderName: emailConfig.sender.name || asset?.sender?.name || '',
    domain: asset?.productIdentity?.domain || '',
  };

  // Approve button depends ONLY on: assetSaved, schema.valid, claimValidation not failed
  const claimStatusOk = claimValidation?.status !== 'failed';
  const canApprove = assetPersisted && schemaValid && claimStatusOk && approvalStatus !== 'APPROVED';
  const isApproved = approvalStatus === 'APPROVED';
  const canSend = isApproved && !!templateId;

  // Merge backend response into local state
  const mergeAsset = (data: any) => {
    if (!data) return;
    const newAsset = { ...(asset || {}), ...data };
    setAsset(newAsset);
    setHtml(data._htmlTemplate || data.html || data.emailBodyHtml || html);
    setPlainText(data._plainText || data.plainText || data.emailBodyText || plainText);
    if (data.approvalStatus) setApprovalStatus(data.approvalStatus);
    if (data.templateId || data.id) setTemplateId(data.templateId || data.id);
    if (data._qualityScore !== undefined) setValidation(v => ({ ...v, score: data._qualityScore }));
    if (data.validation) setValidation(data.validation);
    if (data.quality) setValidation(v => ({ ...v, ...data.quality }));
    if (data.claimValidation) setClaimValidation(data.claimValidation);
    if (data.claimsRequiringReview) setClaimValidation({ status: data.claimsRequiringReview.length > 0 ? 'failed' : 'passed', findings: data.claimsRequiringReview });
    // Update config from data if available
    if (data.emailType) setEmailConfig(p => ({ ...p, emailType: data.emailType }));
    if (data.goal) setEmailConfig(p => ({ ...p, goal: data.goal }));
    if (data.tone) setEmailConfig(p => ({ ...p, tone: data.tone }));
    if (data.audience) setEmailConfig(p => ({ ...p, audience: data.audience }));
    if (data.sender) setEmailConfig(p => ({ ...p, sender: { ...p.sender, ...data.sender } }));
    if (data.recipient) setRecipient(p => ({ ...p, ...data.recipient }));
    if (data.id || data.templateId) setAssetPersisted(true);
  };

  // Initialize from initialContent
  useEffect(() => {
    if (initialContent) mergeAsset(initialContent);
  }, []);

  useEffect(() => {
    if (templateId) loadDeliveries();
  }, [templateId]);

  const loadDeliveries = async () => {
    if (!templateId) return;
    setDeliveryLoading(true);
    try { const r = await getEmailDeliveryStatus(templateId); if (r.success) setDeliveries(r.deliveries || []); }
    finally { setDeliveryLoading(false); }
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
        setValidation(result.validation || null);
        setSchemaValid(result.validation?.valid !== false);
        if (result.email?.claimValidation) setClaimValidation(result.email.claimValidation);
        if (result.email?.claimsRequiringReview) setClaimValidation({ status: result.email.claimsRequiringReview.length > 0 ? 'failed' : 'passed', findings: result.email.claimsRequiringReview });
        mergeAsset(result.email);
        const h = await generateEmailHtml(result.email);
        if (h.success) { setHtml(h.html); setAsset(a => ({ ...a, _htmlTemplate: h.html })); }
        const p = await generateEmailPlainText(result.email);
        if (p.success) { setPlainText(p.plainText); setAsset(a => ({ ...a, _plainText: p.plainText })); }
      }
    } catch (err: any) { setError(err.message || 'Failed to generate email'); }
    finally { setGenerating(false); }
  };

  const handleSaveDraft = async () => {
    if (!selectedChatId || !asset) return;
    try {
      const dataToSave = { ...asset, html, plainText, config: emailConfig, recipient };
      const result = templateId
        ? await updateEmailTemplate(templateId, dataToSave)
        : await saveEmailDraft(selectedChatId, dataToSave);
      if (result.success) {
        const id = result.template?.id || result.assetId;
        if (id) setTemplateId(id);
        setAssetPersisted(true);
        if (result.template) mergeAsset(result.template);
        if (result.approvalStatus) setApprovalStatus(result.approvalStatus);
        setSchemaValid(true);
      }
    } catch (err: any) { setError(err.message || 'Failed to save draft'); }
  };

  const handleApprove = async () => {
    if (!templateId) return;
    try {
      const r = await approveEmailTemplate(templateId);
      if (r.success) {
        setApprovalStatus('APPROVED');
        if (r.template) mergeAsset(r.template);
        const refreshed = await getEmailTemplate(templateId);
        if (refreshed.success && refreshed.template) mergeAsset(refreshed.template);
      } else {
        setError(r.error || 'Approve failed');
      }
    } catch (err: any) { setError(err.message || 'Approve failed'); }
  };

  const handleReject = async () => {
    if (!templateId) return;
    try {
      const r = await rejectEmailTemplate(templateId, 'Rejected by user');
      if (r.success) { setApprovalStatus('REJECTED'); if (r.template) mergeAsset(r.template); }
    } catch (err: any) { setError(err.message || 'Reject failed'); }
  };

  const handleSendAction = async () => {
    const rid = 'FE-' + Date.now().toString(36).toUpperCase();
    console.log(`[${rid}] [EMAIL-FE] STEP 1: handleSendAction called`);
    console.log(`[${rid}] [EMAIL-FE] STEP 1 DETAILS: selectedChatId=${selectedChatId}, templateId=${templateId}, sendEmail=${sendEmail}, sendMode=${sendMode}`);

    if (!selectedChatId) {
      console.error(`[${rid}] [EMAIL-FE] STEP 1 FAIL: No selectedChatId`);
      setSendResult({ success: false, message: 'No chat selected' });
      return;
    }
    if (!templateId) {
      console.error(`[${rid}] [EMAIL-FE] STEP 1 FAIL: No templateId`);
      setSendResult({ success: false, message: 'No template — save a draft first' });
      return;
    }
    if (!sendEmail) {
      console.error(`[${rid}] [EMAIL-FE] STEP 1 FAIL: No recipient email`);
      setSendResult({ success: false, message: 'Enter a recipient email' });
      return;
    }

    const isApproved = approvalStatus === 'APPROVED';
    if (!isApproved && sendMode !== 'test') {
      console.error(`[${rid}] [EMAIL-FE] STEP 1 FAIL: Not approved (status=${approvalStatus})`);
      setSendResult({ success: false, message: 'Approve the email before sending' });
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      let result;
      let url: string;
      if (sendMode === 'test') {
        url = `/content/email/${selectedChatId}/send-test`;
        console.log(`[${rid}] [EMAIL-FE] STEP 2: Calling POST ${url}`);
        console.log(`[${rid}] [EMAIL-FE] STEP 2 PAYLOAD:`, JSON.stringify({ templateId, recipientEmail: sendEmail }));
        result = await sendTestEmailContent(selectedChatId, { templateId, recipientEmail: sendEmail });
      } else if (sendMode === 'now') {
        url = `/content/email/${selectedChatId}/send-now`;
        console.log(`[${rid}] [EMAIL-FE] STEP 2: Calling POST ${url}`);
        console.log(`[${rid}] [EMAIL-FE] STEP 2 PAYLOAD:`, JSON.stringify({ templateId, recipientEmail: sendEmail }));
        result = await sendEmailNow(selectedChatId, { templateId, recipientEmail: sendEmail });
      } else {
        const scheduledAt = `${sendDate}T${sendTime}:00`;
        url = `/content/email/${selectedChatId}/schedule`;
        console.log(`[${rid}] [EMAIL-FE] STEP 2: Calling POST ${url}`);
        console.log(`[${rid}] [EMAIL-FE] STEP 2 PAYLOAD:`, JSON.stringify({ templateId, recipientEmail: sendEmail, scheduledAt }));
        result = await scheduleEmailContent(selectedChatId, { templateId, recipientEmail: sendEmail, scheduledAt });
      }
      console.log(`[${rid}] [EMAIL-FE] STEP 3: API response:`, JSON.stringify(result));

      if (result?.success) {
        const parts = [];
        if (result.messageId) parts.push(`ID: ${result.messageId}`);
        if (result.provider) parts.push(`Provider: ${result.provider}`);
        if (result.delivered) parts.push('Delivered');
        console.log(`[${rid}] [EMAIL-FE] STEP 3 PASS: ${parts.join(' · ')}`);
        setSendResult({ success: true, message: parts.length > 0 ? parts.join(' · ') : sendMode === 'test' ? 'Test email sent' : sendMode === 'now' ? 'Email sent' : 'Email scheduled' });
        if (sendMode !== 'test') loadDeliveries();
      } else {
        console.error(`[${rid}] [EMAIL-FE] STEP 3 FAIL: ${result?.error || 'Unknown error'}`);
        setSendResult({ success: false, message: result?.error || 'Send failed' });
      }
    } catch (err: any) {
      console.error(`[${rid}] [EMAIL-FE] STEP 3 EXCEPTION: ${err?.message || err}`);
      console.error(`[${rid}] [EMAIL-FE] Stack:`, err?.stack || 'N/A');
      setSendResult({ success: false, message: err?.message || 'Send failed' });
    }
    finally { setSending(false); }
  };

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

      {!asset && (
        <button onClick={handleGenerate} disabled={generating} style={{ padding: '14px', background: '#53a7ff', border: '1px solid #53a7ff', borderRadius: '8px', color: 'white', cursor: generating ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: generating ? 0.5 : 1 }}>
          {generating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
          {generating ? 'Generating...' : 'Generate Email'}
        </button>
      )}

      {asset && <>
        {/* SECTION 1: Configuration */}
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
            <EmailEditor emailData={asset} onChange={(f, v) => {
              setAsset((p: any) => {
                if (f.includes('.')) {
                  const [parent, child] = f.split('.');
                  return { ...p, [parent]: { ...(p[parent] || {}), [child]: v } };
                }
                return { ...p, [f]: v };
              });
            }} onSave={handleSaveDraft} />
          ) : (
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#e5e7eb' }}>
              <div style={{ marginBottom: '8px' }}><strong>Subject:</strong> {replacePersonalization(asset?.subject || '', personalizationVars)}</div>
              {asset?.greeting && <div style={{ marginBottom: '4px' }}>{replacePersonalization(asset.greeting, personalizationVars)}</div>}
              {asset?.headline && <div style={{ marginBottom: '4px', fontWeight: 600, fontSize: '15px' }}>{replacePersonalization(asset.headline, personalizationVars)}</div>}
              {asset?.opening && <div style={{ marginBottom: '4px' }}>{replacePersonalization(asset.opening, personalizationVars)}</div>}
              {(asset?.bodyParagraphs || []).map((p: string, i: number) => <div key={i} style={{ marginBottom: '4px' }}>{replacePersonalization(p, personalizationVars)}</div>)}
              {asset?.closing && <div style={{ marginBottom: '4px' }}>{replacePersonalization(asset.closing, personalizationVars)}</div>}
              {asset?.signature && <div style={{ marginBottom: '4px' }}>{replacePersonalization(asset.signature, personalizationVars)}</div>}
              <div style={{ marginTop: '12px', padding: '10px', background: '#0f1729', borderRadius: '6px', fontSize: '11px', color: '#9aa7bd', fontFamily: 'monospace' }}>
                {Object.entries(personalizationVars).map(([k, v]) => (
                  <div key={k}>{`{{${k}}}`} → {v || <span style={{ color: '#ffb347' }}>Not set</span>}</div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* SECTION 3: Preview */}
        <SectionCard title="Preview" icon={<Eye size={14} />}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid #293245' }}>
            {(['visual', 'mobile', 'html', 'plain'] as const).map(tab => (
              <button key={tab} onClick={() => setPreviewTab(tab)} style={{ padding: '8px 14px', background: previewTab === tab ? '#1e293b' : 'transparent', border: 'none', borderBottom: previewTab === tab ? '2px solid #53a7ff' : '2px solid transparent', color: previewTab === tab ? '#e5e7eb' : '#9aa7bd', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {tab === 'visual' && <Eye size={13} />}{tab === 'mobile' && <Smartphone size={13} />}{tab === 'html' && <Code size={13} />}{tab === 'plain' && <FileText size={13} />}{tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {previewTab === 'visual' || previewTab === 'mobile' ? (
            <div style={{ maxWidth: previewTab === 'mobile' ? '375px' : '600px', margin: '0 auto', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #293245' }}>
              <iframe srcDoc={html} title="Email Preview" style={{ width: '100%', height: '500px', border: 'none' }} sandbox="" />
            </div>
          ) : previewTab === 'html' ? (
            <pre style={{ background: '#0f1729', color: '#e5e7eb', padding: '16px', borderRadius: '6px', fontSize: '12px', overflow: 'auto', maxHeight: '500px', whiteSpace: 'pre-wrap' }}>{html}</pre>
          ) : (
            <pre style={{ background: '#0f1729', color: '#e5e7eb', padding: '16px', borderRadius: '6px', fontSize: '13px', lineHeight: 1.6, overflow: 'auto', maxHeight: '500px', whiteSpace: 'pre-wrap' }}>{plainText}</pre>
          )}
        </SectionCard>

        {/* SECTION 4: Quality Check — single canonical component driven only by backend data */}
        {validation && (
          <SectionCard title="Quality & Validation" icon={<Activity size={14} />}>
            <QualityCheck validation={validation} />
          </SectionCard>
        )}

        {/* SECTION 5: Approval */}
        <SectionCard title="Approval" icon={<ThumbsUp size={14} />}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '11px', color: '#9aa7bd' }}>Status:</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: isApproved ? '#10e18b' : approvalStatus === 'REJECTED' ? '#ff4757' : '#ffb347', padding: '3px 8px', background: isApproved ? 'rgba(16,225,139,0.1)' : approvalStatus === 'REJECTED' ? 'rgba(255,71,87,0.1)' : 'rgba(255,179,71,0.1)', borderRadius: '4px', border: `1px solid ${isApproved ? '#10e18b' : approvalStatus === 'REJECTED' ? '#ff4757' : '#ffb347'}` }}>
              {approvalStatus}
            </span>
            {asset?.approvedAt && (
              <span style={{ fontSize: '11px', color: '#9aa7bd' }}>Approved {new Date(asset.approvedAt).toLocaleString()}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={handleSaveDraft} style={{ padding: '8px 16px', background: '#293245', border: '1px solid #3b4d61', borderRadius: '6px', color: '#e5e7eb', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={14} /> Save Draft</button>
            {!isApproved && (
              <button onClick={handleApprove} disabled={!canApprove} style={{ padding: '8px 16px', background: canApprove ? '#10e18b' : '#293245', border: canApprove ? '1px solid #10e18b' : '1px solid #3b4d61', borderRadius: '6px', color: canApprove ? '#0f1729' : '#9aa7bd', cursor: canApprove ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: canApprove ? 1 : 0.5 }}>
                <CheckCircle2 size={14} /> Approve
              </button>
            )}
            {!isApproved && (
              <button onClick={handleReject} disabled={!templateId} style={{ padding: '8px 16px', background: templateId ? '#ff4757' : '#293245', border: templateId ? '1px solid #ff4757' : '1px solid #3b4d61', borderRadius: '6px', color: templateId ? 'white' : '#9aa7bd', cursor: templateId ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: templateId ? 1 : 0.5 }}>
                <XCircle size={14} /> Reject
              </button>
            )}
            <button onClick={handleGenerate} style={{ padding: '8px 16px', background: '#818cf8', border: '1px solid #818cf8', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}><RefreshCw size={14} /> Regenerate</button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#9aa7bd' }}>
            {!assetPersisted ? 'Save a draft first to enable approval' : !schemaValid ? 'Fix blocking issues to enable approval' : !claimStatusOk ? 'Review claims requiring verification' : isApproved ? 'Email is approved and ready to send' : 'Approval is ready — review and approve'}
          </div>
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

        {/* SECTION 7: Delivery Tracking */}
        {templateId && (
          <SectionCard title="Delivery Tracking" icon={<Activity size={14} />}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: '#9aa7bd' }}>Tracking for template #{templateId.slice(-8)}</span>
              <button onClick={loadDeliveries} disabled={deliveryLoading} style={{ padding: '5px 10px', background: '#293245', border: '1px solid #3b4d61', borderRadius: '4px', color: '#e5e7eb', cursor: 'pointer', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><RefreshCw size={12} className={deliveryLoading ? 'spin' : ''} /> Refresh</button>
            </div>
            {(!deliveries || deliveries.length === 0) ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9aa7bd', fontSize: '12px' }}>No delivery records yet</div>
            ) : (
              <>
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
                <div style={{ fontSize: '11px', color: '#9aa7bd' }}>
                  {deliveries.filter((d: any) => d.providerMessageId).map((d: any, i: number) => (
                    <div key={i} style={{ padding: '4px 0', display: 'flex', gap: '8px' }}>
                      <span style={{ color: '#e5e7eb' }}>{d.status}</span>
                      <span>ID: {d.providerMessageId?.slice(-12) || 'N/A'}</span>
                      {d.scheduledAt && <span>Scheduled: {new Date(d.scheduledAt).toLocaleString()}</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        )}
      </>}
    </div>
  );
}
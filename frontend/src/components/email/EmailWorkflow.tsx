import { useState, useEffect } from 'react';
import { Mail, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import {
  generateEmailContent,
  validateEmailContent,
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
import { EmailConfiguration } from './EmailConfiguration';
import { RecipientEntry } from './RecipientEntry';
import { EmailEditor } from './EmailEditor';
import { EmailRenderer } from './EmailRenderer';
import { PersonalizationPreview } from './PersonalizationPreview';
import { QualityCheck } from './QualityCheck';
import { ApprovalFlow } from './ApprovalFlow';
import { SendTest } from './SendTest';
import { SendSchedule } from './SendSchedule';
import { DeliveryStatus } from './DeliveryStatus';

export function EmailWorkflow({ content: initialContent }: { content?: any }) {
  const { selectedChatId } = useProject();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email data state
  const [emailConfig, setEmailConfig] = useState({
    emailType: initialContent?.emailType || 'Product Announcement',
    goal: initialContent?.goal || 'Product Adoption',
    tone: initialContent?.tone || 'Professional',
    audience: initialContent?.audience || '',
    language: initialContent?.language || 'en',
    sender: {
      name: initialContent?.sender?.name || '',
      email: initialContent?.sender?.email || '',
      replyTo: initialContent?.sender?.replyTo || '',
    },
  });

  const [recipient, setRecipient] = useState({
    email: initialContent?.recipient?.email || '',
    firstName: initialContent?.recipient?.firstName || '',
    lastName: initialContent?.recipient?.lastName || '',
    companyName: initialContent?.recipient?.companyName || '',
  });

  const [emailData, setEmailData] = useState<any>(initialContent || null);
  const [html, setHtml] = useState(initialContent?.html || '');
  const [plainText, setPlainText] = useState(initialContent?.plainText || '');
  const [validation, setValidation] = useState<any>(initialContent?.validation || null);
  const [templateId, setTemplateId] = useState<string | null>(initialContent?.templateId || null);
  const [approvalStatus, setApprovalStatus] = useState<'DRAFT' | 'APPROVED' | 'REJECTED'>(initialContent?.approvalStatus || 'DRAFT');

  // Generate email content
  const handleGenerate = async () => {
    if (!selectedChatId) return;

    setGenerating(true);
    setError(null);

    try {
      const brief = {
        productIdentity: { displayName: 'Your Product' }, // This would come from analysis
        emailType: emailConfig.emailType,
        goal: emailConfig.goal,
        tone: emailConfig.tone,
        audience: emailConfig.audience,
        language: emailConfig.language,
        sender: emailConfig.sender,
        recipient,
      };

      const result = await generateEmailContent(selectedChatId, brief);

      if (result.success) {
        setEmailData(result.email);
        setValidation(result.validation);

        // Generate HTML and plain text
        const htmlResult = await generateEmailHtml(result.email);
        if (htmlResult.success) {
          setHtml(htmlResult.html);
        }

        const plainResult = await generateEmailPlainText(result.email);
        if (plainResult.success) {
          setPlainText(plainResult.plainText);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate email');
    } finally {
      setGenerating(false);
    }
  };

  // Initialize with existing content if provided
  useEffect(() => {
    if (initialContent && !emailData) {
      setEmailData(initialContent);
      setHtml(initialContent.html || '');
      setPlainText(initialContent.plainText || '');
      setValidation(initialContent.validation || null);
      setTemplateId(initialContent.templateId || null);
      setApprovalStatus(initialContent.approvalStatus || 'DRAFT');
      
      // Also update email config from initial content
      if (initialContent.emailType) {
        setEmailConfig(prev => ({
          ...prev,
          emailType: initialContent.emailType,
          goal: initialContent.goal || prev.goal,
          tone: initialContent.tone || prev.tone,
          audience: initialContent.audience || prev.audience,
          language: initialContent.language || prev.language,
        }));
      }
    }
  }, [initialContent]);

  // Auto-generate HTML when email data changes
  useEffect(() => {
    if (emailData && !html && emailData !== initialContent) {
      const generateHtmlFromData = async () => {
        try {
          const htmlResult = await generateEmailHtml(emailData);
          if (htmlResult.success) {
            setHtml(htmlResult.html);
          }
        } catch (err) {
          console.error('Failed to generate HTML:', err);
        }
      };
      
      const generateTextFromData = async () => {
        try {
          const plainResult = await generateEmailPlainText(emailData);
          if (plainResult.success) {
            setPlainText(plainResult.plainText);
          }
        } catch (err) {
          console.error('Failed to generate plain text:', err);
        }
      };
      
      generateHtmlFromData();
      generateTextFromData();
    }
  }, [emailData]);

  // Save draft
  const handleSaveDraft = async () => {
    if (!selectedChatId || !emailData) return;

    try {
      const dataToSave = {
        ...emailData,
        html,
        plainText,
        config: emailConfig,
        recipient,
      };

      const result = templateId
        ? await updateEmailTemplate(templateId, dataToSave)
        : await saveEmailDraft(selectedChatId, dataToSave);

      if (result.success) {
        setTemplateId(result.template.id);
        setApprovalStatus('DRAFT');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    }
  };

  // Approve email
  const handleApprove = async () => {
    if (!templateId) return;

    try {
      const result = await approveEmailTemplate(templateId);
      if (result.success) {
        setApprovalStatus('APPROVED');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve email');
    }
  };

  // Reject email
  const handleReject = async (reason: string) => {
    if (!templateId) return;

    try {
      const result = await rejectEmailTemplate(templateId, reason);
      if (result.success) {
        setApprovalStatus('REJECTED');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject email');
    }
  };

  // Regenerate email
  const handleRegenerate = async () => {
    await handleGenerate();
  };

  // Send test email
  const handleSendTest = async (testEmail: string) => {
    if (!selectedChatId || !templateId) return;

    try {
      await sendTestEmailContent(selectedChatId, {
        templateId,
        recipientEmail: testEmail,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    }
  };

  // Send email now
  const handleSendNow = async (email: string) => {
    if (!selectedChatId || !templateId) return;

    try {
      await sendEmailNow(selectedChatId, {
        templateId,
        recipientEmail: email,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    }
  };

  // Schedule email
  const handleSchedule = async (email: string, scheduledAt: string) => {
    if (!selectedChatId || !templateId) return;

    try {
      await scheduleEmailContent(selectedChatId, {
        templateId,
        recipientEmail: email,
        scheduledAt,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to schedule email');
    }
  };

  // Cancel scheduled email
  const handleCancelSchedule = async (scheduledId: string) => {
    try {
      await cancelScheduledEmail(scheduledId);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel scheduled email');
    }
  };

  // Refresh delivery status
  const handleRefreshDeliveryStatus = async () => {
    if (!templateId) return;

    try {
      await getEmailDeliveryStatus(templateId);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh delivery status');
    }
  };

  const canApprove = validation?.valid && validation?.blockingIssues?.length === 0;

  if (!selectedChatId) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#9aa7bd',
      }}>
        <Mail size={48} style={{ marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '16px', marginBottom: '8px' }}>No chat selected</div>
        <div style={{ fontSize: '13px' }}>Select a chat to create emails</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(255, 71, 87, 0.1)',
          borderRadius: '6px',
          border: '1px solid #ff4757',
          color: '#ff4757',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertTriangle size={16} />
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#ff4757',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Configuration Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <EmailConfiguration
          config={emailConfig}
          onChange={setEmailConfig}
        />
        <RecipientEntry
          recipient={recipient}
          onChange={setRecipient}
          onValidate={(r) => {
            const errors = [];
            if (!r.email) errors.push('Email is required');
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
              errors.push('Invalid email format');
            }
            return { valid: errors.length === 0, errors };
          }}
        />
      </div>

      {/* Generate Button */}
      {(!emailData || initialContent) && (
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: '#53a7ff',
            border: '1px solid #53a7ff',
            borderRadius: '8px',
            color: 'white',
            cursor: generating ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: generating ? 0.5 : 1,
          }}
        >
          {generating ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
          {generating ? 'Generating Email...' : initialContent ? 'Regenerate Email' : 'Generate Email'}
        </button>
      )}

      {/* Email Content Section */}
      {emailData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Left Column: Editor and Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <EmailEditor
              emailData={emailData}
              onChange={(field, value) => setEmailData({ ...emailData, [field]: value })}
              onSave={handleSaveDraft}
            />

            <PersonalizationPreview
              emailContent={emailData}
              recipient={recipient}
              sender={emailConfig.sender?.name}
              productName="Your Product"
            />

            <QualityCheck
              validation={validation || {}}
            />

            <ApprovalFlow
              emailData={emailData}
              approvalStatus={approvalStatus}
              onSaveDraft={handleSaveDraft}
              onApprove={handleApprove}
              onReject={handleReject}
              onRegenerate={handleRegenerate}
              canApprove={canApprove}
            />
          </div>

          {/* Right Column: Preview and Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <EmailRenderer
              html={html}
              plainText={plainText}
              subject={emailData?.subject || ''}
            />

            <SendTest
              recipientEmail={recipient.email}
              onSendTest={handleSendTest}
              canSend={approvalStatus === 'APPROVED'}
            />

            <SendSchedule
              recipientEmail={recipient.email}
              onSendNow={handleSendNow}
              onSchedule={handleSchedule}
              onCancelSchedule={handleCancelSchedule}
              canSend={approvalStatus === 'APPROVED'}
            />

            {templateId && (
              <DeliveryStatus
                templateId={templateId}
                onRefresh={handleRefreshDeliveryStatus}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

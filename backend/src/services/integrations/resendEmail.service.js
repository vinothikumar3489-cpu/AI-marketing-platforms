let resendClient = null;

async function getResend() {
  if (resendClient) return resendClient;
  const { Resend } = await import('resend');
  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || 'unknown';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export async function sendTestEmail({ recipientEmail, subject, body, senderName, approvalChecked }) {
  if (!approvalChecked) {
    return { success: false, error: 'Manual approval required. Check the approval checkbox before sending.', code: 'APPROVAL_REQUIRED' };
  }
  if (!recipientEmail || typeof recipientEmail !== 'string') {
    return { success: false, error: 'Recipient email is required', code: 'INVALID_EMAIL' };
  }
  if (recipientEmail.includes(',') || recipientEmail.includes(';')) {
    return { success: false, error: 'Only one recipient allowed in demo mode', code: 'MULTIPLE_RECIPIENTS' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail.trim())) {
    return { success: false, error: 'Invalid email format', code: 'INVALID_EMAIL' };
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return { success: false, error: 'Subject is required', code: 'INVALID_SUBJECT' };
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return { success: false, error: 'Email body is required', code: 'INVALID_BODY' };
  }

  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'Resend API key is not configured. Add RESEND_API_KEY to environment variables.', code: 'PROVIDER_NOT_CONFIGURED' };
  }
  if (!process.env.RESEND_FROM_EMAIL) {
    return { success: false, error: 'Resend from email is not configured. Add RESEND_FROM_EMAIL to environment variables.', code: 'SENDER_NOT_CONFIGURED' };
  }

  try {
    const resend = await getResend();
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: recipientEmail.trim(),
      subject: subject.trim(),
      html: body.replace(/\n/g, '<br/>'),
    });

    if (error) {
      console.error('[ResendEmail] Send failed:', error);
      return { success: false, error: 'Email sending failed', details: error.message, code: 'SEND_FAILED' };
    }

    console.log('[ResendEmail] Email sent successfully:', { recipient: maskEmail(recipientEmail), messageId: data?.id });
    return {
      success: true,
      provider: 'resend',
      status: 'sent',
      messageId: data?.id || 'sent-' + Date.now(),
      maskedRecipient: maskEmail(recipientEmail),
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[ResendEmail] Send error:', err.message);
    return { success: false, error: 'Email sending failed', details: err.message, code: 'SEND_FAILED' };
  }
}

export async function checkEmailProvider() {
  const hasKey = !!process.env.RESEND_API_KEY;
  const hasFrom = !!process.env.RESEND_FROM_EMAIL;
  if (!hasKey) return { configured: false, provider: null, reason: 'missing_api_key', fromConfigured: false };
  if (!hasFrom) return { configured: false, provider: null, reason: 'missing_from_email', fromConfigured: false };
  try {
    await getResend();
    return { configured: true, provider: 'resend', reason: 'configured', fromConfigured: true };
  } catch {
    return { configured: false, provider: null, reason: 'init_failed', fromConfigured: hasFrom };
  }
}

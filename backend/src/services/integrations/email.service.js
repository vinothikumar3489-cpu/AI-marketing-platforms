let nodemailer;
let resendClient = null;

async function getNodemailer() {
  if (nodemailer) return nodemailer;
  nodemailer = await import('nodemailer');
  return nodemailer;
}

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

function getProvider() {
  const provider = (process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (provider === 'gmail') return 'gmail';
  if (provider === 'resend') return 'resend';
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return 'gmail';
  if (process.env.RESEND_API_KEY) return 'resend';
  return null;
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

  const provider = getProvider();

  if (provider === 'gmail') {
    if (!process.env.SMTP_PASS) {
      return { success: false, error: 'Gmail SMTP is not configured. Add SMTP_PASS Gmail App Password.', code: 'PROVIDER_NOT_CONFIGURED' };
    }
    if (!process.env.SMTP_USER) {
      return { success: false, error: 'SMTP_USER is not configured.', code: 'PROVIDER_NOT_CONFIGURED' };
    }

    try {
      const nodemailerDefault = await getNodemailer();
      const transporter = nodemailerDefault.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
      const info = await transporter.sendMail({
        from: `"${senderName || 'AI Marketing Platform'}" <${fromEmail}>`,
        to: recipientEmail.trim(),
        subject: subject.trim(),
        text: body,
        html: body.replace(/\n/g, '<br/>'),
      });

      console.log('[EmailService] Gmail SMTP sent:', { recipient: maskEmail(recipientEmail), messageId: info.messageId });
      return {
        success: true,
        provider: 'gmail',
        status: 'sent',
        messageId: info.messageId || 'sent-' + Date.now(),
        maskedRecipient: maskEmail(recipientEmail),
        sentAt: new Date().toISOString(),
      };
    } catch (err) {
      const msg = err.message || '';
      console.error('[EmailService] Gmail SMTP error:', msg);
      if (msg.includes('Invalid login') || msg.includes('Username and Password not accepted') || msg.includes('auth')) {
        return { success: false, error: 'Gmail authentication failed. Use a Gmail App Password, not your normal password.', details: msg, code: 'AUTH_FAILED' };
      }
      if (msg.includes('blocked') || msg.includes('less secure') || msg.includes('Access denied')) {
        return { success: false, error: 'Google blocked SMTP login. Enable 2-Step Verification and create App Password.', details: msg, code: 'BLOCKED' };
      }
      return { success: false, error: 'Email sending failed', details: msg, code: 'SEND_FAILED' };
    }
  }

  if (provider === 'resend') {
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
        console.error('[EmailService] Resend failed:', error);
        return { success: false, error: 'Email sending failed', details: error.message, code: 'SEND_FAILED' };
      }

      console.log('[EmailService] Resend sent:', { recipient: maskEmail(recipientEmail), messageId: data?.id });
      return {
        success: true,
        provider: 'resend',
        status: 'sent',
        messageId: data?.id || 'sent-' + Date.now(),
        maskedRecipient: maskEmail(recipientEmail),
        sentAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('[EmailService] Resend error:', err.message);
      return { success: false, error: 'Email sending failed', details: err.message, code: 'SEND_FAILED' };
    }
  }

  return { success: false, error: 'No email provider configured. Set EMAIL_PROVIDER=gmail with SMTP_USER/SMTP_PASS or set RESEND_API_KEY.', code: 'NO_PROVIDER' };
}

export async function checkEmailProvider() {
  const provider = getProvider();

  if (provider === 'gmail') {
    const smtpUser = !!process.env.SMTP_USER;
    const smtpPass = !!process.env.SMTP_PASS;
    return {
      configured: smtpUser && smtpPass,
      provider: 'gmail',
      smtpUserConfigured: smtpUser,
      smtpPassConfigured: smtpPass,
      from: process.env.SMTP_FROM ? maskEmail(process.env.SMTP_FROM) : (process.env.SMTP_USER ? maskEmail(process.env.SMTP_USER) : null),
    };
  }

  if (provider === 'resend') {
    const hasKey = !!process.env.RESEND_API_KEY;
    const hasFrom = !!process.env.RESEND_FROM_EMAIL;
    return {
      configured: hasKey && hasFrom,
      provider: 'resend',
      smtpUserConfigured: false,
      smtpPassConfigured: false,
      from: process.env.RESEND_FROM_EMAIL ? maskEmail(process.env.RESEND_FROM_EMAIL) : null,
    };
  }

  return {
    configured: false,
    provider: null,
    smtpUserConfigured: !!process.env.SMTP_USER,
    smtpPassConfigured: !!process.env.SMTP_PASS,
    from: null,
  };
}

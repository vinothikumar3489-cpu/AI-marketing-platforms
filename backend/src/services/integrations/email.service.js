import axios from 'axios';
let nodemailer;
let resendClient;

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
  if (provider === 'sendgrid') return 'sendgrid';
  if (provider === 'brevo') return 'brevo';
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return 'gmail';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (process.env.BREVO_API_KEY) return 'brevo';
  return null;
}

async function tryGmailPort(port, secure) {
  const nodemailerDefault = await getNodemailer();
  const transporter = nodemailerDefault.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
  await transporter.verify();
  return transporter;
}

async function sendViaGmail({ recipient, subject, body, senderName }) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user) return { success: false, error: 'SMTP_USER is not configured.', code: 'PROVIDER_NOT_CONFIGURED' };
  if (!pass) return { success: false, error: 'SMTP_PASS is not configured. Use a Gmail App Password.', code: 'PROVIDER_NOT_CONFIGURED' };
  if (pass.length < 10) return { success: false, error: 'SMTP_PASS looks invalid. Gmail App Passwords are 16 characters.', code: 'AUTH_FAILED' };

  let transporter;
  let usedPort = Number(process.env.SMTP_PORT || 587);
  let usedSecure = false;

  try {
    transporter = await tryGmailPort(usedPort, usedSecure);
  } catch (err1) {
    const msg1 = (err1.message || '').toLowerCase();
    if (msg1.includes('timeout') || msg1.includes('etimedout') || msg1.includes('econnrefused') || msg1.includes('enotfound')) {
      try {
        usedPort = 465;
        usedSecure = true;
        transporter = await tryGmailPort(usedPort, usedSecure);
      } catch (err2) {
        const msg2 = err2.message || '';
        if (msg2.includes('timeout') || msg2.includes('etimedout')) {
          return { success: false, error: 'Gmail SMTP timed out from Render. Try port 465 or switch to Brevo/Resend/SendGrid which use HTTP APIs and do not require SMTP ports.', details: `Port 587: timeout, Port 465: timeout`, code: 'TIMEOUT' };
        }
        return { success: false, error: `Gmail SMTP failed on both ports. Port 587: ${msg1.slice(0, 120)}, Port 465: ${msg2.slice(0, 120)}`, code: 'CONNECTION_FAILED' };
      }
    } else if (msg1.includes('invalid login') || msg1.includes('auth') || msg1.includes('username and password not accepted')) {
      return { success: false, error: 'Gmail authentication failed. Use a Gmail App Password (16 chars) from https://myaccount.google.com/apppasswords', details: msg1, code: 'AUTH_FAILED' };
    } else {
      return { success: false, error: `Gmail SMTP error on port ${usedPort}: ${msg1.slice(0, 200)}`, code: 'SEND_FAILED' };
    }
  }

  const fromEmail = process.env.SMTP_FROM || user;
  try {
    const info = await transporter.sendMail({
      from: `"${senderName || 'AI Marketing Platform'}" <${fromEmail}>`,
      to: recipient.trim(),
      subject: subject.trim(),
      text: body,
      html: body.replace(/\n/g, '<br/>'),
    });
    console.log('[EmailService] Gmail SMTP sent:', { recipient: maskEmail(recipient), messageId: info.messageId, port: usedPort });
    return {
      success: true,
      provider: 'gmail',
      status: 'sent',
      messageId: info.messageId || 'sent-' + Date.now(),
      maskedRecipient: maskEmail(recipient),
      sentAt: new Date().toISOString(),
      port: usedPort,
    };
  } catch (err) {
    const msg = err.message || '';
    console.error('[EmailService] Gmail sendMail error:', msg);
    if (msg.includes('Invalid login') || msg.includes('auth')) {
      return { success: false, error: 'Gmail authentication failed. Use a Gmail App Password, not your normal password.', details: msg, code: 'AUTH_FAILED' };
    }
    return { success: false, error: 'Email sending failed', details: msg, code: 'SEND_FAILED' };
  }
}

async function sendViaSendGrid({ recipient, subject, body, senderName }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return { success: false, error: 'SendGrid API key not configured.', code: 'PROVIDER_NOT_CONFIGURED' };

  let sgMail;
  try {
    sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(apiKey);
  } catch (importErr) {
    return { success: false, error: 'SendGrid package not installed. Run: npm install @sendgrid/mail', code: 'PACKAGE_MISSING' };
  }

  try {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || 'sanjaytamil248@gmail.com';
    const msg = {
      to: recipient.trim(),
      from: fromEmail,
      subject: subject.trim(),
      text: body,
      html: body.replace(/\n/g, '<br/>'),
    };
    await sgMail.default.send(msg);
    console.log('[EmailService] SendGrid sent:', { recipient: maskEmail(recipient) });
    return {
      success: true,
      provider: 'sendgrid',
      status: 'sent',
      messageId: 'sg-' + Date.now(),
      maskedRecipient: maskEmail(recipient),
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err.message || err.response?.body?.errors?.[0]?.message || '';
    console.error('[EmailService] SendGrid error:', msg);
    return { success: false, error: 'SendGrid sending failed', details: msg, code: 'SEND_FAILED' };
  }
}

async function sendViaBrevo({ recipient, subject, body, senderName }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { success: false, error: 'Brevo API key not configured.', code: 'PROVIDER_NOT_CONFIGURED' };

  try {
    const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.SMTP_FROM || process.env.SENDGRID_FROM_EMAIL || 'sanjaytamil248@gmail.com';
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: fromEmail, name: senderName || 'AI Marketing Platform' },
        to: [{ email: recipient.trim() }],
        subject: subject.trim(),
        textContent: body,
        htmlContent: body.replace(/\n/g, '<br/>'),
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    console.log('[EmailService] Brevo sent:', { recipient: maskEmail(recipient), messageId: response.data?.messageId });
    return {
      success: true,
      provider: 'brevo',
      status: 'sent',
      messageId: response.data?.messageId || 'bv-' + Date.now(),
      maskedRecipient: maskEmail(recipient),
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    const msg = err.response?.data?.message || err.message || '';
    console.error('[EmailService] Brevo error:', msg);
    return { success: false, error: 'Brevo sending failed', details: msg, code: 'SEND_FAILED' };
  }
}

async function sendViaResend({ recipient, subject, body, senderName }) {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'Resend API key not configured.', code: 'PROVIDER_NOT_CONFIGURED' };
  }
  if (!process.env.RESEND_FROM_EMAIL) {
    return { success: false, error: 'Resend from email not configured. Add RESEND_FROM_EMAIL.', code: 'SENDER_NOT_CONFIGURED' };
  }

  try {
    const resend = await getResend();
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: recipient.trim(),
      subject: subject.trim(),
      html: body.replace(/\n/g, '<br/>'),
    });

    if (error) {
      console.error('[EmailService] Resend failed:', error);
      return { success: false, error: 'Resend sending failed', details: error.message, code: 'SEND_FAILED' };
    }

    console.log('[EmailService] Resend sent:', { recipient: maskEmail(recipient), messageId: data?.id });
    return {
      success: true,
      provider: 'resend',
      status: 'sent',
      messageId: data?.id || 'sent-' + Date.now(),
      maskedRecipient: maskEmail(recipient),
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('[EmailService] Resend error:', err.message);
    return { success: false, error: 'Resend sending failed', details: err.message, code: 'SEND_FAILED' };
  }
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
  const opts = { recipient: recipientEmail, subject, body, senderName };

  const providers = [];
  if (provider === 'gmail') providers.push('gmail');
  if (provider === 'sendgrid') providers.push('sendgrid');
  if (provider === 'brevo') providers.push('brevo');
  if (provider === 'resend') providers.push('resend');

  if (providers.length === 0) {
    if (process.env.SENDGRID_API_KEY) providers.push('sendgrid');
    if (process.env.BREVO_API_KEY) providers.push('brevo');
    if (process.env.RESEND_API_KEY) providers.push('resend');
    if (process.env.SMTP_USER && process.env.SMTP_PASS) providers.push('gmail');
  }

  const triedProviders = [];

  if (providers.includes('gmail')) {
    triedProviders.push('gmail');
    const result = await sendViaGmail(opts);
    if (result.success) return result;
    if (result.code === 'TIMEOUT') {
      if (providers.length > 1) {
        console.log('[EmailService] Gmail timed out, trying fallback provider...');
      } else {
        return result;
      }
    } else {
      return result;
    }
  }

  if (providers.includes('sendgrid')) {
    triedProviders.push('sendgrid');
    const result = await sendViaSendGrid(opts);
    if (result.success) return result;
    if (providers.length === triedProviders.length) return result;
  }

  if (providers.includes('brevo')) {
    triedProviders.push('brevo');
    const result = await sendViaBrevo(opts);
    if (result.success) return result;
    if (providers.length === triedProviders.length) return result;
  }

  if (providers.includes('resend')) {
    triedProviders.push('resend');
    const result = await sendViaResend(opts);
    if (result.success) return result;
    if (providers.length === triedProviders.length) return result;
  }

  if (triedProviders.length > 0) {
    return { success: false, error: `All providers failed. Tried: ${triedProviders.join(', ')}.`, code: 'ALL_PROVIDERS_FAILED' };
  }

  return { success: false, error: 'No email provider configured. Set EMAIL_PROVIDER=gmail with SMTP_USER/SMTP_PASS, or set SENDGRID_API_KEY / BREVO_API_KEY / RESEND_API_KEY.', code: 'NO_PROVIDER' };
}

export async function checkEmailProvider() {
  const provider = getProvider();

  if (provider === 'gmail') {
    const smtpUser = !!process.env.SMTP_USER;
    const smtpPass = !!process.env.SMTP_PASS;
    const passLength = process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0;
    return {
      configured: smtpUser && smtpPass && passLength >= 10,
      provider: 'gmail',
      smtpUserConfigured: smtpUser,
      smtpPassConfigured: smtpPass,
      smtpPassLength: passLength,
      from: process.env.SMTP_FROM ? maskEmail(process.env.SMTP_FROM) : (process.env.SMTP_USER ? maskEmail(process.env.SMTP_USER) : null),
      port587: process.env.SMTP_PORT ? 'configured' : 'unknown',
      port465: 'unknown',
    };
  }

  if (provider === 'sendgrid') {
    return {
      configured: !!process.env.SENDGRID_API_KEY,
      provider: 'sendgrid',
      smtpUserConfigured: false,
      smtpPassConfigured: false,
      from: process.env.SENDGRID_FROM_EMAIL ? maskEmail(process.env.SENDGRID_FROM_EMAIL) : null,
    };
  }

  if (provider === 'brevo') {
    return {
      configured: !!process.env.BREVO_API_KEY,
      provider: 'brevo',
      smtpUserConfigured: false,
      smtpPassConfigured: false,
      from: process.env.BREVO_FROM_EMAIL ? maskEmail(process.env.BREVO_FROM_EMAIL) : null,
    };
  }

  if (provider === 'resend') {
    return {
      configured: !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL,
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
    sengridConfigured: !!process.env.SENDGRID_API_KEY,
    brevoConfigured: !!process.env.BREVO_API_KEY,
    resendConfigured: !!process.env.RESEND_API_KEY,
    from: null,
  };
}

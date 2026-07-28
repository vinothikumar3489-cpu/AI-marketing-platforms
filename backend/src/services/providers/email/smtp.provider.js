import nodemailer from 'nodemailer';
import { PROVIDER_STATUS, maskEmail } from "./email-provider.interface.js";

function getConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
    fromName: process.env.SMTP_FROM_NAME || 'AI Marketing Platform',
  };
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const config = getConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  return transporter;
}

export function getSmtpHealth() {
  const config = getConfig();
  const configured = !!(config.user && config.pass);
  const senderConfigured = !!config.fromEmail;
  return {
    provider: 'smtp',
    configured,
    senderConfigured,
    host: config.host,
    port: config.port,
    mode: configured ? 'SMTP' : 'NOT_CONFIGURED',
    status: configured ? (senderConfigured ? PROVIDER_STATUS.AVAILABLE : PROVIDER_STATUS.SENDER_NOT_CONFIGURED) : PROVIDER_STATUS.NOT_CONFIGURED,
  };
}

export async function sendViaSmtp({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey }) {
  const config = getConfig();
  if (!config.user || !config.pass) return { success: false, status: PROVIDER_STATUS.NOT_CONFIGURED, error: { code: 'SMTP_NOT_CONFIGURED', message: 'SMTP_USER/SMTP_PASS not configured.' } };
  if (!config.fromEmail) return { success: false, status: PROVIDER_STATUS.SENDER_NOT_CONFIGURED, error: { code: 'SENDER_NOT_CONFIGURED', message: 'SMTP_FROM_EMAIL not configured.' } };

  try {
    const transporter = getTransporter();
    const fromAddr = senderName ? `"${senderName}" <${config.fromEmail}>` : config.fromEmail;

    const mailOptions = {
      from: fromAddr,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      replyTo: replyTo || undefined,
      headers: {
        'X-Idempotency-Key': idempotencyKey || '',
        'X-Provider': 'smtp',
      },
    };

    if (tags && tags.length > 0) {
      mailOptions.headers['X-Categories'] = tags.join(',');
    }

    const info = await transporter.sendMail(mailOptions);

    const messageId = info.messageId || 'smtp-' + Date.now();
    return {
      success: true,
      provider: 'smtp',
      status: 'QUEUED',
      providerMessageId: messageId,
      maskedRecipient: maskEmail(to),
      sentAt: new Date().toISOString(),
      retryable: false,
    };
  } catch (err) {
    console.error(`[SMTP] Send error:`, err.message);
    return {
      success: false,
      provider: 'smtp',
      status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE,
      error: { code: 'SMTP_SEND_FAILED', message: err.message },
      providerMessageId: null,
      maskedRecipient: maskEmail(to),
      sentAt: new Date().toISOString(),
      retryable: err.message?.includes('ETIMEDOUT') || err.message?.includes('ECONNREFUSED'),
    };
  }
}

export async function sendTestEmailSmtp({ to, subject, html, text, senderName, replyTo }) {
  const result = await sendViaSmtp({
    to,
    subject: `[TEST] ${subject}`,
    html,
    text,
    senderName,
    replyTo,
    tags: ['TEST_EMAIL'],
    idempotencyKey: `test-${Date.now()}`,
  });

  if (result.success) {
    return { ...result, testStatus: 'TEST_SENT', message: 'Test email sent successfully' };
  }
  return result;
}

export async function verifySmtpConnection() {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
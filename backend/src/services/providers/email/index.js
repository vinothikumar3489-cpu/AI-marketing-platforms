export {
  getBrevoHealth,
  sendTransactionalEmail,
  sendViaBrevo,
  sendTestEmail,
  scheduleEmail,
  cancelScheduledEmail,
  getDeliveryStatus,
  createWebhook,
} from './brevo.provider.js';

export {
  getResendHealth,
  sendViaResend,
  sendTestEmailResend,
  getResendDeliveryStatus,
} from './resend.provider.js';

export {
  getSmtpHealth,
  sendViaSmtp,
  sendTestEmailSmtp,
  verifySmtpConnection,
} from './smtp.provider.js';

export {
  getSendgridHealth,
  sendViaSendgrid,
  sendTestEmailSendgrid,
  verifySendgridConnection,
} from './sendgrid.provider.js';

export {
  getEmailProviderHealth,
  sendEmail,
  getActiveProvider,
  logActiveProvider,
  PROVIDER_STATUS,
} from "./email-provider-registry.js";

export {
  PROVIDER_STATUS as PROVIDER_STATUS_CONSTANTS,
  maskEmail,
  validateRecipient,
} from "./email-provider.interface.js";

export {
  sendTestEmail as sendLegacyTestEmail,
  checkEmailProvider,
} from "./email-service-legacy.js";
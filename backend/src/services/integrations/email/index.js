/**
 * Email Integration Barrel Export
 * Centralized exports for email provider services
 */

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
  getEmailProviderHealth,
  sendEmail,
} from './email-provider-registry.js';

export {
  PROVIDER_STATUS,
  maskEmail,
  validateRecipient,
} from './email-provider.interface.js';

export {
  sendTestEmail as sendLegacyTestEmail,
  checkEmailProvider,
} from './email-service-legacy.js';

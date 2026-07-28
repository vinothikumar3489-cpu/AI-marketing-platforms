import dotenv from 'dotenv';
dotenv.config();

import { logActiveProvider, sendEmail, getEmailProviderHealth } from '../src/services/providers/email/email-provider-registry.js';

const recipient = process.argv[2] || process.env.BREVO_FROM_EMAIL || 'sukeshkavin@gmail.com';

console.log('=== Email Delivery Pipeline Verification ===\n');

logActiveProvider();
const health = getEmailProviderHealth();
console.log('Provider:', health.activeProvider);
console.log('Can send:', health.canSend);
console.log('Recipient:', recipient);
console.log('');

if (!health.canSend) {
  console.error('ERROR: No email provider configured.');
  process.exit(1);
}

const result = await sendEmail({
  to: recipient,
  subject: '[TEST] Email Delivery Pipeline Verification',
  html: `<html><body style="font-family:Arial,sans-serif;padding:20px">
<h1 style="color:#0066cc">Email Delivery Pipeline Test</h1>
<p>This is a test email sent via the production email delivery pipeline.</p>
<p>All pipeline stages are functioning correctly:</p>
<ul>
  <li>AI Generation</li>
  <li>Schema Validation</li>
  <li>Claim Validation</li>
  <li>Asset Persistence</li>
  <li>Provider Selection</li>
  <li>SMTP/API Delivery</li>
</ul>
<p style="color:#666">Timestamp: ${new Date().toISOString()}</p>
<hr>
<p style="font-size:12px;color:#999">AI Marketing Platform - Pipeline Verification</p>
</body></html>`,
  text: `Email Delivery Pipeline Test

This is a test email sent via the production email delivery pipeline.

All pipeline stages are functioning correctly:
- AI Generation
- Schema Validation
- Claim Validation
- Asset Persistence
- Provider Selection
- SMTP/API Delivery

Timestamp: ${new Date().toISOString()}

AI Marketing Platform - Pipeline Verification`,
  senderName: 'AI Marketing Platform',
  tags: ['PIPELINE_TEST', 'VERIFICATION'],
  metadata: { test: true, pipeline: 'email-delivery' },
});

console.log('\n--- Delivery Result ---');
console.log('Success:', result.success);
console.log('Provider:', result.provider);
console.log('MessageId:', result.providerMessageId);
console.log('Status:', result.status);
console.log('Masked Recipient:', result.maskedRecipient);

if (result.error) {
  console.log('Error:', result.error);
}

if (result.success) {
  console.log('\n✓ Email delivered successfully!');
  process.exit(0);
} else {
  console.log('\n✗ Email delivery failed.');
  process.exit(1);
}

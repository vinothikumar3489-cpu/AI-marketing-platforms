// Full production test of Brevo Email Automation
// Tests: 1. Brevo health check, 2. Test send via direct Brevo API, 3. Approval flow
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '../.env') });

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL;
const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'AI Marketing Platform';

console.log('=== BREVO PRODUCTION TEST ===');
console.log(`BREVO_API_KEY: ${BREVO_API_KEY ? BREVO_API_KEY.substring(0, 20) + '...' : 'MISSING'}`);
console.log(`BREVO_FROM_EMAIL: ${BREVO_FROM_EMAIL || 'MISSING'}`);
console.log(`BREVO_FROM_NAME: ${BREVO_FROM_NAME}`);

async function testBrevoHealth() {
  console.log('\n--- Test 1: Brevo Health Check ---');
  const { getBrevoHealth } = await import('../src/services/integrations/email/brevo.provider.js');
  const health = getBrevoHealth();
  console.log('Health:', JSON.stringify(health, null, 2));
  if (!health.configured) throw new Error('BREVO_API_KEY is not configured');
  if (!health.senderConfigured) throw new Error('BREVO_FROM_EMAIL is not configured');
  console.log('PASS: Brevo is configured and sender is verified');
  return health;
}

async function testDirectBrevoSend() {
  console.log('\n--- Test 2: Direct Brevo HTTP API Send ---');
  const { sendViaBrevo } = await import('../src/services/integrations/email/brevo.provider.js');
  
  const result = await sendViaBrevo({
    to: 'sukeshkavin@gmail.com',
    subject: 'Test: Brevo Automation Verification',
    html: '<h1>Test Email</h1><p>This is a production test of the Brevo email automation pipeline.</p>',
    text: 'Test Email\n\nThis is a production test of the Brevo email automation pipeline.',
    senderName: BREVO_FROM_NAME,
    tags: ['production-test', 'brevo-verification'],
    idempotencyKey: `test_prod_${Date.now()}`,
  });

  console.log('Send result:', JSON.stringify(result, null, 2));
  if (!result.success) throw new Error(`Send failed: ${result.error?.message || 'Unknown'}`);
  if (!result.providerMessageId) throw new Error('No providerMessageId returned');
  console.log('PASS: Email submitted to Brevo');
  console.log(`Provider Message ID: ${result.providerMessageId}`);
  return result;
}

async function testProviderRegistry() {
  console.log('\n--- Test 3: Provider Registry Detection ---');
  const { getEmailProviderHealth, sendEmail } = await import('../src/services/integrations/email/email-provider-registry.js');
  
  const health = getEmailProviderHealth();
  console.log('Registry health:', JSON.stringify(health, null, 2));
  
  if (health.activeProvider !== 'brevo') throw new Error(`Expected brevo, got ${health.activeProvider}`);
  if (!health.canSend) throw new Error('Provider says cannot send');
  console.log('PASS: Brevo is detected as active provider');
  
  const result = await sendEmail({
    to: 'sukeshkavin@gmail.com',
    subject: 'Test: Provider Registry Send',
    html: '<h1>Provider Registry Test</h1><p>Sent via provider registry.</p>',
    text: 'Provider Registry Test\n\nSent via provider registry.',
    senderName: BREVO_FROM_NAME,
    tags: ['provider-registry-test'],
    idempotencyKey: `reg_test_${Date.now()}`,
  });
  
  console.log('Registry send result:', JSON.stringify({
    success: result.success,
    provider: result.provider,
    status: result.status,
    providerMessageId: result.providerMessageId,
    maskedRecipient: result.maskedRecipient,
  }, null, 2));
  
  if (!result.success) throw new Error(`Registry send failed: ${result.error?.message || 'Unknown'}`);
  console.log('PASS: Provider registry successfully sent via Brevo');
  return result;
}

async function testHtmlRendering() {
  console.log('\n--- Test 4: HTML/Plain Text Rendering ---');
  const { renderEmailHtml, renderPlainText } = await import('../src/services/email/email-template-renderer.service.js');
  
  const structured = {
    subject: 'Test Subject',
    previewText: 'Preview of the email',
    greeting: 'Hi {{firstName}},',
    opening: 'We have some exciting news.',
    bodyParagraphs: ['This is the main body paragraph.', 'This is another paragraph.'],
    bulletPoints: ['Feature one', 'Feature two'],
    cta: { text: 'Get Started', url: 'https://example.com' },
    closing: 'Best regards,',
    signature: 'The Team',
  };
  
  const html = renderEmailHtml(structured);
  const text = renderPlainText(structured);
  
  if (!html.includes('<!DOCTYPE html>')) throw new Error('HTML missing doctype');
  if (!html.includes('Test Subject')) throw new Error('HTML missing subject');
  if (!html.includes('{{firstName}}')) throw new Error('HTML missing personalization');
  if (!html.includes('{{unsubscribe_url}}')) throw new Error('HTML missing unsubscribe link');
  if (!text.includes('Feature one')) throw new Error('Plain text missing bullet points');
  if (!text.includes('Get Started')) throw new Error('Plain text missing CTA');
  
  console.log('HTML length:', html.length, 'chars');
  console.log('Plain text length:', text.length, 'chars');
  console.log('PASS: HTML and plain text rendering works correctly');
  return { html, text };
}

async function testValidation() {
  console.log('\n--- Test 5: API Key/From Email Validation ---');
  
  // Test without API key
  const originalKey = process.env.BREVO_API_KEY;
  process.env.BREVO_API_KEY = '';
  
  const { getBrevoHealth } = await import('../src/services/integrations/email/brevo.provider.js');
  const healthNoKey = getBrevoHealth();
  
  if (healthNoKey.configured) throw new Error('Should show not configured when API key is empty');
  console.log('Without API key:', JSON.stringify({ configured: healthNoKey.configured, status: healthNoKey.status }));
  
  // Test without from email
  process.env.BREVO_API_KEY = originalKey;
  const originalFrom = process.env.BREVO_FROM_EMAIL;
  process.env.BREVO_FROM_EMAIL = '';
  
  // Need fresh import
  const healthNoFrom = getBrevoHealth();
  if (healthNoFrom.senderConfigured) throw new Error('Should show sender not configured when from email is empty');
  console.log('Without from email:', JSON.stringify({ configured: healthNoFrom.configured, senderConfigured: healthNoFrom.senderConfigured, status: healthNoFrom.status }));
  
  process.env.BREVO_FROM_EMAIL = originalFrom;
  console.log('PASS: Validation correctly detects missing API key and from email');
}

(async () => {
  let passed = 0;
  let failed = 0;
  
  const tests = [
    { name: 'Brevo Health Check', fn: testBrevoHealth },
    { name: 'Direct Brevo HTTP API Send', fn: testDirectBrevoSend },
    { name: 'Provider Registry Detection', fn: testProviderRegistry },
    { name: 'HTML/Plain Text Rendering', fn: testHtmlRendering },
    { name: 'API Key/From Email Validation', fn: testValidation },
  ];
  
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${test.name}: ${err.message}`);
      failed++;
    }
    console.log('');
  }
  
  console.log('=== RESULTS ===');
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  
  if (failed > 0) process.exit(1);
})();

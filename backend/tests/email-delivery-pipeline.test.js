import { describe, test, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

before(() => {
  const mockPrisma = {
    emailTemplate: {
      findFirst: () => Promise.resolve(null),
      create: () => Promise.resolve({ id: 'tmpl-new' }),
      update: () => Promise.resolve({ id: 'tmpl-upd' }),
    },
    emailDeliveryLog: {
      create: () => Promise.resolve({ id: 'del-1' }),
      findFirst: () => Promise.resolve(null),
      findMany: () => Promise.resolve([]),
      update: () => Promise.resolve({ id: 'del-1' }),
    },
    automationLog: {
      create: () => Promise.resolve({ id: 'log-1' }),
    },
  };
  mock.module('../src/config/prisma.js', {
    namedExports: { prisma: mockPrisma },
    defaultExport: mockPrisma,
  });

  mock.module('axios', {
    defaultExport: {
      post: () => Promise.resolve({
        data: { messageId: 'brevo-msg-123' },
        status: 201,
      }),
      delete: () => Promise.resolve({ status: 204 }),
    },
  });
});

after(() => {
  Object.assign(process.env, ORIGINAL_ENV);
  mock.reset();
});

const MOCK_TEMPLATE = {
  id: 'tmpl-e2e-test-001',
  userId: 'user-1',
  chatId: 'chat-1',
  subjectLine: 'Welcome to Our Platform {{firstName}}',
  previewText: 'Get started with your account',
  emailBodyHtml: '<html><body><h1>Welcome!</h1><p>Hello {{firstName}}, welcome to {{productName}}.</p></body></html>',
  emailBodyText: 'Welcome! Hello {{firstName}}, welcome to {{productName}}.',
  senderName: 'Test Team',
  senderEmail: 'test@example.com',
  replyToEmail: 'support@example.com',
  approvalStatus: 'APPROVED',
  category: 'Welcome',
  personalizationFields: {
    recipient: { firstName: 'John', lastName: 'Doe', companyName: 'Acme', email: 'john@acme.com' },
    productIdentity: { displayName: 'Platform Pro' },
  },
};

const MOCK_EMAIL_DATA = {
  subject: 'Welcome to Our Platform',
  greeting: 'Hello {{firstName}},',
  headline: 'Welcome aboard!',
  opening: 'We are excited to have you.',
  bodyParagraphs: ['You can now access all features.'],
  closing: 'Best regards,',
  signature: 'The Team',
  callToAction: { label: 'Get Started', url: 'https://example.com/start' },
  recipient: { firstName: 'John', lastName: 'Doe', companyName: 'Acme', email: 'john@acme.com' },
  sender: { name: 'Test Team', email: 'test@example.com' },
  productIdentity: { displayName: 'Platform Pro' },
};

describe('Email Delivery Pipeline', () => {

  before(() => {
    process.env.BREVO_API_KEY = 'brevo-test-key';
    process.env.BREVO_FROM_EMAIL = 'noreply@example.com';
    process.env.BREVO_FROM_NAME = 'Test Platform';
    process.env.EMAIL_PROVIDER = 'brevo';
  });

  test('1. Provider auto-detection works with Brevo configured', async () => {
    const { getEmailProviderHealth } = await import('../src/services/providers/email/email-provider-registry.js');
    const health = getEmailProviderHealth();
    assert.equal(health.activeProvider, 'brevo');
    assert.equal(health.canSend, true);
    assert.equal(health.providers.brevo.configured, true);
  });

  test('2. Validation rejects missing recipient', async () => {
    const { deliverEmail } = await import('../src/services/email/email-delivery.service.js');
    const result = await deliverEmail({
      templateId: 'tmpl-1', chatId: 'chat-1', userId: 'user-1',
      recipientEmail: '', emailData: MOCK_TEMPLATE, mode: 'test',
    });
    assert.equal(result.success, false);
    assert.ok(result.error.includes('required') || result.error.toLowerCase().includes('recipient'));
  });

  test('3. Validation rejects missing subject', async () => {
    const { deliverEmail } = await import('../src/services/email/email-delivery.service.js');
    const tmpl = { ...MOCK_TEMPLATE, subjectLine: '' };
    const result = await deliverEmail({
      templateId: 'tmpl-1', chatId: 'chat-1', userId: 'user-1',
      recipientEmail: 'john@example.com', emailData: tmpl, mode: 'test',
    });
    assert.equal(result.success, false);
    assert.ok(result.error.includes('Subject') || result.error.toLowerCase().includes('subject'));
  });

  test('4. Validation rejects unapproved template', async () => {
    const { deliverEmail } = await import('../src/services/email/email-delivery.service.js');
    const tmpl = { ...MOCK_TEMPLATE, approvalStatus: 'DRAFT' };
    const result = await deliverEmail({
      templateId: 'tmpl-1', chatId: 'chat-1', userId: 'user-1',
      recipientEmail: 'john@example.com', emailData: tmpl, mode: 'now',
    });
    assert.equal(result.success, false);
    assert.ok(result.error.includes('approved') || result.error.toLowerCase().includes('approv'));
  });

  test('5. Generates HTML when missing', async () => {
    const { deliverEmail } = await import('../src/services/email/email-delivery.service.js');
    const tmpl = {
      ...MOCK_TEMPLATE,
      emailBodyHtml: '',
      personalizationFields: MOCK_EMAIL_DATA,
    };
    const result = await deliverEmail({
      templateId: 'tmpl-1', chatId: 'chat-1', userId: 'user-1',
      recipientEmail: 'john@example.com', emailData: tmpl, mode: 'test',
    });
    assert.equal(result.success, true);
    assert.ok(result.messageId);
    assert.ok(result.provider);
  });

  test('6. Send test email returns messageId and provider', async () => {
    const { deliverEmail } = await import('../src/services/email/email-delivery.service.js');
    const result = await deliverEmail({
      templateId: 'tmpl-e2e-test-001', chatId: 'chat-1', userId: 'user-1',
      recipientEmail: 'john@example.com', emailData: MOCK_TEMPLATE, mode: 'test',
    });
    assert.equal(result.success, true);
    assert.ok(result.messageId);
    assert.ok(result.provider);
    assert.equal(result.delivered, true);
    assert.equal(result.status, 'SENT');
  });

  test('7. Send production email returns messageId and provider', async () => {
    const { deliverEmail } = await import('../src/services/email/email-delivery.service.js');
    const result = await deliverEmail({
      templateId: 'tmpl-e2e-test-001', chatId: 'chat-1', userId: 'user-1',
      recipientEmail: 'john@example.com', emailData: MOCK_TEMPLATE, mode: 'now',
    });
    assert.equal(result.success, true);
    assert.ok(result.messageId);
    assert.ok(result.provider);
    assert.equal(result.delivered, true);
    assert.equal(result.status, 'SENT');
  });

  test('8. Schedule email returns messageId and provider', async () => {
    const { deliverEmail } = await import('../src/services/email/email-delivery.service.js');
    const result = await deliverEmail({
      templateId: 'tmpl-e2e-test-001', chatId: 'chat-1', userId: 'user-1',
      recipientEmail: 'john@example.com', emailData: MOCK_TEMPLATE,
      mode: 'schedule', scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(result.success, true);
    assert.ok(result.messageId);
    assert.ok(result.provider);
    assert.equal(result.delivered, true);
    assert.equal(result.status, 'SCHEDULED');
  });

  test('9. Full pipeline: generate validate approve send', async () => {
    const { validateEmail } = await import('../src/services/email/email-validator.service.js');
    const { generateEmailHtmlTemplate } = await import('../src/services/email/email-html-generator.service.js');
    const { deliverEmail } = await import('../src/services/email/email-delivery.service.js');

    const validation = validateEmail(MOCK_EMAIL_DATA, { productName: 'Platform Pro' });
    assert.equal(validation.valid, true);
    assert.ok(validation.score >= 0);

    const html = generateEmailHtmlTemplate(MOCK_EMAIL_DATA);
    assert.ok(html);
    assert.ok(html.includes('Welcome'));
    assert.ok(html.includes('Get Started'));

    const result = await deliverEmail({
      templateId: 'tmpl-e2e-test-001', chatId: 'chat-1', userId: 'user-1',
      recipientEmail: 'john@example.com',
      emailData: { ...MOCK_TEMPLATE, emailBodyHtml: html },
      mode: 'now',
    });
    assert.equal(result.success, true);
    assert.ok(result.messageId);
    assert.equal(result.provider, 'brevo');
    assert.equal(result.delivered, true);

    assert.equal(html.includes('<script'), false);
    assert.equal(html.includes('onload='), false);
    assert.equal(html.includes('onclick='), false);
  });

  test('10. sendEmail canonical function works end-to-end', async () => {
    const { sendEmail } = await import('../src/services/providers/email/email-provider-registry.js');
    const result = await sendEmail({
      to: 'john@example.com',
      subject: 'E2E Test',
      html: '<html><body><p>Test</p></body></html>',
      text: 'Test',
      senderName: 'Test Team',
      tags: ['E2E_TEST'],
    });
    assert.equal(result.success, true);
    assert.ok(result.providerMessageId);
    assert.equal(result.provider, 'brevo');
  });
});

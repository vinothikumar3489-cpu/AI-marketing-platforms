/**
 * Email Workflow Backend Tests
 * Tests for email generation, validation, persistence, and Brevo integration
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  saveEmailDraft, 
  updateEmailTemplate, 
  approveEmailTemplate, 
  rejectEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  deleteEmailTemplate,
  saveDeliveryRecord,
  updateDeliveryStatus,
  getDeliveryStatus
} from "../services/persistence/email-persistence.service.js";
import { validateEmail, validateForSending } from "../services/email/email-validator.service.js";
import { generateEmailHtmlTemplate, generatePlainTextFromEmailData } from "../services/email/email-html-generator.service.js";
import { 
  sendTransactionalEmail,
  sendTestEmail,
  scheduleEmail,
  cancelScheduledEmail
} from '../services/integrations/email/brevo.provider.js';

// Mock Prisma
jest.mock('../config/prisma.js', () => ({
  prisma: {
    emailTemplate: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    emailRecipient: {
      upsert: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    emailDelivery: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    automationLog: {
      create: jest.fn(),
    },
  },
}));

describe('Email Persistence Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saveEmailDraft should create a new email template', async () => {
    const mockTemplate = {
      id: 'template-1',
      userId: 'user-1',
      emailType: 'Product Announcement',
      subject: 'Test Subject',
      approvalStatus: 'DRAFT',
    };

    const { prisma } = await import('../config/prisma.js');
    prisma.emailTemplate.findFirst.mockResolvedValue(null);
    prisma.emailTemplate.create.mockResolvedValue(mockTemplate);

    const emailData = {
      emailType: 'Product Announcement',
      subject: 'Test Subject',
      html: '<html>Test</html>',
      plainText: 'Test plain text',
    };

    const result = await saveEmailDraft('user-1', 'chat-1', emailData);

    expect(result.success).toBe(true);
    expect(result.template).toEqual(mockTemplate);
    expect(prisma.emailTemplate.create).toHaveBeenCalled();
  });

  test('saveEmailDraft should update existing draft', async () => {
    const mockTemplate = {
      id: 'template-1',
      userId: 'user-1',
      emailType: 'Product Announcement',
      subject: 'Updated Subject',
      approvalStatus: 'DRAFT',
    };

    const { prisma } = await import('../config/prisma.js');
    prisma.emailTemplate.findFirst.mockResolvedValue(mockTemplate);
    prisma.emailTemplate.update.mockResolvedValue(mockTemplate);

    const emailData = {
      emailType: 'Product Announcement',
      subject: 'Updated Subject',
      html: '<html>Updated</html>',
      plainText: 'Updated plain text',
    };

    const result = await saveEmailDraft('user-1', 'chat-1', emailData);

    expect(result.success).toBe(true);
    expect(prisma.emailTemplate.update).toHaveBeenCalled();
  });

  test('approveEmailTemplate should update status to APPROVED', async () => {
    const mockTemplate = {
      id: 'template-1',
      userId: 'user-1',
      approvalStatus: 'DRAFT',
    };

    const { prisma } = await import('../config/prisma.js');
    prisma.emailTemplate.findFirst.mockResolvedValue(mockTemplate);
    prisma.emailTemplate.update.mockResolvedValue({
      ...mockTemplate,
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
    });

    const result = await approveEmailTemplate('template-1', 'user-1');

    expect(result.success).toBe(true);
    expect(result.template.approvalStatus).toBe('APPROVED');
  });

  test('rejectEmailTemplate should update status with reason', async () => {
    const mockTemplate = {
      id: 'template-1',
      userId: 'user-1',
      approvalStatus: 'DRAFT',
    };

    const { prisma } = await import('../config/prisma.js');
    prisma.emailTemplate.findFirst.mockResolvedValue(mockTemplate);
    prisma.emailTemplate.update.mockResolvedValue(mockTemplate);

    const result = await rejectEmailTemplate('template-1', 'user-1', 'Test rejection reason');

    expect(result.success).toBe(true);
    expect(prisma.emailTemplate.update).toHaveBeenCalledWith({
      where: { id: 'template-1' },
      data: expect.objectContaining({
        approvalStatus: 'REJECTED',
      }),
    });
  });

  test('deleteEmailTemplate should not delete approved templates', async () => {
    const mockTemplate = {
      id: 'template-1',
      userId: 'user-1',
      approvalStatus: 'APPROVED',
    };

    const { prisma } = await import('../config/prisma.js');
    prisma.emailTemplate.findFirst.mockResolvedValue(mockTemplate);

    const result = await deleteEmailTemplate('template-1', 'user-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot delete approved');
  });

  test('saveDeliveryRecord should create delivery record', async () => {
    const mockDelivery = {
      id: 'delivery-1',
      emailTemplateId: 'template-1',
      recipientId: 'recipient-1',
      status: 'QUEUED',
    };

    const { prisma } = await import('../config/prisma.js');
    prisma.emailDelivery.create.mockResolvedValue(mockDelivery);

    const result = await saveDeliveryRecord('template-1', 'recipient-1', {
      brevoMessageId: 'brevo-1',
      status: 'QUEUED',
    });

    expect(result.success).toBe(true);
    expect(result.delivery).toEqual(mockDelivery);
  });
});

describe('Email Validator', () => {
  test('validateEmail should return valid for complete email', () => {
    const emailData = {
      subject: 'Test Subject',
      greeting: 'Hello',
      headline: 'Test Headline',
      opening: 'Test opening',
      solution: 'Test solution',
      benefits: ['Benefit 1', 'Benefit 2'],
      primaryCta: { label: 'Click Here', url: 'https://example.com' },
      closing: 'Best regards',
      signature: 'John Doe',
      complianceFooter: 'Compliance text',
      unsubscribeText: 'Unsubscribe',
      html: '<html>Test</html>',
      plainText: 'Test plain text',
    };

    const result = validateEmail(emailData, {
      productName: 'Test Product',
      audienceIntelligence: [],
    });

    expect(result.valid).toBe(true);
    expect(result.blockingIssues).toHaveLength(0);
  });

  test('validateEmail should return invalid for missing required fields', () => {
    const emailData = {
      subject: '',
      greeting: '',
      headline: '',
    };

    const result = validateEmail(emailData, {});

    expect(result.valid).toBe(false);
    expect(result.blockingIssues.length).toBeGreaterThan(0);
  });

  test('validateForSending should check approval status', () => {
    const emailData = {
      subject: 'Test Subject',
      approvalStatus: 'DRAFT',
    };

    const result = validateForSending(emailData);

    expect(result.canSend).toBe(false);
    expect(result.blockingIssues).toContain('Email must be approved before sending');
  });
});

describe('Email HTML Generator', () => {
  test('generateEmailHtmlTemplate should produce valid HTML', () => {
    const emailData = {
      subject: 'Test Subject',
      greeting: 'Hello',
      headline: 'Test Headline',
      body: 'Test body',
      primaryCta: { label: 'Click Here', url: 'https://example.com' },
      sender: { name: 'John Doe', email: 'john@example.com' },
    };

    const html = generateEmailHtmlTemplate(emailData);

    expect(html).toContain('<html');
    expect(html).toContain('Test Headline');
    expect(html).toContain('Click Here');
  });

  test('generateEmailHtmlTemplate should replace personalization variables', () => {
    const emailData = {
      subject: 'Hello {{firstName}}',
      greeting: 'Hi {{firstName}}',
      headline: 'Welcome to {{companyName}}',
      primaryCta: { label: 'Get Started', url: 'https://example.com' },
      sender: { name: 'John Doe', email: 'john@example.com' },
    };

    const recipient = {
      firstName: 'Jane',
      lastName: 'Smith',
      companyName: 'Acme Inc',
    };

    const html = generateEmailHtmlTemplate(emailData, recipient);

    expect(html).toContain('Jane');
    expect(html).toContain('Acme Inc');
    expect(html).not.toContain('{{firstName}}');
  });

  test('generatePlainTextFromEmailData should produce plain text', () => {
    const emailData = {
      subject: 'Test Subject',
      greeting: 'Hello',
      headline: 'Test Headline',
      body: 'Test body',
      primaryCta: { label: 'Click Here', url: 'https://example.com' },
      sender: { name: 'John Doe', email: 'john@example.com' },
    };

    const plainText = generatePlainTextFromEmailData(emailData);

    expect(plainText).toContain('Test Subject');
    expect(plainText).toContain('Test Headline');
    expect(plainText).toContain('Click Here');
  });
});

describe('Brevo Provider Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variables
    process.env.BREVO_API_KEY = 'test-api-key';
    process.env.BREVO_SENDER_EMAIL = 'sender@example.com';
    process.env.BREVO_SENDER_NAME = 'Test Sender';
  });

  test('sendTransactionalEmail should call Brevo API', async () => {
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ messageId: 'brevo-message-1' }),
      })
    );

    const result = await sendTransactionalEmail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<html>Test</html>',
      text: 'Test plain text',
      senderName: 'Test Sender',
    });

    expect(result.success).toBe(true);
    expect(result.providerMessageId).toBe('brevo-message-1');
  });

  test('sendTestEmail should add TEST prefix to subject', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ messageId: 'brevo-message-1' }),
      })
    );

    const result = await sendTestEmail({
      to: 'test@example.com',
      subject: 'Original Subject',
      html: '<html>Test</html>',
      text: 'Test plain text',
      senderName: 'Test Sender',
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('[TEST]'),
      })
    );
  });

  test('scheduleEmail should include scheduledAt parameter', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ scheduledId: 'scheduled-1' }),
      })
    );

    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    const result = await scheduleEmail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<html>Test</html>',
      text: 'Test plain text',
      scheduledAt,
    });

    expect(result.success).toBe(true);
    expect(result.scheduledId).toBe('scheduled-1');
  });

  test('cancelScheduledEmail should call Brevo API', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );

    const result = await cancelScheduledEmail('scheduled-1');

    expect(result.success).toBe(true);
  });
});

describe('Email Workflow Integration', () => {
  test('complete email workflow should work end-to-end', async () => {
    // This test simulates the complete workflow:
    // 1. Generate email
    // 2. Validate email
    // 3. Save draft
    // 4. Approve email
    // 5. Send email

    const emailData = {
      subject: 'Test Subject',
      greeting: 'Hello',
      headline: 'Test Headline',
      opening: 'Test opening',
      solution: 'Test solution',
      benefits: ['Benefit 1'],
      primaryCta: { label: 'Click Here', url: 'https://example.com' },
      closing: 'Best regards',
      signature: 'John Doe',
      complianceFooter: 'Compliance text',
      unsubscribeText: 'Unsubscribe',
      html: '<html>Test</html>',
      plainText: 'Test plain text',
    };

    // Validate
    const validation = validateEmail(emailData, { productName: 'Test Product' });
    expect(validation.valid).toBe(true);

    // Generate HTML
    const html = generateEmailHtmlTemplate(emailData);
    expect(html).toContain('Test Headline');

    // Generate plain text
    const plainText = generatePlainTextFromEmailData(emailData);
    expect(plainText).toContain('Test Subject');

    // Mock save
    const { prisma } = await import('../config/prisma.js');
    prisma.emailTemplate.findFirst.mockResolvedValue(null);
    prisma.emailTemplate.create.mockResolvedValue({
      id: 'template-1',
      approvalStatus: 'DRAFT',
    });

    const saveResult = await saveEmailDraft('user-1', 'chat-1', {
      ...emailData,
      html,
      plainText,
    });
    expect(saveResult.success).toBe(true);

    // Mock approve
    prisma.emailTemplate.findFirst.mockResolvedValue({
      id: 'template-1',
      approvalStatus: 'DRAFT',
    });
    prisma.emailTemplate.update.mockResolvedValue({
      id: 'template-1',
      approvalStatus: 'APPROVED',
    });

    const approveResult = await approveEmailTemplate('template-1', 'user-1');
    expect(approveResult.success).toBe(true);
  });

  test('email workflow should handle validation errors', async () => {
    const invalidEmailData = {
      subject: '',
      greeting: '',
    };

    const validation = validateEmail(invalidEmailData, {});

    expect(validation.valid).toBe(false);
    expect(validation.blockingIssues.length).toBeGreaterThan(0);
    expect(validation.score).toBeLessThan(0.5);
  });
});

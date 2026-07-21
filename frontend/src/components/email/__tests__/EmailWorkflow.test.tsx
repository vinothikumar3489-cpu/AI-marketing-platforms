/**
 * Email Workflow Frontend Tests
 * Tests for email components and workflow integration
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmailWorkflow } from '../EmailWorkflow';
import { EmailConfiguration } from '../EmailConfiguration';
import { RecipientEntry } from '../RecipientEntry';
import { EmailEditor } from '../EmailEditor';
import { EmailRenderer } from '../EmailRenderer';
import { PersonalizationPreview } from '../PersonalizationPreview';
import { QualityCheck } from '../QualityCheck';
import { ApprovalFlow } from '../ApprovalFlow';
import { SendTest } from '../SendTest';
import { SendSchedule } from '../SendSchedule';
import { DeliveryStatus } from '../DeliveryStatus';

// Mock the ProjectContext
jest.mock('../../context/ProjectContext', () => ({
  useProject: () => ({
    selectedChatId: 'test-chat-id',
  }),
}));

// Mock the API
jest.mock('../../lib/api', () => ({
  generateEmailContent: jest.fn(),
  validateEmailContent: jest.fn(),
  saveEmailDraft: jest.fn(),
  updateEmailTemplate: jest.fn(),
  approveEmailTemplate: jest.fn(),
  rejectEmailTemplate: jest.fn(),
  sendTestEmailContent: jest.fn(),
  sendEmailNow: jest.fn(),
  scheduleEmailContent: jest.fn(),
  cancelScheduledEmail: jest.fn(),
  getEmailDeliveryStatus: jest.fn(),
  generateEmailHtml: jest.fn(),
  generateEmailPlainText: jest.fn(),
}));

describe('EmailConfiguration Component', () => {
  test('should render configuration form', () => {
    const mockConfig = {
      emailType: 'Product Announcement',
      goal: 'Product Adoption',
      tone: 'Professional',
      audience: 'Marketing Managers',
      language: 'en',
      sender: {
        name: 'John Doe',
        email: 'john@example.com',
        replyTo: 'reply@example.com',
      },
    };

    const { getByText, getByLabelText } = render(
      <EmailConfiguration config={mockConfig} onChange={jest.fn()} />
    );

    expect(getByText('Email Configuration')).toBeInTheDocument();
    expect(getByText('Product Announcement')).toBeInTheDocument();
    expect(getByText('Professional')).toBeInTheDocument();
  });

  test('should call onChange when email type is changed', () => {
    const mockOnChange = jest.fn();
    const mockConfig = {
      emailType: 'Product Announcement',
      goal: 'Product Adoption',
      tone: 'Professional',
    };

    const { getByLabelText } = render(
      <EmailConfiguration config={mockConfig} onChange={mockOnChange} />
    );

    const select = getByLabelText('Email Type');
    fireEvent.change(select, { target: { value: 'Newsletter' } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  test('should show advanced settings when toggled', () => {
    const mockConfig = {
      emailType: 'Product Announcement',
      goal: 'Product Adoption',
      tone: 'Professional',
    };

    const { getByText, queryByText } = render(
      <EmailConfiguration config={mockConfig} onChange={jest.fn()} />
    );

    expect(queryByText('Sender Information')).not.toBeInTheDocument();

    fireEvent.click(getByText('Show Advanced'));

    expect(getByText('Sender Information')).toBeInTheDocument();
  });
});

describe('RecipientEntry Component', () => {
  test('should render recipient form', () => {
    const mockRecipient = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Acme Inc',
    };

    const { getByLabelText } = render(
      <RecipientEntry recipient={mockRecipient} onChange={jest.fn()} />
    );

    expect(getByLabelText('Email Address *')).toHaveValue('test@example.com');
    expect(getByLabelText('First Name')).toHaveValue('John');
  });

  test('should validate email format', () => {
    const mockRecipient = { email: 'invalid-email' };
    const mockOnChange = jest.fn();
    const mockOnValidate = jest.fn(() => ({
      valid: false,
      errors: ['Invalid email format'],
    }));

    const { getByLabelText } = render(
      <RecipientEntry
        recipient={mockRecipient}
        onChange={mockOnChange}
        onValidate={mockOnValidate}
      />
    );

    const input = getByLabelText('Email Address *');
    fireEvent.change(input, { target: { value: 'invalid-email' } });
    fireEvent.blur(input);

    expect(mockOnValidate).toHaveBeenCalled();
  });

  test('should show personalization variables when recipient data exists', () => {
    const mockRecipient = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Acme Inc',
    };

    const { getByText } = render(
      <RecipientEntry recipient={mockRecipient} onChange={jest.fn()} />
    );

    fireEvent.blur(getByLabelText('Email Address *'));

    expect(getByText('Available Personalization Variables:')).toBeInTheDocument();
    expect(getByText('{{firstName}} → John')).toBeInTheDocument();
  });
});

describe('EmailEditor Component', () => {
  test('should render email content fields', () => {
    const mockEmailData = {
      subject: 'Test Subject',
      greeting: 'Hello',
      headline: 'Test Headline',
      opening: 'Test opening',
    };

    const { getByLabelText } = render(
      <EmailEditor emailData={mockEmailData} onChange={jest.fn()} />
    );

    expect(getByLabelText('Subject Line')).toHaveValue('Test Subject');
    expect(getByLabelText('Greeting')).toHaveValue('Hello');
  });

  test('should enable inline editing when field is clicked', () => {
    const mockEmailData = { subject: 'Test Subject' };
    const mockOnChange = jest.fn();

    const { getByLabelText, getByText } = render(
      <EmailEditor emailData={mockEmailData} onChange={mockOnChange} />
    );

    fireEvent.click(getByLabelText('Subject Line'));

    expect(getByText('Save')).toBeInTheDocument();
  });

  test('should show character count for fields with maxLength', () => {
    const mockEmailData = { subject: 'Test Subject' };

    const { getByText } = render(
      <EmailEditor emailData={mockEmailData} onChange={jest.fn()} />
    );

    expect(getByText('12/70')).toBeInTheDocument();
  });
});

describe('EmailRenderer Component', () => {
  test('should render email preview tabs', () => {
    const mockProps = {
      html: '<html><body>Test Email</body></html>',
      plainText: 'Test plain text',
      subject: 'Test Subject',
    };

    const { getByText } = render(<EmailRenderer {...mockProps} />);

    expect(getByText('Visual')).toBeInTheDocument();
    expect(getByText('HTML')).toBeInTheDocument();
    expect(getByText('Plain Text')).toBeInTheDocument();
    expect(getByText('Mobile')).toBeInTheDocument();
  });

  test('should switch between preview tabs', () => {
    const mockProps = {
      html: '<html><body>Test Email</body></html>',
      plainText: 'Test plain text',
      subject: 'Test Subject',
    };

    const { getByText, queryByText } = render(<EmailRenderer {...mockProps} />);

    fireEvent.click(getByText('HTML'));

    expect(queryByText('Test plain text')).toBeInTheDocument();
  });

  test('should copy HTML to clipboard', async () => {
    const mockProps = {
      html: '<html><body>Test Email</body></html>',
      plainText: 'Test plain text',
      subject: 'Test Subject',
    };

    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(''),
      },
    });

    const { getByText } = render(<EmailRenderer {...mockProps} />);

    fireEvent.click(getByText('HTML'));
    fireEvent.click(getByText('Copy'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockProps.html);
    });
  });
});

describe('PersonalizationPreview Component', () => {
  test('should show personalized content when recipient data exists', () => {
    const mockProps = {
      emailContent: {
        greeting: 'Hello {{firstName}}',
        subject: 'Welcome {{firstName}}',
      },
      recipient: {
        firstName: 'John',
        lastName: 'Doe',
      },
      sender: 'Company',
      productName: 'Product',
    };

    const { getByText } = render(<PersonalizationPreview {...mockProps} />);

    expect(getByText('Hello John')).toBeInTheDocument();
    expect(getByText('Welcome John')).toBeInTheDocument();
  });

  test('should show variable count', () => {
    const mockProps = {
      emailContent: {
        greeting: 'Hello {{firstName}}',
        subject: 'Welcome {{firstName}}',
      },
      recipient: { firstName: 'John' },
    };

    const { getByText } = render(<PersonalizationPreview {...mockProps} />);

    expect(getByText('2 variables')).toBeInTheDocument();
  });

  test('should copy personalized content', async () => {
    const mockProps = {
      emailContent: {
        greeting: 'Hello {{firstName}}',
        subject: 'Welcome {{firstName}}',
      },
      recipient: { firstName: 'John' },
    };

    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(''),
      },
    });

    const { getByText } = render(<PersonalizationPreview {...mockProps} />);

    fireEvent.click(getByText('Copy'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});

describe('QualityCheck Component', () => {
  test('should show validation results', () => {
    const mockValidation = {
      valid: true,
      score: 0.85,
      blockingIssues: [],
      warnings: [],
      checks: {
        subjectQuality: { status: 'passed', message: 'Subject is good' },
        ctaClarity: { status: 'passed', message: 'CTA is clear' },
      },
    };

    const { getByText } = render(<QualityCheck validation={mockValidation} />);

    expect(getByText('85% - Excellent')).toBeInTheDocument();
    expect(getByText('Subject is good')).toBeInTheDocument();
  });

  test('should show blocking issues', () => {
    const mockValidation = {
      valid: false,
      blockingIssues: ['Subject is missing'],
      warnings: [],
      checks: {},
    };

    const { getByText } = render(<QualityCheck validation={mockValidation} />);

    expect(getByText('Subject is missing')).toBeInTheDocument();
  });

  test('should expand/collapse details', () => {
    const mockValidation = {
      valid: true,
      score: 0.85,
      blockingIssues: [],
      warnings: [],
      checks: {},
    };

    const { getByRole } = render(<QualityCheck validation={mockValidation} />);

    const button = getByRole('button');
    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded');
  });
});

describe('ApprovalFlow Component', () => {
  test('should show approval status badge', () => {
    const { getByText } = render(
      <ApprovalFlow emailData={{}} approvalStatus='DRAFT' />
    );

    expect(getByText('Draft')).toBeInTheDocument();
  });

  test('should call onApprove when approve button is clicked', async () => {
    const mockOnApprove = jest.fn().mockResolvedValue(undefined);

    const { getByText } = render(
      <ApprovalFlow
        emailData={{}}
        approvalStatus='DRAFT'
        onApprove={mockOnApprove}
        canApprove={true}
      />
    );

    fireEvent.click(getByText('Approve'));

    await waitFor(() => {
      expect(mockOnApprove).toHaveBeenCalled();
    });
  });

  test('should show reject dialog when reject button is clicked', () => {
    const { getByText, queryByText } = render(
      <ApprovalFlow
        emailData={{}}
        approvalStatus='DRAFT'
        onReject={jest.fn()}
      />
    );

    fireEvent.click(getByText('Reject'));

    expect(queryByText('Reject Email')).toBeInTheDocument();
  });
});

describe('SendTest Component', () => {
  test('should validate email before sending', () => {
    const { getByLabelText, getByText } = render(
      <SendTest onSendTest={jest.fn()} />
    );

    const input = getByLabelText('Test Recipient Email');
    fireEvent.change(input, { target: { value: 'invalid-email' } });

    expect(getByText('Please enter a valid email address')).toBeInTheDocument();
  });

  test('should call onSendTest with valid email', async () => {
    const mockOnSendTest = jest.fn().mockResolvedValue(undefined);

    const { getByLabelText, getByText } = render(
      <SendTest onSendTest={mockOnSendTest} canSend={true} />
    );

    const input = getByLabelText('Test Recipient Email');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    fireEvent.click(getByText('Send Test Email'));

    await waitFor(() => {
      expect(mockOnSendTest).toHaveBeenCalledWith('test@example.com');
    });
  });
});

describe('SendSchedule Component', () => {
  test('should toggle between send now and schedule modes', () => {
    const { getByText } = render(
      <SendSchedule onSendNow={jest.fn()} onSchedule={jest.fn()} />
    );

    expect(getByText('Send Now')).toBeInTheDocument();

    fireEvent.click(getByText('Schedule'));

    expect(getByText('Schedule Email')).toBeInTheDocument();
  });

  test('should validate schedule date is in future', () => {
    const { getByLabelText, getByText } = render(
      <SendSchedule onSchedule={jest.fn()} />
    );

    fireEvent.click(getByText('Schedule'));

    const dateInput = getByLabelText('Date');
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    fireEvent.change(dateInput, { target: { value: pastDate.toISOString().split('T')[0] } });

    expect(getByText('Schedule time must be in the future')).toBeInTheDocument();
  });
});

describe('DeliveryStatus Component', () => {
  test('should show delivery statistics', () => {
    const mockProps = {
      templateId: 'template-1',
      onRefresh: jest.fn(),
    };

    // Mock delivery data would be loaded from API
    const { getByText } = render(<DeliveryStatus {...mockProps} />);

    expect(getByText('Delivery Status')).toBeInTheDocument();
  });

  test('should call onRefresh when refresh button is clicked', () => {
    const mockOnRefresh = jest.fn();

    const { getByRole } = render(
      <DeliveryStatus templateId='template-1' onRefresh={mockOnRefresh} />
    );

    const button = getByRole('button');
    fireEvent.click(button);

    expect(mockOnRefresh).toHaveBeenCalled();
  });
});

describe('EmailWorkflow Integration', () => {
  test('should render complete email workflow', () => {
    const { getByText } = render(<EmailWorkflow />);

    expect(getByText('Email Configuration')).toBeInTheDocument();
    expect(getByText('Recipient Information')).toBeInTheDocument();
  });

  test('should generate email when generate button is clicked', async () => {
    const { generateEmailContent } = await import('../../lib/api');
    (generateEmailContent as jest.Mock).mockResolvedValue({
      success: true,
      email: {
        subject: 'Generated Subject',
        greeting: 'Hello',
      },
    });

    const { getByText } = render(<EmailWorkflow />);

    fireEvent.click(getByText('Generate Email'));

    await waitFor(() => {
      expect(generateEmailContent).toHaveBeenCalled();
    });
  });
});

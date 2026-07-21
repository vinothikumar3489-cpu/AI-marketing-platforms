/**
 * Email Copy Stable DTO
 * PART 4: Stable data transfer object for email_copy generation
 * Enhanced for Content Studio Email Workflow
 */

/**
 * Email Copy DTO Schema
 * Stable structure for email generation with strict word count limits
 */
export const EMAIL_COPY_DTO_SCHEMA = {
  // Email Configuration
  emailType: {
    type: 'string',
    enum: ['Product Announcement', 'Promotional Email', 'Welcome Email', 'Follow-up Email', 'Lead Nurture Email', 'Event Invitation', 'Newsletter', 'Final CTA', 'Re-engagement Email'],
    required: true,
    description: 'Type of email being generated'
  },
  goal: {
    type: 'string',
    required: true,
    description: 'Email goal (e.g., Product Adoption, Brand Awareness, Lead Generation)'
  },
  tone: {
    type: 'string',
    required: true,
    description: 'Email tone (e.g., Professional, Friendly, Urgent)'
  },
  audience: {
    type: 'string',
    required: true,
    description: 'Target audience or persona'
  },
  language: {
    type: 'string',
    required: false,
    default: 'en',
    description: 'Email language'
  },

  // Sender Information
  sender: {
    type: 'object',
    properties: {
      name: { type: 'string', required: true },
      email: { type: 'string', required: true },
      replyTo: { type: 'string', required: false }
    },
    required: true,
    description: 'Sender information'
  },

  // Recipient Information
  recipient: {
    type: 'object',
    properties: {
      email: { type: 'string', required: true },
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      companyName: { type: 'string', required: false }
    },
    required: false,
    description: 'Recipient information for personalization'
  },

  // Email Content
  subject: {
    type: 'string',
    maxLength: 70,
    required: true,
    description: 'Compelling subject line including product name'
  },
  subjectAlternatives: {
    type: 'array',
    items: { type: 'string' },
    required: false,
    description: 'Alternative subject lines for A/B testing'
  },
  previewText: {
    type: 'string',
    maxLength: 150,
    required: true,
    description: 'Compelling preview text'
  },
  greeting: {
    type: 'string',
    required: true,
    description: 'Professional greeting with personalization placeholder'
  },
  headline: {
    type: 'string',
    required: true,
    description: 'Main headline or hook'
  },
  opening: {
    type: 'string',
    required: true,
    description: 'Strong opening paragraph addressing pain point'
  },
  painPoint: {
    type: 'string',
    required: true,
    description: '1-2 sentences describing the specific problem'
  },
  solution: {
    type: 'string',
    required: true,
    description: '2-3 sentences on how product solves the problem'
  },
  benefits: {
    type: 'array',
    items: { type: 'string' },
    minItems: 3,
    maxItems: 5,
    required: true,
    description: 'Array of 3-5 key benefits'
  },
  bodyParagraphs: {
    type: 'array',
    items: { type: 'string' },
    minItems: 2,
    maxItems: 4,
    required: true,
    description: 'Array of 2-4 paragraphs that form the email body'
  },
  socialProof: {
    type: 'string',
    required: false,
    description: 'Social proof or testimonials'
  },
  primaryCta: {
    type: 'object',
    properties: {
      label: { type: 'string', required: true },
      url: { type: 'string', required: true }
    },
    required: true,
    description: 'Primary CTA object with label and url'
  },
  secondaryCta: {
    type: 'object',
    properties: {
      label: { type: 'string', required: false },
      url: { type: 'string', required: false }
    },
    required: false,
    description: 'Secondary CTA object'
  },
  closing: {
    type: 'string',
    required: true,
    description: 'Warm closing paragraph'
  },
  signature: {
    type: 'string',
    required: true,
    description: 'Sender signature with company name'
  },
  postscript: {
    type: 'string',
    required: false,
    description: 'Optional P.S. line reinforcing key benefit'
  },
  complianceFooter: {
    type: 'string',
    required: true,
    description: 'Compliance footer with legal information'
  },
  unsubscribeText: {
    type: 'string',
    required: true,
    description: 'Unsubscribe text and link'
  },

  // Generated Content
  html: {
    type: 'string',
    required: true,
    description: 'Responsive HTML version of the email (inline styles)'
  },
  plainText: {
    type: 'string',
    required: true,
    description: 'Plain text version of the email'
  },

  // Evidence and Quality
  evidenceUsed: {
    type: 'array',
    items: { type: 'string' },
    required: false,
    description: 'Array of evidence points referenced from context'
  },
  quality: {
    type: 'object',
    required: false,
    description: 'Quality check results'
  },

  // Status
  approvalStatus: {
    type: 'string',
    enum: ['DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED'],
    required: false,
    default: 'DRAFT',
    description: 'Email approval status'
  },
  deliveryStatus: {
    type: 'string',
    required: false,
    description: 'Email delivery status'
  }
};

/**
 * Word count limits by email type
 */
export const EMAIL_WORD_COUNT_LIMITS = {
  'Product Announcement': { min: 250, max: 500 },
  'Promotional Email': { min: 180, max: 350 },
  'Welcome Email': { min: 150, max: 300 },
  'Follow-up Email': { min: 120, max: 250 },
  'Lead Nurture Email': { min: 200, max: 450 },
  'Event Invitation': { min: 150, max: 300 },
  'Newsletter': { min: 350, max: 700 },
  'Final CTA': { min: 100, max: 220 },
  'Re-engagement Email': { min: 150, max: 300 }
};

/**
 * Personalization variables supported in email templates
 */
export const PERSONALIZATION_VARIABLES = [
  '{{firstName}}',
  '{{lastName}}',
  '{{companyName}}',
  '{{productName}}',
  '{{senderName}}'
];

/**
 * Validate email copy DTO against schema
 */
export function validateEmailCopyDTO(data) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!data.subject || typeof data.subject !== 'string') {
    errors.push('subject is required and must be a string');
  } else if (data.subject.length > 70) {
    errors.push('subject must be max 70 characters');
  }

  if (!data.previewText || typeof data.previewText !== 'string') {
    errors.push('previewText is required and must be a string');
  } else if (data.previewText.length > 150) {
    errors.push('previewText must be max 150 characters');
  }

  if (!data.emailType || !EMAIL_WORD_COUNT_LIMITS[data.emailType]) {
    errors.push(`emailType must be one of: ${Object.keys(EMAIL_WORD_COUNT_LIMITS).join(', ')}`);
  }

  if (!Array.isArray(data.benefits) || data.benefits.length < 3 || data.benefits.length > 5) {
    errors.push('benefits must be an array with 3-5 items');
  }

  if (!Array.isArray(data.bodyParagraphs) || data.bodyParagraphs.length < 2 || data.bodyParagraphs.length > 4) {
    errors.push('bodyParagraphs must be an array with 2-4 items');
  }

  if (!data.primaryCta || typeof data.primaryCta !== 'object' || !data.primaryCta.label) {
    errors.push('primaryCta is required and must have a label');
  }

  if (!data.primaryCta || !data.primaryCta.url) {
    warnings.push('primaryCta.url is recommended');
  }

  // Check word count
  const wordCount = countWords(data);
  const limits = EMAIL_WORD_COUNT_LIMITS[data.emailType] || { min: 200, max: 500 };
  if (wordCount < limits.min || wordCount > limits.max) {
    errors.push(`word count must be between ${limits.min} and ${limits.max} (actual: ${wordCount})`);
  }

  // Check personalization placeholders
  const unresolvedPlaceholders = checkUnresolvedPlaceholders(data);
  if (unresolvedPlaceholders.length > 0) {
    warnings.push(`Unresolved personalization placeholders: ${unresolvedPlaceholders.join(', ')}`);
  }

  // Check required email fields
  if (!data.html) {
    errors.push('html content is required');
  }

  if (!data.plainText) {
    errors.push('plainText content is required');
  }

  if (!data.unsubscribeText) {
    errors.push('unsubscribeText is required');
  }

  if (!data.complianceFooter) {
    errors.push('complianceFooter is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Count words in email copy
 */
function countWords(data) {
  const text = [
    data.subject,
    data.previewText,
    data.greeting,
    data.headline,
    data.opening,
    data.painPoint,
    data.solution,
    data.benefits?.join(' '),
    data.bodyParagraphs?.join(' '),
    data.socialProof,
    data.closing,
    data.signature,
    data.postscript
  ].filter(Boolean).join(' ');

  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Check for unresolved personalization placeholders
 */
function checkUnresolvedPlaceholders(data) {
  const text = [
    data.subject,
    data.previewText,
    data.greeting,
    data.headline,
    data.opening,
    data.bodyParagraphs?.join(' '),
    data.closing,
    data.signature
  ].filter(Boolean).join(' ');

  const unresolved = [];
  PERSONALIZATION_VARIABLES.forEach(variable => {
    if (text.includes(variable)) {
      unresolved.push(variable);
    }
  });

  return unresolved;
}

/**
 * Replace personalization variables with actual values
 */
export function replacePersonalizationVariables(content, recipient, sender, productName) {
  let replaced = content;

  if (recipient) {
    replaced = replaced.replace(/\{\{firstName\}\}/g, recipient.firstName || '');
    replaced = replaced.replace(/\{\{lastName\}\}/g, recipient.lastName || '');
    replaced = replaced.replace(/\{\{companyName\}\}/g, recipient.companyName || '');
  }

  if (sender) {
    replaced = replaced.replace(/\{\{senderName\}\}/g, sender.name || '');
  }

  if (productName) {
    replaced = replaced.replace(/\{\{productName\}\}/g, productName);
  }

  return replaced;
}

/**
 * Create empty email copy DTO template
 */
export function createEmptyEmailCopyDTO(emailType = 'Product Announcement') {
  return {
    contentType: 'email_copy',
    emailType,
    goal: '',
    tone: 'Professional',
    audience: '',
    language: 'en',
    sender: {
      name: '',
      email: '',
      replyTo: ''
    },
    recipient: {
      email: '',
      firstName: '',
      lastName: '',
      companyName: ''
    },
    subject: '',
    subjectAlternatives: [],
    previewText: '',
    greeting: '',
    headline: '',
    opening: '',
    painPoint: '',
    solution: '',
    benefits: [],
    bodyParagraphs: [],
    socialProof: '',
    primaryCta: {
      label: '',
      url: ''
    },
    secondaryCta: null,
    closing: '',
    signature: '',
    postscript: '',
    complianceFooter: '',
    unsubscribeText: '',
    html: '',
    plainText: '',
    evidenceUsed: [],
    quality: null,
    approvalStatus: 'DRAFT',
    deliveryStatus: null
  };
}

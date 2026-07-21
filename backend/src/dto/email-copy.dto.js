/**
 * Email Copy Stable DTO
 * PART 4: Stable data transfer object for email_copy generation
 */

/**
 * Email Copy DTO Schema
 * Stable structure for email generation with strict word count limits
 */
export const EMAIL_COPY_DTO_SCHEMA = {
  subject: {
    type: 'string',
    maxLength: 70,
    required: true,
    description: 'Compelling subject line including product name'
  },
  previewText: {
    type: 'string',
    maxLength: 150,
    required: true,
    description: 'Compelling preview text'
  },
  emailType: {
    type: 'string',
    enum: ['promotional', 'newsletter', 'product_announcement', 'nurture'],
    required: true,
    description: 'Type of email being generated'
  },
  greeting: {
    type: 'string',
    required: true,
    description: 'Professional greeting with personalization placeholder'
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
  evidence: {
    type: 'array',
    items: { type: 'string' },
    required: true,
    description: 'Array of evidence points referenced from context'
  },
  cta: {
    type: 'object',
    properties: {
      label: { type: 'string', required: true },
      url: { type: 'string', nullable: true }
    },
    required: true,
    description: 'CTA object with label and url (null if not available)'
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
  footer: {
    type: 'string',
    required: true,
    description: 'Professional footer with company info and copyright'
  },
  postscript: {
    type: 'string',
    required: false,
    description: 'Optional P.S. line reinforcing key benefit'
  },
  bodyParagraphs: {
    type: 'array',
    items: { type: 'string' },
    minItems: 2,
    maxItems: 3,
    required: true,
    description: 'Array of 2-3 paragraphs that form the email body'
  },
  html: {
    type: 'string',
    required: true,
    description: 'Basic HTML version of the email (inline styles)'
  },
  plainText: {
    type: 'string',
    required: true,
    description: 'Plain text version of the email'
  }
};

/**
 * Word count limits by email type
 */
export const EMAIL_WORD_COUNT_LIMITS = {
  promotional: { min: 180, max: 350 },
  newsletter: { min: 350, max: 700 },
  product_announcement: { min: 250, max: 500 },
  nurture: { min: 200, max: 450 }
};

/**
 * Validate email copy DTO against schema
 */
export function validateEmailCopyDTO(data) {
  const errors = [];

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

  if (!Array.isArray(data.bodyParagraphs) || data.bodyParagraphs.length < 2 || data.bodyParagraphs.length > 3) {
    errors.push('bodyParagraphs must be an array with 2-3 items');
  }

  if (!data.cta || typeof data.cta !== 'object' || !data.cta.label) {
    errors.push('cta is required and must have a label');
  }

  // Check word count
  const wordCount = countWords(data);
  const limits = EMAIL_WORD_COUNT_LIMITS[data.emailType] || { min: 200, max: 500 };
  if (wordCount < limits.min || wordCount > limits.max) {
    errors.push(`word count must be between ${limits.min} and ${limits.max} (actual: ${wordCount})`);
  }

  return {
    valid: errors.length === 0,
    errors
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
    data.opening,
    data.painPoint,
    data.solution,
    data.benefits?.join(' '),
    data.evidence?.join(' '),
    data.closing,
    data.signature,
    data.footer,
    data.postscript,
    data.bodyParagraphs?.join(' ')
  ].filter(Boolean).join(' ');

  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Create empty email copy DTO template
 */
export function createEmptyEmailCopyDTO(emailType = 'promotional') {
  return {
    subject: '',
    previewText: '',
    emailType,
    greeting: '',
    opening: '',
    painPoint: '',
    solution: '',
    benefits: [],
    evidence: [],
    cta: { label: '', url: null },
    closing: '',
    signature: '',
    footer: '',
    postscript: '',
    bodyParagraphs: [],
    html: '',
    plainText: ''
  };
}

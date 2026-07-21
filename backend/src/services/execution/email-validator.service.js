/**
 * Email Validator Service
 * Comprehensive email validation for Content Studio Email Workflow
 */

import { validateEmailCopyDTO, PERSONALIZATION_VARIABLES } from '../../dto/email-copy.dto.js';

/**
 * Email validation result structure
 */
const VALIDATION_RESULT = {
  valid: false,
  blockingIssues: [],
  warnings: [],
  score: 0,
  checks: {}
};

/**
 * Comprehensive email validation checks
 */
export function validateEmail(emailData, context = {}) {
  const result = { ...VALIDATION_RESULT };
  const { productName, companyName, productIntelligence, audienceIntelligence } = context;

  // 1. Product Specificity Check
  result.checks.productSpecificity = checkProductSpecificity(emailData, productName);
  
  // 2. Audience Relevance Check
  result.checks.audienceRelevance = checkAudienceRelevance(emailData, audienceIntelligence);
  
  // 3. CTA Clarity Check
  result.checks.ctaClarity = checkCtaClarity(emailData);
  
  // 4. Tone Consistency Check
  result.checks.toneConsistency = checkToneConsistency(emailData);
  
  // 5. Evidence Coverage Check
  result.checks.evidenceCoverage = checkEvidenceCoverage(emailData);
  
  // 6. Unsupported Claims Check
  result.checks.unsupportedClaims = checkUnsupportedClaims(emailData);
  
  // 7. Personalization Validity Check
  result.checks.personalizationValidity = checkPersonalizationValidity(emailData);
  
  // 8. Unresolved Placeholders Check
  result.checks.unresolvedPlaceholders = checkUnresolvedPlaceholders(emailData);
  
  // 9. Subject Quality Check
  result.checks.subjectQuality = checkSubjectQuality(emailData);
  
  // 10. Preview Text Quality Check
  result.checks.previewTextQuality = checkPreviewTextQuality(emailData);
  
  // 11. Readability Check
  result.checks.readability = checkReadability(emailData);
  
  // 12. Spam Risk Check
  result.checks.spamRisk = checkSpamRisk(emailData);
  
  // 13. Missing Unsubscribe Text Check
  result.checks.unsubscribeText = checkUnsubscribeText(emailData);
  
  // 14. Missing Sender Identity Check
  result.checks.senderIdentity = checkSenderIdentity(emailData);
  
  // 15. Missing Recipient Check
  result.checks.recipient = checkRecipient(emailData);
  
  // 16. Missing HTML Check
  result.checks.htmlContent = checkHtmlContent(emailData);
  
  // 17. Missing Plain Text Check
  result.checks.plainTextContent = checkPlainTextContent(emailData);
  
  // 18. Broken Links Check
  result.checks.brokenLinks = checkBrokenLinks(emailData);

  // Aggregate results
  result.blockingIssues = Object.values(result.checks)
    .filter(check => check.status === 'blocked')
    .map(check => check.message);
  
  result.warnings = Object.values(result.checks)
    .filter(check => check.status === 'warning')
    .map(check => check.message);

  result.valid = result.blockingIssues.length === 0;
  result.score = calculateValidationScore(result.checks);

  return result;
}

/**
 * Check 1: Product Specificity
 * Ensures email mentions the actual product name, not internal identifiers
 */
function checkProductSpecificity(emailData, productName) {
  const text = [
    emailData.subject,
    emailData.headline,
    emailData.opening,
    emailData.bodyParagraphs?.join(' '),
    emailData.closing
  ].filter(Boolean).join(' ').toLowerCase();

  if (!productName) {
    return {
      status: 'warning',
      message: 'Product name not available for specificity check',
      score: 50
    };
  }

  const productMentionCount = (text.match(new RegExp(productName.toLowerCase(), 'g')) || []).length;

  if (productMentionCount === 0) {
    return {
      status: 'blocked',
      message: 'Email does not mention the product name',
      score: 0
    };
  }

  if (productMentionCount >= 2) {
    return {
      status: 'passed',
      message: `Product mentioned ${productMentionCount} times`,
      score: 100
    };
  }

  return {
    status: 'warning',
    message: 'Product mentioned only once, consider adding more mentions',
    score: 70
  };
}

/**
 * Check 2: Audience Relevance
 * Ensures email content aligns with target audience
 */
function checkAudienceRelevance(emailData, audienceIntelligence) {
  if (!audienceIntelligence || !audienceIntelligence.personas || audienceIntelligence.personas.length === 0) {
    return {
      status: 'warning',
      message: 'Audience intelligence not available for relevance check',
      score: 50
    };
  }

  const audience = emailData.audience || '';
  const text = [
    emailData.opening,
    emailData.bodyParagraphs?.join(' ')
  ].filter(Boolean).join(' ').toLowerCase();

  // Check if email addresses audience pain points or interests
  const hasAudienceAlignment = audienceIntelligence.personas.some(persona => {
    const painPoints = persona.painPoints || [];
    const goals = persona.goals || [];
    
    const mentionsPainPoint = painPoints.some(pp => text.includes(pp.toLowerCase()));
    const mentionsGoal = goals.some(g => text.includes(g.toLowerCase()));
    
    return mentionsPainPoint || mentionsGoal;
  });

  if (hasAudienceAlignment) {
    return {
      status: 'passed',
      message: 'Email content aligns with audience pain points or goals',
      score: 100
    };
  }

  return {
    status: 'warning',
    message: 'Email may not address specific audience pain points or goals',
    score: 60
  };
}

/**
 * Check 3: CTA Clarity
 * Ensures CTA is clear, actionable, and has a valid URL
 */
function checkCtaClarity(emailData) {
  const cta = emailData.primaryCta;

  if (!cta || !cta.label) {
    return {
      status: 'blocked',
      message: 'Primary CTA is missing or has no label',
      score: 0
    };
  }

  if (!cta.url) {
    return {
      status: 'blocked',
      message: 'Primary CTA URL is missing',
      score: 0
    };
  }

  // Check if URL is valid
  try {
    new URL(cta.url);
  } catch (e) {
    return {
      status: 'blocked',
      message: 'Primary CTA URL is invalid',
      score: 0
    };
  }

  // Check CTA label clarity
  const actionWords = ['get', 'start', 'try', 'sign up', 'register', 'download', 'learn', 'discover', 'explore'];
  const hasActionWord = actionWords.some(word => cta.label.toLowerCase().includes(word));

  if (!hasActionWord) {
    return {
      status: 'warning',
      message: 'CTA label could be more action-oriented',
      score: 70
    };
  }

  return {
    status: 'passed',
    message: 'CTA is clear and actionable with valid URL',
    score: 100
  };
}

/**
 * Check 4: Tone Consistency
 * Ensures email tone matches the specified tone
 */
function checkToneConsistency(emailData) {
  const specifiedTone = emailData.tone?.toLowerCase() || 'professional';
  const text = [
    emailData.greeting,
    emailData.opening,
    emailData.bodyParagraphs?.join(' '),
    emailData.closing
  ].filter(Boolean).join(' ').toLowerCase();

  const toneIndicators = {
    professional: ['respectfully', 'regards', 'sincerely', 'professional', 'business'],
    friendly: ['hi', 'hello', 'thanks', 'cheers', 'great', 'awesome'],
    urgent: ['now', 'today', 'limited', 'deadline', 'urgent', 'immediately'],
    casual: ['hey', 'guys', 'cool', 'awesome', 'super']
  };

  const indicators = toneIndicators[specifiedTone] || toneIndicators.professional;
  const hasToneIndicators = indicators.some(indicator => text.includes(indicator));

  if (hasToneIndicators) {
    return {
      status: 'passed',
      message: `Email tone matches specified tone: ${specifiedTone}`,
      score: 100
    };
  }

  return {
    status: 'warning',
    message: `Email may not consistently reflect the specified tone: ${specifiedTone}`,
    score: 70
  };
}

/**
 * Check 5: Evidence Coverage
 * Ensures email uses evidence from intelligence data
 */
function checkEvidenceCoverage(emailData) {
  const evidenceUsed = emailData.evidenceUsed || [];

  if (evidenceUsed.length === 0) {
    return {
      status: 'warning',
      message: 'No evidence sources referenced in email',
      score: 50
    };
  }

  if (evidenceUsed.length >= 2) {
    return {
      status: 'passed',
      message: `Email references ${evidenceUsed.length} evidence sources`,
      score: 100
    };
  }

  return {
    status: 'warning',
    message: 'Email references only 1 evidence source, consider adding more',
    score: 70
  };
}

/**
 * Check 6: Unsupported Claims
 * Checks for percentage claims without evidence
 */
function checkUnsupportedClaims(emailData) {
  const text = [
    emailData.headline,
    emailData.bodyParagraphs?.join(' '),
    emailData.benefits?.join(' ')
  ].filter(Boolean).join(' ');

  // Look for percentage patterns
  const percentagePattern = /\d+%|percent|percentage/gi;
  const percentageMatches = text.match(percentagePattern) || [];

  if (percentageMatches.length === 0) {
    return {
      status: 'passed',
      message: 'No percentage claims found',
      score: 100
    };
  }

  // Check if evidence is provided for percentage claims
  const hasEvidence = emailData.evidenceUsed && emailData.evidenceUsed.length > 0;

  if (!hasEvidence && percentageMatches.length > 0) {
    return {
      status: 'blocked',
      message: 'Percentage claims found without supporting evidence',
      score: 0
    };
  }

  return {
    status: 'passed',
    message: 'Percentage claims have supporting evidence',
    score: 100
  };
}

/**
 * Check 7: Personalization Validity
 * Ensures personalization variables are used correctly
 */
function checkPersonalizationValidity(emailData) {
  const recipient = emailData.recipient;

  if (!recipient || !recipient.email) {
    return {
      status: 'warning',
      message: 'Recipient information not provided for personalization',
      score: 50
    };
  }

  // Check if email uses personalization variables
  const text = [
    emailData.subject,
    emailData.greeting,
    emailData.bodyParagraphs?.join(' ')
  ].filter(Boolean).join(' ');

  const hasPersonalization = PERSONALIZATION_VARIABLES.some(variable => text.includes(variable));

  if (!hasPersonalization) {
    return {
      status: 'warning',
      message: 'Email does not use personalization variables',
      score: 60
    };
  }

  return {
    status: 'passed',
    message: 'Email uses personalization variables correctly',
    score: 100
  };
}

/**
 * Check 8: Unresolved Placeholders
 * Blocks sending if personalization placeholders remain unresolved
 */
function checkUnresolvedPlaceholders(emailData) {
  const text = [
    emailData.subject,
    emailData.previewText,
    emailData.greeting,
    emailData.headline,
    emailData.opening,
    emailData.bodyParagraphs?.join(' '),
    emailData.closing,
    emailData.signature
  ].filter(Boolean).join(' ');

  const unresolved = [];
  PERSONALIZATION_VARIABLES.forEach(variable => {
    if (text.includes(variable)) {
      unresolved.push(variable);
    }
  });

  if (unresolved.length > 0) {
    return {
      status: 'blocked',
      message: `Unresolved personalization placeholders: ${unresolved.join(', ')}`,
      score: 0
    };
  }

  return {
    status: 'passed',
    message: 'No unresolved personalization placeholders',
    score: 100
  };
}

/**
 * Check 9: Subject Quality
 * Ensures subject line is compelling and within length limits
 */
function checkSubjectQuality(emailData) {
  const subject = emailData.subject;

  if (!subject) {
    return {
      status: 'blocked',
      message: 'Subject line is missing',
      score: 0
    };
  }

  if (subject.length > 70) {
    return {
      status: 'blocked',
      message: 'Subject line exceeds 70 character limit',
      score: 0
    };
  }

  if (subject.length < 10) {
    return {
      status: 'warning',
      message: 'Subject line is too short',
      score: 50
    };
  }

  // Check for compelling words
  const compellingWords = ['new', 'exclusive', 'limited', 'free', 'save', 'discover', 'unlock', 'get'];
  const hasCompellingWord = compellingWords.some(word => subject.toLowerCase().includes(word));

  if (hasCompellingWord) {
    return {
      status: 'passed',
      message: 'Subject line is compelling and within limits',
      score: 100
    };
  }

  return {
    status: 'warning',
    message: 'Subject line could be more compelling',
    score: 75
  };
}

/**
 * Check 10: Preview Text Quality
 * Ensures preview text is compelling and within limits
 */
function checkPreviewTextQuality(emailData) {
  const previewText = emailData.previewText;

  if (!previewText) {
    return {
      status: 'blocked',
      message: 'Preview text is missing',
      score: 0
    };
  }

  if (previewText.length > 150) {
    return {
      status: 'blocked',
      message: 'Preview text exceeds 150 character limit',
      score: 0
    };
  }

  if (previewText.length < 20) {
    return {
      status: 'warning',
      message: 'Preview text is too short',
      score: 50
    };
  }

  return {
    status: 'passed',
    message: 'Preview text is within limits and appropriate length',
    score: 100
  };
}

/**
 * Check 11: Readability
 * Checks email readability score
 */
function checkReadability(emailData) {
  const text = [
    emailData.opening,
    emailData.bodyParagraphs?.join(' ')
  ].filter(Boolean).join(' ');

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (words.length === 0 || sentences.length === 0) {
    return {
      status: 'warning',
      message: 'Cannot calculate readability score',
      score: 50
    };
  }

  const avgWordsPerSentence = words.length / sentences.length;

  // Ideal: 15-20 words per sentence
  if (avgWordsPerSentence > 25) {
    return {
      status: 'warning',
      message: `Average sentence length is ${avgWordsPerSentence.toFixed(1)} words (recommended: 15-20)`,
      score: 60
    };
  }

  return {
    status: 'passed',
    message: `Average sentence length is ${avgWordsPerSentence.toFixed(1)} words`,
    score: 100
  };
}

/**
 * Check 12: Spam Risk
 * Checks for spam-triggering phrases
 */
function checkSpamRisk(emailData) {
  const spamPhrases = [
    'free money', 'guaranteed', 'no obligation', 'risk-free', 'click here',
    'act now', 'limited time only', 'winner', 'congratulations', 'you have been selected'
  ];

  const text = [
    emailData.subject,
    emailData.bodyParagraphs?.join(' ')
  ].filter(Boolean).join(' ').toLowerCase();

  const foundSpamPhrases = spamPhrases.filter(phrase => text.includes(phrase));

  if (foundSpamPhrases.length > 2) {
    return {
      status: 'warning',
      message: `Email contains ${foundSpamPhrases.length} spam-triggering phrases: ${foundSpamPhrases.join(', ')}`,
      score: 40
    };
  }

  if (foundSpamPhrases.length > 0) {
    return {
      status: 'warning',
      message: `Email contains spam-triggering phrase: ${foundSpamPhrases[0]}`,
      score: 70
    };
  }

  return {
    status: 'passed',
    message: 'No spam-triggering phrases detected',
    score: 100
  };
}

/**
 * Check 13: Missing Unsubscribe Text
 * Ensures unsubscribe text is present
 */
function checkUnsubscribeText(emailData) {
  if (!emailData.unsubscribeText) {
    return {
      status: 'blocked',
      message: 'Unsubscribe text is missing (required for compliance)',
      score: 0
    };
  }

  return {
    status: 'passed',
    message: 'Unsubscribe text is present',
    score: 100
  };
}

/**
 * Check 14: Missing Sender Identity
 * Ensures sender information is complete
 */
function checkSenderIdentity(emailData) {
  const sender = emailData.sender;

  if (!sender || !sender.name || !sender.email) {
    return {
      status: 'blocked',
      message: 'Sender name or email is missing',
      score: 0
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sender.email)) {
    return {
      status: 'blocked',
      message: 'Sender email format is invalid',
      score: 0
    };
  }

  return {
    status: 'passed',
    message: 'Sender identity is complete and valid',
    score: 100
  };
}

/**
 * Check 15: Missing Recipient
 * Ensures recipient email is present for sending
 */
function checkRecipient(emailData) {
  const recipient = emailData.recipient;

  if (!recipient || !recipient.email) {
    return {
      status: 'blocked',
      message: 'Recipient email is missing',
      score: 0
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipient.email)) {
    return {
      status: 'blocked',
      message: 'Recipient email format is invalid',
      score: 0
    };
  }

  return {
    status: 'passed',
    message: 'Recipient email is present and valid',
    score: 100
  };
}

/**
 * Check 16: Missing HTML
 * Ensures HTML content is present
 */
function checkHtmlContent(emailData) {
  if (!emailData.html) {
    return {
      status: 'blocked',
      message: 'HTML content is missing',
      score: 0
    };
  }

  if (emailData.html.length < 50) {
    return {
      status: 'blocked',
      message: 'HTML content is too short',
      score: 0
    };
  }

  return {
    status: 'passed',
    message: 'HTML content is present',
    score: 100
  };
}

/**
 * Check 17: Missing Plain Text
 * Ensures plain text content is present
 */
function checkPlainTextContent(emailData) {
  if (!emailData.plainText) {
    return {
      status: 'blocked',
      message: 'Plain text content is missing',
      score: 0
    };
  }

  if (emailData.plainText.length < 20) {
    return {
      status: 'blocked',
      message: 'Plain text content is too short',
      score: 0
    };
  }

  return {
    status: 'passed',
    message: 'Plain text content is present',
    score: 100
  };
}

/**
 * Check 18: Broken Links
 * Checks for broken or invalid links
 */
function checkBrokenLinks(emailData) {
  const links = [];

  // Extract links from CTA
  if (emailData.primaryCta?.url) {
    links.push(emailData.primaryCta.url);
  }
  if (emailData.secondaryCta?.url) {
    links.push(emailData.secondaryCta.url);
  }

  // Extract links from body
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const bodyText = emailData.bodyParagraphs?.join(' ') || '';
  const bodyLinks = bodyText.match(urlPattern) || [];
  links.push(...bodyLinks);

  if (links.length === 0) {
    return {
      status: 'warning',
      message: 'No links found in email',
      score: 80
    };
  }

  // Validate each link
  const invalidLinks = links.filter(link => {
    try {
      new URL(link);
      return false;
    } catch (e) {
      return true;
    }
  });

  if (invalidLinks.length > 0) {
    return {
      status: 'blocked',
      message: `Invalid links found: ${invalidLinks.join(', ')}`,
      score: 0
    };
  }

  return {
    status: 'passed',
    message: `All ${links.length} links are valid`,
    score: 100
  };
}

/**
 * Calculate overall validation score
 */
function calculateValidationScore(checks) {
  const checkValues = Object.values(checks).map(check => check.score || 0);
  const totalScore = checkValues.reduce((sum, score) => sum + score, 0);
  const avgScore = Math.round(totalScore / checkValues.length);
  return avgScore;
}

/**
 * Quick validation for blocking issues only (used before sending)
 */
export function validateForSending(emailData) {
  const fullValidation = validateEmail(emailData);
  
  return {
    canSend: fullValidation.valid,
    blockingIssues: fullValidation.blockingIssues,
    score: fullValidation.score
  };
}

import { z } from 'zod';
import { SCHEMA_REGISTRY } from "../../shared/schemas/content-types.schema.js";

const evidenceUsed = z.array(z.string()).default([]);
const claimsRequiringReview = z.array(z.string()).default([]);

function fillCommon(repaired) {
  repaired.evidenceUsed = Array.isArray(repaired.evidenceUsed) ? repaired.evidenceUsed : [];
  repaired.claimsRequiringReview = Array.isArray(repaired.claimsRequiringReview) ? repaired.claimsRequiringReview : [];
  return repaired;
}

function generateHeadline(productName, painPoint) {
  if (!productName && !painPoint) return 'How to Transform Your Business Operations';
  if (productName && painPoint) return `${productName}: Solving ${painPoint}`;
  if (productName) return `Introducing ${productName}`;
  return 'A Comprehensive Guide to Better Outcomes';
}

function generateCaption(productName, hook) {
  const base = hook || 'Check out what we have to share!';
  if (productName) return `${base}\n\nDiscover how ${productName} can help you achieve more.\n\n#Productivity #Innovation #Growth`;
  return `${base}\n\n#Innovation #Growth`;
}

function generateVisualConcept(productName, headline) {
  if (productName) return `Modern, clean interface of ${productName} showing key features in a professional setting. Bright color scheme with brand accents.`;
  return `Clean, professional design with modern aesthetics. Data visualization elements with brand-colored accents.`;
}

function generateImagePrompt(productName, topic) {
  if (productName) return `Professional product showcase of ${productName} interface, clean modern design, soft lighting, technology context, 4k quality`;
  return `Abstract technology concept with glowing network connections, professional color scheme, modern minimalist design`;
}

function generateCallToAction(action) {
  const actions = ['Get Started', 'Learn More', 'Try It Now', 'Discover How', 'See It In Action'];
  if (action && actions.includes(action)) return action;
  return actions[0];
}

function generateHashtags(productName, count = 5) {
  const tags = ['#Innovation', '#Productivity', '#Growth', '#Technology', '#DigitalTransformation', '#FutureOfWork', '#Efficiency', '#Business'];
  if (productName) {
    const brandTag = '#' + productName.replace(/[^a-zA-Z0-9]/g, '');
    return [brandTag, ...tags].slice(0, count);
  }
  return tags.slice(0, count);
}

function generateSummary(content, maxLength = 200) {
  if (!content) return 'Learn how our solution can help your team achieve better outcomes.';
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/** Normalize legacy stored assets to match current schema */
export function normalizeLegacyAsset(raw, assetType) {
  if (!raw || typeof raw !== 'object') return raw;

  if (assetType === 'blog_article') {
    if (raw.title && !raw.headline) raw.headline = raw.title;
    if (raw.article && (!raw.introduction || !raw.conclusion)) {
      const text = raw.article;
      const parts = text.split(/\n\n+/);
      raw.introduction = raw.introduction || parts[0] || text;
      raw.conclusion = raw.conclusion || parts[parts.length - 1] || '';
      raw.sections = raw.sections || parts.slice(1, -1).filter(Boolean).map(p => ({
        heading: 'Section',
        body: p,
        keyTakeaways: [],
      }));
    }
    if (!raw.sections) raw.sections = [{ heading: 'Overview', body: raw.article || '', keyTakeaways: [] }];
    delete raw.title;
    delete raw.article;
  }

  if (assetType === 'faq_page') {
    if (raw.faqItems && !raw.faqs) {
      raw.faqs = raw.faqItems;
      delete raw.faqItems;
    }
  }

  if (assetType === 'email_copy' || assetType === 'email_campaign' || assetType === 'email_nurture' || assetType === 'email_newsletter') {
    if (raw.subjectLine && !raw.subject) raw.subject = raw.subjectLine;
    if (raw.preheader && !raw.previewText) raw.previewText = raw.preheader;
    if (raw.greetingText && !raw.greeting) raw.greeting = raw.greetingText;
    if (raw.cta && !raw.ctaText) raw.ctaText = typeof raw.cta === 'object' ? raw.cta.label || raw.cta.text || '' : raw.cta;
    if (raw.ctaUrl === undefined && raw.cta && typeof raw.cta === 'object') raw.ctaUrl = raw.cta.url || raw.cta.destination || null;
    if (raw.body && !raw.bodyParagraphs) raw.bodyParagraphs = [raw.body];
    if (!raw.bodyParagraphs && raw.sections?.body) raw.bodyParagraphs = [raw.sections.body];
    if (raw.plainTextBody && !raw.plainText) raw.plainText = raw.plainTextBody;
    if (raw.htmlBody && !raw.html) raw.html = raw.htmlBody;
    if (raw.footerText && !raw.footer) raw.footer = raw.footerText;
    delete raw.title;
    delete raw.article;
    delete raw.headline;
    delete raw.blogContent;
  }

  return raw;
}

/** Validate and normalize content output */
export function validateContentOutput(raw, assetType) {
  const entry = SCHEMA_REGISTRY[assetType];
  if (!entry) {
    console.warn(`[Schema] No schema registered for: ${assetType}`);
    return { valid: false, errors: [`No schema for content type: ${assetType}`] };
  }

  const normalized = normalizeLegacyAsset(raw, assetType);

  const result = entry.schema.safeParse(normalized);
  if (result.success) {
    return { valid: true, data: result.data };
  }

  const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  const missingFields = result.error.issues
    .filter(i => i.code === 'invalid_type' && i.received === 'undefined' || (i.message.toLowerCase().includes('required')))
    .map(i => i.path.join('.'));

  return { valid: false, errors: issues, missingFields, issues, raw: normalized };
}

/** Attempt repair of common AI output issues — auto-fills ALL missing required fields before validation */
export function repairAIOutput(raw, assetType) {
  if (!raw || typeof raw !== 'object') return raw;
  const repaired = { ...raw };

  if (assetType === 'blog_article') {
    if (repaired.title) { repaired.headline = repaired.headline || repaired.title; delete repaired.title; }
    if (repaired.article) {
      if (!repaired.introduction) repaired.introduction = repaired.article.substring(0, 200);
      if (!repaired.sections) repaired.sections = [{ heading: 'Overview', body: repaired.article, keyTakeaways: [] }];
      delete repaired.article;
    }
    if (repaired.content && !repaired.sections) {
      repaired.sections = [{ heading: 'Content', body: repaired.content, keyTakeaways: [] }];
      delete repaired.content;
    }
    if (repaired.body) {
      if (!repaired.introduction) repaired.introduction = repaired.body.substring(0, 200);
      if (!repaired.sections) repaired.sections = [{ heading: 'Overview', body: repaired.body, keyTakeaways: [] }];
      if (!repaired.conclusion) repaired.conclusion = repaired.body.substring(0, 150);
      delete repaired.body;
    }
    repaired.headline = repaired.headline || repaired.metaTitle || generateHeadline(repaired._productName, repaired._painPoint);
    repaired.introduction = repaired.introduction || (repaired.headline ? `An overview of ${repaired.headline.toLowerCase()}.` : 'Introduction to this topic.');
    if (!repaired.sections || repaired.sections.length === 0) {
      repaired.sections = [{ heading: 'Overview', body: generateSummary(repaired.headline), keyTakeaways: [] }];
    }
    repaired.conclusion = repaired.conclusion || `${repaired.headline || 'This solution'} helps teams achieve better outcomes. Reach out to learn more.`;
    fillCommon(repaired);
  }

  if (assetType === 'faq_page') {
    if (repaired.faqItems && !repaired.faqs) { repaired.faqs = repaired.faqItems; delete repaired.faqItems; }
    if (repaired.title && !repaired.headline) { repaired.headline = repaired.title; delete repaired.title; }
    if (repaired.questions && !repaired.faqs) {
      repaired.faqs = repaired.questions.map(q => typeof q === 'string' ? { question: q, answer: '' } : q);
      delete repaired.questions;
    }
    repaired.headline = repaired.headline || 'Frequently Asked Questions';
    repaired.introduction = repaired.introduction || 'Find answers to common questions about how our solution can help you.';
    if (!repaired.faqs || repaired.faqs.length === 0) {
      repaired.faqs = [
        { question: 'What is this solution?', answer: 'Our platform helps teams achieve better outcomes through innovative technology and proven methodologies.' },
        { question: 'How does it work?', answer: 'The platform integrates seamlessly with your existing workflow, providing powerful tools and insights.' },
        { question: 'What are the key benefits?', answer: 'Users report increased efficiency, better decision-making, and improved team collaboration.' },
        { question: 'How do I get started?', answer: 'Contact our team for a personalized demo and onboarding session tailored to your needs.' },
      ];
    }
    fillCommon(repaired);
  }

  if (assetType === 'linkedin_post') {
    repaired.hook = repaired.hook || repaired.headline || repaired.title || generateHeadline(repaired._productName, repaired._painPoint);
    repaired.body = repaired.body || repaired.content || repaired.text || '';
    if (repaired.content && !repaired.body) { repaired.body = repaired.content; delete repaired.content; }
    if (repaired.text && !repaired.body) { repaired.body = repaired.text; delete repaired.text; }
    repaired.body = repaired.body || (repaired.hook ? `Learn more about ${repaired.hook.toLowerCase()}.` : 'Read on for insights on how leading teams are transforming their approach.');
    repaired.cta = repaired.cta || repaired.callToAction || generateCallToAction();
    repaired.audience = repaired.audience || 'Professionals in the industry';
    repaired.angle = repaired.angle || 'informational';
    repaired.hashtags = Array.isArray(repaired.hashtags) ? repaired.hashtags : generateHashtags(repaired._productName, 3);
    fillCommon(repaired);
  }

  if (assetType === 'instagram_post') {
    repaired.hook = repaired.hook || repaired.headline || generateHeadline(repaired._productName, repaired._painPoint);
    repaired.caption = repaired.caption || repaired.body || repaired.content || generateCaption(repaired._productName, repaired.hook);
    repaired.visualConcept = repaired.visualConcept || generateVisualConcept(repaired._productName, repaired.headline || repaired.hook);
    repaired.imagePrompt = repaired.imagePrompt || generateImagePrompt(repaired._productName, repaired.caption);
    repaired.callToAction = repaired.callToAction || repaired.cta || generateCallToAction();
    repaired.hashtags = Array.isArray(repaired.hashtags) ? repaired.hashtags : generateHashtags(repaired._productName, 10);
    repaired.audience = repaired.audience || 'General audience';
    repaired.angle = repaired.angle || 'informational';
    if (!repaired.carouselSlides || !Array.isArray(repaired.carouselSlides) || repaired.carouselSlides.length === 0) {
      repaired.carouselSlides = [
        { headline: repaired.hook || 'Key Insight', body: 'Discover what makes this approach different.', visualHint: 'Brand visual with headline overlay' },
        { headline: 'How It Works', body: 'Simple, effective solution design.', visualHint: 'Process flow diagram' },
        { headline: 'Results', body: 'See the difference for yourself.', visualHint: 'Before/after comparison graphic' },
      ];
    }
    fillCommon(repaired);
  }

  if (assetType === 'twitter_post' || assetType === 'x_post') {
    repaired.post = repaired.post || repaired.content || repaired.text || repaired.body || '';
    if (repaired.content && !repaired.post) { repaired.post = repaired.content; delete repaired.content; }
    if (repaired.body && !repaired.post) { repaired.post = repaired.body; delete repaired.body; }
    repaired.post = repaired.post || `${generateHeadline(repaired._productName, repaired._painPoint)} — learn more today.`;
    if (repaired.post.length > 280) repaired.post = repaired.post.substring(0, 277) + '...';
    repaired.cta = repaired.cta || generateCallToAction();
    repaired.hashtags = Array.isArray(repaired.hashtags) ? repaired.hashtags : generateHashtags(repaired._productName, 2);
    repaired.audience = repaired.audience || 'General audience';
    repaired.angle = repaired.angle || 'informational';
    fillCommon(repaired);
  }

  if (assetType === 'facebook_post') {
    repaired.headline = repaired.headline || repaired.title || generateHeadline(repaired._productName, repaired._painPoint);
    repaired.body = repaired.body || repaired.content || repaired.text || '';
    if (repaired.content && !repaired.body) { repaired.body = repaired.content; delete repaired.content; }
    if (repaired.text && !repaired.body) { repaired.body = repaired.text; delete repaired.text; }
    repaired.body = repaired.body || `${generateSummary(repaired.headline)} Learn how teams are achieving better outcomes with this approach.`;
    repaired.cta = repaired.cta || generateCallToAction('Share your thoughts');
    repaired.audience = repaired.audience || 'General audience';
    repaired.angle = repaired.angle || 'informational';
    fillCommon(repaired);
  }

  if (assetType === 'youtube_description') {
    repaired.title = repaired.title || repaired.headline || generateHeadline(repaired._productName, repaired._painPoint);
    repaired.openingHook = repaired.openingHook || repaired.introduction || `${repaired._painPoint || 'Common challenges'} are costing teams time and resources — here is the solution.`;
    repaired.description = repaired.description || repaired.body || repaired.content || `In this video, we explore how to overcome ${repaired._painPoint || 'key industry challenges'} with practical, effective solutions.`;
    repaired.chapters = Array.isArray(repaired.chapters) ? repaired.chapters : [
      { timestamp: '0:00', title: 'Introduction' },
      { timestamp: '1:00', title: 'The Challenge' },
      { timestamp: '3:00', title: 'The Solution' },
      { timestamp: '5:00', title: 'Key Takeaways' },
    ];
    repaired.cta = repaired.cta || 'Subscribe for more insights';
    repaired.hashtags = Array.isArray(repaired.hashtags) ? repaired.hashtags : generateHashtags(repaired._productName, 4);
    repaired.keywords = Array.isArray(repaired.keywords) ? repaired.keywords : [repaired.title || 'video', repaired._productName || 'solution'].filter(Boolean);
    fillCommon(repaired);
  }

  if (assetType === 'landing_page') {
    repaired.headline = repaired.headline || repaired.title || generateHeadline(repaired._productName, repaired._painPoint);
    repaired.subheadline = repaired.subheadline || `Learn how ${repaired._productName || 'our solution'} helps teams achieve better outcomes.`;
    repaired.heroCTA = repaired.heroCTA || repaired.cta || generateCallToAction();
    repaired.painPoints = Array.isArray(repaired.painPoints) && repaired.painPoints.length > 0 ? repaired.painPoints :
      [repaired._painPoint || 'Inefficient workflows', 'Limited visibility into key metrics', 'Manual processes that slow growth'];
    repaired.solution = repaired.solution || `${repaired._productName || 'Our solution'} directly addresses these challenges by providing powerful tools and intelligent workflows.`;
    if (!repaired.features || repaired.features.length === 0) {
      repaired.features = [
        { icon: 'star', title: 'Core Platform', description: 'Powerful capabilities designed for real-world use cases.' },
        { icon: 'chart', title: 'Advanced Analytics', description: 'Data-driven insights to make informed decisions.' },
        { icon: 'link', title: 'Seamless Integration', description: 'Connect with existing tools and workflows.' },
      ];
    }
    repaired.socialProof = Array.isArray(repaired.socialProof) ? repaired.socialProof : [];
    repaired.finalCTA = repaired.finalCTA || repaired.heroCTA || generateCallToAction('Get Started');
    repaired.seoKeywords = Array.isArray(repaired.seoKeywords) ? repaired.seoKeywords : [repaired._productName || 'solution', 'digital transformation'].filter(Boolean);
    fillCommon(repaired);
  }

  if (assetType === 'email_copy' || assetType.startsWith('email_')) {
    repaired.subject = repaired.subject || repaired.subjectLine || generateHeadline(repaired._productName, repaired._painPoint);
    if (repaired.subjectLine && !repaired.subject) { repaired.subject = repaired.subjectLine; delete repaired.subjectLine; }
    repaired.previewText = repaired.previewText || `Discover how ${repaired._productName || 'our solution'} can help your team.`;
    repaired.greeting = repaired.greeting || 'Hi there,';
    repaired.opening = repaired.opening || repaired.introduction || `We wanted to share how ${repaired._productName || 'our platform'} can help you overcome ${repaired._painPoint || 'common challenges'}.`;
    if (!repaired.bodyParagraphs || repaired.bodyParagraphs.length === 0) {
      if (repaired.body) { repaired.bodyParagraphs = [repaired.body]; delete repaired.body; }
      else if (repaired.content) { repaired.bodyParagraphs = [repaired.content]; delete repaired.content; }
      else { repaired.bodyParagraphs = [`${repaired._productName || 'Our solution'} provides the tools and capabilities your team needs to succeed.`]; }
    }
    repaired.ctaText = repaired.ctaText || repaired.cta || generateCallToAction();
    if (repaired.cta && !repaired.ctaText) { repaired.ctaText = repaired.cta; delete repaired.cta; }
    repaired.callToAction = typeof repaired.callToAction === 'object' ? repaired.callToAction : (repaired.primaryCta || { label: repaired.ctaText || generateCallToAction(), url: repaired.ctaUrl || '#' });
    repaired.closing = repaired.closing || 'Best regards,';
    repaired.signature = repaired.signature || 'The Team';
    repaired.footer = repaired.footer || `© ${new Date().getFullYear()} ${repaired._brandName || repaired._productName || 'Our Company'}. All rights reserved.`;
    repaired.html = repaired.html || '';
    repaired.plainText = repaired.plainText || '';
    if (!repaired.benefits || repaired.benefits.length < 3) {
      repaired.benefits = repaired.benefits || [];
      while (repaired.benefits.length < 3) {
        repaired.benefits.push('Key benefit of the platform');
      }
    }
    fillCommon(repaired);
  }

  if (assetType === 'comparison_page') {
    repaired.headline = repaired.headline || repaired.title || `${repaired._productName || 'Solution'} vs. Alternatives: A Comprehensive Comparison`;
    repaired.introduction = repaired.introduction || `Choosing the right solution requires careful evaluation. This comparison examines how ${repaired._productName || 'our solution'} stacks up.`;
    repaired.competitorWeaknesses = Array.isArray(repaired.competitorWeaknesses) ? repaired.competitorWeaknesses : [];
    if (!repaired.comparisonTable || !repaired.comparisonTable.rows || repaired.comparisonTable.rows.length === 0) {
      repaired.comparisonTable = {
        headers: ['Feature', repaired._productName || 'Our Solution', 'Alternative'],
        rows: [
          { feature: 'Core Capabilities', [repaired._productName || 'Our Solution']: '✓', 'Alternative': 'Limited' },
          { feature: 'Ease of Use', [repaired._productName || 'Our Solution']: '✓', 'Alternative': 'Moderate' },
          { feature: 'Integration', [repaired._productName || 'Our Solution']: 'Seamless', 'Alternative': 'Complex' },
        ],
      };
    }
    fillCommon(repaired);
  }

  if (assetType === 'feature_announcement') {
    repaired.headline = repaired.headline || repaired.title || `Introducing New Capabilities in ${repaired._productName || 'Our Platform'}`;
    repaired.subheadline = repaired.subheadline || `Designed to help teams achieve more.`;
    repaired.body = repaired.body || repaired.content || `${repaired._productName || 'Our platform'} continuously evolves to meet your needs with new features and capabilities.`;
    repaired.benefits = Array.isArray(repaired.benefits) ? repaired.benefits : ['Increased efficiency', 'Better outcomes', 'Simplified workflows'];
    repaired.cta = repaired.cta || generateCallToAction('Learn More');
    repaired.availability = repaired.availability || 'Available now';
    fillCommon(repaired);
  }

  if (assetType === 'whitepaper') {
    repaired.title = repaired.title || repaired.headline || `${repaired._productName || 'Solution'} Whitepaper: A Comprehensive Guide`;
    repaired.subtitle = repaired.subtitle || `Strategies and insights for ${repaired._productName || 'transforming your approach'}.`;
    repaired.executiveSummary = repaired.executiveSummary || `This whitepaper explores how ${repaired._productName || 'our solution'} helps teams overcome key challenges and achieve better outcomes.`;
    if (!repaired.sections || repaired.sections.length === 0) {
      repaired.sections = [
        { heading: 'Understanding the Challenge', body: 'Teams today face significant obstacles in achieving their goals efficiently.', keyFindings: ['Challenge affects productivity', 'Traditional approaches fall short', 'New strategies needed'] },
        { heading: 'How Our Solution Addresses This', body: `${repaired._productName || 'Our platform'} provides targeted solutions for these challenges.`, keyFindings: ['Direct solution for key pain points', 'Proven methodologies', 'Measurable results'] },
        { heading: 'Implementation Guide', body: 'Follow these steps to get started and maximize value.', keyFindings: ['Quick setup process', 'Best practices for adoption', 'Continuous improvement cycle'] },
      ];
    }
    repaired.conclusion = repaired.conclusion || `${repaired._productName || 'Our solution'} provides a comprehensive approach to overcoming key challenges. Reach out to learn more.`;
    repaired.references = Array.isArray(repaired.references) ? repaired.references : [];
    repaired.cta = repaired.cta || `Download the full ${repaired._productName || 'whitepaper'}`;
    fillCommon(repaired);
  }

  if (assetType === 'creative_brief') {
    repaired.objective = repaired.objective || repaired.objective || `Drive awareness and adoption of ${repaired._productName || 'our solution'} by demonstrating how it solves ${repaired._painPoint || 'key challenges'}.`;
    repaired.audience = repaired.audience || 'Target audience';
    repaired.message = repaired.message || `${repaired._productName || 'Our solution'} helps teams overcome challenges with targeted solutions.`;
    repaired.visualDirection = repaired.visualDirection || 'Clean, modern aesthetic with brand colors. Professional imagery showing success and innovation.';
    repaired.brandSignals = Array.isArray(repaired.brandSignals) ? repaired.brandSignals : ['Brand typography', 'Clean design', 'Professional imagery', 'Data-driven visuals', 'Consistent iconography'];
    repaired.requiredText = repaired.requiredText || `${repaired._productName || 'Smarter solutions'} for better outcomes`;
    repaired.cta = repaired.cta || generateCallToAction('Discover More');
    repaired.format = repaired.format || 'Multi-channel campaign';
    repaired.supportingMessages = Array.isArray(repaired.supportingMessages) ? repaired.supportingMessages : [];
    repaired.deliverables = Array.isArray(repaired.deliverables) ? repaired.deliverables : [];
    repaired.mandatoryElements = Array.isArray(repaired.mandatoryElements) ? repaired.mandatoryElements : [];
    repaired.prohibitedClaims = Array.isArray(repaired.prohibitedClaims) ? repaired.prohibitedClaims : [];
    repaired.evidenceLimitations = Array.isArray(repaired.evidenceLimitations) ? repaired.evidenceLimitations : [];
    fillCommon(repaired);
  }

  if (assetType === 'video_script') {
    repaired.title = repaired.title || `${repaired._productName || 'Solution'}: ${repaired._painPoint || 'A Comprehensive Overview'}`;
    repaired.format = repaired.format || 'Explainer';
    repaired.duration = repaired.duration || '60-90 seconds';
    if (!repaired.scenes || repaired.scenes.length === 0) {
      repaired.scenes = [
        { scene: 1, narration: `Meet your team. Every day they face "${repaired._painPoint || 'key challenges'}" — obstacles that slow them down.`, onScreenText: `${repaired._painPoint || 'The Challenge'}`, visual: 'Team working, looking frustrated', evidencePoint: repaired._painPoint || null, cta: null },
        { scene: 2, narration: `But what if there was a better way? ${repaired._productName || 'Our solution'} was built for this.`, onScreenText: `Introducing ${repaired._productName || 'The Solution'}`, visual: 'Product interface mockup', evidencePoint: null, cta: null },
        { scene: 3, narration: `With powerful features, teams achieve better outcomes faster.`, onScreenText: 'Key Features', visual: 'Feature demonstration', evidencePoint: null, cta: null },
        { scene: 4, narration: `Better efficiency and results — that is what our users experience every day.`, onScreenText: 'Results', visual: 'Success metrics visualization', evidencePoint: null, cta: null },
        { scene: 5, narration: `Ready to transform your approach? Start today and see the difference.`, onScreenText: `Get Started with ${repaired._productName || 'Our Solution'}`, visual: 'CTA screen', evidencePoint: null, cta: `Learn more about ${repaired._productName || 'our solution'}` },
      ];
    }
    fillCommon(repaired);
  }

  if (assetType === 'product_page') {
    repaired.productName = repaired.productName || repaired._productName || 'Our Solution';
    repaired.tagline = repaired.tagline || `The solution teams need to overcome ${repaired._painPoint || 'key challenges'}.`;
    repaired.overview = repaired.overview || `${repaired.productName} is designed to help teams overcome challenges and achieve better outcomes through innovative capabilities.`;
    if (!repaired.keyFeatures || repaired.keyFeatures.length === 0) {
      repaired.keyFeatures = [
        { name: 'Core Platform', description: 'Powerful capabilities for real-world use.', benefit: 'Achieve better results faster' },
        { name: 'Advanced Analytics', description: 'Data-driven insights for informed decisions.', benefit: 'Make confident decisions' },
        { name: 'Seamless Integration', description: 'Connect with existing tools.', benefit: 'Smooth adoption and maximum impact' },
      ];
    }
    if (!repaired.useCases || repaired.useCases.length === 0) {
      repaired.useCases = [{ scenario: `${repaired._painPoint || 'Key challenge'}`, solution: `${repaired.productName} provides targeted tools to address this directly.`, outcome: 'Improved outcomes and enhanced efficiency.' }];
    }
    repaired.cta = repaired.cta || generateCallToAction('Get Started');
    repaired.pricing = null;
    if (!repaired.faqs || repaired.faqs.length === 0) {
      repaired.faqs = [
        { question: `What is ${repaired.productName}?`, answer: `A platform designed to help teams address key challenges through innovative capabilities.` },
        { question: `How does it benefit teams?`, answer: `It delivers measurable improvements in efficiency, visibility, and outcomes.` },
      ];
    }
    fillCommon(repaired);
  }

  return repaired;
}

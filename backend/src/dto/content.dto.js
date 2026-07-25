export const CONTENT_DTO_SCHEMAS = {
  linkedin_post: {
    hook: { type: 'string', required: true },
    body: { type: 'string', required: true },
    cta: { type: 'string', required: false },
    hashtags: { type: 'array', items: 'string', required: true },
    audience: { type: 'string', required: true },
    angle: { type: 'string', required: true },
    evidenceUsed: { type: 'array', items: 'string', required: false },
    claimsRequiringReview: { type: 'array', items: 'string', required: false },
  },
  instagram_post: {
    hook: { type: 'string', required: true },
    caption: { type: 'string', required: true },
    visualConcept: { type: 'string', required: true },
    carouselSlides: { type: 'array', required: true },
    imagePrompt: { type: 'string', required: false },
    callToAction: { type: 'string', required: true },
    hashtags: { type: 'array', items: 'string', required: true },
    audience: { type: 'string', required: true },
    angle: { type: 'string', required: true },
    evidenceUsed: { type: 'array', items: 'string', required: false },
    claimsRequiringReview: { type: 'array', items: 'string', required: false },
  },
  twitter_post: {
    post: { type: 'string', required: true },
    cta: { type: 'string', required: false },
    hashtags: { type: 'array', items: 'string', required: true },
    audience: { type: 'string', required: true },
    angle: { type: 'string', required: true },
    evidenceUsed: { type: 'array', items: 'string', required: false },
    claimsRequiringReview: { type: 'array', items: 'string', required: false },
  },
  facebook_post: {
    headline: { type: 'string', required: true },
    body: { type: 'string', required: true },
    cta: { type: 'string', required: true },
    audience: { type: 'string', required: true },
    angle: { type: 'string', required: true },
    evidenceUsed: { type: 'array', items: 'string', required: false },
    claimsRequiringReview: { type: 'array', items: 'string', required: false },
  },
  blog_article: {
    title: { type: 'string', required: true },
    metaDescription: { type: 'string', required: true },
    sections: { type: 'array', required: true },
    keyTakeaways: { type: 'array', items: 'string', required: true },
    faqItems: { type: 'array', required: false },
    seoKeywords: { type: 'array', items: 'string', required: false },
    cta: { type: 'string', required: true },
    targetAudience: { type: 'string', required: true },
    readingTime: { type: 'string', required: false },
  },
  email_copy: {
    subject: { type: 'string', required: true },
    previewText: { type: 'string', required: true },
    greeting: { type: 'string', required: true },
    opening: { type: 'string', required: true },
    problem: { type: 'string', required: true },
    solution: { type: 'string', required: true },
    featureHighlights: { type: 'array', items: 'string', required: true },
    benefits: { type: 'array', items: 'string', required: true },
    socialProof: { type: 'string', required: false },
    callToAction: { type: 'object', required: true },
    signature: { type: 'string', required: true },
    footer: { type: 'string', required: true },
    personalizationVariables: { type: 'array', items: 'string', required: false },
    html: { type: 'string', required: true },
    plainText: { type: 'string', required: true },
    evidenceUsed: { type: 'array', items: 'string', required: false },
    claimsRequiringReview: { type: 'array', items: 'string', required: false },
  },
  creative_brief: {
    projectName: { type: 'string', required: true },
    objective: { type: 'string', required: true },
    targetAudience: { type: 'string', required: true },
    keyMessage: { type: 'string', required: true },
    deliverables: { type: 'array', required: true },
    tone: { type: 'string', required: true },
    channels: { type: 'array', required: true },
    timeline: { type: 'string', required: false },
    budget: { type: 'string', required: false },
    successMetrics: { type: 'array', required: true },
  },
  video_script: {
    title: { type: 'string', required: true },
    duration: { type: 'string', required: true },
    hook: { type: 'string', required: true },
    scenes: { type: 'array', required: true },
    keyTakeaways: { type: 'array', items: 'string', required: true },
    cta: { type: 'string', required: true },
  },
};

export function validateContentDTO(data, contentType) {
  const schema = CONTENT_DTO_SCHEMAS[contentType];
  if (!schema) return { valid: false, errors: [`No schema for ${contentType}`] };

  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    if (rules.required) {
      const value = data[field];
      if (value === undefined || value === null || value === '') {
        errors.push(`${field} is required`);
        continue;
      }
      if (rules.type === 'array' && (!Array.isArray(value) || value.length === 0)) {
        errors.push(`${field} must be a non-empty array`);
      }
      if (rules.type === 'object' && (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length === 0)) {
        errors.push(`${field} must be a non-empty object`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createEmptyContentDTO(contentType, overrides = {}) {
  const defaults = {
    linkedin_post: () => ({
      hook: '',
      body: '',
      cta: null,
      hashtags: [],
      audience: '',
      angle: '',
      evidenceUsed: [],
      claimsRequiringReview: [],
    }),
    instagram_post: () => ({
      hook: '',
      caption: '',
      visualConcept: '',
      carouselSlides: [],
      imagePrompt: '',
      callToAction: '',
      hashtags: [],
      audience: '',
      angle: '',
      evidenceUsed: [],
      claimsRequiringReview: [],
    }),
    twitter_post: () => ({
      post: '',
      cta: null,
      hashtags: [],
      audience: '',
      angle: '',
      evidenceUsed: [],
      claimsRequiringReview: [],
    }),
    facebook_post: () => ({
      headline: '',
      body: '',
      cta: '',
      audience: '',
      angle: '',
      evidenceUsed: [],
      claimsRequiringReview: [],
    }),
    blog_article: () => ({
      title: '',
      metaDescription: '',
      sections: [],
      keyTakeaways: [],
      faqItems: [],
      seoKeywords: [],
      cta: '',
      targetAudience: '',
      readingTime: '5 min',
    }),
    email_copy: () => ({
      subject: '',
      previewText: '',
      greeting: '',
      opening: '',
      problem: '',
      solution: '',
      featureHighlights: [],
      benefits: [],
      socialProof: '',
      callToAction: { label: '', url: '' },
      signature: '',
      footer: '',
      personalizationVariables: [],
      html: '',
      plainText: '',
      evidenceUsed: [],
      claimsRequiringReview: [],
    }),
    creative_brief: () => ({
      projectName: '',
      objective: '',
      targetAudience: '',
      keyMessage: '',
      deliverables: [],
      tone: '',
      channels: [],
      timeline: '',
      budget: '',
      successMetrics: [],
    }),
    video_script: () => ({
      title: '',
      duration: '',
      hook: '',
      scenes: [],
      keyTakeaways: [],
      cta: '',
    }),
  };

  const factory = defaults[contentType];
  if (!factory) return {};
  return { ...factory(), ...overrides };
}

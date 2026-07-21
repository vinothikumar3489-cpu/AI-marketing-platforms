export const CONTENT_TYPE_ENUM = {
  BLOG_ARTICLE: 'blog_article',
  SOCIAL_POST: 'social_post',
  EMAIL_COPY: 'email_copy',
  CONTENT_BRIEF: 'content_brief',
  SCRIPT: 'script',
};

export const CONTENT_TYPES = {
  email_copy: { label: 'Email Copy' },
  email_campaign: { label: 'Email Campaign' },
  email_nurture: { label: 'Email Nurture' },
  email_newsletter: { label: 'Email Newsletter' },
  linkedin_post: { label: 'LinkedIn Post' },
  instagram_post: { label: 'Instagram Post' },
  instagram_carousel: { label: 'Instagram Carousel' },
  instagram_reel_script: { label: 'Instagram Reel Script' },
  facebook_post: { label: 'Facebook Post' },
  facebook_ad: { label: 'Facebook Ad' },
  x_post: { label: 'X (Twitter) Post' },
  x_thread: { label: 'X (Twitter) Thread' },
  youtube_description: { label: 'YouTube Description' },
  youtube_script: { label: 'YouTube Script' },
  blog_article: { label: 'Blog Article' },
  landing_page: { label: 'Landing Page' },
  case_study: { label: 'Case Study' },
  product_announcement: { label: 'Product Announcement' },
  faq_page: { label: 'FAQ Page' },
  product_page: { label: 'Product Page' },
  comparison_page: { label: 'Comparison Page' },
  feature_announcement: { label: 'Feature Announcement' },
  whitepaper: { label: 'Whitepaper' },
  creative_brief: { label: 'Creative Brief' },
  video_script: { label: 'Video Script' },
};

export const CONTENT_TYPES_LIST = Object.keys(CONTENT_TYPES);
export const SUPPORTED_CONTENT_TYPES = CONTENT_TYPES_LIST;

export const CONTENT_TYPE_ALIASES = {
  email: 'email_campaign',
  social: 'linkedin_post',
  blog: 'blog_article',
  video: 'youtube_script',
  brief: 'creative_brief',
  ad: 'facebook_ad',
  'x (twitter) post': 'x_post',
  'x thread': 'x_thread',
  'instagram reel': 'instagram_reel_script',
  'instagram carousel': 'instagram_carousel',
  'facebook ad': 'facebook_ad',
  'email campaign': 'email_campaign',
  'email nurture': 'email_nurture',
  'email newsletter': 'email_newsletter',
  'case study': 'case_study',
  'product announcement': 'product_announcement',
  'youtube script': 'youtube_script',
};

export const CONTENT_TYPE_GROUPS = {
  email: ['email_copy', 'email_campaign', 'email_nurture', 'email_newsletter'],
  social: ['linkedin_post', 'instagram_post', 'instagram_carousel', 'instagram_reel_script', 'facebook_post', 'facebook_ad', 'x_post', 'x_thread'],
  video: ['youtube_description', 'youtube_script'],
  longForm: ['blog_article', 'landing_page', 'case_study', 'product_announcement', 'faq_page', 'product_page', 'comparison_page', 'feature_announcement', 'whitepaper'],
  brief: ['creative_brief', 'video_script'],
};

export const CONTENT_TYPE_REGISTRY = {
  email_copy: {
    canonicalType: 'email_campaign',
    generator: 'emailCampaignGenerator',
    validator: 'emailCampaignValidator',
    renderer: 'EmailAssetPreview',
  },
  email_campaign: {
    canonicalType: 'email_campaign',
    generator: 'emailCampaignGenerator',
    validator: 'emailCampaignValidator',
    renderer: 'EmailAssetPreview',
  },
  email_nurture: {
    canonicalType: 'email_campaign',
    generator: 'emailCampaignGenerator',
    validator: 'emailCampaignValidator',
    renderer: 'EmailAssetPreview',
  },
  email_newsletter: {
    canonicalType: 'email_campaign',
    generator: 'emailCampaignGenerator',
    validator: 'emailCampaignValidator',
    renderer: 'EmailAssetPreview',
  },
  linkedin_post: {
    canonicalType: 'linkedin_post',
    generator: 'linkedInPostGenerator',
    validator: 'linkedInPostValidator',
    renderer: 'LinkedInPostPreview',
  },
  instagram_post: {
    canonicalType: 'instagram_post',
    generator: 'instagramPostGenerator',
    validator: 'instagramPostValidator',
    renderer: 'InstagramPostPreview',
  },
  instagram_carousel: {
    canonicalType: 'instagram_carousel',
    generator: 'instagramCarouselGenerator',
    validator: 'instagramPostValidator',
    renderer: 'InstagramCarouselPreview',
  },
  instagram_reel_script: {
    canonicalType: 'instagram_reel_script',
    generator: 'instagramReelGenerator',
    validator: 'instagramPostValidator',
    renderer: 'InstagramReelPreview',
  },
  facebook_post: {
    canonicalType: 'facebook_post',
    generator: 'facebookPostGenerator',
    validator: 'facebookPostValidator',
    renderer: 'FacebookPostPreview',
  },
  facebook_ad: {
    canonicalType: 'facebook_ad',
    generator: 'facebookAdGenerator',
    validator: 'facebookAdValidator',
    renderer: 'FacebookAdPreview',
  },
  x_post: {
    canonicalType: 'x_post',
    generator: 'twitterPostGenerator',
    validator: 'twitterPostValidator',
    renderer: 'XPostPreview',
  },
  x_thread: {
    canonicalType: 'x_thread',
    generator: 'twitterThreadGenerator',
    validator: 'twitterPostValidator',
    renderer: 'XThreadPreview',
  },
  youtube_description: {
    canonicalType: 'youtube_description',
    generator: 'youtubeDescriptionGenerator',
    validator: 'youtubeDescriptionValidator',
    renderer: 'YouTubeDescriptionPreview',
  },
  youtube_script: {
    canonicalType: 'youtube_script',
    generator: 'youtubeScriptGenerator',
    validator: 'youtubeScriptValidator',
    renderer: 'YouTubeScriptPreview',
  },
  blog_article: {
    canonicalType: 'blog_article',
    generator: 'blogArticleGenerator',
    validator: 'blogArticleValidator',
    renderer: 'BlogArticlePreview',
  },
  landing_page: {
    canonicalType: 'landing_page',
    generator: 'landingPageGenerator',
    validator: 'landingPageValidator',
    renderer: 'LandingPagePreview',
  },
  case_study: {
    canonicalType: 'case_study',
    generator: 'caseStudyGenerator',
    validator: 'caseStudyValidator',
    renderer: 'CaseStudyPreview',
  },
  product_announcement: {
    canonicalType: 'product_announcement',
    generator: 'productAnnouncementGenerator',
    validator: 'blogArticleValidator',
    renderer: 'BlogArticlePreview',
  },
  faq_page: {
    canonicalType: 'faq_page',
    generator: 'faqPageGenerator',
    validator: 'faqPageValidator',
    renderer: 'BlogArticlePreview',
  },
  product_page: {
    canonicalType: 'product_page',
    generator: 'productPageGenerator',
    validator: 'blogArticleValidator',
    renderer: 'BlogArticlePreview',
  },
  comparison_page: {
    canonicalType: 'comparison_page',
    generator: 'comparisonPageGenerator',
    validator: 'comparisonPageValidator',
    renderer: 'BlogArticlePreview',
  },
  feature_announcement: {
    canonicalType: 'feature_announcement',
    generator: 'featureAnnouncementGenerator',
    validator: 'featureAnnouncementValidator',
    renderer: 'BlogArticlePreview',
  },
  whitepaper: {
    canonicalType: 'whitepaper',
    generator: 'whitepaperGenerator',
    validator: 'blogArticleValidator',
    renderer: 'BlogArticlePreview',
  },
  creative_brief: {
    canonicalType: 'creative_brief',
    generator: 'creativeBriefGenerator',
    validator: 'creativeBriefValidator',
    renderer: 'CreativeBriefPreview',
  },
  video_script: {
    canonicalType: 'video_script',
    generator: 'videoScriptGenerator',
    validator: 'videoScriptValidator',
    renderer: 'VideoScriptPreview',
  },
};

export function normalizeContentType(type) {
  if (!type) return null;
  const lower = String(type).toLowerCase().replace(/^content_/, '');
  if (CONTENT_TYPES[lower]) return lower;
  if (CONTENT_TYPE_ALIASES[lower]) return CONTENT_TYPE_ALIASES[lower];
  return null;
}

export function isSupportedContentType(type) {
  return CONTENT_TYPES_LIST.includes(normalizeContentType(type));
}

export function getContentTypeRegistryEntry(type) {
  const normalized = normalizeContentType(type);
  if (!normalized) return null;
  return CONTENT_TYPE_REGISTRY[normalized] || null;
}

export function getGeneratorNameForType(type) {
  const entry = getContentTypeRegistryEntry(type);
  return entry?.generator || null;
}

export function getValidatorNameForType(type) {
  const entry = getContentTypeRegistryEntry(type);
  return entry?.validator || null;
}

export function getCanonicalContentType(type) {
  const entry = getContentTypeRegistryEntry(type);
  return entry?.canonicalType || normalizeContentType(type) || null;
}

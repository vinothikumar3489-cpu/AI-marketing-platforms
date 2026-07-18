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

function sanitize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\[\]{}()]/g, '').replace(/\s+/g, ' ').trim();
}

function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function deriveHeadline(prompt) {
  const cleaned = sanitize(prompt);
  if (!cleaned) return '';
  const lower = cleaned.toLowerCase();

  if (lower.startsWith('how to')) return capitalizeWords(cleaned);
  if (lower.startsWith('launch')) return `Launch Your ${capitalizeWords(cleaned.replace(/^launch\s*/i, ''))}`;
  if (lower.startsWith('promote')) return `Promote Your ${capitalizeWords(cleaned.replace(/^promote\s*/i, ''))}`;
  if (lower.startsWith('create')) return `Create Your ${capitalizeWords(cleaned.replace(/^create\s*/i, ''))}`;
  if (lower.startsWith('build')) return `Build Your ${capitalizeWords(cleaned.replace(/^build\s*/i, ''))}`;
  if (lower.startsWith('design')) return `Design Your ${capitalizeWords(cleaned.replace(/^design\s*/i, ''))}`;
  if (lower.startsWith('market')) return `Market Your ${capitalizeWords(cleaned.replace(/^market\s*/i, ''))}`;

  return capitalizeWords(truncate(cleaned, 60));
}

function deriveCta(prompt) {
  const cleaned = sanitize(prompt).toLowerCase();

  if (cleaned.includes('poster') || cleaned.includes('design') || cleaned.includes('figma') || cleaned.includes('create') || cleaned.includes('canva')) return 'Start Designing';
  if (cleaned.includes('skincare') || cleaned.includes('beauty') || cleaned.includes('cosmetic')) return 'Shop Now';
  if (cleaned.includes('course') || cleaned.includes('learn') || cleaned.includes('training') || cleaned.includes('education') || cleaned.includes('coding')) return 'Enroll Today';
  if (cleaned.includes('hospital') || cleaned.includes('appointment') || cleaned.includes('doctor') || cleaned.includes('clinic') || cleaned.includes('health')) return 'Book Appointment';
  if (cleaned.includes('bike') || cleaned.includes('electric') || cleaned.includes('vehicle') || cleaned.includes('car')) return 'Test Ride';
  if (cleaned.includes('launch') || cleaned.includes('product') || cleaned.includes('brand')) return 'Learn More';
  if (cleaned.includes('sale') || cleaned.includes('discount') || cleaned.includes('offer') || cleaned.includes('deal')) return 'Shop Sale';
  if (cleaned.includes('app') || cleaned.includes('software') || cleaned.includes('tool') || cleaned.includes('platform')) return 'Try Free';
  if (cleaned.includes('event') || cleaned.includes('webinar') || cleaned.includes('workshop') || cleaned.includes('conference')) return 'Register Now';
  if (cleaned.includes('download') || cleaned.includes('ebook') || cleaned.includes('guide') || cleaned.includes('template')) return 'Download Free';
  if (cleaned.includes('subscribe') || cleaned.includes('newsletter') || cleaned.includes('news')) return 'Subscribe';
  if (cleaned.includes('donate') || cleaned.includes('charity') || cleaned.includes('fund')) return 'Donate Now';
  if (cleaned.includes('startup') || cleaned.includes('fundraise') || cleaned.includes('invest')) return 'Invest Now';

  return 'Get Started';
}

function deriveSubheadline(prompt, headline) {
  const cleaned = sanitize(prompt).toLowerCase();
  const head = sanitize(headline || '');

  if (head) {
    if (cleaned.includes('how to')) return `Learn step-by-step how to ${cleaned.replace(/^how\s*to\s*/i, '').replace(/\.$/, '')}.`;
    if (cleaned.includes('poster') || cleaned.includes('design') || cleaned.includes('figma')) return 'Master the tools and techniques to create professional designs that stand out.';
    if (cleaned.includes('skincare') || cleaned.includes('beauty')) return 'Create clean, trustworthy campaigns for health-conscious customers.';
    if (cleaned.includes('hospital') || cleaned.includes('appointment') || cleaned.includes('clinic')) return 'Streamline patient scheduling with an intelligent AI-powered booking system.';
    if (cleaned.includes('coding') || cleaned.includes('course') || cleaned.includes('education') || cleaned.includes('learn')) return 'Empower students with interactive lessons and real-world coding projects.';
    if (cleaned.includes('bike') || cleaned.includes('electric') || cleaned.includes('vehicle')) return 'Discover the future of eco-friendly commuting with cutting-edge electric bikes.';
    if (cleaned.includes('launch') || cleaned.includes('brand') || cleaned.includes('product')) return 'Build brand awareness and drive customer engagement with a strategic launch.';
    if (cleaned.includes('app') || cleaned.includes('software') || cleaned.includes('saas')) return 'Boost productivity and streamline workflows with intuitive software solutions.';
    if (cleaned.includes('market') || cleaned.includes('advertise') || cleaned.includes('campaign')) return 'Reach your target audience with data-driven marketing campaigns.';
    return `${head} — designed for modern professionals who demand quality and results.`;
  }

  return truncate(cleaned, 100).replace(/^./, c => c.toUpperCase()) + '.';
}

export function buildPosterContent({ prompt, headline, cta, platform, dimensions, brandColors }) {
  const safePrompt = sanitize(prompt || '');
  if (!safePrompt) {
    return { error: 'Prompt is required' };
  }

  const finalHeadline = sanitize(headline) || deriveHeadline(safePrompt);
  const finalCta = sanitize(cta) || deriveCta(safePrompt);
  const finalSubheadline = deriveSubheadline(safePrompt, finalHeadline);
  const finalPlatform = sanitize(platform) || 'Digital';

  const dims = (dimensions || '1080x1080').split('x').map(Number);
  const width = dims[0] || 1080;
  const height = dims[1] || 1080;

  return {
    headline: truncate(capitalizeWords(finalHeadline), 70),
    subheadline: truncate(finalSubheadline, 140),
    cta: truncate(finalCta, 25),
    platform: finalPlatform,
    width,
    height,
    brandColors: Array.isArray(brandColors) && brandColors.length > 0 ? brandColors : null,
  };
}

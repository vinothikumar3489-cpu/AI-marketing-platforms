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
  return capitalizeWords(truncate(cleaned, 60));
}

function deriveCtaFromPrompt(cleaned) {
  if (cleaned.includes('poster') || cleaned.includes('reveal') || cleaned.includes('movie') || cleaned.includes('film')) return 'Reveal Now';
  if (cleaned.includes('design') || cleaned.includes('figma') || cleaned.includes('canva') || cleaned.includes('create')) return 'Start Designing';
  if (cleaned.includes('skincare') || cleaned.includes('beauty') || cleaned.includes('cosmetic')) return 'Shop Now';
  if (cleaned.includes('course') || cleaned.includes('learn') || cleaned.includes('training') || cleaned.includes('education')) return 'Enroll Today';
  if (cleaned.includes('hospital') || cleaned.includes('appointment') || cleaned.includes('doctor') || cleaned.includes('clinic')) return 'Book Appointment';
  if (cleaned.includes('bike') || cleaned.includes('electric') || cleaned.includes('vehicle') || cleaned.includes('car')) return 'Test Ride';
  if (cleaned.includes('launch') || cleaned.includes('product') || cleaned.includes('brand') || cleaned.includes('startup')) return 'Learn More';
  if (cleaned.includes('sale') || cleaned.includes('discount') || cleaned.includes('offer')) return 'Shop Sale';
  if (cleaned.includes('app') || cleaned.includes('software') || cleaned.includes('tool') || cleaned.includes('platform')) return 'Try Free';
  if (cleaned.includes('event') || cleaned.includes('webinar') || cleaned.includes('workshop') || cleaned.includes('conference')) return 'Register Now';
  if (cleaned.includes('download') || cleaned.includes('ebook') || cleaned.includes('guide')) return 'Download Free';
  if (cleaned.includes('subscribe') || cleaned.includes('newsletter')) return 'Subscribe';
  if (cleaned.includes('donate') || cleaned.includes('charity')) return 'Donate Now';
  if (cleaned.includes('invest') || cleaned.includes('fundraise')) return 'Invest Now';
  return null;
}

function deriveCta(prompt) {
  const cleaned = sanitize(prompt).toLowerCase();
  const fromPrompt = deriveCtaFromPrompt(cleaned);
  if (fromPrompt) return fromPrompt;
  const topicWords = cleaned.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
  if (topicWords.length > 0) {
    return 'Explore ' + topicWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return 'Learn More';
}

function deriveSubheadline(prompt) {
  const cleaned = sanitize(prompt);
  if (!cleaned) return 'Explore the possibilities with our platform.';
  const lower = cleaned.toLowerCase();

  if (lower.includes('movie') && lower.includes('poster')) return 'Create suspense and excitement with a cinematic reveal design.';
  if (lower.includes('poster') && lower.includes('reveal')) return 'Unveil your visual story with a bold and dramatic poster reveal.';
  if (lower.includes('poster')) return 'Design a stunning poster that captures attention and communicates your message.';
  if (lower.includes('figma') && lower.includes('poster')) return 'Master Figma tools to create professional posters with typography and layout.';
  if (lower.includes('figma')) return 'Design modern interfaces and graphics using Figma\'s powerful design tools.';
  if (lower.includes('design')) return 'Create beautiful, impactful designs that resonate with your target audience.';
  if (lower.includes('skincare') || lower.includes('beauty')) return 'Build trust with clean, natural skincare visuals that speak to health-conscious customers.';
  if (lower.includes('hospital') || lower.includes('appointment') || lower.includes('clinic')) return 'Streamline patient scheduling with an intelligent AI-powered booking system.';
  if (lower.includes('how to')) return `Learn step-by-step how to ${lower.replace(/^how\s*to\s*/i, '').replace(/\.$/, '')}.`;
  if (lower.includes('chatbot') || lower.includes('ai chatbot')) return 'Automate conversations and provide instant support with an intelligent AI chatbot.';
  if (lower.includes('electric') || lower.includes('bike') || lower.includes('vehicle')) return 'Discover the future of eco-friendly commuting with cutting-edge electric vehicles.';
  if (lower.includes('course') || lower.includes('learn') || lower.includes('coding')) return 'Empower yourself with interactive lessons and real-world projects.';
  if (lower.includes('launch') || lower.includes('product') || lower.includes('brand')) return 'Build brand awareness and drive customer engagement with a strategic launch.';
  if (lower.includes('app') || lower.includes('software') || lower.includes('saas')) return 'Boost productivity and streamline workflows with intuitive software solutions.';
  if (lower.includes('market') || lower.includes('campaign') || lower.includes('social')) return 'Reach your target audience with data-driven marketing campaigns.';
  if (lower.includes('organic') || lower.includes('natural')) return 'Promote natural, organic products with authentic and earth-friendly visual design.';

  const words = cleaned.split(/\s+/).filter(w => w.length > 3).slice(0, 4);
  if (words.length > 0) {
    const topic = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `Discover everything you need to know about ${topic} — designed for modern professionals.`;
  }
  return truncate(cleaned, 100).replace(/^./, c => c.toUpperCase()) + '.';
}

function containsPlaceholder(str) {
  if (!str) return true;
  const placeholders = ['compelling headline here', 'untitled brief', 'general audience', 'to be determined', 'undefined', 'null', '[object object]', 'get started'];
  const lower = str.toLowerCase().trim();
  return placeholders.some(p => lower.includes(p));
}

export function buildPosterContent({ prompt, headline, cta, platform, dimensions, brandColors }) {
  const safePrompt = sanitize(prompt || '');
  if (!safePrompt) {
    return { error: 'Prompt is required' };
  }

  let finalHeadline = sanitize(headline);
  if (!finalHeadline || containsPlaceholder(finalHeadline)) {
    finalHeadline = deriveHeadline(safePrompt);
  }
  if (containsPlaceholder(finalHeadline)) {
    finalHeadline = capitalizeWords(truncate(safePrompt, 60));
  }

  let finalCta = sanitize(cta);
  if (!finalCta || containsPlaceholder(finalCta)) {
    finalCta = deriveCta(safePrompt);
  }
  if (containsPlaceholder(finalCta)) {
    finalCta = 'Learn More';
  }

  const finalSubheadline = deriveSubheadline(safePrompt);
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

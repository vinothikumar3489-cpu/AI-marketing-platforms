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

function deriveSubheadline(prompt) {
  const cleaned = sanitize(prompt);
  if (!cleaned) return null;
  const lower = cleaned.toLowerCase();

  if (lower.includes('how to')) return `Learn step-by-step how to ${lower.replace(/^how\s*to\s*/i, '').replace(/\.$/, '')}.`;

  return truncate(cleaned, 100).replace(/^./, c => c.toUpperCase()) + '.';
}

function containsPlaceholder(str) {
  if (!str) return true;
  const placeholders = ['compelling headline here', 'untitled brief', 'general audience', 'to be determined', 'undefined', 'null', '[object object]', 'get started', 'reach your target audience with data-driven marketing campaigns', 'designed for target audience', 'designed for teenage people to drive engagement', 'professional, modern, #e94560 accent', 'social creative for general audience', 'social creative for teenage people', 'growth analysis placeholder', 'problem introduction', 'solution presentation', 'proof and social proof', 'new analysis', 'designed for '];
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
    finalCta = null;
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

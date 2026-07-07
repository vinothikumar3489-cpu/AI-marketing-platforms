import axios from 'axios';
import sharp from 'sharp';
import { uploadBuffer } from './storage.service.js';

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1080;

const FALLBACK_HEADLINE = 'How to Create a Poster Using Figma';
const FALLBACK_SUBHEADLINE = 'Learn simple design steps to create a clean and professional poster.';
const FALLBACK_CTA = 'Start Designing';

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildVisualPrompt({ prompt, brandColors }) {
  let cleanPrompt = prompt || 'Clean modern workspace with laptop showing design software, colorful poster design elements, creative UI/UX design theme, professional educational poster background';
  if (brandColors?.length) cleanPrompt += `, ${brandColors.join(' and ')} accents`;
  cleanPrompt += ', no text, no letters, no words, no typography, no watermark, no labels, no UI text, no writing';
  return cleanPrompt;
}

function getDimensions(dimensions) {
  const dims = (dimensions || `${POSTER_WIDTH}x${POSTER_HEIGHT}`).split('x').map(Number);
  return { width: dims[0] || POSTER_WIDTH, height: dims[1] || POSTER_HEIGHT };
}

async function generateWithPollinations(prompt, width, height) {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&enhance=true`;
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
    const buffer = Buffer.from(response.data);
    if (buffer.length < 100) return { success: false, error: 'Pollinations returned empty response' };
    return { success: true, provider: 'pollinations', buffer };
  } catch (err) {
    const status = err?.response?.status || 0;
    const msg = err?.message || '';
    console.error('[ImageExec] Pollinations failed:', { status, message: msg.slice(0, 200) });
    return { success: false, error: `Pollinations failed: ${msg.slice(0, 200)}`, diagnostic: { provider: 'pollinations', status } };
  }
}

async function generateWithFal(prompt) {
  if (!process.env.FAL_KEY) return { success: false, error: 'Fal key not configured', diagnostic: { provider: 'fal', reason: 'missing_key' } };
  try {
    const { fal } = await import('@fal-ai/client');
    fal.config({ credentials: process.env.FAL_KEY });
    const model = process.env.FAL_IMAGE_MODEL || 'fal-ai/flux/schnell';
    const result = await fal.subscribe(model, {
      input: { prompt, num_images: 1, output_format: 'png' },
      logs: true,
      onQueueUpdate: () => {},
    });
    const imageUrl = result?.data?.images?.[0]?.url || result?.data?.image?.url;
    if (!imageUrl) return { success: false, error: 'Fal returned no image URL', diagnostic: { provider: 'fal', reason: 'empty_response' } };
    return { success: true, provider: 'fal.ai', imageUrl };
  } catch (err) {
    const msg = err?.message || err?.body?.message || '';
    const status = err?.status || 0;
    console.error('[ImageExec] Fal failed:', { status, message: msg.slice(0, 200) });
    return { success: false, error: `Fal failed: ${msg.slice(0, 200)}`, diagnostic: { provider: 'fal', status, message: msg.slice(0, 200) } };
  }
}

function wrapLines(text, maxChars) {
  if (!text || text.length <= maxChars) return [text || ''];
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length > maxChars) { lines.push(line); line = w; }
    else { line = test; }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

async function overlayTextOnImage(imageBuffer, { headline, subheadline, cta }) {
  const title = headline || FALLBACK_HEADLINE;
  const sub = subheadline || FALLBACK_SUBHEADLINE;
  const callToAction = cta || FALLBACK_CTA;

  const titleLines = wrapLines(title, 28);
  const subLines = wrapLines(sub, 42);

  const titleSvgLineHeight = 76;
  const titleStartY = 260;
  const totalTitleHeight = titleLines.length * titleSvgLineHeight;
  const subStartY = titleStartY + totalTitleHeight + 60;
  const subSvgLineHeight = 44;
  const totalSubHeight = subLines.length * subSvgLineHeight;
  const ctaY = subStartY + totalSubHeight + 80;

  let titleTspans = titleLines.map((line, i) =>
    `<tspan x="540" dy="${i === 0 ? '0' : titleSvgLineHeight}">${escapeXml(line)}</tspan>`
  ).join('');
  let subTspans = subLines.map((line, i) =>
    `<tspan x="540" dy="${i === 0 ? '0' : subSvgLineHeight}">${escapeXml(line)}</tspan>`
  ).join('');

  const overlaySvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}">
    <defs>
      <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:rgba(0,0,0,0.55);stop-opacity:1" />
        <stop offset="60%" style="stop-color:rgba(0,0,0,0.25);stop-opacity:1" />
        <stop offset="100%" style="stop-color:rgba(0,0,0,0.65);stop-opacity:1" />
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
    </defs>
    <rect width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" fill="url(#overlay)"/>
    <text x="540" y="${titleStartY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="800" fill="white" filter="url(#shadow)" letter-spacing="-0.5">${titleTspans}</text>
    <text x="540" y="${subStartY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="rgba(255,255,255,0.92)" font-weight="400">${subTspans}</text>
    <rect x="${(POSTER_WIDTH - 340) / 2}" y="${ctaY}" width="340" height="68" rx="34" fill="white" opacity="0.95" filter="url(#shadow)"/>
    <text x="540" y="${ctaY + 45}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="#1a1a2e">${escapeXml(callToAction)}</text>
  </svg>`);

  return sharp(imageBuffer)
    .resize(POSTER_WIDTH, POSTER_HEIGHT, { fit: 'cover', position: 'centre' })
    .composite([{ input: overlaySvg, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

function generateSvgPoster({ headline, subheadline, cta, brandColors }) {
  const bgColor = brandColors?.[0] || '#2563eb';
  const accentColor = brandColors?.[1] || '#111827';
  const safeTitle = escapeXml(headline || FALLBACK_HEADLINE);
  const safeSub = escapeXml(subheadline || FALLBACK_SUBHEADLINE);
  const safeCta = escapeXml(cta || FALLBACK_CTA);

  const titleLines = wrapLines(safeTitle, 28);
  const subLines = wrapLines(safeSub, 42);
  const titleSvgLineHeight = 76;
  const subSvgLineHeight = 44;
  let titleY = 280;
  let subY = titleY + titleLines.length * titleSvgLineHeight + 60;

  let titleTspans = titleLines.map((line, i) =>
    `<tspan x="540" dy="${i === 0 ? '0' : titleSvgLineHeight}">${line}</tspan>`
  ).join('');
  let subTspans = subLines.map((line, i) =>
    `<tspan x="540" dy="${i === 0 ? '0' : subSvgLineHeight}">${line}</tspan>`
  ).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" viewBox="0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentColor};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.2)" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <rect width="${POSTER_WIDTH}" height="${POSTER_HEIGHT}" fill="url(#bg)" rx="20"/>
  <rect x="0" y="0" width="${POSTER_WIDTH}" height="400" fill="url(#accent)"/>
  <text x="540" y="${titleY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="60" font-weight="800" fill="white" filter="url(#shadow)" letter-spacing="-0.5">${titleTspans}</text>
  <line x1="340" y1="${subY - 30}" x2="740" y2="${subY - 30}" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <text x="540" y="${subY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="rgba(255,255,255,0.9)" font-weight="400">${subTspans}</text>
  <rect x="${(POSTER_WIDTH - 340) / 2}" y="${subY + subLines.length * subSvgLineHeight + 60}" width="340" height="68" rx="34" fill="white" opacity="0.95" filter="url(#shadow)"/>
  <text x="540" y="${subY + subLines.length * subSvgLineHeight + 105}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="700" fill="${accentColor}">${safeCta}</text>
</svg>`;

  return Buffer.from(svg, 'utf-8');
}

async function uploadToCloudinary(buffer, filename, folder) {
  return uploadBuffer(buffer, filename, folder, 'image');
}

export async function generateImage({ prompt, headline, cta, platform, dimensions, brandColors }) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { success: false, error: 'Prompt is required' };
  }

  const visualPrompt = buildVisualPrompt({ prompt, brandColors });
  const { width, height } = getDimensions(dimensions);
  const warnings = [];
  const timestamp = Date.now();
  const subheadline = 'Learn simple design steps to create a clean and professional poster.';
  const finalHeadline = headline || FALLBACK_HEADLINE;
  const finalCta = cta || FALLBACK_CTA;

  // Try Pollinations first — get background image only (no text)
  let pollResult = await generateWithPollinations(visualPrompt, width, height);
  if (pollResult.success && pollResult.buffer) {
    try {
      const composed = await overlayTextOnImage(pollResult.buffer, { headline: finalHeadline, subheadline, cta: finalCta });
      const storage = await uploadToCloudinary(composed, `poster-${timestamp}.png`, 'posters');
      return {
        success: true, provider: 'pollinations',
        imageUrl: storage.url, publicId: storage.publicId,
        prompt: visualPrompt, generatedAt: new Date().toISOString(), warnings,
      };
    } catch (composeErr) {
      warnings.push('Image generated but text overlay failed');
      const storage = await uploadToCloudinary(pollResult.buffer, `poster-${timestamp}.png`, 'posters');
      return {
        success: true, provider: 'pollinations',
        imageUrl: storage.url, publicId: storage.publicId,
        prompt: visualPrompt, generatedAt: new Date().toISOString(), warnings,
      };
    }
  }
  warnings.push(`Pollinations failed${pollResult.error ? ': ' + pollResult.error.slice(0, 100) : ''}`);

  // Try Fal.ai second
  if (process.env.FAL_KEY) {
    const falResult = await generateWithFal(visualPrompt);
    if (falResult.success && falResult.imageUrl) {
      try {
        const imgResp = await axios.get(falResult.imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
        const rawBuffer = Buffer.from(imgResp.data);
        const composed = await overlayTextOnImage(rawBuffer, { headline: finalHeadline, subheadline, cta: finalCta });
        const storage = await uploadToCloudinary(composed, `poster-${timestamp}.png`, 'posters');
        return {
          success: true, provider: 'fal.ai',
          imageUrl: storage.url, publicId: storage.publicId,
          prompt: visualPrompt, generatedAt: new Date().toISOString(), warnings,
        };
      } catch (uploadErr) {
        warnings.push('Fal image generated but compose/upload failed');
        return {
          success: true, provider: 'fal.ai',
          imageUrl: falResult.imageUrl, publicId: null,
          prompt: visualPrompt, generatedAt: new Date().toISOString(), warnings,
        };
      }
    }
    warnings.push(`Fal failed: ${(falResult.diagnostic?.message || falResult.error || 'unknown').slice(0, 100)}`);
  }

  // SVG fallback — text is natively correct here
  warnings.push('AI image providers unavailable. SVG fallback generated.');
  const svgBuffer = generateSvgPoster({ headline: finalHeadline, subheadline, cta: finalCta, brandColors });
  const storage = await uploadToCloudinary(svgBuffer, `poster-${timestamp}.svg`, 'posters');

  return {
    success: true, provider: 'svg-fallback',
    imageUrl: storage.url, publicId: storage.publicId,
    prompt: visualPrompt, generatedAt: new Date().toISOString(), warnings,
  };
}

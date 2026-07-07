import axios from 'axios';
import { uploadBuffer } from './storage.service.js';

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function buildPrompt({ prompt, headline, cta, platform, brandColors }) {
  let finalPrompt = prompt;
  if (headline) finalPrompt += `, headline: "${headline}"`;
  if (cta) finalPrompt += `, call to action: "${cta}"`;
  if (platform) finalPrompt += `, optimized for ${platform}`;
  if (brandColors?.length) finalPrompt += `, brand colors: ${brandColors.join(', ')}`;
  finalPrompt += ', professional marketing poster design, clean modern style, high quality';
  return finalPrompt;
}

function getDimensions(dimensions) {
  const dims = (dimensions || '1080x1080').split('x').map(Number);
  return { width: dims[0] || 1080, height: dims[1] || 1080 };
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

function generateSvgPoster({ prompt, headline, cta, platform, brandColors }) {
  const bgColor = brandColors?.[0] || '#2563eb';
  const accentColor = brandColors?.[1] || '#111827';
  const safeTitle = escapeXml(headline || 'AI Marketing Platform');
  const safeCta = escapeXml(cta || 'Learn More');
  const safePlatform = escapeXml(platform || 'Digital');
  const safePrompt = escapeXml(prompt ? (prompt.slice(0, 120) + (prompt.length > 120 ? '...' : '')) : '');

  const wrapText = (text, maxChars) => {
    if (!text || text.length <= maxChars) return text;
    const words = text.split(' ');
    let line = '';
    const lines = [];
    words.forEach(w => {
      const test = line ? `${line} ${w}` : w;
      if (test.length > maxChars) { lines.push(line); line = w; }
      else { line = test; }
    });
    if (line) lines.push(line);
    return lines.slice(0, 3).join('&#10;') + (lines.length > 3 ? '...' : '');
  };

  const wrappedTitle = wrapText(safeTitle, 30);
  const wrappedPrompt = wrapText(safePrompt, 45);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentColor};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:rgba(255,255,255,0.15)" />
      <stop offset="100%" style="stop-color:rgba(255,255,255,0)" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)" rx="20"/>
  <rect x="0" y="0" width="1080" height="400" fill="url(#accent)"/>
  <text x="540" y="160" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="rgba(255,255,255,0.5)" letter-spacing="4">${safePlatform.toUpperCase()}</text>
  <text x="540" y="280" text-anchor="middle" font-family="system-ui, sans-serif" font-size="56" font-weight="800" fill="white" letter-spacing="-1" filter="url(#shadow)"><tspan x="540" dy="0">${wrappedTitle.split('&#10;').join('</tspan><tspan x="540" dy="68">')}</tspan></text>
  <line x1="440" y1="440" x2="640" y2="440" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
  <text x="540" y="520" text-anchor="middle" font-family="system-ui, sans-serif" font-size="28" fill="rgba(255,255,255,0.85)" font-style="italic"><tspan x="540" dy="0">${wrappedPrompt.split('&#10;').join('</tspan><tspan x="540" dy="40">')}</tspan></text>
  <rect x="340" y="660" width="400" height="76" rx="38" fill="white" opacity="0.95" filter="url(#shadow)"/>
  <text x="540" y="712" text-anchor="middle" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="${accentColor}">${safeCta}</text>
  <text x="540" y="960" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="rgba(255,255,255,0.4)">AI Marketing Platform</text>
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

  const finalPrompt = buildPrompt({ prompt, headline, cta, platform, brandColors });
  const { width, height } = getDimensions(dimensions);
  const warnings = [];
  const timestamp = Date.now();

  // Try Pollinations first
  let pollResult = await generateWithPollinations(finalPrompt, width, height);
  if (pollResult.success && pollResult.buffer) {
    const storage = await uploadToCloudinary(pollResult.buffer, `poster-${timestamp}.png`, 'posters');
    return {
      success: true, provider: 'pollinations',
      imageUrl: storage.url, publicId: storage.publicId,
      prompt: finalPrompt, generatedAt: new Date().toISOString(), warnings,
    };
  }
  warnings.push(`Pollinations failed${pollResult.error ? ': ' + pollResult.error.slice(0, 100) : ''}`);

  // Try Fal.ai second
  if (process.env.FAL_KEY) {
    const falResult = await generateWithFal(finalPrompt);
    if (falResult.success && falResult.imageUrl) {
      try {
        const imgResp = await axios.get(falResult.imageUrl, { responseType: 'arraybuffer', timeout: 30000 });
        const buffer = Buffer.from(imgResp.data);
        const storage = await uploadToCloudinary(buffer, `poster-${timestamp}.png`, 'posters');
        return {
          success: true, provider: 'fal.ai',
          imageUrl: storage.url, publicId: storage.publicId,
          prompt: finalPrompt, generatedAt: new Date().toISOString(), warnings,
        };
      } catch (uploadErr) {
        warnings.push('Fal image generated but download/upload failed');
        return {
          success: true, provider: 'fal.ai',
          imageUrl: falResult.imageUrl, publicId: null,
          prompt: finalPrompt, generatedAt: new Date().toISOString(), warnings,
        };
      }
    }
    warnings.push(`Fal failed: ${(falResult.diagnostic?.message || falResult.error || 'unknown').slice(0, 100)}`);
  }

  // SVG fallback
  warnings.push('AI image providers unavailable. SVG fallback generated.');
  const svgBuffer = generateSvgPoster({ prompt: finalPrompt, headline, cta, platform, brandColors });
  const storage = await uploadToCloudinary(svgBuffer, `poster-${timestamp}.svg`, 'posters');

  return {
    success: true, provider: 'svg-fallback',
    imageUrl: storage.url, publicId: storage.publicId,
    prompt: finalPrompt, generatedAt: new Date().toISOString(), warnings,
  };
}

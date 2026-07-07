import { uploadBuffer } from './storage.service.js';

const REPLICATE_IMAGE_MODEL = process.env.REPLICATE_IMAGE_MODEL || 'black-forest-labs/flux-schnell';
const HUGGINGFACE_IMAGE_MODEL = process.env.HUGGINGFACE_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function generateWithReplicate(prompt, width, height) {
  const hasToken = !!process.env.REPLICATE_API_TOKEN;
  try {
    if (!hasToken) {
      console.error('[Replicate Image Error]', { configured: false, reason: 'missing_api_key' });
      return { success: false, error: 'Replicate API token not configured', diagnostic: { configured: false, reason: 'missing_api_key' } };
    }
    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const input = { prompt, num_outputs: 1, output_format: 'png' };
    if (width && height) { input.width = width; input.height = height; }
    const output = await replicate.run(REPLICATE_IMAGE_MODEL, { input });
    const imageUrl = Array.isArray(output) ? output[0] : output;
    return { success: true, provider: 'replicate', imageUrl };
  } catch (err) {
    const status = err?.response?.status || err?.status || 0;
    const errType = err?.response?.data?.detail || err?.message || '';
    const isModelNotFound = errType.includes('not found') || errType.includes('invalid version') || status === 404;
    const isAuthError = status === 401 || status === 403;
    const isQuotaError = status === 429 || errType.includes('quota') || errType.includes('rate limit') || errType.includes('billing');
    const diagnostic = {
      provider: 'replicate',
      configured: hasToken,
      model: REPLICATE_IMAGE_MODEL,
      status,
      errorType: isModelNotFound ? 'model_not_found' : isAuthError ? 'invalid_key' : isQuotaError ? 'quota_or_billing_issue' : 'api_error',
      message: errType.slice(0, 200)
    };
    console.error('[Replicate Image Error]', diagnostic);
    return { success: false, error: errType, diagnostic };
  }
}

async function generateWithHuggingFace(prompt) {
  const hasToken = !!process.env.HUGGINGFACE_API_KEY;
  try {
    if (!hasToken) {
      console.error('[HuggingFace Image Error]', { configured: false, reason: 'missing_api_key' });
      return { success: false, error: 'HuggingFace API key not configured', diagnostic: { configured: false, reason: 'missing_api_key' } };
    }
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HUGGINGFACE_IMAGE_MODEL}`,
      {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
        method: 'POST',
        body: JSON.stringify({ inputs: prompt }),
      }
    );
    if (!response.ok) {
      const status = response.status;
      let reason = 'api_error';
      if (status === 401 || status === 403) reason = 'invalid_key_or_no_access';
      else if (status === 404) reason = 'model_not_found';
      else if (status === 429) reason = 'rate_limit';
      else if (status === 503) reason = 'model_loading_or_unavailable';
      const diagnostic = { provider: 'huggingface', configured: hasToken, model: HUGGINGFACE_IMAGE_MODEL, status, reason };
      console.error('[HuggingFace Image Error]', diagnostic);
      return { success: false, error: `HuggingFace returned ${status}`, diagnostic };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { success: true, provider: 'huggingface', buffer };
  } catch (err) {
    const diagnostic = { provider: 'huggingface', configured: hasToken, model: HUGGINGFACE_IMAGE_MODEL, error: err.message?.slice(0, 200) };
    console.error('[HuggingFace Image Error]', diagnostic);
    return { success: false, error: err.message, diagnostic };
  }
}

function generateSvgPoster({ prompt, headline, cta, platform, brandColors }) {
  const bgColor = brandColors?.[0] || '#2563eb';
  const accentColor = brandColors?.[1] || '#111827';
  const safeTitle = escapeXml(headline || 'AI Marketing Platform');
  const safeCta = escapeXml(cta || 'Learn More');
  const safePlatform = escapeXml(platform || 'Digital');
  const safePrompt = escapeXml(prompt ? (prompt.slice(0, 120) + (prompt.length > 120 ? '...' : '')) : '');

  const wrapText = (text, maxChars, fontSize) => {
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

  const wrappedTitle = wrapText(safeTitle, 30, 56);
  const wrappedPrompt = wrapText(safePrompt, 45, 28);

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
  <text x="540" y="960" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="rgba(255,255,255,0.4)">Generated by AI Marketing Platform</text>
</svg>`;

  return Buffer.from(svg, 'utf-8');
}

function buildImagePrompt({ prompt, headline, cta, platform, brandColors }) {
  let finalPrompt = prompt;
  if (headline) finalPrompt += `, headline: "${headline}"`;
  if (cta) finalPrompt += `, call to action: "${cta}"`;
  if (platform) finalPrompt += `, optimized for ${platform}`;
  if (brandColors?.length) finalPrompt += `, brand colors: ${brandColors.join(', ')}`;
  finalPrompt += ', professional marketing poster design, clean modern style, high quality';
  return finalPrompt;
}

export async function generateImage({ prompt, headline, cta, platform, dimensions, brandColors }) {
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { success: false, error: 'Prompt is required' };
  }

  const finalPrompt = buildImagePrompt({ prompt, headline, cta, platform, brandColors });
  const dims = (dimensions || '1080x1080').split('x').map(Number);
  const width = dims[0] || 1080;
  const height = dims[1] || 1080;
  const warnings = [];
  let result;

  // Try Replicate first
  if (process.env.REPLICATE_API_TOKEN) {
    result = await generateWithReplicate(finalPrompt, width, height);
    if (result.success) {
      try {
        const fetch = (await import('node-fetch')).default;
        const imgResp = await fetch(result.imageUrl);
        const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
        const storage = await uploadBuffer(imgBuffer, `poster-${Date.now()}.png`, 'posters', 'image');
        return {
          success: true, provider: 'replicate',
          imageUrl: storage.url, cloudinaryPublicId: storage.publicId,
          prompt: finalPrompt, generatedAt: new Date().toISOString(), warnings,
        };
      } catch (err) {
        warnings.push('Image generated but upload failed');
        console.error('[ImageService] Replicate upload failed:', { message: err.message?.slice(0, 200) });
        return {
          success: true, provider: 'replicate',
          imageUrl: result.imageUrl, cloudinaryPublicId: null,
          prompt: finalPrompt, generatedAt: new Date().toISOString(), warnings,
        };
      }
    }
    const diag = result.diagnostic || {};
    warnings.push(`Replicate image generation failed: ${diag.reason || diag.errorType || 'unknown error'}`);
    warnings.push('Trying HuggingFace');
  }

  // Try HuggingFace second
  if (process.env.HUGGINGFACE_API_KEY) {
    result = await generateWithHuggingFace(finalPrompt);
    if (result.success && result.buffer) {
      const storage = await uploadBuffer(result.buffer, `poster-${Date.now()}.png`, 'posters', 'image');
      return {
        success: true, provider: 'huggingface',
        imageUrl: storage.url, cloudinaryPublicId: storage.publicId,
        prompt: finalPrompt, generatedAt: new Date().toISOString(), warnings,
      };
    }
    const diag = result.diagnostic || {};
    warnings.push(`HuggingFace image generation failed: ${diag.reason || diag.errorType || 'unknown error'}`);
    warnings.push('Using SVG fallback');
  }

  // Local SVG fallback
  warnings.push('AI image providers unavailable. SVG fallback generated successfully.');
  const svgBuffer = generateSvgPoster({ prompt: finalPrompt, headline, cta, platform, brandColors });
  const storage = await uploadBuffer(svgBuffer, `poster-${Date.now()}.svg`, 'posters', 'image');

  return {
    success: true, provider: 'svg-fallback',
    imageUrl: storage.url, cloudinaryPublicId: storage.publicId,
    prompt: finalPrompt, generatedAt: new Date().toISOString(), warnings,
  };
}

export async function checkImageProviders() {
  const hf = !!process.env.HUGGINGFACE_API_KEY;
  const rep = !!process.env.REPLICATE_API_TOKEN;
  let reason = null;
  if (!hf && !rep) reason = 'no_providers_configured';
  else if (!hf) reason = 'only_replicate_configured';
  else if (!rep) reason = 'only_huggingface_configured';
  else reason = 'both_configured';
  return { huggingface: hf, replicate: rep, reason };
}

export async function testReplicateConnection() {
  const hasToken = !!process.env.REPLICATE_API_TOKEN;
  if (!hasToken) return { success: false, reason: 'missing_api_key', provider: 'replicate' };
  try {
    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const input = { prompt: 'simple modern marketing poster', num_outputs: 1, output_format: 'png', width: 512, height: 512 };
    const output = await replicate.run(REPLICATE_IMAGE_MODEL, { input });
    if (output) return { success: true, reason: 'configured', provider: 'replicate', model: REPLICATE_IMAGE_MODEL };
    return { success: false, reason: 'empty_response', provider: 'replicate' };
  } catch (err) {
    const status = err?.response?.status || err?.status || 0;
    const msg = err?.response?.data?.detail || err?.message || '';
    let reason = 'unknown_error';
    if (msg.includes('not found') || msg.includes('invalid version') || status === 404) reason = 'model_not_found';
    else if (status === 401 || status === 403) reason = 'invalid_key';
    else if (status === 429 || msg.includes('quota') || msg.includes('rate limit') || msg.includes('billing')) reason = 'quota_or_billing_issue';
    return { success: false, reason, provider: 'replicate', model: REPLICATE_IMAGE_MODEL, status, detail: msg.slice(0, 200) };
  }
}

export async function testHuggingFaceConnection() {
  const hasToken = !!process.env.HUGGINGFACE_API_KEY;
  if (!hasToken) return { success: false, reason: 'missing_api_key', provider: 'huggingface' };
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HUGGINGFACE_IMAGE_MODEL}`,
      {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
        method: 'POST',
        body: JSON.stringify({ inputs: 'simple test' }),
      }
    );
    if (response.ok) return { success: true, reason: 'configured', provider: 'huggingface', model: HUGGINGFACE_IMAGE_MODEL };
    const status = response.status;
    let reason = 'api_error';
    if (status === 401 || status === 403) reason = 'invalid_key_or_no_access';
    else if (status === 404) reason = 'model_not_found';
    else if (status === 429) reason = 'rate_limit';
    else if (status === 503) reason = 'model_loading_or_unavailable';
    return { success: false, reason, provider: 'huggingface', model: HUGGINGFACE_IMAGE_MODEL, status };
  } catch (err) {
    return { success: false, reason: 'unknown_error', provider: 'huggingface', model: HUGGINGFACE_IMAGE_MODEL, detail: err.message?.slice(0, 200) };
  }
}

export { REPLICATE_IMAGE_MODEL, HUGGINGFACE_IMAGE_MODEL };

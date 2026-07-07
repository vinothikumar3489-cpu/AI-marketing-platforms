import { uploadBuffer } from './storage.service.js';

const PRIMARY_MODELS = [
  process.env.REPLICATE_IMAGE_MODEL || 'black-forest-labs/flux-schnell',
  'black-forest-labs/flux-schnell',
  'stability-ai/sdxl',
  'bytedance/sdxl-lightning-4step',
].filter(Boolean);
const REPLICATE_IMAGE_MODEL = PRIMARY_MODELS[0];
const HUGGINGFACE_IMAGE_MODEL = process.env.HUGGINGFACE_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell';

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function dimensionsToAspectRatio(width, height) {
  if (!width || !height) return '1:1';
  const ratios = [
    { w: 1, h: 1, label: '1:1' },
    { w: 4, h: 3, label: '4:3' },
    { w: 3, h: 2, label: '3:2' },
    { w: 16, h: 9, label: '16:9' },
    { w: 9, h: 16, label: '9:16' },
    { w: 3, h: 4, label: '3:4' },
  ];
  const ratio = width / height;
  let best = ratios[0];
  let bestDiff = Math.abs(ratio - best.w / best.h);
  for (const r of ratios) {
    const diff = Math.abs(ratio - r.w / r.h);
    if (diff < bestDiff) { best = r; bestDiff = diff; }
  }
  return best.label;
}

function extractImageUrl(output) {
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (output instanceof URL) return output.href;
  if (typeof output?.url === 'function') {
    const u = output.url();
    return u instanceof URL ? u.href : u;
  }
  if (typeof output?.toString === 'function') return output.toString();
  if (Array.isArray(output)) return extractImageUrl(output[0]);
  return null;
}

async function generateWithReplicate(prompt, width, height) {
  const hasToken = !!process.env.REPLICATE_API_TOKEN;
  const startMs = Date.now();
  try {
    if (!hasToken) {
      console.error('[Replicate Image Error]', { configured: false, reason: 'missing_api_key' });
      return { success: false, error: 'Replicate API token not configured', diagnostic: { configured: false, reason: 'missing_api_key' } };
    }
    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN, useFileOutput: false });
    const aspectRatio = dimensionsToAspectRatio(width, height);
    const input = { prompt, num_outputs: 1, output_format: 'png', aspect_ratio: aspectRatio };
    const output = await replicate.run(REPLICATE_IMAGE_MODEL, { input });
    const imageUrl = extractImageUrl(output);
    if (!imageUrl) return { success: false, error: 'Empty output from Replicate', diagnostic: { provider: 'replicate', model: REPLICATE_IMAGE_MODEL, errorType: 'empty_output' } };
    return { success: true, provider: 'replicate', imageUrl, latency: Date.now() - startMs };
  } catch (err) {
    const status = err?.response?.status || err?.status || 0;
    const errData = err?.response?.data;
    const errMsg = typeof errData === 'object' ? JSON.stringify(errData) : (errData || err?.message || '');
    const isModelNotFound = errMsg.includes('not found') || errMsg.includes('invalid version') || status === 404;
    const isAuthError = status === 401 || status === 403 || errMsg.includes('invalid token');
    const isQuotaError = status === 429 || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('billing') || errMsg.toLowerCase().includes('payment');
    let errorType = 'api_error';
    if (isModelNotFound) errorType = 'model_not_found';
    else if (isAuthError) errorType = 'invalid_key';
    else if (isQuotaError) errorType = 'quota_or_billing_issue';
    else if (errMsg.includes('input') || errMsg.includes('schema') || errMsg.includes('validation')) errorType = 'invalid_payload';
    else if (err.name === 'AbortError' || errMsg.includes('timeout')) errorType = 'timeout';
    const diagnostic = {
      provider: 'replicate',
      configured: hasToken,
      model: REPLICATE_IMAGE_MODEL,
      status,
      errorType,
      message: (errMsg || err?.message || '').slice(0, 300),
    };
    console.error('[Replicate Image Error]', diagnostic);
    return { success: false, error: errMsg, diagnostic, latency: Date.now() - startMs };
  }
}

async function generateWithReplicateFallback(prompt, width, height) {
  let lastError = null;
  for (const model of PRIMARY_MODELS) {
    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN, useFileOutput: false });
    const aspectRatio = dimensionsToAspectRatio(width, height);
    const input = { prompt, num_outputs: 1, output_format: 'png', aspect_ratio: aspectRatio };
    try {
      const output = await replicate.run(model, { input });
      const imageUrl = extractImageUrl(output);
      if (imageUrl) return { success: true, provider: 'replicate', imageUrl, model };
    } catch (fallbackErr) {
      lastError = fallbackErr;
      console.warn(`[Replicate] Model ${model} failed, trying next:`, fallbackErr.message?.slice(0, 100));
    }
  }
  return { success: false, error: lastError?.message || 'All Replicate models failed', diagnostic: { provider: 'replicate', configured: true, errorType: 'all_models_failed' } };
}

async function generateWithHuggingFace(prompt) {
  const hasToken = !!process.env.HUGGINGFACE_API_KEY;
  try {
    if (!hasToken) {
      console.error('[HuggingFace Image Error]', { configured: false, reason: 'missing_api_key' });
      return { success: false, error: 'HuggingFace API key not configured', diagnostic: { configured: false, reason: 'missing_api_key' } };
    }
    const fetch = (await import('node-fetch')).default;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HUGGINGFACE_IMAGE_MODEL}`,
      {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
        method: 'POST',
        body: JSON.stringify({ inputs: prompt }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!response.ok) {
      const status = response.status;
      let body = '';
      try { body = await response.text(); } catch {}
      let reason = 'api_error';
      if (status === 401 || status === 403) reason = body.includes('token') ? 'invalid_key' : 'no_access';
      else if (status === 404) reason = 'model_not_found';
      else if (status === 429) reason = 'rate_limit';
      else if (status === 503) reason = 'model_loading_or_unavailable';
      const diagnostic = { provider: 'huggingface', configured: hasToken, model: HUGGINGFACE_IMAGE_MODEL, status, reason, body: body.slice(0, 300) };
      console.error('[HuggingFace Image Error]', diagnostic);
      return { success: false, error: `HuggingFace returned ${status}: ${body.slice(0, 200)}`, diagnostic };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return { success: true, provider: 'huggingface', buffer };
  } catch (err) {
    const diagnostic = { provider: 'huggingface', configured: hasToken, model: HUGGINGFACE_IMAGE_MODEL, error: err.message?.slice(0, 300) };
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
    if (!result.success && PRIMARY_MODELS.length > 1) {
      result = await generateWithReplicateFallback(finalPrompt, width, height);
    }
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
    const reasonStr = diag.errorType || diag.reason || 'unknown_error';
    warnings.push(`Replicate failed: ${reasonStr}${diag.status ? ` (HTTP ${diag.status})` : ''}${diag.model ? ` — model: ${diag.model}` : ''}`);
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
    const hfReason = diag.reason || diag.errorType || 'unknown_error';
    warnings.push(`HuggingFace failed: ${hfReason}${diag.status ? ` (HTTP ${diag.status})` : ''}${diag.body ? ` — ${String(diag.body).slice(0, 200)}` : ''}`);
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
  const startMs = Date.now();
  try {
    const Replicate = (await import('replicate')).default;
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN, useFileOutput: false });
    const input = { prompt: 'simple professional marketing poster', num_outputs: 1, output_format: 'png', aspect_ratio: '1:1' };
    const output = await replicate.run(REPLICATE_IMAGE_MODEL, { input });
    const imageUrl = extractImageUrl(output);
    const latency = Date.now() - startMs;
    return {
      success: true, reason: 'configured', provider: 'replicate',
      model: REPLICATE_IMAGE_MODEL, latency,
      outputType: typeof output,
      previewUrl: imageUrl?.slice(0, 100) || null,
    };
  } catch (err) {
    const status = err?.response?.status || err?.status || 0;
    const errData = err?.response?.data;
    const msg = typeof errData === 'object' ? JSON.stringify(errData) : (errData || err?.message || '');
    let reason = 'unknown_error';
    if (msg.includes('not found') || msg.includes('invalid version') || status === 404) reason = 'model_not_found';
    else if (status === 401 || status === 403 || msg.includes('invalid token')) reason = 'invalid_key';
    else if (status === 429 || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('billing') || msg.toLowerCase().includes('payment')) reason = 'quota_or_billing_issue';
    else if (msg.includes('input') || msg.includes('schema') || msg.includes('validation')) reason = 'invalid_payload';
    const latency = Date.now() - startMs;
    return { success: false, reason, provider: 'replicate', model: REPLICATE_IMAGE_MODEL, status, detail: msg.slice(0, 300), latency };
  }
}

export async function testHuggingFaceConnection() {
  const hasToken = !!process.env.HUGGINGFACE_API_KEY;
  if (!hasToken) return { success: false, reason: 'missing_api_key', provider: 'huggingface' };
  try {
    const fetch = (await import('node-fetch')).default;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HUGGINGFACE_IMAGE_MODEL}`,
      {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
        method: 'POST',
        body: JSON.stringify({ inputs: 'simple test' }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (response.ok) return { success: true, reason: 'configured', provider: 'huggingface', model: HUGGINGFACE_IMAGE_MODEL };
    const status = response.status;
    let body = '';
    try { body = await response.text(); } catch {}
    let reason = 'api_error';
    if (status === 401 || status === 403) reason = body.includes('token') ? 'invalid_key' : 'no_access';
    else if (status === 404) reason = 'model_not_found';
    else if (status === 429) reason = 'rate_limit';
    else if (status === 503) reason = 'model_loading_or_unavailable';
    return { success: false, reason, provider: 'huggingface', model: HUGGINGFACE_IMAGE_MODEL, status, body: body.slice(0, 300) };
  } catch (err) {
    return { success: false, reason: 'unknown_error', provider: 'huggingface', model: HUGGINGFACE_IMAGE_MODEL, detail: err.message?.slice(0, 300) };
  }
}

export { REPLICATE_IMAGE_MODEL, HUGGINGFACE_IMAGE_MODEL };

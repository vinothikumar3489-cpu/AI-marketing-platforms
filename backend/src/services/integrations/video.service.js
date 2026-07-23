import axios from 'axios';
import sharp from 'sharp';
import { uploadBuffer } from "./storage.service.js";

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function generateFallbackStoryboard(script, scenes) {
  const storyboard = `# Video Storyboard (Fallback)

${script ? `## Script\n\n${script}\n\n` : ''}

## Storyboard Scenes

${(scenes || []).map((scene, i) => `### Scene ${i + 1}: ${scene.title || 'Untitled'}
- **Visual:** ${scene.visual || 'Not specified'}
- **Voiceover:** ${scene.voiceover || 'None'}
- **Duration:** ${scene.duration || 5}s
`).join('\n')}

---
*Generated at ${new Date().toISOString()} | MP4 rendering not available*
`;
  return storyboard;
}

async function generateSlideImage(scene, index, aspectRatio) {
  const dims = aspectRatio === '9:16' ? { w: 720, h: 1280 }
    : aspectRatio === '1:1' ? { w: 1080, h: 1080 }
    : { w: 1920, h: 1080 };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dims.w}" height="${dims.h}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
    </defs>
    <rect width="${dims.w}" height="${dims.h}" fill="url(#bg)"/>
    <text x="${dims.w/2}" y="${dims.h*0.3}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(dims.w*0.04)}" font-weight="700" fill="white" filter="url(#shadow)">${escapeXml(scene.title || `Scene ${index + 1}`)}</text>
    <text x="${dims.w*0.1}" y="${dims.h*0.5}" width="${dims.w*0.8}" font-family="system-ui, sans-serif" font-size="${Math.round(dims.w*0.025)}" fill="rgba(255,255,255,0.85)">${escapeXml(scene.visual || '')}</text>
    ${scene.voiceover ? `<text x="${dims.w*0.1}" y="${dims.h*0.75}" width="${dims.w*0.8}" font-family="system-ui, sans-serif" font-size="${Math.round(dims.w*0.02)}" fill="rgba(255,255,255,0.5)" font-style="italic">VO: ${escapeXml(scene.voiceover)}</text>` : ''}
    <text x="${dims.w/2}" y="${dims.h*0.9}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(dims.w*0.018)}" fill="rgba(255,255,255,0.3)">AI Marketing Platform • Slide ${index + 1}</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderVideo({ script, scenes, duration, platform, aspectRatio }) {
  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    return { success: false, error: 'At least one scene is required' };
  }

  const warnings = [];
  const ratio = aspectRatio || '16:9';

  // Try Shotstack first
  if (process.env.SHOTSTACK_API_KEY) {
    try {
      const shotResult = await renderWithShotstack(scenes, ratio, duration);
      if (shotResult.success) {
        return shotResult;
      }
      warnings.push(`Shotstack: ${(shotResult.error || 'unknown').slice(0, 150)}`);
    } catch (err) {
      warnings.push(`Shotstack error: ${err.message?.slice(0, 100)}`);
    }
  }

  // Try Creatomate second
  if (process.env.CREATOMATE_API_KEY) {
    try {
      const creaResult = await renderWithCreatomate(scenes, ratio, duration);
      if (creaResult.success) {
        return creaResult;
      }
      warnings.push(`Creatomate: ${(creaResult.error || 'unknown').slice(0, 150)}`);
    } catch (err) {
      warnings.push(`Creatomate error: ${err.message?.slice(0, 100)}`);
    }
  }

  // Cloudinary video assembly fallback
  try {
    const slideBuffers = [];
    for (let i = 0; i < scenes.length; i++) {
      const buf = await generateSlideImage(scenes[i], i, ratio);
      slideBuffers.push(buf);
    }
    if (slideBuffers.length > 0) {
      const totalSlides = slideBuffers.length;
      const perSlideMs = Math.max(2000, ((duration || totalSlides * 5) * 1000) / totalSlides);
      const cloudResult = await renderCloudinarySlideshow(slideBuffers, perSlideMs, ratio);
      if (cloudResult.success) {
        return {
          success: true, provider: 'cloudinary-slideshow',
          videoUrl: cloudResult.url, cloudinaryPublicId: cloudResult.publicId,
          duration: duration || totalSlides * 5,
          generatedAt: new Date().toISOString(), warnings,
        };
      }
      warnings.push(`Cloudinary slideshow: ${cloudResult.error}`);
    }
  } catch (err) {
    warnings.push(`Slide generation error: ${err.message?.slice(0, 100)}`);
  }

  // Storyboard fallback
  warnings.push('Video APIs unavailable. Storyboard fallback generated.');
  const storyboard = generateFallbackStoryboard(script, scenes);
  return {
    success: true, provider: 'storyboard-fallback', videoUrl: null,
    storyboard, duration: duration || scenes.reduce((sum, s) => sum + (s.duration || 5), 0),
    generatedAt: new Date().toISOString(), warnings,
  };
}

async function renderWithShotstack(scenes, aspectRatio, duration) {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  const stage = process.env.SHOTSTACK_STAGE || 'stage';
  const dims = aspectRatio === '9:16' ? { w: 720, h: 1280 }
    : aspectRatio === '1:1' ? { w: 1080, h: 1080 }
    : { w: 1920, h: 1080 };
  const totalDuration = duration || scenes.reduce((sum, s) => sum + (s.duration || 5), 0);
  const perSlide = Math.max(2, totalDuration / scenes.length);

  const clips = scenes.map((scene, i) => ({
    asset: {
      type: 'title',
      text: scene.title || `Scene ${i + 1}`,
      style: 'default',
      size: { w: dims.w, h: dims.h },
    },
    start: i * perSlide,
    length: perSlide,
    transition: { in: 'fade', out: 'fade' },
  }));

  const timeline = {
    timeline: {
      soundtrack: null,
      background: '#1a1a2e',
      tracks: [{ clips }],
      cache: false,
    },
    output: {
      format: 'mp4',
      resolution: aspectRatio === '9:16' ? 'portrait' : aspectRatio === '1:1' ? 'square' : 'landscape',
      aspectRatio: aspectRatio,
    },
  };

  const response = await axios.post(
    `https://api.shotstack.io/edit/${stage}/render`,
    timeline,
    {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );
  const data = response.data;
  if (data?.success) {
    return {
      success: true, provider: 'shotstack',
      status: 'queued', renderId: data?.response?.id,
    };
  }
  return { success: false, error: data?.message || 'Shotstack returned error' };
}

async function renderWithCreatomate(scenes, aspectRatio, duration) {
  const apiKey = process.env.CREATOMATE_API_KEY;
  const totalDuration = duration || scenes.reduce((sum, s) => sum + (s.duration || 5), 0);

  const response = await axios.post(
    'https://api.creatomate.com/v1/renders',
    {
      templateName: 'Marketing Video',
      modifications: {
        scenes: scenes.map((scene, i) => ({
          title: scene.title || `Scene ${i + 1}`,
          text: scene.visual || '',
          voiceover: scene.voiceover || '',
          duration: scene.duration || Math.ceil(totalDuration / scenes.length),
        })),
        aspect_ratio: aspectRatio || '16:9',
      },
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );
  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  if (data?.id) {
    return {
      success: true, provider: 'creatomate',
      status: data.status === 'completed' ? 'completed' : 'queued',
      renderId: data.id, videoUrl: data.url || null,
    };
  }
  return { success: false, error: 'Creatomate returned no render ID' };
}

async function renderCloudinarySlideshow(slideBuffers, slideDurationMs, aspectRatio) {
  const dims = aspectRatio === '9:16' ? { w: 720, h: 1280 }
    : aspectRatio === '1:1' ? { w: 1080, h: 1080 }
    : { w: 1920, h: 1080 };

  try {
    const { v2: cloudinary } = await import('cloudinary');
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadPromises = slideBuffers.map((buf, i) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'ai-marketing/video-slides', public_id: `slide-${Date.now()}-${i}`, resource_type: 'image' },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
        stream.end(buf);
      });
    });

    const uploadResults = await Promise.all(uploadPromises);
    const publicIds = uploadResults.map(r => r.public_id);

    const slideDurationSec = Math.max(1, slideDurationMs / 1000);
    const multiUrl = cloudinary.url('ai-marketing/video-slides', {
      resource_type: 'video',
      transformation: [
        { width: dims.w, height: dims.h, crop: 'pad', background: '#1a1a2e' },
        { duration: slideDurationSec * slideBuffers.length, flags: 'streaming_attachment' },
        { overlay: { public_id: publicIds[0] }, duration: slideDurationSec },
        ...publicIds.slice(1).flatMap(id => [
          { overlay: { public_id: id }, duration: slideDurationSec }
        ]),
      ],
    });

    return { success: true, url: multiUrl, publicId: `ai-marketing/video-slides` };
  } catch (err) {
    return { success: false, error: err.message?.slice(0, 200) };
  }
}

export async function checkVideoProvider() {
  const shotstack = !!process.env.SHOTSTACK_API_KEY;
  const creatomate = !!process.env.CREATOMATE_API_KEY;
  const provider = shotstack ? 'shotstack' : creatomate ? 'creatomate' : null;
  const reason = shotstack ? 'shotstack_configured' : creatomate ? 'creatomate_configured' : 'no_video_provider';
  return { configured: shotstack || creatomate, provider, reason, shotstackConfigured: shotstack, creatomateConfigured: creatomate };
}

export async function testShotstackConnection() {
  if (!process.env.SHOTSTACK_API_KEY) return { success: false, reason: 'missing_api_key', provider: 'shotstack' };
  try {
    const stage = process.env.SHOTSTACK_STAGE || 'stage';
    const response = await axios.get(`https://api.shotstack.io/edit/${stage}/status`, {
      headers: { 'x-api-key': process.env.SHOTSTACK_API_KEY },
      timeout: 10000,
    });
    return { success: response.status === 200, reason: 'configured', provider: 'shotstack', status: response.status };
  } catch (err) {
    const status = err?.response?.status || 0;
    let reason = 'api_error';
    if (status === 401 || status === 403) reason = 'invalid_key';
    return { success: false, reason, provider: 'shotstack', status, detail: err.message?.slice(0, 200) };
  }
}

export async function testCreatomateConnection() {
  if (!process.env.CREATOMATE_API_KEY) return { success: false, reason: 'missing_api_key', provider: 'creatomate' };
  try {
    const response = await axios.get('https://api.creatomate.com/v1/templates', {
      headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` },
      timeout: 10000,
    });
    return { success: Array.isArray(response.data), reason: 'configured', provider: 'creatomate', count: Array.isArray(response.data) ? response.data.length : 0 };
  } catch (err) {
    const status = err?.response?.status || 0;
    let reason = 'api_error';
    if (status === 401 || status === 403) reason = 'invalid_key';
    return { success: false, reason, provider: 'creatomate', status, detail: err.message?.slice(0, 200) };
  }
}

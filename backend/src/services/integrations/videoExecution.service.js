import axios from 'axios';
import { uploadBuffer } from './storage.service.js';

function buildShotstackTimeline(scenes, aspectRatio, duration) {
  const ratio = aspectRatio || '16:9';
  const dims = ratio === '9:16' ? { w: 720, h: 1280 }
    : ratio === '1:1' ? { w: 1080, h: 1080 }
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

  return {
    timeline: {
      soundtrack: null,
      background: '#1a1a2e',
      tracks: [{ clips }],
      cache: false,
    },
    output: {
      format: 'mp4',
      resolution: ratio === '9:16' ? 'portrait' : ratio === '1:1' ? 'square' : 'landscape',
      aspectRatio: ratio,
    },
  };
}

async function renderWithShotstack(scenes, aspectRatio, duration) {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  const stage = process.env.SHOTSTACK_STAGE || 'stage';
  if (!apiKey) return { success: false, error: 'Shotstack API key not configured', diagnostic: { provider: 'shotstack', reason: 'missing_key' } };

  try {
    const timeline = buildShotstackTimeline(scenes, aspectRatio, duration);
    const response = await axios.post(
      `https://api.shotstack.io/edit/${stage}/render`,
      timeline,
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    const data = response.data;
    if (data?.success) {
      return {
        success: true,
        provider: 'shotstack',
        status: 'queued',
        renderId: data?.response?.id,
        message: data?.message || 'Video render queued',
      };
    }
    return { success: false, error: data?.message || 'Shotstack returned error', diagnostic: { provider: 'shotstack' } };
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || '';
    const status = err?.response?.status || 0;
    console.error('[VideoExec] Shotstack failed:', { status, message: msg.slice(0, 200) });
    return { success: false, error: `Shotstack failed: ${msg.slice(0, 200)}`, diagnostic: { provider: 'shotstack', status } };
  }
}

async function renderWithCreatomate(scenes, aspectRatio, duration) {
  const apiKey = process.env.CREATOMATE_API_KEY;
  if (!apiKey) return { success: false, error: 'Creatomate API key not configured', diagnostic: { provider: 'creatomate', reason: 'missing_key' } };

  try {
    const totalDuration = duration || scenes.reduce((sum, s) => sum + (s.duration || 5), 0);
    const source = {
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
    };

    const response = await axios.post(
      'https://api.creatomate.com/v1/renders',
      source,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    const data = Array.isArray(response.data) ? response.data[0] : response.data;
    if (data?.id) {
      return {
        success: true,
        provider: 'creatomate',
        status: data.status === 'completed' ? 'completed' : 'queued',
        renderId: data.id,
        videoUrl: data.url || null,
        message: data.status === 'completed' ? 'Video ready' : 'Video render queued',
      };
    }
    return { success: false, error: 'Creatomate returned no render ID', diagnostic: { provider: 'creatomate' } };
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || '';
    const status = err?.response?.status || 0;
    console.error('[VideoExec] Creatomate failed:', { status, message: msg.slice(0, 200) });
    return { success: false, error: `Creatomate failed: ${msg.slice(0, 200)}`, diagnostic: { provider: 'creatomate', status } };
  }
}

function generateFallbackStoryboard(script, scenes) {
  return {
    type: 'storyboard',
    script: script || '',
    scenes: (scenes || []).map((scene, i) => ({
      sceneNumber: i + 1,
      title: scene.title || `Scene ${i + 1}`,
      visual: scene.visual || 'Not specified',
      voiceover: scene.voiceover || null,
      duration: scene.duration || 5,
    })),
    generatedAt: new Date().toISOString(),
  };
}

export async function renderVideo({ script, scenes, duration, platform, aspectRatio }) {
  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    return { success: false, error: 'At least one scene is required' };
  }

  const warnings = [];

  // Try Shotstack first
  if (process.env.SHOTSTACK_API_KEY) {
    const shotResult = await renderWithShotstack(scenes, aspectRatio, duration);
    if (shotResult.success) {
      return shotResult;
    }
    warnings.push(`Shotstack failed: ${(shotResult.diagnostic?.message || shotResult.error || 'unknown').slice(0, 100)}`);
  }

  // Try Creatomate second
  if (process.env.CREATOMATE_API_KEY) {
    const creaResult = await renderWithCreatomate(scenes, aspectRatio, duration);
    if (creaResult.success && creaResult.videoUrl) {
      return creaResult;
    }
    if (creaResult.success && creaResult.renderId) {
      return creaResult;
    }
    warnings.push(`Creatomate failed: ${(creaResult.diagnostic?.message || creaResult.error || 'unknown').slice(0, 100)}`);
  }

  // Storyboard fallback
  const storyboard = generateFallbackStoryboard(script, scenes);
  warnings.push('Video APIs unavailable. Storyboard fallback generated.');
  const totalDuration = duration || scenes.reduce((sum, s) => sum + (s.duration || 5), 0);

  return {
    success: true,
    provider: 'storyboard-fallback',
    status: 'fallback',
    storyboard,
    duration: totalDuration,
    generatedAt: new Date().toISOString(),
    warnings,
  };
}

export async function getVideoStatus(provider, renderId) {
  if (provider === 'shotstack' && process.env.SHOTSTACK_API_KEY) {
    try {
      const stage = process.env.SHOTSTACK_STAGE || 'stage';
      const response = await axios.get(
        `https://api.shotstack.io/edit/${stage}/render/${renderId}`,
        {
          headers: { 'x-api-key': process.env.SHOTSTACK_API_KEY },
          timeout: 10000,
        }
      );
      const data = response.data?.response || {};
      return {
        success: true,
        provider: 'shotstack',
        status: data.status,
        renderId,
        videoUrl: data.url || null,
      };
    } catch (err) {
      return { success: false, error: err.message, provider: 'shotstack' };
    }
  }
  if (provider === 'creatomate' && process.env.CREATOMATE_API_KEY) {
    try {
      const response = await axios.get(
        `https://api.creatomate.com/v1/renders/${renderId}`,
        {
          headers: { Authorization: `Bearer ${process.env.CREATOMATE_API_KEY}` },
          timeout: 10000,
        }
      );
      const data = response.data;
      return {
        success: true,
        provider: 'creatomate',
        status: data.status,
        renderId,
        videoUrl: data.url || null,
      };
    } catch (err) {
      return { success: false, error: err.message, provider: 'creatomate' };
    }
  }
  return { success: false, error: 'Unknown provider or not configured' };
}

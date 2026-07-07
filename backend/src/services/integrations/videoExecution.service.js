import axios from 'axios';
import { uploadBuffer } from './storage.service.js';

const FIGMA_SCRIPT = `How to Create a Poster Using Figma

Step 1: Open Figma and create a new frame. Set dimensions to 1080x1080 pixels for an Instagram-ready poster.

Step 2: Add a background shape. Use the rectangle tool to create a solid or gradient background. Choose colors that match your brand.

Step 3: Add visual elements. Import images or use shapes to create visual interest. Keep it clean and professional.

Step 4: Add typography. Use text layers for your headline and subheadline. Choose readable fonts with proper hierarchy.

Step 5: Add a call-to-action button. Create a rounded rectangle with contrasting color and clear action text.

Step 6: Export your poster. Go to File > Export and choose PNG format at 2x resolution for crisp output.`;

const FIGMA_SCENES = [
  {
    title: 'Open Figma and Create a New Frame',
    visual: 'Open Figma on desktop, click "New File", select frame tool and set dimensions to 1080x1080 pixels for an Instagram poster.',
    voiceover: 'Start by opening Figma and creating a new design file. Select the frame tool and enter 1080 by 1080 pixels for a square poster layout.',
    duration: 8,
  },
  {
    title: 'Add Background, Shapes, and Colors',
    visual: 'Use rectangle tool to draw a full-frame background, apply gradient fill with brand colors, add decorative shapes and geometric elements.',
    voiceover: 'Add a background by drawing a rectangle that covers the entire frame. Apply a gradient using your brand colors, then layer in decorative shapes for visual interest.',
    duration: 10,
  },
  {
    title: 'Import Images and Visual Elements',
    visual: 'Drag and drop design assets, use placeholder images, arrange visual elements in a balanced composition around the poster.',
    voiceover: 'Import any images or design assets you want to feature. Arrange them in a balanced composition, keeping the focal area centered for the text.',
    duration: 8,
  },
  {
    title: 'Add Typography and Text Layers',
    visual: 'Select text tool, click to add headline text, adjust font size and weight, add subheadline below, align text to center.',
    voiceover: 'Use the text tool to add your headline. Choose a bold, readable font at 60pt or larger. Add a subheadline below in a lighter weight and smaller size.',
    duration: 10,
  },
  {
    title: 'Add Call-to-Action Button',
    visual: 'Draw a rounded rectangle near the bottom, fill with contrasting color, add CTA text in white centered inside the button.',
    voiceover: 'Create a call-to-action button by drawing a rounded rectangle near the bottom of the poster. Fill it with a contrasting color and add your action text in white.',
    duration: 8,
  },
  {
    title: 'Export and Share Your Poster',
    visual: 'Go to File menu, select Export, choose PNG format at 2x resolution, click Export button, save to computer.',
    voiceover: 'Finally, export your poster by going to File, then Export. Choose PNG format at 2x resolution for a crisp, print-ready output. Save and share your creation.',
    duration: 8,
  },
];

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
    return { success: false, error: data?.message || 'Shotstack returned error', diagnostic: { provider: 'shotstack', detail: data?.message } };
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || '';
    const status = err?.response?.status || 0;
    console.error('[VideoExec] Shotstack failed:', { status, message: msg.slice(0, 200) });
    return { success: false, error: `Shotstack failed (HTTP ${status}): ${msg.slice(0, 200)}`, diagnostic: { provider: 'shotstack', status, message: msg.slice(0, 200) } };
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
    return { success: false, error: 'Creatomate returned no render ID', diagnostic: { provider: 'creatomate', detail: 'empty_response' } };
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || '';
    const status = err?.response?.status || 0;
    console.error('[VideoExec] Creatomate failed:', { status, message: msg.slice(0, 200) });
    return { success: false, error: `Creatomate failed (HTTP ${status}): ${msg.slice(0, 200)}`, diagnostic: { provider: 'creatomate', status, message: msg.slice(0, 200) } };
  }
}

function generateFallbackStoryboard(script, scenes) {
  return {
    type: 'storyboard',
    title: 'How to Create a Poster Using Figma',
    script: script || FIGMA_SCRIPT,
    scenes: (scenes && scenes.length > 0 ? scenes : FIGMA_SCENES).map((scene, i) => ({
      sceneNumber: i + 1,
      title: scene.title || `Step ${i + 1}`,
      visual: scene.visual || 'See script for details',
      voiceover: scene.voiceover || null,
      duration: scene.duration || 8,
    })),
    totalDuration: (scenes || FIGMA_SCENES).reduce((sum, s) => sum + (s.duration || 8), 0),
    generatedAt: new Date().toISOString(),
  };
}

export async function renderVideo({ script, scenes, duration, platform, aspectRatio }) {
  const effectiveScenes = (scenes && scenes.length > 0) ? scenes : FIGMA_SCENES;
  const effectiveScript = script || FIGMA_SCRIPT;

  if (!effectiveScenes || effectiveScenes.length === 0) {
    return { success: false, error: 'At least one scene is required' };
  }

  const warnings = [];

  // Try Shotstack first
  if (process.env.SHOTSTACK_API_KEY) {
    const shotResult = await renderWithShotstack(effectiveScenes, aspectRatio, duration);
    if (shotResult.success) {
      return shotResult;
    }
    warnings.push(`Shotstack: ${(shotResult.diagnostic?.message || shotResult.error || 'unknown').slice(0, 150)}`);
  } else {
    warnings.push('Shotstack not configured (SHOTSTACK_API_KEY missing)');
  }

  // Try Creatomate second
  if (process.env.CREATOMATE_API_KEY) {
    const creaResult = await renderWithCreatomate(effectiveScenes, aspectRatio, duration);
    if (creaResult.success && creaResult.videoUrl) {
      return creaResult;
    }
    if (creaResult.success && creaResult.renderId) {
      return creaResult;
    }
    warnings.push(`Creatomate: ${(creaResult.diagnostic?.message || creaResult.error || 'unknown').slice(0, 150)}`);
  } else {
    warnings.push('Creatomate not configured (CREATOMATE_API_KEY missing)');
  }

  // Storyboard fallback
  const storyboard = generateFallbackStoryboard(effectiveScript, effectiveScenes);
  warnings.push('Video APIs unavailable. Storyboard fallback generated with Figma poster creation steps.');
  const totalDuration = duration || effectiveScenes.reduce((sum, s) => sum + (s.duration || 8), 0);

  return {
    success: true,
    provider: 'storyboard-fallback',
    status: 'fallback',
    storyboard,
    script: effectiveScript,
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

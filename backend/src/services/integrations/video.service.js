import { uploadBuffer } from './storage.service.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import os from 'os';

let ffmpegPath = null;
let ffmpegChecked = false;

async function getFfmpegPath() {
  if (ffmpegChecked) return ffmpegPath;
  ffmpegChecked = true;
  if (process.env.FFMPEG_PATH) {
    ffmpegPath = process.env.FFMPEG_PATH;
    console.log('[VideoService] Using FFMPEG_PATH env:', ffmpegPath);
    return ffmpegPath;
  }
  try {
    const ffmpegStatic = (await import('ffmpeg-static'));
    ffmpegPath = ffmpegStatic.default || ffmpegStatic;
    console.log('[VideoService] ffmpeg-static resolved:', ffmpegPath ? 'found' : 'not found');
  } catch {
    try {
      const { default: ffstatic } = await import('ffmpeg-static');
      ffmpegPath = ffstatic;
      console.log('[VideoService] ffmpeg-static resolved (alt):', ffmpegPath ? 'found' : 'not found');
    } catch (e) {
      console.warn('[VideoService] ffmpeg-static not available:', e.message);
    }
  }
  return ffmpegPath;
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

function escapeXml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

export async function renderVideo({ script, scenes, duration, platform, aspectRatio }) {
  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    return { success: false, error: 'At least one scene is required' };
  }

  // Render 512MB memory guard — skip FFmpeg if video rendering is not explicitly enabled
  if (process.env.ENABLE_VIDEO_RENDERING !== 'true') {
    const storyboard = generateFallbackStoryboard(script, scenes);
    return {
      success: true, provider: 'storyboard-fallback', videoUrl: null,
      storyboard, duration: duration || scenes.reduce((sum, s) => sum + (s.duration || 5), 0),
      generatedAt: new Date().toISOString(),
      warnings: ['Video rendering disabled due to server memory limit. Set ENABLE_VIDEO_RENDERING=true to enable.'],
      reason: 'disabled_memory_limit',
    };
  }

  const warnings = [];
  const ratio = aspectRatio || '16:9';
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-slides-'));

  try {
    const slideBuffers = [];
    for (let i = 0; i < scenes.length; i++) {
      try {
        const buf = await generateSlideImage(scenes[i], i, ratio);
        slideBuffers.push(buf);
      } catch (slideErr) {
        warnings.push(`Scene ${i + 1} slide generation failed, using blank`);
        console.error('[VideoService] Slide generation error:', { scene: i, error: slideErr.message?.slice(0, 200) });
        const blankBuf = await sharp({
          create: { width: 1920, height: 1080, channels: 4, background: '#1a1a2e' }
        }).png().toBuffer();
        slideBuffers.push(blankBuf);
      }
    }

    if (slideBuffers.length === 0) {
      throw new Error('No slides could be generated');
    }

    const fp = await getFfmpegPath();
    if (fp && fs.existsSync(fp)) {
      try {
        const ffmpeg = (await import('fluent-ffmpeg')).default;
        ffmpeg.setFfmpegPath(fp);
        const slidePaths = [];

        for (let i = 0; i < slideBuffers.length; i++) {
          const slidePath = path.join(tmpDir, `slide-${String(i).padStart(3, '0')}.png`);
          fs.writeFileSync(slidePath, slideBuffers[i]);
          slidePaths.push(slidePath);
        }

        const totalDuration = duration || scenes.reduce((sum, s) => sum + (s.duration || 5), 0);
        const perSlideDuration = Math.max(2, totalDuration / scenes.length);
        const outputPath = path.join(tmpDir, 'output.mp4');

        await new Promise((resolve, reject) => {
          const slideList = slidePaths.map((p, i) => {
            const line = `file '${p.replace(/\\/g, '/')}'`;
            return i < slidePaths.length - 1 ? `${line}\nduration ${perSlideDuration}` : line;
          }).join('\n');
          const listPath = path.join(tmpDir, 'list.txt');
          fs.writeFileSync(listPath, slideList);

          ffmpeg()
            .input(listPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '24'])
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });

        const videoBuffer = fs.readFileSync(outputPath);
        const storage = await uploadBuffer(videoBuffer, `video-${Date.now()}.mp4`, 'videos', 'video');

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        return {
          success: true, provider: 'ffmpeg', videoUrl: storage.url,
          cloudinaryPublicId: storage.publicId, duration: totalDuration,
          generatedAt: new Date().toISOString(), warnings,
        };
      } catch (ffmpegError) {
        const diag = { ffmpegPath: fp, platform: process.platform, tempDir: tmpDir, error: ffmpegError.message?.slice(0, 300) };
        console.error('[VideoService] FFmpeg rendering error:', diag);
        warnings.push('FFmpeg rendering failed: ' + ffmpegError.message);
      }
    } else {
      const diag = { ffmpegPath: fp, ffmpegExists: fp ? fs.existsSync(fp) : false, platform: process.platform };
      console.warn('[VideoService] FFmpeg not available:', diag);
      warnings.push('FFmpeg not available on this system');
    }
  } catch (err) {
    console.error('[VideoService] Slide generation error:', { error: err.message?.slice(0, 300) });
    warnings.push('Slide generation failed: ' + err.message);
  }

  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  warnings.push('Using storyboard fallback — MP4 rendering unavailable');
  const storyboard = generateFallbackStoryboard(script, scenes);

  return {
    success: true, provider: 'storyboard-fallback', videoUrl: null,
    storyboard, duration: duration || scenes.reduce((sum, s) => sum + (s.duration || 5), 0),
    generatedAt: new Date().toISOString(), warnings,
  };
}

export async function checkVideoProvider() {
  const enabled = process.env.ENABLE_VIDEO_RENDERING === 'true';
  if (!enabled) return { configured: false, provider: null, reason: 'disabled_memory_limit', videoEnabled: false };
  const fp = await getFfmpegPath();
  const available = !!(fp && fs.existsSync(fp));
  return {
    configured: available,
    provider: available ? 'ffmpeg' : null,
    reason: available ? 'available' : (fp ? 'binary_not_found_at_path' : 'missing_binary'),
    videoEnabled: true,
  };
}

export async function testFfmpegConnection() {
  const fp = await getFfmpegPath();
  if (!fp || !fs.existsSync(fp)) {
    return { success: false, reason: 'missing_binary', provider: 'ffmpeg', ffmpegPath: fp };
  }
  try {
    const { execSync } = await import('child_process');
    const version = execSync(`"${fp}" -version`, { encoding: 'utf8', timeout: 10000 }).split('\n')[0] || 'unknown';
    return { success: true, reason: 'available', provider: 'ffmpeg', ffmpegPath: fp, version: version.slice(0, 100) };
  } catch (err) {
    return { success: false, reason: 'execution_failed', provider: 'ffmpeg', ffmpegPath: fp, error: err.message?.slice(0, 200) };
  }
}

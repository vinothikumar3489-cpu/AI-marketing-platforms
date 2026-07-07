import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

let initialized = false;

function initCloudinary() {
  if (initialized) return true;
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || !key || !secret) {
    console.warn('[StorageService] Cloudinary not configured (missing env vars). Using local fallback.');
    return false;
  }
  try {
    cloudinary.config({
      cloud_name: name,
      api_key: key,
      api_secret: secret,
    });
    initialized = true;
    console.log('[StorageService] Cloudinary configured successfully');
    return true;
  } catch (err) {
    console.error('[StorageService] Cloudinary init failed:', { error: err.message?.slice(0, 200) });
    return false;
  }
}

const FOLDERS = {
  posters: 'ai-marketing/posters',
  videos: 'ai-marketing/videos',
  reports: 'ai-marketing/reports',
  assets: 'ai-marketing/assets',
};

function getFolder(folder) {
  return FOLDERS[folder] || FOLDERS.assets;
}

export async function uploadBuffer(buffer, filename, folder = 'assets', resourceType = 'image') {
  const useCloudinary = initCloudinary();
  if (!useCloudinary) {
    return localFallback(filename, folder, buffer);
  }

  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: getFolder(folder),
        public_id: filename.replace(/\.[^.]+$/, '') + '-' + Date.now(),
        resource_type: resourceType,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          console.error('[StorageService] Cloudinary upload failed:', {
            provider: 'cloudinary',
            uploadType: resourceType,
            folder: getFolder(folder),
            error: error.message?.slice(0, 200),
          });
          resolve(localFallback(filename, folder, buffer));
          return;
        }
        resolve({
          success: true,
          url: result.secure_url,
          publicId: result.public_id,
          provider: 'cloudinary',
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

export async function uploadFile(filePath, folder = 'assets', resourceType = 'image') {
  const filename = filePath.split(/[/\\]/).pop() || 'file';
  const useCloudinary = initCloudinary();
  if (!useCloudinary) {
    return localFallback(filename, folder, tryReadFile(filePath));
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: getFolder(folder),
      resource_type: resourceType,
      overwrite: false,
    });
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      provider: 'cloudinary',
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('[StorageService] Cloudinary file upload failed:', { error: error.message?.slice(0, 200) });
    return localFallback(filename, folder, tryReadFile(filePath));
  }
}

export async function uploadBase64(base64, filename, folder = 'assets') {
  const useCloudinary = initCloudinary();
  const base64Data = base64 ? Buffer.from(base64, 'base64') : null;
  if (!useCloudinary) {
    return localFallback(filename, folder, base64Data);
  }

  try {
    const result = await cloudinary.uploader.upload(`data:image/png;base64,${base64}`, {
      folder: getFolder(folder),
      public_id: filename.replace(/\.[^.]+$/, '') + '-' + Date.now(),
      overwrite: false,
    });
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      provider: 'cloudinary',
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('[StorageService] Cloudinary base64 upload failed:', { error: error.message?.slice(0, 200) });
    return localFallback(filename, folder, base64Data);
  }
}

export async function deleteAsset(publicId) {
  const useCloudinary = initCloudinary();
  if (!useCloudinary) return { success: false, error: 'Cloudinary not configured' };

  try {
    await cloudinary.uploader.destroy(publicId);
    return { success: true, provider: 'cloudinary' };
  } catch (error) {
    console.error('[StorageService] Cloudinary delete failed:', { error: error.message?.slice(0, 200) });
    return { success: false, error: 'Failed to delete asset' };
  }
}

function tryReadFile(filePath) {
  try { return fs.readFileSync(filePath); } catch { return null; }
}

function localFallback(filename, folder, data) {
  const localDir = path.join(process.cwd(), 'local-assets', folder);
  const filePath = path.join(localDir, filename);
  let bytes = 0;
  try {
    fs.mkdirSync(localDir, { recursive: true });
    if (Buffer.isBuffer(data)) {
      fs.writeFileSync(filePath, data);
      bytes = data.length;
    } else if (typeof data === 'string' && data.length > 0) {
      fs.writeFileSync(filePath, data, 'utf-8');
      bytes = Buffer.byteLength(data, 'utf-8');
    }
  } catch (err) {
    console.warn('[StorageService] Local fallback write failed:', err.message);
  }
  const fallbackUrl = `/api/local-assets/${folder}/${filename}`;
  return {
    success: true,
    url: fallbackUrl,
    publicId: `local_${folder}_${filename}_${Date.now()}`,
    provider: 'local-fallback',
    format: filename.split('.').pop() || 'unknown',
    bytes,
    warnings: ['Cloudinary not configured. Using local storage fallback.'],
  };
}

export async function checkStorageProvider() {
  const hasAll = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (!hasAll) return { configured: false, provider: null, reason: 'missing_env_vars' };
  const ok = initCloudinary();
  return {
    configured: ok,
    provider: ok ? 'cloudinary' : null,
    reason: ok ? 'configured' : 'init_failed',
  };
}

export async function testCloudinaryConnection() {
  const hasAll = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (!hasAll) return { success: false, reason: 'missing_env_vars', provider: 'cloudinary' };
  const ok = initCloudinary();
  if (!ok) return { success: false, reason: 'init_failed', provider: 'cloudinary' };
  try {
    const testSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>');
    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'ai-marketing/test', public_id: 'test-' + Date.now(), resource_type: 'image', overwrite: false },
        (error, result) => {
          if (error) {
            console.error('[StorageService] Cloudinary test upload failed:', { error: error.message?.slice(0, 200) });
            resolve({ success: false, reason: 'upload_failed', provider: 'cloudinary', detail: error.message?.slice(0, 200) });
            return;
          }
          resolve({ success: true, reason: 'configured', provider: 'cloudinary', url: result.secure_url, publicId: result.public_id });
        }
      );
      const readable = new Readable();
      readable.push(testSvg);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  } catch (err) {
    return { success: false, reason: 'unknown_error', provider: 'cloudinary', detail: err.message?.slice(0, 200) };
  }
}

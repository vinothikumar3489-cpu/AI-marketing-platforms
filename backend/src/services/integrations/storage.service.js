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
    console.warn('[StorageService] Cloudinary not configured. Using local fallback.');
    return false;
  }
  try {
    cloudinary.config({
      cloud_name: name,
      api_key: key,
      api_secret: secret,
    });
    initialized = true;
    return true;
  } catch (err) {
    console.warn('[StorageService] Cloudinary init failed:', err.message);
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
          console.warn('[StorageService] Cloudinary upload failed:', error.message);
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
    console.warn('[StorageService] Cloudinary file upload failed:', error.message);
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
    console.warn('[StorageService] Cloudinary base64 upload failed:', error.message);
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
    console.warn('[StorageService] Cloudinary delete failed:', error.message);
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
  const ok = hasAll && initCloudinary();
  return { configured: ok, provider: ok ? 'cloudinary' : null };
}

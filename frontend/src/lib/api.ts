const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

import { normalizeDeep } from './normalizers';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem('auth_token') || localStorage.getItem('token') || '';
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function clearAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  localStorage.removeItem('selectedChatId');
}

async function request<T>(method: Method, path: string, body?: any, signal?: AbortSignal): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    throw new ApiError('Backend server is unreachable. Please ensure the server is running.', 502, err);
  }

  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  
  if (!res.ok) {
    if (res.status === 401) {
      clearAuth();
    }
    throw new ApiError(data?.error || data?.message || `Request failed: ${res.status}`, res.status, data);
  }

  // Unwrap standardized { success: true, data: ... } format
  if (data && data.success && data.data !== undefined) {
    data = data.data as T;
  }

  // Normalize deep to prevent React error #31 while preserving data structure
  if (path.includes('full-results') && data && typeof data === 'object') {
    return {
      ...data,
      seoIntelligence: normalizeDeep(data?.seoIntelligence),
      seo: normalizeDeep(data?.seo),
    } as T;
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal),
  post: <T = any>(path: string, body?: any, signal?: AbortSignal) => request<T>('POST', path, body, signal),
  put: <T = any>(path: string, body?: any, signal?: AbortSignal) => request<T>('PUT', path, body, signal),
  del: <T = any>(path: string, signal?: AbortSignal) => request<T>('DELETE', path, undefined, signal),
};

export async function tryPost(paths: string[], body?: any) {
  let last: any;
  for (const path of paths) {
    try { return await api.post(path, body); } catch (e) { last = e; }
  }
  throw last;
}

export async function tryGet(paths: string[]) {
  let last: any;
  for (const path of paths) {
    try { return await api.get(path); } catch (e) { last = e; }
  }
  throw last;
}

// ============================================
// PHASE 9 — Integration API Functions
// ============================================

export async function getIntegrationHealth() {
  return api.get<{
    success: boolean;
    providers: {
      email: { configured: boolean; provider: string | null; smtpUserConfigured: boolean; smtpPassConfigured: boolean; smtpPassLength?: number; from: string | null; port587?: string; port465?: string };
      image: { pollinations: { configured: boolean }; fal: { configured: boolean; model: string }; reason: string };
      storage: { configured: boolean; provider: string | null };
      video: { shotstack: { configured: boolean; stage: string }; creatomate: { configured: boolean }; reason: string };
      ai: { gemini: boolean; groq: boolean };
    };
  }>('/integrations/health');
}

export async function sendTestEmail(chatId: string, payload: {
  recipientEmail: string;
  subject: string;
  body: string;
  approvalChecked: boolean;
  senderName?: string;
}) {
  return api.post<{
    success: boolean;
    provider?: string;
    messageId?: string;
    sentAt?: string;
    maskedRecipient?: string;
    recipient?: string;
    status?: string;
    warnings?: string[];
    error?: string;
    details?: string;
    code?: string;
  }>(`/integrations/${chatId}/studio/email/send-test`, payload);
}

export async function generatePosterImage(chatId: string, payload: {
  prompt: string;
  headline?: string;
  cta?: string;
  platform?: string;
  dimensions?: string;
  brandColors?: string[];
  audience?: string;
}) {
  return api.post<{
    success: boolean;
    provider?: string;
    imageUrl?: string;
    cloudinaryPublicId?: string;
    prompt?: string;
    generatedAt?: string;
    warnings?: string[];
    error?: string;
  }>(`/integrations/${chatId}/studio/creative/generate-image`, payload);
}

export async function renderVideo(chatId: string, payload: {
  script?: string;
  scenes: Array<{ title?: string; visual?: string; voiceover?: string; duration?: number }>;
  duration?: number;
  platform?: string;
  aspectRatio?: string;
  prompt?: string;
}) {
  return api.post<{
    success: boolean;
    provider?: string;
    videoUrl?: string | null;
    storyboard?: any;
    scenes?: any[];
    script?: string;
    duration?: number;
    generatedAt?: string;
    warnings?: string[];
    error?: string;
    renderId?: string;
    status?: string;
  }>(`/integrations/${chatId}/studio/video/render`, payload);
}

export async function getVideoStatus(provider: string, renderId: string) {
  return api.get<{
    success: boolean;
    provider?: string;
    status?: string;
    renderId?: string;
    videoUrl?: string | null;
    error?: string;
  }>(`/integrations/video/status/${provider}/${renderId}`);
}

export async function downloadReport(chatId: string, type: 'executive' | 'growth' | 'seo', format: string): Promise<void> {
  const token = getToken();
  const url = `${API_BASE}/chats/${chatId}/report/${type}/${format}`;

  try {
    const res = await fetch(url, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });

    if (!res.ok) {
      let errMsg = `Download failed: ${res.status}`;
      try {
        const errData = await res.json();
        errMsg = errData?.error || errMsg;
      } catch { /* ignore */ }
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    if (blob.size === 0) throw new Error('Downloaded file is empty');

    // Extract filename from Content-Disposition header or use fallback
    const disposition = res.headers.get('Content-Disposition');
    let filename = `Report_${type}_${chatId}.${format === 'markdown' ? 'md' : format}`;
    if (disposition) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    a.remove();
  } catch (err: any) {
    console.error('[Download Report]', err);
    // Try to show a toast if sonner toast is available
    try {
      const { toast } = await import('sonner');
      toast.error(err.message || 'Failed to download report. Check server connection.');
    } catch {
      alert(err.message || 'Failed to download report. Check server connection.');
    }
    throw err;
  }
}

// ============================================
// PHASE A — Evidence Context & Content Generation
// ============================================

export async function getEvidenceContext(chatId: string) {
  return api.get<{
    success: boolean;
    data: {
      company: any;
      product: any;
      website: any;
      audience: any;
      competitors: any;
      seo: any;
      channels: any[];
      growth: any;
      sourceSummary: any;
    };
  }>(`/automation/${chatId}/evidence-context`);
}

export async function generateExecutionModule(chatId: string, module: string) {
  return api.post<{ success: boolean; data: any }>(`/automation/${chatId}/execute/${module}`);
}

export async function getExecutionData(chatId: string) {
  return api.get<{ success: boolean; exists: boolean; data: any }>(`/automation/${chatId}/execution`);
}

// ============================================
// CONTENT STUDIO API (Phases 1–10)
// ============================================

export async function getContentBrief(chatId: string, signal?: AbortSignal) {
  return api.get<any>(`/automation/${chatId}/content-brief`, signal);
}

export async function generateContentItem(chatId: string, contentType: string, signal?: AbortSignal) {
  return api.post<any>(`/automation/${chatId}/content`, { contentType }, signal);
}

export async function generateContentPlan(chatId: string, types?: string[], signal?: AbortSignal) {
  return api.post<any>(`/automation/${chatId}/content/plan`, { types }, signal);
}

export async function getContentAssets(chatId: string, type?: string, signal?: AbortSignal) {
  const query = type ? `?type=${type}` : '';
  return api.get<any>(`/automation/${chatId}/content/assets${query}`, signal);
}

export async function getAssetVersionHistory(assetId: string, signal?: AbortSignal) {
  return api.get<any>(`/automation/content/assets/${assetId}/versions`, signal);
}

export async function regenerateContentAsset(assetId: string, signal?: AbortSignal) {
  return api.post<any>(`/automation/content/assets/${assetId}/regenerate`, {}, signal);
}

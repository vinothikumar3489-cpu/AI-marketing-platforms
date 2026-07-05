const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

async function request<T>(method: Method, path: string, body?: any): Promise<T> {
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
    });
  } catch (err) {
    throw new ApiError('Backend server is unreachable. Please ensure the server is running.', 502, err);
  }

  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  
  if (!res.ok) {
    throw new ApiError(data?.error || data?.message || `Request failed: ${res.status}`, res.status, data);
  }

  // Unwrap standardized { success: true, data: ... } format
  if (data && data.success && data.data !== undefined) {
    return data.data as T;
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: any) => request<T>('PUT', path, body),
  del: <T = any>(path: string) => request<T>('DELETE', path),
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

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

export function downloadReport(chatId: string, type: 'executive' | 'growth' | 'seo', format: string) {
  const token = getToken();
  const url = `${API_BASE}/chats/${chatId}/report/${type}/${format}`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('Authorization', `Bearer ${token}`);
  link.style.display = 'none';

  // Use fetch to get the blob and trigger download (preserves auth header)
  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => {
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Report_${type}_${chatId}.${format === 'markdown' ? 'md' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    })
    .catch(err => {
      console.error('[Download Report]', err);
      alert('Failed to download report. Check server connection.');
    });
}

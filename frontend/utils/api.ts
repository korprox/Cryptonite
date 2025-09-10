export const API_PREFIX = '/api';

function buildUrl(path: string) {
  if (!path.startsWith('/')) {
    return `${API_PREFIX}/${path}`;
  }
  // Avoid double /api/api
  return path.startsWith('/api') ? path : `${API_PREFIX}${path}`;
}

function buildHeaders(token?: string, extra?: Record<string, string>) {
  const headers: Record<string, string> = { ...(extra || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const api = {
  get: (path: string, token?: string, init?: RequestInit) => {
    return fetch(buildUrl(path), {
      ...(init || {}),
      method: 'GET',
      headers: buildHeaders(token, init?.headers as Record<string, string> | undefined),
    });
  },
  post: (path: string, body?: any, token?: string, init?: RequestInit) => {
    return fetch(buildUrl(path), {
      ...(init || {}),
      method: 'POST',
      headers: buildHeaders(token, {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  put: (path: string, body?: any, token?: string, init?: RequestInit) => {
    return fetch(buildUrl(path), {
      ...(init || {}),
      method: 'PUT',
      headers: buildHeaders(token, {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      }),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete: (path: string, token?: string, init?: RequestInit) => {
    return fetch(buildUrl(path), {
      ...(init || {}),
      method: 'DELETE',
      headers: buildHeaders(token, init?.headers as Record<string, string> | undefined),
    });
  },
};
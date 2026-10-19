const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim();
let API_BASE_URL = '';

if (!rawApiBaseUrl) {
  throw new Error('MediCloud configuration error: VITE_API_URL is missing. Set it in frontend/.env.local for development or in the Vercel project environment variables, then restart or redeploy.');
}

try {
  const parsedApiBaseUrl = new URL(rawApiBaseUrl);
  if (!['http:', 'https:'].includes(parsedApiBaseUrl.protocol) || parsedApiBaseUrl.username || parsedApiBaseUrl.password || parsedApiBaseUrl.search || parsedApiBaseUrl.hash) {
    throw new Error('unsupported URL format');
  }
  API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');
} catch {
  throw new Error('MediCloud configuration error: VITE_API_URL must be a valid HTTP(S) base URL without credentials, query, or fragment (for example, https://api.example.com).');
}
const TOKEN_KEY = 'medicloud_access_token';

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const getAccessToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setAccessToken = (token) => token
  ? sessionStorage.setItem(TOKEN_KEY, token)
  : sessionStorage.removeItem(TOKEN_KEY);

export async function apiRequest(path, { method = 'GET', body, headers = {}, timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const token = getAccessToken();
  try {
    const response = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (response.status === 401) {
      setAccessToken(null);
      window.dispatchEvent(new Event('medicloud:unauthorized'));
    }
    if (!response.ok) {
      throw new ApiError(payload?.error?.message || 'The request could not be completed.', {
        status: response.status,
        code: payload?.error?.code,
      });
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new ApiError('The request timed out. Please try again.');
    if (error instanceof ApiError) throw error;
    throw new ApiError('Unable to reach the MediCloud service. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}

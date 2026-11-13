const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const string = query.toString();
  return string ? `?${string}` : '';
}

async function request(path, { method = 'GET', body, signal, headers = {} } = {}) {
  const options = {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json', ...headers },
    signal,
  };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Unable to reach the server. Check that the API is running and try again.', 0);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed with status ${response.status}.`;
    const details = payload?.error?.details;
    const isAuthCheck = path === '/auth/me' || path === '/auth/login' || path === '/auth/register';
    if (response.status === 401 && !isAuthCheck && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:unauthorized'));
    }
    throw new ApiError(message, response.status, details);
  }

  return payload;
}

export const api = {
  base: API_BASE,
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
  upload: (path, formData, options) => request(path, { ...options, method: 'POST', body: formData }),
  query: buildQuery,
};

export function errorMessage(error) {
  if (error instanceof ApiError) return error.message;
  if (error?.name === 'AbortError') return '';
  return error?.message || 'Something went wrong.';
}

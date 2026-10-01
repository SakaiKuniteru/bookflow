import apiConfig from '../config/api.js';

class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 500;
    this.code = options.code ?? 'API_ERROR';
    this.data = options.data ?? null;
    this.isBackendUnavailable = options.isBackendUnavailable ?? false;
  }
}

const normalizeResponse = (payload, status) => {
  if (payload === null || payload === undefined) {
    return {
      success: status >= 200 && status < 300,
      data: null,
      message: ''
    };
  }
  if (typeof payload !== 'object') {
    return {
      success: status >= 200 && status < 300,
      data: payload,
      message: ''
    };
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'success')) {
    return payload;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'data')) {
    return {
      success: status >= 200 && status < 300,
      data: payload.data,
      message: payload.message ?? '',
      errors: payload.errors ?? null,
      meta: payload.meta ?? null
    };
  }
  return {
    success: status >= 200 && status < 300,
    data: payload,
    message: payload.message ?? '',
    errors: payload.errors ?? null,
    meta: payload.meta ?? null
  };
};

const parseResponseBody = async response => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
};

const createTimeoutSignal = timeout => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
};

const request = async (path, options = {}) => {
  const method = String(options.method || 'GET').toUpperCase();
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const timeout = options.timeout ?? apiConfig.timeout;
  const timeoutController = createTimeoutSignal(timeout);
  const controller = options.signal ? null : timeoutController;
  const signal = options.signal || controller.signal;
  let body = options.body;
  if (body !== undefined && !(body instanceof FormData) && typeof body !== 'string') {
    body = JSON.stringify(body);
  }
  try {
    const response = await fetch(`${apiConfig.baseUrl}${path}`, {
      method,
      headers,
      body,
      signal,
      redirect: 'manual'
    });
    const payload = await parseResponseBody(response);
    const normalized = normalizeResponse(payload, response.status);
    if (!response.ok) {
      const message = normalized.message || normalized.error?.message || `Backend API trả về HTTP ${response.status}`;
      throw new ApiError(message, {
        status: response.status,
        code: normalized.code || payload?.code || 'API_ERROR',
        data: normalized
      });
    }
    return normalized;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw new ApiError('Backend API phản hồi quá thời gian.', {
        status: 504,
        code: 'BACKEND_TIMEOUT',
        isBackendUnavailable: true
      });
    }
    throw new ApiError('Không thể kết nối tới Backend API.', {
      status: 503,
      code: 'BACKEND_UNAVAILABLE',
      isBackendUnavailable: true
    });
  } finally {
    timeoutController.clear();
  }
};

const get = (path, options = {}) => request(path, { ...options, method: 'GET' });

const post = (path, body, options = {}) => request(path, { ...options, method: 'POST', body });

const put = (path, body, options = {}) => request(path, { ...options, method: 'PUT', body });

const patch = (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body });

const del = (path, options = {}) => request(path, { ...options, method: 'DELETE' });

export { ApiError, request, get, post, put, patch, del };
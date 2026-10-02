import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost/otelex-server/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

let csrfToken = null;
let refreshPromise = null;
let onSessionExpired = () => {};
let onSessionRefreshed = () => {};

const AUTH_NO_REFRESH_ENDPOINTS = [
  '/auth/csrf',
  '/auth/login',
  '/auth/mfa/verify',
  '/auth/mfa/resend',
  '/auth/device-limit/revoke',
  '/auth/logout',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const isStateChangingMethod = (method = 'get') =>
  ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase());

const MAX_GET_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const retryAfterMs = (error, retryNumber) => {
  const retryAfter = error.response?.headers?.['retry-after'];
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, 5000);
    }

    const retryDate = Date.parse(retryAfter);
    if (!Number.isNaN(retryDate)) {
      return Math.max(0, Math.min(retryDate - Date.now(), 5000));
    }
  }

  // Short exponential backoff: ~350ms, then ~700ms.
  return 350 * (2 ** Math.max(0, retryNumber - 1));
};

const shouldRetryGetRequest = (error, config) => {
  if (!config || String(config.method || 'get').toLowerCase() !== 'get') return false;
  if (config.skipRequestRetry === true) return false;
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') return false;

  const retryCount = Number(config._getRetryCount || 0);
  if (retryCount >= MAX_GET_RETRIES) return false;

  // No response generally means a transient network/connection failure.
  if (!error.response) {
    return error.code !== 'ERR_BAD_REQUEST';
  }

  return RETRYABLE_STATUS_CODES.has(Number(error.response.status));
};

export const setCsrfToken = (value) => {
  csrfToken = typeof value === 'string' && value.length > 0 ? value : null;
};

export const registerSessionExpiredHandler = (handler) => {
  onSessionExpired = typeof handler === 'function' ? handler : () => {};
};

export const registerSessionRefreshedHandler = (handler) => {
  onSessionRefreshed = typeof handler === 'function' ? handler : () => {};
};

export const initialiseCsrfToken = async () => {
  const response = await api.get('/auth/csrf', { skipAuthRefresh: true });
  setCsrfToken(response.data?.data?.csrf_token);
  return csrfToken;
};

api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    // Let the browser generate the multipart boundary for PDF/logo uploads.
    // Keeping the instance-level JSON content type would prevent PHP from reading $_FILES.
    if (typeof config.headers?.delete === 'function') {
      config.headers.delete('Content-Type');
    } else if (config.headers) {
      delete config.headers['Content-Type'];
    }
  }

  if (isStateChangingMethod(config.method) && csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    // Any successful business mutation may have generated a backend notification.
    // Signal the authenticated shell so the bell/panel can refresh immediately.
    const method = response.config?.method || 'get';
    const requestUrl = response.config?.url || '';
    const shouldSignalActivity = isStateChangingMethod(method)
      && !requestUrl.includes('/notifications/mark-read')
      && !requestUrl.includes('/auth/');

    if (shouldSignalActivity && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('otelex:activity-completed'));
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};
    const requestUrl = originalRequest.url || '';
    const shouldSkipRefresh = originalRequest.skipAuthRefresh
      || AUTH_NO_REFRESH_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint));
    const suppressSessionExpiredNotice = originalRequest.suppressSessionExpiredNotice === true;

    if (shouldRetryGetRequest(error, originalRequest)) {
      const retryNumber = Number(originalRequest._getRetryCount || 0) + 1;
      originalRequest._getRetryCount = retryNumber;
      await sleep(retryAfterMs(error, retryNumber));
      return api(originalRequest);
    }

    if (error.response?.status === 419 && !originalRequest._csrfRetry && !requestUrl.includes('/auth/csrf')) {
      originalRequest._csrfRetry = true;
      try {
        await initialiseCsrfToken();
        return api(originalRequest);
      } catch (csrfError) {
        setCsrfToken(null);
        onSessionExpired();
        return Promise.reject(csrfError);
      }
    }

    const sessionReason = error.response?.data?.reason;
    const terminalSessionReasons = ['idle_timeout', 'absolute_timeout', 'deactivated', 'security_change', 'device_mismatch', 'revoked'];

    if (error.response?.status === 401 && terminalSessionReasons.includes(sessionReason)) {
      setCsrfToken(null);
      if (!suppressSessionExpiredNotice) {
        onSessionExpired({
          reason: sessionReason,
          message: error.response?.data?.message || null,
        });
      }
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry || shouldSkipRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!csrfToken) {
        await initialiseCsrfToken();
      }

      if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh', {}, { skipAuthRefresh: true })
          .then((response) => {
            const data = response.data?.data || {};
            setCsrfToken(data.csrf_token);
            if (data.user) onSessionRefreshed(data.user, data.session_policy);
            return response;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      await refreshPromise;
      return api(originalRequest);
    } catch (refreshError) {
      setCsrfToken(null);
      if (!suppressSessionExpiredNotice) {
        onSessionExpired({
          reason: refreshError.response?.data?.reason || 'session_expired',
          message: refreshError.response?.data?.message || null,
        });
      }
      return Promise.reject(refreshError);
    }
  }
);

export default api;

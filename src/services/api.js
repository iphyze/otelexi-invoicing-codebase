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

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_FETCH_RETRIES = 2;

const isStateChangingMethod = (method = 'get') =>
  ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase());

const isFetchMethod = (method = 'get') =>
  ['get', 'head'].includes(String(method).toLowerCase());

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const retryDelay = (error, retryNumber) => {
  const retryAfter = error.response?.headers?.['retry-after'];
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 5000);

    const retryAt = Date.parse(retryAfter);
    if (!Number.isNaN(retryAt)) return Math.min(Math.max(0, retryAt - Date.now()), 5000);
  }

  return Math.min(350 * (2 ** Math.max(0, retryNumber - 1)), 1400);
};

const shouldRetryRequest = (error, config) => {
  if (!config || config.skipRetry || !isFetchMethod(config.method)) return false;
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') return false;

  const status = error.response?.status;
  if (!status) return true; // network / connection failure
  return RETRYABLE_STATUSES.has(status);
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
  const response = await api.get('/auth/csrf', {
    skipAuthRefresh: true,
    skipRetry: false,
  });
  setCsrfToken(response.data?.data?.csrf_token);
  return csrfToken;
};

api.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    // Let the browser generate the multipart boundary for PDF/logo uploads.
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
    // Business mutations may create backend notifications. Let the authenticated
    // shell refresh the notification state immediately rather than waiting for
    // the next poll interval.
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
    const silentBootstrap = Boolean(originalRequest.authBootstrap);
    const shouldSkipRefresh = originalRequest.skipAuthRefresh
      || AUTH_NO_REFRESH_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint));

    // CSRF token may have rotated. Refresh it once and replay the original
    // state-changing request. This is separate from ordinary GET retry logic.
    if (error.response?.status === 419 && !originalRequest._csrfRetry && !requestUrl.includes('/auth/csrf')) {
      originalRequest._csrfRetry = true;
      try {
        await initialiseCsrfToken();
        return api(originalRequest);
      } catch (csrfError) {
        setCsrfToken(null);
        if (!silentBootstrap) onSessionExpired();
        return Promise.reject(csrfError);
      }
    }

    const sessionReason = error.response?.data?.reason;
    const terminalSessionReasons = [
      'idle_timeout',
      'absolute_timeout',
      'deactivated',
      'security_change',
      'device_mismatch',
      'revoked',
    ];

    if (error.response?.status === 401 && terminalSessionReasons.includes(sessionReason)) {
      setCsrfToken(null);
      if (!silentBootstrap) {
        onSessionExpired({
          reason: sessionReason,
          message: error.response?.data?.message || null,
        });
      }
      return Promise.reject(error);
    }

    // Try the refresh-token flow once for protected requests. A failed bootstrap
    // refresh is intentionally silent so a genuine guest never sees a false
    // "Session expired" warning on first load.
    if (error.response?.status === 401 && !originalRequest._retry && !shouldSkipRefresh) {
      originalRequest._retry = true;

      try {
        if (!csrfToken) {
          await initialiseCsrfToken();
        }

        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh', {}, {
            skipAuthRefresh: true,
            skipRetry: true,
          })
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
        if (!silentBootstrap) {
          onSessionExpired({
            reason: refreshError.response?.data?.reason || 'session_expired',
            message: refreshError.response?.data?.message || null,
          });
        }
        return Promise.reject(refreshError);
      }
    }

    // Safe retries apply only to GET/HEAD reads and only for transient failures.
    // Mutations are deliberately excluded to avoid duplicate invoices/payments.
    if (shouldRetryRequest(error, originalRequest)) {
      const currentRetry = Number(originalRequest._fetchRetryCount || 0);
      if (currentRetry < MAX_FETCH_RETRIES) {
        const nextRetry = currentRetry + 1;
        originalRequest._fetchRetryCount = nextRetry;
        await sleep(retryDelay(error, nextRetry));
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

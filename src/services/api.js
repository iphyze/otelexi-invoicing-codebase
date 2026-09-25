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
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const requestUrl = originalRequest.url || '';
    const shouldSkipRefresh = originalRequest.skipAuthRefresh
      || AUTH_NO_REFRESH_ENDPOINTS.some((endpoint) => requestUrl.includes(endpoint));

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
      onSessionExpired({
        reason: sessionReason,
        message: error.response?.data?.message || null,
      });
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
      onSessionExpired({
        reason: refreshError.response?.data?.reason || 'session_expired',
        message: refreshError.response?.data?.message || null,
      });
      return Promise.reject(refreshError);
    }
  }
);

export default api;

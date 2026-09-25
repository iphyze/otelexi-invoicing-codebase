import { create } from 'zustand';
import api, {
  initialiseCsrfToken,
  registerSessionExpiredHandler,
  registerSessionRefreshedHandler,
  setCsrfToken,
} from '../services/api';
import useToastStore from './useToastStore';
import { publishSessionEvent } from '../utils/sessionSync';

const DEFAULT_SESSION_POLICY = {
  idle_timeout_seconds: 600,
  idle_warning_seconds: 60,
  absolute_timeout_seconds: 43200,
  heartbeat_interval_seconds: 60,
  max_active_sessions: 2,
};

const normalizeSessionPolicy = (policy) => ({
  ...DEFAULT_SESSION_POLICY,
  ...(policy || {}),
});

const notifySessionEnd = (reason, message) => {
  if (!reason) return;

  const fallbackMessages = {
    idle_timeout: 'You were signed out after 10 minutes of inactivity.',
    absolute_timeout: 'Your session reached its maximum duration. Please sign in again.',
    deactivated: 'Your account is unavailable. Please contact the administrator.',
    security_change: 'Your session changed for security reasons. Please sign in again.',
    device_mismatch: 'This session is no longer valid on this device. Please sign in again.',
    revoked: 'This device session was signed out. Please sign in again.',
  };

  const resolvedMessage = message || fallbackMessages[reason];
  if (resolvedMessage) {
    useToastStore.getState().showToast(resolvedMessage, 'warning');
  }
};

const useAuthStore = create((set, get) => ({
  user: null,
  status: 'checking',
  initialized: false,
  sessionPolicy: DEFAULT_SESSION_POLICY,

  initialize: async () => {
    if (get().initialized) return;

    // Remove the legacy persisted JWT left by earlier releases.
    localStorage.removeItem('auth-storage');
    set({ status: 'checking' });
    try {
      await initialiseCsrfToken();
      const response = await api.get('/auth/session');
      const data = response.data?.data || {};
      set({
        user: data.user || null,
        status: 'authenticated',
        initialized: true,
        sessionPolicy: normalizeSessionPolicy(data.session_policy),
      });
    } catch (error) {
      set({
        user: null,
        status: 'guest',
        initialized: true,
        sessionPolicy: DEFAULT_SESSION_POLICY,
      });
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password }, { skipAuthRefresh: true });
      const data = response.data?.data || {};

      if (response.data?.status === 'success' && data.user) {
        setCsrfToken(data.csrf_token);
        set({
          user: data.user,
          status: 'authenticated',
          initialized: true,
          sessionPolicy: normalizeSessionPolicy(data.session_policy),
        });
        publishSessionEvent('authenticated');
        return { success: true };
      }

      if (response.data?.reason === 'mfa_required') {
        return {
          success: false,
          mfaRequired: true,
          message: response.data?.message,
          mfaChallenge: data.mfa_challenge || null,
          maskedEmail: data.masked_email || '',
          expiresIn: Number(data.expires_in) || 600,
          resendAfter: Number(data.resend_after) || 60,
          maxAttempts: Number(data.max_attempts) || 5,
        };
      }

      return { success: false, error: 'Invalid credentials.' };
    } catch (error) {
      const payload = error.response?.data || {};
      if (error.response?.status === 409 && payload.reason === 'device_limit_reached') {
        return {
          success: false,
          deviceLimit: true,
          error: payload.message,
          loginChallenge: payload.data?.login_challenge || null,
          maxDevices: payload.data?.max_devices || 2,
          sessions: payload.data?.sessions || [],
        };
      }

      return {
        success: false,
        error: payload.message || 'Login failed. Please try again.',
      };
    }
  },

  verifyEmailMfa: async (mfaChallenge, code) => {
    try {
      const response = await api.post('/auth/mfa/verify', {
        mfa_challenge: mfaChallenge,
        code,
      }, { skipAuthRefresh: true });
      const data = response.data?.data || {};

      if (response.data?.status === 'success' && data.user) {
        setCsrfToken(data.csrf_token);
        set({
          user: data.user,
          status: 'authenticated',
          initialized: true,
          sessionPolicy: normalizeSessionPolicy(data.session_policy),
        });
        publishSessionEvent('authenticated');
        return { success: true };
      }

      return { success: false, error: 'Unable to verify the sign-in code.' };
    } catch (error) {
      const payload = error.response?.data || {};
      if (error.response?.status === 409 && payload.reason === 'device_limit_reached') {
        return {
          success: false,
          deviceLimit: true,
          error: payload.message,
          loginChallenge: payload.data?.login_challenge || null,
          maxDevices: payload.data?.max_devices || 2,
          sessions: payload.data?.sessions || [],
        };
      }

      return {
        success: false,
        error: payload.message || 'Unable to verify the sign-in code.',
        verificationFailed: ['mfa_verification_failed'].includes(payload.reason),
      };
    }
  },

  resendEmailMfa: async (mfaChallenge) => {
    try {
      const response = await api.post('/auth/mfa/resend', {
        mfa_challenge: mfaChallenge,
      }, { skipAuthRefresh: true });
      const data = response.data?.data || {};
      return {
        success: true,
        message: response.data?.message,
        maskedEmail: data.masked_email || '',
        expiresIn: Number(data.expires_in) || 600,
        resendAfter: Number(data.resend_after) || 60,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Unable to resend the verification code.',
      };
    }
  },

  replaceDeviceForLogin: async (loginChallenge, sessionKey) => {
    try {
      const response = await api.post('/auth/device-limit/revoke', {
        login_challenge: loginChallenge,
        session_key: sessionKey,
      }, { skipAuthRefresh: true });
      const data = response.data?.data || {};

      if (response.data?.status === 'success' && data.user) {
        setCsrfToken(data.csrf_token);
        set({
          user: data.user,
          status: 'authenticated',
          initialized: true,
          sessionPolicy: normalizeSessionPolicy(data.session_policy),
        });
        publishSessionEvent('authenticated');
        return { success: true };
      }

      return { success: false, error: 'Unable to complete sign in.' };
    } catch (error) {
      const payload = error.response?.data || {};
      if (error.response?.status === 409 && payload.reason === 'device_limit_reached') {
        return {
          success: false,
          deviceLimit: true,
          error: payload.message,
          loginChallenge: payload.data?.login_challenge || loginChallenge,
          maxDevices: payload.data?.max_devices || 2,
          sessions: payload.data?.sessions || [],
        };
      }

      return {
        success: false,
        error: payload.message || 'Unable to complete sign in.',
      };
    }
  },

  logout: async ({ callApi = true, reason = null, message = null, broadcast = true } = {}) => {
    if (callApi) {
      try {
        await api.post('/auth/logout', {}, { skipAuthRefresh: true });
      } catch (error) {
        // Clear local UI state even when the server session already expired.
      }
    }

    setCsrfToken(null);
    set({
      user: null,
      status: 'guest',
      initialized: true,
      sessionPolicy: DEFAULT_SESSION_POLICY,
    });

    notifySessionEnd(reason, message);
    if (broadcast) publishSessionEvent('signed_out', { reason, message });
  },

  clearSession: ({ reason = null, message = null, broadcast = true } = {}) => {
    setCsrfToken(null);
    set({
      user: null,
      status: 'guest',
      initialized: true,
      sessionPolicy: DEFAULT_SESSION_POLICY,
    });

    notifySessionEnd(reason, message);
    if (broadcast) publishSessionEvent('signed_out', { reason, message });
  },

  updateUserData: (user, sessionPolicy = null) => {
    if (!user) return;
    set((state) => ({
      user,
      sessionPolicy: sessionPolicy
        ? normalizeSessionPolicy(sessionPolicy)
        : state.sessionPolicy,
    }));
  },

  isAuthenticated: () => get().status === 'authenticated' && Boolean(get().user),
}));

registerSessionExpiredHandler(({ reason = null, message = null } = {}) => {
  useAuthStore.getState().clearSession({ reason, message });
});

registerSessionRefreshedHandler((user, sessionPolicy) => {
  useAuthStore.getState().updateUserData(user, sessionPolicy);
});

export default useAuthStore;

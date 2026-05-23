import { create } from 'zustand';
import api, {
  initialiseCsrfToken,
  registerSessionExpiredHandler,
  registerSessionRefreshedHandler,
  setCsrfToken,
} from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  status: 'checking',
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    // Remove the legacy persisted JWT left by earlier releases.
    localStorage.removeItem('auth-storage');
    set({ status: 'checking' });
    try {
      await initialiseCsrfToken();
      const response = await api.get('/auth/session');
      set({
        user: response.data?.data?.user || null,
        status: 'authenticated',
        initialized: true,
      });
    } catch (error) {
      set({ user: null, status: 'guest', initialized: true });
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password }, { skipAuthRefresh: true });
      const data = response.data?.data || {};

      if (response.data?.status === 'success' && data.user) {
        setCsrfToken(data.csrf_token);
        set({ user: data.user, status: 'authenticated', initialized: true });
        return { success: true };
      }

      return { success: false, error: 'Invalid credentials.' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed. Please try again.',
      };
    }
  },

  logout: async ({ callApi = true } = {}) => {
    if (callApi) {
      try {
        await api.post('/auth/logout', {}, { skipAuthRefresh: true });
      } catch (error) {
        // Clear local UI state even when the server session already expired.
      }
    }

    setCsrfToken(null);
    set({ user: null, status: 'guest', initialized: true });
  },

  clearSession: () => {
    setCsrfToken(null);
    set({ user: null, status: 'guest', initialized: true });
  },

  updateUserData: (user) => {
    if (user) set({ user });
  },

  isAuthenticated: () => get().status === 'authenticated' && Boolean(get().user),
}));

registerSessionExpiredHandler(() => {
  useAuthStore.getState().clearSession();
});

registerSessionRefreshedHandler((user) => {
  useAuthStore.getState().updateUserData(user);
});

export default useAuthStore;

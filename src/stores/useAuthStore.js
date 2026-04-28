import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      expiresAt: null, // Unix ms timestamp when token expires

      login: async (email, password) => {
        try {
          const response = await api.post('/auth/login', { email, password });
          const { status, data } = response.data;

          if (status === 'success') {
            const { token, expires_in, ...userData } = data;
            // expires_in is in seconds (e.g. 432000 = 5 days)
            const expiresAt = Date.now() + expires_in * 1000;

            set({ token, user: userData, expiresAt });
            return { success: true };
          }

          return { success: false, error: 'Invalid credentials' };
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.message || 'Login failed. Please try again.',
          };
        }
      },

      logout: () => {
        set({ token: null, user: null, expiresAt: null });
      },

      // Returns true if a valid, non-expired token exists
      isAuthenticated: () => {
        const { token, expiresAt } = get();
        if (!token || !expiresAt) return false;
        return Date.now() < expiresAt;
      },

      // Call on app boot — clears stale session silently
      init: () => {
        const { token, expiresAt, logout } = get();
        if (token && expiresAt && Date.now() >= expiresAt) {
          logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist these keys
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        expiresAt: state.expiresAt,
      }),
    }
  )
);

// Run init on store creation
useAuthStore.getState().init();

export default useAuthStore;
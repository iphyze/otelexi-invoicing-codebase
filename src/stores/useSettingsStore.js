// stores/useSettingsStore.js
import { create } from 'zustand';
import settingsService from '../services/settingsService';

const useSettingsStore = create((set, get) => ({
  settings: null,
  loading:  false,
  saving:   false,
  error:    null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const res = await settingsService.getSettings();
      set({ settings: res.data.data, loading: false });
      return res.data.data;
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to load settings.' });
      throw err;
    }
  },

  updateSettings: async (payload) => {
    set({ saving: true });
    try {
      const res = await settingsService.updateSettings(payload);
      set({ settings: res.data.data, saving: false });
      return res.data;
    } catch (err) {
      set({ saving: false });
      throw err;
    }
  },

  uploadLogo: async (file) => {
    set({ saving: true });
    try {
      const res = await settingsService.uploadLogo(file);
      // Merge the new logo_path into existing settings
      set((s) => ({
        saving: false,
        settings: s.settings ? { ...s.settings, logo_path: res.data.data.logo_path } : s.settings,
      }));
      return res.data;
    } catch (err) {
      set({ saving: false });
      throw err;
    }
  },
}));

export default useSettingsStore;

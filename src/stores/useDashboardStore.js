// stores/useDashboardStore.js
import { create } from 'zustand';
import api from '../services/api';

const EMPTY_DATA = {
  meta: null,
  kpis: null,
  charts: null,
  lists: null,
};

const useDashboardStore = create((set, get) => ({
  data: { ...EMPTY_DATA },
  loading: false,
  error: null,
  currency: 'NGN',   // active currency filter

  setCurrency: (currency) => {
    set({ currency });
    get().fetchDashboard(currency);
  },

  fetchDashboard: async (currency) => {
    const cur = currency || get().currency;
    set({ loading: true, error: null });
    try {
      const res = await api.get('/dashboard', { params: { currency: cur } });
      set({ data: res.data.data, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err.response?.data?.message || 'Failed to load dashboard.',
      });
    }
  },

  // Convenience selectors (called by components)
  getMeta: () => get().data.meta,
  getKpis: () => get().data.kpis,
  getCharts: () => get().data.charts,
  getLists: () => get().data.lists,
}));

export default useDashboardStore;
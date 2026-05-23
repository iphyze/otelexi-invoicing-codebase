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
  refreshing: false,
  error: null,
  filters: {
    currency: 'NGN',
    period: 'month',
  },

  setCurrency: (currency) => {
    set((state) => ({ filters: { ...state.filters, currency } }));
    get().fetchDashboard({ currency });
  },

  setPeriod: (period) => {
    set((state) => ({ filters: { ...state.filters, period } }));
    get().fetchDashboard({ period });
  },

  fetchDashboard: async (overrides = {}) => {
    const params = { ...get().filters, ...overrides };
    const alreadyLoaded = Boolean(get().data.meta);

    set({
      loading: !alreadyLoaded,
      refreshing: alreadyLoaded,
      error: null,
    });

    try {
      const response = await api.get('/dashboard', { params });
      set({
        data: response.data.data,
        filters: {
          currency: response.data.data.meta.currency,
          period: response.data.data.meta.period.key,
        },
        loading: false,
        refreshing: false,
      });
    } catch (error) {
      set({
        loading: false,
        refreshing: false,
        error: error.response?.data?.message || 'Failed to load dashboard.',
      });
    }
  },

  refreshDashboard: () => get().fetchDashboard(),

  resetDashboard: () => set({
    data: { ...EMPTY_DATA },
    loading: false,
    refreshing: false,
    error: null,
    filters: { currency: 'NGN', period: 'month' },
  }),
}));

export default useDashboardStore;

// stores/useCustomerPortalStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import customerPortalService from '../services/customerPortalService';

const DEFAULT_FILTERS = {
  search: '', status: '', from: '', to: '', page: 1, limit: 10,
};

const useCustomerPortalStore = create(
  persist(
    (set, get) => ({
      links: [],
      meta: null,
      filters: { ...DEFAULT_FILTERS },
      loading: false,
      error: null,

      setFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value, page: key === 'page' ? value : 1 },
      })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      fetchLinks: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const response = await customerPortalService.getCustomerPortalLinks(filters);
          set({ links: response.data.data || [], meta: response.data.meta || null, loading: false });
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || 'Failed to load customer portal links.' });
        }
      },

      createCustomerPortalLink: async (invoiceId, payload = {}) => {
        const response = await customerPortalService.createCustomerPortalLink(invoiceId, payload);
        get().fetchLinks();
        return response.data;
      },

      sendCustomerPortalLink: async (id) => {
        const response = await customerPortalService.sendCustomerPortalLink(id);
        get().fetchLinks();
        return response.data;
      },

      revokeCustomerPortalLink: async (id) => {
        const response = await customerPortalService.revokeCustomerPortalLink(id);
        get().fetchLinks();
        return response.data;
      },

      downloadLinksExcel: async () => {
        const { links } = get();
        if (!links.length) return;
        const XLSX = await import('xlsx');
        const rows = links.map((link) => ({
          'Created': link.created_at,
          'Reference': link.reference,
          'Invoice #': link.invoice_number,
          'Client': link.client_name,
          'Client Email': link.client_email || '—',
          'Status': link.status,
          'Expires At': link.expires_at,
          'Last Accessed': link.last_accessed_at || '—',
          'Access Count': link.access_count,
          'Email Count': link.email_count,
          'Balance Due': link.balance_due,
          'Currency': link.currency,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map((key) => ({
          wch: Math.max(key.length, ...rows.map((row) => String(row[key]).length)) + 2,
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Customer Portal Links');
        XLSX.writeFile(wb, 'Otelex_Customer_Portal_Links.xlsx');
      },
    }),
    { name: 'customer-portal-store', partialize: (state) => ({ filters: state.filters }) }
  )
);

export default useCustomerPortalStore;

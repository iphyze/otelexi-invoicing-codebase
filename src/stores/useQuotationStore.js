// stores/useQuotationStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import quotationService from '../services/quotationService';

const DEFAULT_FILTERS = {
  search: '', status: '', client_id: '',
  from: '', to: '',
  sortBy: 'created_at', sortOrder: 'DESC', page: 1, limit: 10,
};

const useQuotationStore = create(
  persist(
    (set, get) => ({
      // ── List state ─────────────────────────────────────────────
      quotations: [], meta: null, filters: { ...DEFAULT_FILTERS },
      loading: false, error: null,

      // ── Single quotation ───────────────────────────────────────
      selectedQuotation: null, singleLoading: false,

      // ── Selection ──────────────────────────────────────────────
      selectedIds: [],

      // ── Stats (for stats cards on list page) ───────────────────
      stats: { total: 0, draft: 0, sent: 0, accepted: 0, converted: 0, expired: 0 },

      // ── Filters ────────────────────────────────────────────────
      setFilter: (key, value) =>
        set((s) => ({
          filters: { ...s.filters, [key]: value, page: key === 'page' ? value : 1 },
        })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      // ── Fetch list ─────────────────────────────────────────────
      fetchQuotations: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const res = await quotationService.getQuotations(filters);
          set({ quotations: res.data.data, meta: res.data.meta, loading: false });
          get().fetchStats();
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || 'Failed to load quotations.' });
        }
      },

      // ── Stats ──────────────────────────────────────────────────
      fetchStats: async () => {
        try {
          const statuses = ['draft', 'sent', 'accepted', 'converted', 'expired'];
          const results = await Promise.all(
            statuses.map((s) => quotationService.getQuotations({ status: s, limit: 1, page: 1 }))
          );
          const stats = { total: 0 };
          statuses.forEach((s, i) => {
            stats[s] = results[i].data.meta?.total || 0;
            stats.total += stats[s];
          });
          set({ stats });
        } catch { /* silent */ }
      },

      // ── Single ─────────────────────────────────────────────────
      fetchSingleQuotation: async (id) => {
        set({ singleLoading: true, selectedQuotation: null });
        try {
          const res = await quotationService.getSingleQuotation(id);
          set({ selectedQuotation: res.data.data, singleLoading: false });
          return res.data.data;
        } catch (err) {
          set({ singleLoading: false });
          throw err;
        }
      },

      // ── CRUD ───────────────────────────────────────────────────
      createQuotation: async (payload) => {
        const res = await quotationService.createQuotation(payload);
        get().fetchQuotations();
        return res.data;
      },
      editQuotation: async (id, payload) => {
        const res = await quotationService.editQuotation(id, payload);
        // Refresh single if loaded
        const sel = get().selectedQuotation;
        if (sel && sel.id === id) get().fetchSingleQuotation(id);
        get().fetchQuotations();
        return res.data;
      },
      deleteQuotations: async (ids) => {
        await quotationService.deleteQuotations(ids);
        set({ selectedIds: [] });
        get().fetchQuotations();
      },

      // ── Status transitions ─────────────────────────────────────
      sendQuotation: async (id) => {
        const res = await quotationService.sendQuotation(id);
        get().refreshAfterAction(id);
        return res.data;
      },
      acceptQuotation: async (id) => {
        const res = await quotationService.acceptQuotation(id);
        get().refreshAfterAction(id);
        return res.data;
      },
      rejectQuotation: async (id, reason) => {
        const res = await quotationService.rejectQuotation(id, reason);
        get().refreshAfterAction(id);
        return res.data;
      },
      reopenQuotation: async (id) => {
        const res = await quotationService.reopenQuotation(id);
        get().refreshAfterAction(id);
        return res.data;
      },

      // ── Conversions ────────────────────────────────────────────
      convertToProforma: async (id) => {
        const res = await quotationService.convertToProforma(id);
        get().refreshAfterAction(id);
        return res.data;
      },
      convertToInvoice: async (id) => {
        const res = await quotationService.convertToInvoice(id);
        get().refreshAfterAction(id);
        return res.data;
      },

      // Refresh single + list after any status change
      refreshAfterAction: (id) => {
        get().fetchSingleQuotation(id).catch(() => {});
        get().fetchQuotations();
      },

      // ── Selection ──────────────────────────────────────────────
      toggleSelect: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((i) => i !== id)
            : [...s.selectedIds, id],
        })),
      toggleSelectAll: (ids) =>
        set((s) => ({ selectedIds: s.selectedIds.length === ids.length ? [] : [...ids] })),
      clearSelection: () => set({ selectedIds: [] }),

      // ── Excel export ───────────────────────────────────────────
      downloadQuotationsExcel: async () => {
        const { quotations } = get();
        if (!quotations.length) return;
        const XLSX = await import('xlsx');
        const rows = quotations.map((q) => ({
          'Quotation #':   q.quotation_number,
          'Client':        q.client_name,
          'Issue Date':    q.issue_date,
          'Expiry Date':   q.expiry_date,
          'Currency':      q.currency,
          'Subtotal':      q.subtotal,
          'Discount':      q.discount_amount,
          'VAT':           q.tax_amount,
          'Total':         q.total_amount,
          'Status':        q.status,
          'Items':         q.item_count,
          'Created By':    q.created_by_name,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map((k) => ({
          wch: Math.max(k.length, ...rows.map((r) => String(r[k]).length)) + 2,
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
        XLSX.writeFile(wb, 'Otelex_Quotations.xlsx');
      },
    }),
    {
      name: 'quotation-store',
      partialize: (s) => ({ filters: s.filters }),
    }
  )
);

export default useQuotationStore;

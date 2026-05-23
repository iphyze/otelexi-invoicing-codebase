// stores/useProformaStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import proformaService from '../services/proformaService';
import { sendDocumentWithPdf } from '../utils/documentEmail';

const DEFAULT_FILTERS = {
  search: '', status: '', client_id: '',
  from: '', to: '',
  sortBy: 'created_at', sortOrder: 'DESC', page: 1, limit: 10,
};

const useProformaStore = create(
  persist(
    (set, get) => ({
      // ── List ───────────────────────────────────────────────────
      proformas: [], meta: null, filters: { ...DEFAULT_FILTERS },
      loading: false, error: null,

      // ── Single ─────────────────────────────────────────────────
      selectedProforma: null, singleLoading: false,

      // ── Selection ──────────────────────────────────────────────
      selectedIds: [],

      // ── Stats ──────────────────────────────────────────────────
      stats: { total: 0, draft: 0, sent: 0, approved: 0, converted: 0, expired: 0, rejected: 0 },

      // ── Filters ────────────────────────────────────────────────
      setFilter: (key, value) =>
        set((s) => ({
          filters: { ...s.filters, [key]: value, page: key === 'page' ? value : 1 },
        })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      // ── Fetch list ─────────────────────────────────────────────
      fetchProformas: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const res = await proformaService.getProformas(filters);
          set({ proformas: res.data.data, meta: res.data.meta, loading: false });
          get().fetchStats();
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || 'Failed to load proformas.' });
        }
      },

      // ── Stats ──────────────────────────────────────────────────
      fetchStats: async () => {
        try {
          const statuses = ['draft', 'sent', 'approved', 'rejected', 'converted', 'expired'];
          const results = await Promise.all(
            statuses.map((s) => proformaService.getProformas({ status: s, limit: 1, page: 1 }))
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
      fetchSingleProforma: async (id) => {
        set({ singleLoading: true, selectedProforma: null });
        try {
          const res = await proformaService.getSingleProforma(id);
          set({ selectedProforma: res.data.data, singleLoading: false });
          return res.data.data;
        } catch (err) {
          set({ singleLoading: false });
          throw err;
        }
      },

      // ── CRUD ───────────────────────────────────────────────────
      createProforma: async (payload) => {
        const res = await proformaService.createProforma(payload);
        get().fetchProformas();
        return res.data;
      },
      editProforma: async (id, payload) => {
        const res = await proformaService.editProforma(id, payload);
        const sel = get().selectedProforma;
        if (sel && sel.id === id) get().fetchSingleProforma(id);
        get().fetchProformas();
        return res.data;
      },
      deleteProformas: async (ids) => {
        await proformaService.deleteProformas(ids);
        set({ selectedIds: [] });
        get().fetchProformas();
      },

      // ── Status transitions ─────────────────────────────────────
      sendProforma: async (id) => {
        const res = await sendDocumentWithPdf({
          documentType: 'proforma',
          documentId: id,
        });
        get().refreshAfterAction(id);
        return res.data;
      },
      approveProforma: async (id) => {
        const res = await proformaService.approveProforma(id);
        get().refreshAfterAction(id);
        return res.data;
      },
      rejectProforma: async (id, reason) => {
        const res = await proformaService.rejectProforma(id, reason);
        get().refreshAfterAction(id);
        return res.data;
      },

      // ── Convert to invoice ─────────────────────────────────────
      convertToInvoice: async (id, payload) => {
        const res = await proformaService.convertToInvoice(id, payload);
        get().refreshAfterAction(id);
        return res.data;
      },

      refreshAfterAction: (id) => {
        get().fetchSingleProforma(id).catch(() => {});
        get().fetchProformas();
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
      downloadProformasExcel: async () => {
        const { proformas } = get();
        if (!proformas.length) return;
        const XLSX = await import('xlsx');
        const rows = proformas.map((p) => ({
          'Proforma #':    p.proforma_number,
          'Client':        p.client_name,
          'Quotation #':   p.quotation_number || '—',
          'Issue Date':    p.issue_date,
          'Expiry Date':   p.expiry_date,
          'Currency':      p.currency,
          'Subtotal':      p.subtotal,
          'Discount':      p.discount_amount,
          'VAT':           p.tax_amount,
          'Total':         p.total_amount,
          'Status':        p.status,
          'Items':         p.item_count,
          'Created By':    p.created_by_name,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map((k) => ({
          wch: Math.max(k.length, ...rows.map((r) => String(r[k]).length)) + 2,
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Proformas');
        XLSX.writeFile(wb, 'Otelex_Proformas.xlsx');
      },
    }),
    {
      name: 'proforma-store',
      partialize: (s) => ({ filters: s.filters }),
    }
  )
);

export default useProformaStore;

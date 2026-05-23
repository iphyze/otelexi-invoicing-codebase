// stores/useInvoiceStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import invoiceService from '../services/invoiceService';

const DEFAULT_FILTERS = {
  search: '', status: '', client_id: '',
  from: '', to: '',
  sortBy: 'created_at', sortOrder: 'DESC', page: 1, limit: 10,
};

const useInvoiceStore = create(
  persist(
    (set, get) => ({
      // ── List ───────────────────────────────────────────────────
      invoices: [], meta: null, filters: { ...DEFAULT_FILTERS },
      loading: false, error: null,

      // ── Single ─────────────────────────────────────────────────
      selectedInvoice: null, singleLoading: false,

      // ── Selection ──────────────────────────────────────────────
      selectedIds: [],

      // ── Stats ──────────────────────────────────────────────────
      stats: { total: 0, draft: 0, sent: 0, partial: 0, paid: 0, overdue: 0, credited: 0, reversed: 0, cancelled: 0 },

      // ── Filters ────────────────────────────────────────────────
      setFilter: (key, value) =>
        set((s) => ({
          filters: { ...s.filters, [key]: value, page: key === 'page' ? value : 1 },
        })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      // ── Fetch list ─────────────────────────────────────────────
      fetchInvoices: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const res = await invoiceService.getInvoices(filters);
          set({ invoices: res.data.data, meta: res.data.meta, loading: false });
          get().fetchStats();
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || 'Failed to load invoices.' });
        }
      },

      // ── Stats ──────────────────────────────────────────────────
      fetchStats: async () => {
        try {
          const statuses = ['draft', 'sent', 'partial', 'paid', 'overdue', 'credited', 'reversed', 'cancelled'];
          const results = await Promise.all(
            statuses.map((s) => invoiceService.getInvoices({ status: s, limit: 1, page: 1 }))
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
      fetchSingleInvoice: async (id) => {
        set({ singleLoading: true, selectedInvoice: null });
        try {
          const res = await invoiceService.getSingleInvoice(id);
          set({ selectedInvoice: res.data.data, singleLoading: false });
          return res.data.data;
        } catch (err) {
          set({ singleLoading: false });
          throw err;
        }
      },

      // ── CRUD ───────────────────────────────────────────────────
      createInvoice: async (payload) => {
        const res = await invoiceService.createInvoice(payload);
        get().fetchInvoices();
        return res.data;
      },
      editInvoice: async (id, payload) => {
        const res = await invoiceService.editInvoice(id, payload);
        if (get().selectedInvoice?.id === Number(id)) get().fetchSingleInvoice(id);
        get().fetchInvoices();
        return res.data;
      },
      deleteInvoices: async (ids) => {
        await invoiceService.deleteInvoices(ids);
        set({ selectedIds: [] });
        get().fetchInvoices();
      },

      // ── Lifecycle ──────────────────────────────────────────────
      finalizeInvoice: async (id) => {
        const res = await invoiceService.finalizeInvoice(id);
        get().refreshAfterAction(id);
        return res.data;
      },
      cancelInvoice: async (id, reason) => {
        const res = await invoiceService.cancelInvoice(id, reason);
        get().refreshAfterAction(id);
        return res.data;
      },
      markOverdue: async () => {
        const res = await invoiceService.markOverdue();
        get().fetchInvoices();
        return res.data;
      },
      sendOverdueReminder: async (id) => {
        const res = await invoiceService.sendOverdueReminder(id);
        get().refreshAfterAction(id);
        return res.data;
      },
      createCreditNote: async (id, payload) => {
        const res = await invoiceService.createCreditNote(id, payload);
        get().refreshAfterAction(id);
        return res.data;
      },
      processRefund: async (creditNoteId, payload, invoiceId) => {
        const res = await invoiceService.processRefund(creditNoteId, payload);
        if (invoiceId) get().refreshAfterAction(invoiceId);
        return res.data;
      },
      reverseInvoice: async (id, reason) => {
        const res = await invoiceService.reverseInvoice(id, reason);
        get().refreshAfterAction(id);
        return res.data;
      },

      refreshAfterAction: (id) => {
        get().fetchSingleInvoice(id).catch(() => {});
        get().fetchInvoices();
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
      downloadInvoicesExcel: async () => {
        const { invoices } = get();
        if (!invoices.length) return;
        const XLSX = await import('xlsx');
        const rows = invoices.map((inv) => ({
          'Invoice #':     inv.invoice_number,
          'Client':        inv.client_name,
          'Issue Date':    inv.issue_date,
          'Due Date':      inv.due_date,
          'Currency':      inv.currency,
          'Original Total': inv.total_amount,
          'Credited':      inv.credited_amount || 0,
          'Adjusted Total': inv.adjusted_total ?? inv.total_amount,
          'Paid':          inv.amount_paid,
          'Refunded':      inv.refunded_amount || 0,
          'Net Paid':      (Number(inv.amount_paid || 0) - Number(inv.refunded_amount || 0)),
          'Balance Due':   inv.balance_due,
          'Payment Terms': inv.payment_terms,
          'Status':        inv.status,
          'Items':         inv.item_count,
          'Payments':      inv.payment_count,
          'Created By':    inv.created_by_name,
          'Approved By':   inv.approved_by_name || '—',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map((k) => ({
          wch: Math.max(k.length, ...rows.map((r) => String(r[k]).length)) + 2,
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
        XLSX.writeFile(wb, 'Otelex_Invoices.xlsx');
      },
    }),
    { name: 'invoice-store', partialize: (s) => ({ filters: s.filters }) }
  )
);

export default useInvoiceStore;

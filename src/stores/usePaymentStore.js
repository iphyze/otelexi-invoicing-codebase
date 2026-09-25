// stores/usePaymentStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import paymentService from '../services/paymentService';

const DEFAULT_FILTERS = {
  search: '', invoice_id: '', client_id: '', payment_method: '',
  from: '', to: '',
  sortBy: 'payment_date', sortOrder: 'DESC', page: 1, limit: 10,
};

const DEFAULT_LINK_FILTERS = {
  search: '', invoice_id: '', client_id: '', provider: '', status: '',
  from: '', to: '', page: 1, limit: 10,
};

const usePaymentStore = create(
  persist(
    (set, get) => ({
      payments: [], meta: null, filters: { ...DEFAULT_FILTERS },
      loading: false, error: null,
      selectedPayment: null, singleLoading: false,

      paymentLinks: [], paymentLinksMeta: null, paymentLinkFilters: { ...DEFAULT_LINK_FILTERS },
      paymentLinksLoading: false, paymentLinksError: null,
      selectedPaymentLink: null, paymentLinkSingleLoading: false,

      setFilter: (key, value) =>
        set((s) => ({
          filters: { ...s.filters, [key]: value, page: key === 'page' ? value : 1 },
        })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      setPaymentLinkFilter: (key, value) =>
        set((s) => ({
          paymentLinkFilters: { ...s.paymentLinkFilters, [key]: value, page: key === 'page' ? value : 1 },
        })),
      resetPaymentLinkFilters: () => set({ paymentLinkFilters: { ...DEFAULT_LINK_FILTERS } }),

      fetchPayments: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const res = await paymentService.getPayments(filters);
          set({ payments: res.data.data, meta: res.data.meta, loading: false });
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || 'Failed to load payments.' });
        }
      },

      fetchSinglePayment: async (id) => {
        set({ singleLoading: true, selectedPayment: null });
        try {
          const res = await paymentService.getSinglePayment(id);
          set({ selectedPayment: res.data.data, singleLoading: false });
          return res.data.data;
        } catch (err) {
          set({ singleLoading: false });
          throw err;
        }
      },

      fetchPaymentLinks: async (overrides = {}) => {
        const filters = { ...get().paymentLinkFilters, ...overrides };
        set({ paymentLinksLoading: true, paymentLinksError: null });
        try {
          const res = await paymentService.getPaymentLinks(filters);
          set({ paymentLinks: res.data.data, paymentLinksMeta: res.data.meta, paymentLinksLoading: false });
        } catch (err) {
          set({ paymentLinksLoading: false, paymentLinksError: err.response?.data?.message || 'Failed to load payment requests.' });
        }
      },

      fetchSinglePaymentLink: async (id) => {
        set({ paymentLinkSingleLoading: true, selectedPaymentLink: null });
        try {
          const res = await paymentService.getSinglePaymentLink(id);
          set({ selectedPaymentLink: res.data.data, paymentLinkSingleLoading: false });
          return res.data.data;
        } catch (err) {
          set({ paymentLinkSingleLoading: false });
          throw err;
        }
      },

      recordPayment: async (payload) => {
        const res = await paymentService.recordPayment(payload);
        get().fetchPayments();
        return res.data;
      },

      issueReceipt: async (id) => {
        const res = await paymentService.issueReceipt(id);
        get().fetchPayments();
        return res.data;
      },

      deletePayment: async (id) => {
        const res = await paymentService.deletePayment(id);
        get().fetchPayments();
        return res.data;
      },

      createPaymentLink: async (invoiceId, payload) => {
        const res = await paymentService.createPaymentLink(invoiceId, payload);
        get().fetchPaymentLinks();
        return res.data;
      },

      sendPaymentLink: async (id, mailProvider = 'system') => {
        const res = await paymentService.sendPaymentLink(id, mailProvider);
        get().fetchPaymentLinks();
        return res.data;
      },

      cancelPaymentLink: async (id) => {
        const res = await paymentService.cancelPaymentLink(id);
        get().fetchPaymentLinks();
        return res.data;
      },

      verifyPaymentLink: async (id) => {
        const res = await paymentService.verifyPaymentLink(id);
        get().fetchPaymentLinks();
        get().fetchPayments();
        return res.data;
      },

      downloadPaymentsExcel: async () => {
        const { payments } = get();
        if (!payments.length) return;
        const XLSX = await import('xlsx');
        const rows = payments.map((p) => ({
          'Payment Date':   p.payment_date,
          'Invoice #':      p.invoice_number,
          'Client':         p.client_name,
          'Amount':         p.amount,
          'Currency':       p.currency,
          'Method':         p.payment_method,
          'Reference':      p.reference || '—',
          'Invoice Status': p.invoice_status,
          'Balance Due':    p.invoice_balance_due,
          'Recorded By':    p.recorded_by_name,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map((k) => ({
          wch: Math.max(k.length, ...rows.map((r) => String(r[k]).length)) + 2,
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payments');
        XLSX.writeFile(wb, 'Otelex_Payments.xlsx');
      },

      downloadPaymentLinksExcel: async () => {
        const { paymentLinks } = get();
        if (!paymentLinks.length) return;
        const XLSX = await import('xlsx');
        const rows = paymentLinks.map((link) => ({
          'Created': link.created_at,
          'Invoice #': link.invoice_number,
          'Client': link.client_name,
          'Provider': link.provider,
          'Reference': link.reference,
          'Amount': link.amount,
          'Currency': link.currency,
          'Status': link.status,
          'Gateway Response': link.gateway_response || '—',
          'Receipt': link.receipt_number || '—',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map((k) => ({
          wch: Math.max(k.length, ...rows.map((r) => String(r[k]).length)) + 2,
        }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Payment Requests');
        XLSX.writeFile(wb, 'Otelex_Payment_Requests.xlsx');
      },
    }),
    { name: 'payment-store', partialize: (s) => ({ filters: s.filters, paymentLinkFilters: s.paymentLinkFilters }) }
  )
);

export default usePaymentStore;

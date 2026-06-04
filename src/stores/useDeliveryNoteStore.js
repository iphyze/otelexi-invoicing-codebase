// stores/useDeliveryNoteStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import deliveryNoteService from '../services/deliveryNoteService';

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  client_id: '',
  invoice_id: '',
  from: '',
  to: '',
  sortBy: 'created_at',
  sortOrder: 'DESC',
  page: 1,
  limit: 10,
};

const INITIAL_STATS = {
  total: 0,
  draft: 0,
  dispatched: 0,
  delivered: 0,
  cancelled: 0,
};

const useDeliveryNoteStore = create(
  persist(
    (set, get) => ({
      // ── List ───────────────────────────────────────────────────
      deliveryNotes: [],
      meta: null,
      filters: { ...DEFAULT_FILTERS },
      loading: false,
      error: null,
      stats: { ...INITIAL_STATS },

      // ── Single ─────────────────────────────────────────────────
      selectedDeliveryNote: null,
      singleLoading: false,

      // ── Filters ────────────────────────────────────────────────
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value, page: key === 'page' ? value : 1 },
        })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      // ── Fetch list ─────────────────────────────────────────────
      fetchDeliveryNotes: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const response = await deliveryNoteService.getDeliveryNotes(filters);
          set({
            deliveryNotes: response.data?.data || [],
            meta: response.data?.meta || null,
            loading: false,
          });
          get().fetchStats();
        } catch (error) {
          set({
            loading: false,
            error: error.response?.data?.message || 'Failed to load delivery notes.',
          });
        }
      },

      // ── Stats ──────────────────────────────────────────────────
      fetchStats: async () => {
        try {
          const statuses = ['draft', 'dispatched', 'delivered', 'cancelled'];
          const results = await Promise.all(
            statuses.map((status) => deliveryNoteService.getDeliveryNotes({ status, limit: 1, page: 1 }))
          );
          const stats = { total: 0 };
          statuses.forEach((status, index) => {
            stats[status] = results[index].data?.meta?.total || 0;
            stats.total += stats[status];
          });
          set({ stats });
        } catch {
          // Stats are helpful but should not block the page.
        }
      },

      // ── Single ─────────────────────────────────────────────────
      fetchSingleDeliveryNote: async (id) => {
        set({ singleLoading: true, selectedDeliveryNote: null });
        try {
          const response = await deliveryNoteService.getSingleDeliveryNote(id);
          set({ selectedDeliveryNote: response.data?.data || null, singleLoading: false });
          return response.data?.data;
        } catch (error) {
          set({ singleLoading: false });
          throw error;
        }
      },

      // ── Lifecycle ──────────────────────────────────────────────
      createDeliveryNote: async (payload) => {
        const response = await deliveryNoteService.createDeliveryNote(payload);
        get().fetchDeliveryNotes().catch(() => {});
        return response.data;
      },

      updateDeliveryNoteStatus: async (id, payload) => {
        const response = await deliveryNoteService.updateDeliveryNoteStatus(id, payload);
        get().refreshAfterAction(id);
        return response.data;
      },

      refreshAfterAction: (id) => {
        get().fetchSingleDeliveryNote(id).catch(() => {});
        get().fetchDeliveryNotes().catch(() => {});
      },

      // ── Excel export ───────────────────────────────────────────
      downloadDeliveryNotesExcel: async () => {
        const { deliveryNotes } = get();
        if (!deliveryNotes.length) return;
        const XLSX = await import('xlsx');
        const rows = deliveryNotes.map((note) => ({
          'Delivery Note #': note.delivery_note_number,
          'Invoice #': note.invoice_number,
          'Client': note.client_name,
          'Delivery Date': note.delivery_date,
          'Dispatch Date': note.dispatch_date || '',
          'Delivered At': note.delivered_at || '',
          'Status': note.status,
          'Items': note.item_count || 0,
          'Quantity': note.total_quantity || 0,
          'Driver': note.driver_name || '',
          'Vehicle': note.vehicle_number || '',
          'Created By': note.created_by_name || '',
        }));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet['!cols'] = Object.keys(rows[0]).map((key) => ({
          wch: Math.max(key.length, ...rows.map((row) => String(row[key] ?? '').length)) + 2,
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Delivery Notes');
        XLSX.writeFile(workbook, 'Otelex_Delivery_Notes.xlsx');
      },
    }),
    { name: 'delivery-note-store', partialize: (state) => ({ filters: state.filters }) }
  )
);

export default useDeliveryNoteStore;

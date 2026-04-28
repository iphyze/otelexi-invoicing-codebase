// stores/useClientStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import clientService from '../services/clientService';

const DEFAULT_FILTERS = {
  search: '', status: 'active', currency: '',
  sortBy: 'created_at', sortOrder: 'DESC', page: 1, limit: 10,
};
const DEFAULT_CONTACT_FILTERS = {
  search: '', client_id: '', is_primary: '',
  sortBy: 'created_at', sortOrder: 'DESC', page: 1, limit: 10,
};

const useClientStore = create(
  persist(
    (set, get) => ({
      clients: [], meta: null, filters: { ...DEFAULT_FILTERS },
      loading: false, error: null,
      selectedClient: null, singleLoading: false,
      contacts: [], contactsMeta: null,
      contactFilters: { ...DEFAULT_CONTACT_FILTERS },
      contactsLoading: false, contactsError: null,
      stats: { total: 0, active: 0, inactive: 0, totalContacts: 0 },
      selectedIds: [],

      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value, page: key === 'page' ? value : 1 } })),

      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      setContactFilter: (key, value) =>
        set((s) => ({ contactFilters: { ...s.contactFilters, [key]: value, page: key === 'page' ? value : 1 } })),

      fetchClients: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const res = await clientService.getClients(filters);
          set({ clients: res.data.data, meta: res.data.meta, loading: false });
          get().fetchStats();
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || 'Failed to load clients.' });
        }
      },

      fetchStats: async () => {
        try {
          const [aRes, iRes, cRes] = await Promise.all([
            clientService.getClients({ status: 'active', limit: 1, page: 1 }),
            clientService.getClients({ status: 'inactive', limit: 1, page: 1 }),
            clientService.getFilteredContacts({ limit: 1, page: 1 }),
          ]);
          set({
            stats: {
              active: aRes.data.meta.total, inactive: iRes.data.meta.total,
              total: aRes.data.meta.total + iRes.data.meta.total,
              totalContacts: cRes.data.meta.total,
            }
          });
        } catch { /* silently fail */ }
      },

      fetchSingleClient: async (id) => {
        set({ singleLoading: true, selectedClient: null });
        try {
          const res = await clientService.getSingleClient(id);
          set({ selectedClient: res.data.data, singleLoading: false });
          return res.data.data;
        } catch (err) { set({ singleLoading: false }); throw err; }
      },

      createClient: async (payload) => {
        const res = await clientService.createClient(payload);
        get().fetchClients(); return res.data;
      },
      editClient: async (payload) => {
        const res = await clientService.editClient(payload);
        get().fetchClients(); return res.data;
      },
      deleteClients: async (ids) => {
        await clientService.deleteClients(ids);
        set({ selectedIds: [] }); get().fetchClients();
      },
      deactivateClients: async (ids) => {
        await clientService.deactivateClients(ids);
        set({ selectedIds: [] }); get().fetchClients();
      },
      reactivateClients: async (ids) => {
        await clientService.reactivateClients(ids);
        set({ selectedIds: [] }); get().fetchClients();
      },

      fetchContacts: async (overrides = {}) => {
        const filters = { ...get().contactFilters, ...overrides };
        set({ contactsLoading: true, contactsError: null });
        try {
          const res = await clientService.getFilteredContacts(filters);
          set({ contacts: res.data.data, contactsMeta: res.data.meta, contactsLoading: false });
        } catch (err) {
          set({ contactsLoading: false, contactsError: err.response?.data?.message || 'Failed to load contacts.' });
        }
      },
      createContact: async (payload) => {
        const res = await clientService.createContact(payload);
        get().fetchContacts(); get().fetchStats(); return res.data;
      },
      editContact: async (id, payload) => {
        const res = await clientService.editContact(id, payload);
        get().fetchContacts(); return res.data;
      },
      deleteContacts: async (ids) => {
        await clientService.deleteContacts(ids);
        get().fetchContacts(); get().fetchStats();
      },

      toggleSelect: (id) =>
        set((s) => ({ selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((i) => i !== id) : [...s.selectedIds, id] })),
      toggleSelectAll: (ids) =>
        set((s) => ({ selectedIds: s.selectedIds.length === ids.length ? [] : [...ids] })),
      clearSelection: () => set({ selectedIds: [] }),

      // ── Excel Export ─────────────────────────────────────────
      downloadClientsExcel: async () => {
        const { clients } = get();
        if (!clients.length) return;

        const XLSX = await import('xlsx');

        // Fetch all contacts for the second sheet
        let allContacts = [];
        try {
          const contactsRes = await clientService.getFilteredContacts({ limit: 9999, page: 1 });
          allContacts = contactsRes.data.data || [];
        } catch { /* proceed without contacts sheet */ }

        // Lookup map: client id → company name
        const clientNameMap = {};
        clients.forEach((c) => { clientNameMap[c.id] = c.company_name; });

        // ── Sheet 1: Clients ──────────────────────────────────
        const clientRows = clients.map((c) => ({
          'Company Name':     c.company_name || '',
          'Email':            c.email || '',
          'Phone':            c.phone || '',
          'City':             c.city || '',
          'State':            c.state || '',
          'Country':          c.country || '',
          'Billing Address':  c.billing_address || '',
          'Shipping Address': c.shipping_address || '',
          'Currency':         c.currency || '',
          'Payment Terms':    c.payment_terms === 'due_on_receipt' ? 'Due on Receipt' : (c.payment_terms || ''),
          'Tax ID':           c.tax_id || '',
          'Status':           c.is_active === 1 ? 'Active' : 'Inactive',
        }));

        const wsClients = XLSX.utils.json_to_sheet(clientRows);
        wsClients['!cols'] = Object.keys(clientRows[0]).map((key) => ({
          wch: Math.max(key.length, ...clientRows.map((r) => String(r[key]).length)) + 2,
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsClients, 'Clients');

        // ── Sheet 2: Contacts ─────────────────────────────────
        if (allContacts.length > 0) {
          const contactRows = allContacts.map((c) => ({
            'Client':  clientNameMap[c.client_id] || `ID: ${c.client_id}`,
            'Name':    c.name || '',
            'Email':   c.email || '',
            'Phone':   c.phone || '',
            'Position': c.position || '',
            'Primary': c.is_primary === 1 ? 'Yes' : 'No',
          }));

          const wsContacts = XLSX.utils.json_to_sheet(contactRows);
          wsContacts['!cols'] = Object.keys(contactRows[0]).map((key) => ({
            wch: Math.max(key.length, ...contactRows.map((r) => String(r[key]).length)) + 2,
          }));

          XLSX.utils.book_append_sheet(wb, wsContacts, 'Contacts');
        }

        XLSX.writeFile(wb, 'Otelex_Clients.xlsx');
      },
    }),
    {
      name: 'client-store',
      partialize: (s) => ({ filters: s.filters, contactFilters: s.contactFilters }),
    }
  )
);

export default useClientStore;
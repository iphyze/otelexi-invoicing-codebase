// stores/useUserStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import userService from '../services/userService';

const DEFAULT_FILTERS = {
  search: '', role: '',
  sortBy: 'id', sortOrder: 'DESC', page: 1, limit: 15,
};

const useUserStore = create(
  persist(
    (set, get) => ({
      users: [], meta: null, filters: { ...DEFAULT_FILTERS },
      loading: false, error: null,
      selectedUser: null, singleLoading: false,
      selectedIds: [],

      setFilter: (key, value) =>
        set((s) => ({
          filters: { ...s.filters, [key]: value, page: key === 'page' ? value : 1 },
        })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      fetchUsers: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const res = await userService.getUsers(filters);
          set({ users: res.data.data, meta: res.data.meta, loading: false });
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || 'Failed to load users.' });
        }
      },

      fetchSingleUser: async (id) => {
        set({ singleLoading: true, selectedUser: null });
        try {
          const res = await userService.getSingleUser(id);
          set({ selectedUser: res.data.data, singleLoading: false });
          return res.data.data;
        } catch (err) {
          set({ singleLoading: false });
          throw err;
        }
      },

      createUser: async (payload) => {
        const res = await userService.createUser(payload);
        get().fetchUsers();
        return res.data;
      },

      editUser: async (payload) => {
        const res = await userService.editUser(payload);
        get().fetchUsers();
        return res.data;
      },

      updateProfile: async (payload) => {
        const res = await userService.updateProfile(payload);
        return res.data;
      },

      deleteUsers: async (ids) => {
        await userService.deleteUsers(ids);
        set({ selectedIds: [] });
        get().fetchUsers();
      },

      deactivateUsers: async (ids) => {
        await userService.deactivateUsers(ids);
        get().fetchUsers();
      },

      toggleSelect: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((i) => i !== id)
            : [...s.selectedIds, id],
        })),
      toggleSelectAll: (ids) =>
        set((s) => ({ selectedIds: s.selectedIds.length === ids.length ? [] : [...ids] })),
      clearSelection: () => set({ selectedIds: [] }),
    }),
    { name: 'user-store', partialize: (s) => ({ filters: s.filters }) }
  )
);

export default useUserStore;

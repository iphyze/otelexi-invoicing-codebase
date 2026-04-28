// stores/useNotificationStore.js
import { create } from 'zustand';
import notificationService from '../services/notificationService';

const useNotificationStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────
  notifications:  [],
  unreadCount:    0,
  meta:           null,
  loading:        false,
  panelOpen:      false,
  filter:         'all',   // 'all' | 'unread'
  pollInterval:   null,

  // ── Fetch ──────────────────────────────────────────────────────
  fetchNotifications: async (params = {}) => {
    const { filter } = get();
    set({ loading: true });
    try {
      const res = await notificationService.getNotifications({
        filter, limit: 20, page: 1, ...params,
      });
      set({
        notifications: res.data.data,
        unreadCount:   res.data.meta?.unread_count ?? 0,
        meta:          res.data.meta,
        loading:       false,
      });
    } catch {
      set({ loading: false });
    }
  },

  // Silent poll — only updates badge count, doesn't replace list if panel is closed
  silentPoll: async () => {
    try {
      const res = await notificationService.getNotifications({ filter: 'all', limit: 1, page: 1 });
      const newCount = res.data.meta?.unread_count ?? 0;
      const current  = get().unreadCount;
      // If count increased, also refresh the list
      if (newCount !== current) {
        set({ unreadCount: newCount });
        if (get().panelOpen) get().fetchNotifications();
      }
    } catch { /* silent */ }
  },

  // ── Polling ────────────────────────────────────────────────────
  startPolling: (intervalMs = 30000) => {
    const existing = get().pollInterval;
    if (existing) clearInterval(existing);
    const id = setInterval(() => get().silentPoll(), intervalMs);
    set({ pollInterval: id });
    // Initial fetch
    get().fetchNotifications();
  },
  stopPolling: () => {
    const id = get().pollInterval;
    if (id) clearInterval(id);
    set({ pollInterval: null });
  },

  // ── Actions ────────────────────────────────────────────────────
  markRead: async (ids) => {
    try {
      const res = await notificationService.markRead({ ids });
      set({ unreadCount: res.data.data?.unread_count ?? 0 });
      // Update local state
      set((s) => ({
        notifications: s.notifications.map((n) =>
          ids.includes(n.id) ? { ...n, is_read: true } : n
        ),
      }));
    } catch { /* silent */ }
  },

  markAllRead: async () => {
    try {
      const res = await notificationService.markAllRead();
      set({
        unreadCount:   res.data.data?.unread_count ?? 0,
        notifications: get().notifications.map((n) => ({ ...n, is_read: true })),
      });
    } catch { /* silent */ }
  },

  // ── Panel ──────────────────────────────────────────────────────
  openPanel: () => {
    set({ panelOpen: true });
    get().fetchNotifications();
  },
  closePanel: () => set({ panelOpen: false }),
  togglePanel: () => {
    const isOpen = get().panelOpen;
    if (!isOpen) get().openPanel();
    else         get().closePanel();
  },

  // ── Filter ─────────────────────────────────────────────────────
  setFilter: (filter) => {
    set({ filter });
    get().fetchNotifications({ filter });
  },
}));

export default useNotificationStore;

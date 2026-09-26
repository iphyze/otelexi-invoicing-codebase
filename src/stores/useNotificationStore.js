// stores/useNotificationStore.js
import { create } from 'zustand';
import notificationService from '../services/notificationService';

const DEFAULT_POLL_INTERVAL = 5000;

const sortNewestFirst = (items = []) => [...items].sort((a, b) => {
  const bTime = new Date(b?.created_at || 0).getTime();
  const aTime = new Date(a?.created_at || 0).getTime();
  if (bTime !== aTime) return bTime - aTime;
  return Number(b?.id || 0) - Number(a?.id || 0);
});

const useNotificationStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────
  notifications:  [],
  unreadCount:    0,
  meta:           null,
  loading:        false,
  panelOpen:      false,
  filter:         'all',   // 'all' | 'unread'
  pollInterval:   null,
  pollInFlight:   false,
  lastSyncedAt:   null,
  markAllReadVersion: 0,

  // ── Fetch ──────────────────────────────────────────────────────
  fetchNotifications: async (params = {}) => {
    const { filter } = get();
    set({ loading: true });
    try {
      const res = await notificationService.getNotifications({
        filter, limit: 20, page: 1, ...params,
      });
      set({
        notifications: sortNewestFirst(res.data.data || []),
        unreadCount:   res.data.meta?.unread_count ?? 0,
        meta:          res.data.meta,
        loading:       false,
        lastSyncedAt:  Date.now(),
      });
      return res;
    } catch {
      set({ loading: false });
      return null;
    }
  },

  // Lightweight near-live refresh. Unlike the old badge-only poll,
  // this refreshes the latest list too, so an open panel/page updates
  // without a manual reload.
  silentPoll: async () => {
    if (get().pollInFlight) return;

    set({ pollInFlight: true });
    try {
      const { filter } = get();
      const res = await notificationService.getNotifications({
        filter,
        limit: 20,
        page: 1,
      });

      set({
        notifications: sortNewestFirst(res.data.data || []),
        unreadCount:   res.data.meta?.unread_count ?? 0,
        meta:          res.data.meta,
        lastSyncedAt:  Date.now(),
      });
    } catch {
      // Background sync must never interrupt normal app usage.
    } finally {
      set({ pollInFlight: false });
    }
  },

  // ── Polling ────────────────────────────────────────────────────
  startPolling: (intervalMs = DEFAULT_POLL_INTERVAL) => {
    const existing = get().pollInterval;
    if (existing) clearInterval(existing);

    // Fetch immediately when an authenticated header mounts.
    get().fetchNotifications();

    const id = setInterval(() => {
      // Browsers throttle hidden tabs anyway; skipping here avoids
      // unnecessary API traffic while the user is away.
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        get().silentPoll();
      }
    }, intervalMs);

    set({ pollInterval: id });
  },

  stopPolling: () => {
    const id = get().pollInterval;
    if (id) clearInterval(id);
    set({ pollInterval: null, pollInFlight: false });
  },

  // ── Actions ────────────────────────────────────────────────────
  markRead: async (ids) => {
    try {
      const normalisedIds = [...new Set((ids || []).map(Number).filter((id) => Number.isFinite(id) && id > 0))];
      if (normalisedIds.length === 0) return false;

      const res = await notificationService.markRead({ ids: normalisedIds });
      set((s) => {
        const nextUnreadCount = res.data.data?.unread_count ?? 0;
        const nextMeta = s.filter === 'unread' && s.meta
          ? {
              ...s.meta,
              total: nextUnreadCount,
              total_pages: nextUnreadCount > 0
                ? Math.ceil(nextUnreadCount / (s.meta.limit || 20))
                : 0,
            }
          : s.meta;

        return {
          unreadCount: nextUnreadCount,
          meta: nextMeta,
          notifications: s.filter === 'unread'
            ? s.notifications.filter((n) => !normalisedIds.includes(Number(n.id)))
            : s.notifications.map((n) =>
                normalisedIds.includes(Number(n.id))
                  ? { ...n, is_read: true, read_at: n.read_at || new Date().toISOString() }
                  : n
              ),
        };
      });
      return true;
    } catch {
      return false;
    }
  },

  markAllRead: async () => {
    try {
      const res = await notificationService.markAllRead();
      set((s) => {
        const nextUnreadCount = res.data.data?.unread_count ?? 0;
        return {
          unreadCount: nextUnreadCount,
          notifications: s.filter === 'unread'
            ? []
            : s.notifications.map((n) => ({
                ...n,
                is_read: true,
                read_at: n.read_at || new Date().toISOString(),
              })),
          meta: s.filter === 'unread' && s.meta
            ? { ...s.meta, total: 0, total_pages: 0, page: 1 }
            : s.meta,
          markAllReadVersion: s.markAllReadVersion + 1,
        };
      });
      return true;
    } catch {
      return false;
    }
  },

  // ── Panel ──────────────────────────────────────────────────────
  openPanel: () => {
    set({ panelOpen: true });
    // Pull the freshest data immediately instead of waiting for the next tick.
    get().silentPoll();
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
    return get().fetchNotifications({ filter });
  },
}));

export default useNotificationStore;

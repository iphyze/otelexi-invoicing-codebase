import { create } from 'zustand';

const useToastStore = create((set) => ({
  toasts: [],

  showToast: (message, type = 'info') => {
    const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
  },

  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export default useToastStore;
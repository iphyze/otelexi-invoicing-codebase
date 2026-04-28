// stores/useProductStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import productService from '../services/productService';

const DEFAULT_FILTERS = {
  search: '', status: 'active', category_id: '', tax_type: '',
  unit_of_measure: '', low_stock: 0,
  sortBy: 'created_at', sortOrder: 'DESC', page: 1, limit: 10,
};

const DEFAULT_CAT_FILTERS = {
  search: '',
  sortBy: 'name', sortOrder: 'ASC', page: 1, limit: 10,
};

const useProductStore = create(
  persist(
    (set, get) => ({
      // ── Products ────────────────────────────────────────────
      products: [], meta: null, filters: { ...DEFAULT_FILTERS },
      loading: false, error: null,
      selectedProduct: null, singleLoading: false,
      selectedIds: [],
      stats: { total: 0, active: 0, inactive: 0, lowStock: 0, outOfStock: 0 },

      // ── Categories ──────────────────────────────────────────
      categories: [], categoriesMeta: null,
      catFilters: { ...DEFAULT_CAT_FILTERS },
      catsLoading: false, catsError: null,
      selectedCatIds: [],
      // Lightweight list for dropdowns (no pagination)
      categoryOptions: [],

      // ── Product Filters ─────────────────────────────────────
      setFilter: (key, value) =>
        set((s) => ({
          filters: { ...s.filters, [key]: value, page: key === 'page' ? value : 1 },
        })),
      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),

      // ── Category Filters ────────────────────────────────────
      setCatFilter: (key, value) =>
        set((s) => ({
          catFilters: { ...s.catFilters, [key]: value, page: key === 'page' ? value : 1 },
        })),

      // ── Fetch Products ──────────────────────────────────────
      fetchProducts: async (overrides = {}) => {
        const filters = { ...get().filters, ...overrides };
        set({ loading: true, error: null });
        try {
          const res = await productService.getProducts(filters);
          set({ products: res.data.data, meta: res.data.meta, loading: false });
          get().fetchStats();
        } catch (err) {
          set({ loading: false, error: err.response?.data?.message || 'Failed to load products.' });
        }
      },

      // ── Stats: active, inactive, low/out-of-stock ───────────
      fetchStats: async () => {
        try {
          const [aRes, iRes, lsRes] = await Promise.all([
            productService.getProducts({ status: 'active', limit: 1, page: 1 }),
            productService.getProducts({ status: 'inactive', limit: 1, page: 1 }),
            productService.getLowStock(),
          ]);
          const lowStockData = lsRes.data.data || [];
          set({
            stats: {
              active:     aRes.data.meta.total,
              inactive:   iRes.data.meta.total,
              total:      aRes.data.meta.total + iRes.data.meta.total,
              lowStock:   lsRes.data.meta?.low_stock || 0,
              outOfStock: lsRes.data.meta?.out_of_stock || 0,
            },
          });
        } catch { /* silently fail */ }
      },

      // ── Single Product ──────────────────────────────────────
      fetchSingleProduct: async (id) => {
        set({ singleLoading: true, selectedProduct: null });
        try {
          const res = await productService.getSingleProduct(id);
          set({ selectedProduct: res.data.data, singleLoading: false });
          return res.data.data;
        } catch (err) {
          set({ singleLoading: false });
          throw err;
        }
      },

      // ── CRUD Products ───────────────────────────────────────
      createProduct: async (payload) => {
        const res = await productService.createProduct(payload);
        get().fetchProducts();
        return res.data;
      },
      editProduct: async (id, payload) => {
        const res = await productService.editProduct(id, payload);
        get().fetchProducts();
        return res.data;
      },
      deleteProducts: async (ids) => {
        await productService.deleteProducts(ids);
        set({ selectedIds: [] });
        get().fetchProducts();
      },
      deactivateProducts: async (ids) => {
        await productService.deactivateProducts(ids);
        set({ selectedIds: [] });
        get().fetchProducts();
      },

      // ── Selection ───────────────────────────────────────────
      toggleSelect: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((i) => i !== id)
            : [...s.selectedIds, id],
        })),
      toggleSelectAll: (ids) =>
        set((s) => ({ selectedIds: s.selectedIds.length === ids.length ? [] : [...ids] })),
      clearSelection: () => set({ selectedIds: [] }),

      // ── Categories CRUD ─────────────────────────────────────
      fetchCategories: async (overrides = {}) => {
        const filters = { ...get().catFilters, ...overrides };
        set({ catsLoading: true, catsError: null });
        try {
          const res = await productService.getCategories(filters);
          set({ categories: res.data.data, categoriesMeta: res.data.meta, catsLoading: false });
        } catch (err) {
          set({ catsLoading: false, catsError: err.response?.data?.message || 'Failed to load categories.' });
        }
      },

      // Lightweight fetch for dropdowns (no pagination, all results)
      fetchCategoryOptions: async () => {
        try {
          const res = await productService.searchCategories('');
          set({ categoryOptions: res.data.data || [] });
        } catch { /* silently fail */ }
      },

      createCategory: async (payload) => {
        const res = await productService.createCategory(payload);
        get().fetchCategories();
        get().fetchCategoryOptions();
        return res.data;
      },
      editCategory: async (id, payload) => {
        const res = await productService.editCategory(id, payload);
        get().fetchCategories();
        get().fetchCategoryOptions();
        return res.data;
      },
      deleteCategories: async (ids) => {
        await productService.deleteCategories(ids);
        set({ selectedCatIds: [] });
        get().fetchCategories();
        get().fetchCategoryOptions();
      },

      toggleSelectCat: (id) =>
        set((s) => ({
          selectedCatIds: s.selectedCatIds.includes(id)
            ? s.selectedCatIds.filter((i) => i !== id)
            : [...s.selectedCatIds, id],
        })),
      toggleSelectAllCats: (ids) =>
        set((s) => ({ selectedCatIds: s.selectedCatIds.length === ids.length ? [] : [...ids] })),
      clearCatSelection: () => set({ selectedCatIds: [] }),

      // ── Excel Export ────────────────────────────────────────
      downloadProductsExcel: async () => {
        const { products } = get();
        if (!products.length) return;

        const XLSX = await import('xlsx');

        const rows = products.map((p) => ({
          'Name':            p.name || '',
          'SKU':             p.sku || '',
          'Category':        p.category_name || '',
          'Unit Price':      p.unit_price,
          'Unit of Measure': p.unit_of_measure || '',
          'Tax Type':        p.tax_type === 'vat' ? `VAT (${p.tax_rate}%)` : 'Exempt',
          'Stock Qty':       p.stock_quantity,
          'Reorder Level':   p.reorder_level,
          'Stock Status':    p.stock_status === 'in_stock' ? 'In Stock' : p.stock_status === 'low_stock' ? 'Low Stock' : 'Out of Stock',
          'Status':          p.is_active === 1 ? 'Active' : 'Inactive',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = Object.keys(rows[0]).map((key) => ({
          wch: Math.max(key.length, ...rows.map((r) => String(r[key]).length)) + 2,
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Products');
        XLSX.writeFile(wb, 'Otelex_Products.xlsx');
      },
    }),
    {
      name: 'product-store',
      partialize: (s) => ({ filters: s.filters, catFilters: s.catFilters }),
    }
  )
);

export default useProductStore;

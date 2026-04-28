// services/productService.js
import api from './api';

const productService = {
  // ── Products ──────────────────────────────────────────────
  getProducts: (params) => api.get('/products', { params }),
  searchProducts: (search, categoryId) => api.get('/products/search', { params: { search, category_id: categoryId } }),
  getSingleProduct: (id) => api.get(`/products/${id}`, { params: { id } }),
  createProduct: (data) => api.post('/products/create', data),
  editProduct: (id, data) => api.put(`/products/edit/${id}`, data),
  deleteProducts: (productIds) => api.delete('/products/delete', { data: { productIds } }),
  deactivateProducts: (productIds) => api.put('/products/deactivate', { productIds }),
  getLowStock: (params) => api.get('/products/low-stock', { params }),

  // ── Product Categories ─────────────────────────────────────
  getCategories: (params) => api.get('/products/categories', { params }),
  searchCategories: (search) => api.get('/products/categories/search', { params: { search } }),
  getSingleCategory: (id) => api.get(`/products/categories/${id}`),
  createCategory: (data) => api.post('/products/categories/create', data),
  editCategory: (id, data) => api.put(`/products/categories/edit/${id}`, data),
  deleteCategories: (categoryIds) => api.delete('/products/categories/delete', { data: { categoryIds } }),
};

export default productService;

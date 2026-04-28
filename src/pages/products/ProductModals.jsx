// pages/products/ProductModals.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';
import useProductStore from '../../stores/useProductStore';
import useToastStore from '../../stores/useToastStore';
import SelectInput from '../../components/SelectInput';
import './ProductModals.css';

// ── Options ───────────────────────────────────────────────────────

const UOM_OPTIONS = [
  { value: 'single', label: 'Single Unit',  icon: 'fa-cube' },
  { value: 'set',    label: 'Set',          icon: 'fa-layer-group' },
  { value: 'carton', label: 'Carton',       icon: 'fa-box' },
  { value: 'dozen',  label: 'Dozen (12)',   icon: 'fa-hashtag' },
];

const TAX_TYPE_OPTIONS = [
  { value: 'vat',    label: 'VAT (7.5%)',   icon: 'fa-percent' },
  { value: 'exempt', label: 'Tax Exempt',   icon: 'fa-ban' },
];

// ── Toggle Switch ─────────────────────────────────────────────────
const Toggle = ({ checked, onChange, label, note }) => (
  <div className="pm-toggle-wrap">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`pm-toggle ${checked ? 'is-on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="pm-toggle-thumb" />
    </button>
    <div className="pm-toggle-text">
      <span className="pm-toggle-label">{label}</span>
      {note && <span className="pm-toggle-note">{note}</span>}
    </div>
  </div>
);

// ── Slide-over Shell ──────────────────────────────────────────────
const SlideOver = ({ open, onClose, disabled = false, title, subtitle, children, theme }) => {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (open) {
      clearTimeout(timerRef.current);
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
    } else {
      setActive(false);
    }
  }, [open]);

  useEffect(() => {
    if (mounted && !active) {
      timerRef.current = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timerRef.current);
    }
  }, [active, mounted]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!open || disabled) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, disabled]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`sop-backdrop ${active ? 'sop-visible' : ''}`}
      onClick={() => { if (!disabled) onClose(); }}
    >
      <div
        className={`sop-panel theme-${theme} ${active ? 'sop-panel-in' : 'sop-panel-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sop-header">
          <div>
            <h3 className="sop-title">{title}</h3>
            {subtitle && <p className="sop-subtitle">{subtitle}</p>}
          </div>
          <button
            className="sop-close"
            onClick={() => { if (!disabled) onClose(); }}
            type="button"
            style={disabled ? { opacity: 0.3, pointerEvents: 'none' } : undefined}
          >
            <i className="fas fa-xmark" />
          </button>
        </div>
        <div className="sop-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

// ── Mini Modal Shell (for inline category creation) ───────────────
const MiniModal = ({ open, onClose, title, children, theme }) => {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (open) {
      clearTimeout(timerRef.current);
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
    } else {
      setActive(false);
    }
  }, [open]);

  useEffect(() => {
    if (mounted && !active) {
      timerRef.current = setTimeout(() => setMounted(false), 250);
      return () => clearTimeout(timerRef.current);
    }
  }, [active, mounted]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`mm-backdrop ${active ? 'mm-visible' : ''}`}
      onClick={onClose}
    >
      <div
        className={`mm-panel theme-${theme} ${active ? 'mm-in' : 'mm-out'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mm-header">
          <h4 className="mm-title">
            <i className="fas fa-tags" /> {title}
          </h4>
          <button className="mm-close" onClick={onClose} type="button">
            <i className="fas fa-xmark" />
          </button>
        </div>
        <div className="mm-body">{children}</div>
      </div>
    </div>,
    document.body
  );
};

// ── Field Helpers ─────────────────────────────────────────────────
const Field = ({ label, required, error, hint, children }) => (
  <div className="pm-field">
    {label && (
      <label className="pm-label">
        {label}{required && <span className="pm-required">*</span>}
        {hint && <span className="pm-hint">{hint}</span>}
      </label>
    )}
    {children}
    {error && <span className="pm-error"><i className="fas fa-circle-exclamation" /> {error}</span>}
  </div>
);

const Input = ({ error, ...props }) => (
  <input className={`pm-input ${error ? 'has-error' : ''}`} {...props} />
);

const Textarea = ({ error, ...props }) => (
  <textarea className={`pm-input pm-textarea ${error ? 'has-error' : ''}`} rows={3} {...props} />
);

// ── Inline Category Quick-Add ─────────────────────────────────────
const QuickAddCategory = ({ open, onClose, onCreated, theme }) => {
  const { createCategory } = useProductStore();
  const { showToast } = useToastStore();
  const [form, setForm] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm({ name: '', description: '' });
      setErrors({});
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [open]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleSubmit = async () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Category name is required.';
    if (form.name.length > 100) e.name = 'Cannot exceed 100 characters.';
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      const res = await createCategory({
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      showToast(res.message || 'Category created successfully.', 'success');
      onCreated(res.data); // pass new category back to product form
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create category.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MiniModal open={open} onClose={onClose} title="New Category" theme={theme}>
      <Field label="Category Name" required error={errors.name}>
        <Input
          ref={nameRef}
          placeholder="e.g. Kitchenware"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
      </Field>
      <Field label="Description">
        <Textarea
          placeholder="Optional description..."
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
        />
      </Field>
      <div className="pm-actions">
        <button className="pm-btn pm-cancel" onClick={onClose} type="button" disabled={loading}>
          Cancel
        </button>
        <button className="pm-btn pm-submit" onClick={handleSubmit} type="button" disabled={loading}>
          {loading
            ? <><span className="pm-spinner" /> Creating...</>
            : <><i className="fas fa-plus" /> Create Category</>
          }
        </button>
      </div>
    </MiniModal>
  );
};

// ── Validate Product Form ─────────────────────────────────────────
const validateProduct = (form) => {
  const e = {};
  if (!form.category_id) e.category_id = 'Please select a category.';
  if (!form.name.trim()) e.name = 'Product name is required.';
  if (form.name.length > 200) e.name = 'Cannot exceed 200 characters.';
  if (!form.sku.trim()) e.sku = 'SKU is required.';
  if (form.sku.length > 100) e.sku = 'Cannot exceed 100 characters.';
  if (!form.unit_price && form.unit_price !== 0) e.unit_price = 'Unit price is required.';
  if (isNaN(Number(form.unit_price)) || Number(form.unit_price) < 0) e.unit_price = 'Enter a valid positive price.';
  if (!form.unit_of_measure) e.unit_of_measure = 'Please select a unit.';
  if (form.stock_quantity !== '' && (isNaN(Number(form.stock_quantity)) || Number(form.stock_quantity) < 0))
    e.stock_quantity = 'Stock quantity cannot be negative.';
  if (form.reorder_level !== '' && (isNaN(Number(form.reorder_level)) || Number(form.reorder_level) < 0))
    e.reorder_level = 'Reorder level cannot be negative.';
  return e;
};

// ── EMPTY DEFAULTS ────────────────────────────────────────────────
const EMPTY_PRODUCT = {
  category_id: '',
  name: '',
  sku: '',
  description: '',
  unit_price: '',
  unit_of_measure: 'single',
  tax_type: 'vat',
  tax_rate: 7.5,
  stock_quantity: 0,
  reorder_level: 0,
};

// ── PRODUCT FORM MODAL ────────────────────────────────────────────
export const ProductFormModal = ({ open, onClose, product = null }) => {
  const { theme } = useThemeStore();
  const { createProduct, editProduct, categoryOptions, fetchCategoryOptions } = useProductStore();
  const { showToast } = useToastStore();
  const isEdit = !!product;

  const [form, setForm] = useState({ ...EMPTY_PRODUCT });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);

  // Reload category options on open
  useEffect(() => {
    if (open) {
      fetchCategoryOptions();
      setForm(
        product
          ? {
              ...EMPTY_PRODUCT,
              ...product,
              category_id: product.category_id || '',
              tax_rate: product.tax_type === 'exempt' ? 7.5 : (product.tax_rate ?? 7.5),
            }
          : { ...EMPTY_PRODUCT }
      );
      setErrors({});
    }
  }, [open, product]);

  const set = (key, val) => {
    setForm((f) => {
      const next = { ...f, [key]: val };
      // Auto-set tax_rate when switching tax_type
      if (key === 'tax_type') {
        next.tax_rate = val === 'vat' ? 7.5 : 0;
      }
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  // Called when user creates a new category inline
  const handleCategoryCreated = (newCat) => {
    set('category_id', newCat.id);
    // categoryOptions is updated by the store action
  };

  const handleSubmit = async () => {
    const errs = validateProduct(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        // ...( !isEdit ? { category_id: Number(form.category_id) } : {} ),
        category_id:    Number(form.category_id),
        unit_price:     Number(form.unit_price),
        tax_rate:       form.tax_type === 'exempt' ? 0 : Number(form.tax_rate),
        stock_quantity: Number(form.stock_quantity) || 0,
        reorder_level:  Number(form.reorder_level) || 0,
      };

      let res;
      if (isEdit) {
        res = await editProduct(product.id, payload);
      } else {
        res = await createProduct(payload);
      }
      showToast(res.message || `Product ${isEdit ? 'updated' : 'created'} successfully.`, 'success');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Build dropdown options from store
  const catOptions = categoryOptions.map((c) => ({
    value: c.id,
    label: `${c.name}${c.product_count ? ` (${c.product_count})` : ''}`,
    icon: 'fa-tag',
  }));

  return (
    <>
      <SlideOver
        open={open}
        onClose={onClose}
        disabled={loading || catModalOpen}
        title={isEdit ? 'Edit Product' : 'Add New Product'}
        subtitle={
          isEdit
            ? `Editing ${product?.name}`
            : 'Fill in the details below to add a new product.'
        }
        theme={theme}
      >
        {/* Category field + inline add button */}
        <Field label="Category" required error={errors.category_id}>
          <div className="pm-category-row">
            <div className="pm-category-select">
              <SelectInput
                options={catOptions}
                value={form.category_id}
                onChange={(v) => set('category_id', v)}
                placeholder="Select category..."
                searchable
                error={errors.category_id}
              />
            </div>
            <button
              type="button"
              className="pm-add-cat-btn"
              onClick={() => setCatModalOpen(true)}
              title="Add new category without leaving this form"
            >
              <i className="fas fa-plus" />
              <span>New</span>
            </button>
          </div>
          {errors.category_id && (
            <span className="pm-error"><i className="fas fa-circle-exclamation" /> {errors.category_id}</span>
          )}
        </Field>

        {/* Product name + SKU */}
        <div className="pm-grid-2">
          <Field label="Product Name" required error={errors.name}>
            <Input
              placeholder="e.g. Stainless Steel Pot"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
            />
          </Field>
          <Field label="SKU" required error={errors.sku}
            hint="Must be unique">
            <Input
              placeholder="e.g. KW-SS-001"
              value={form.sku}
              onChange={(e) => set('sku', e.target.value.toUpperCase())}
              error={errors.sku}
            />
          </Field>
        </div>

        {/* Description */}
        <Field label="Description">
          <Textarea
            placeholder="Optional product description..."
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>

        {/* Price + Unit of Measure */}
        <div className="pm-grid-2">
          <Field label="Unit Price (₦)" required error={errors.unit_price}>
            <div className="pm-price-wrap">
              <span className="pm-price-symbol">₦</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.unit_price}
                onChange={(e) => set('unit_price', e.target.value)}
                error={errors.unit_price}
                className="pm-input pm-price-input"
              />
            </div>
          </Field>
          <Field label="Unit of Measure" required error={errors.unit_of_measure}>
            <SelectInput
              options={UOM_OPTIONS}
              value={form.unit_of_measure}
              onChange={(v) => set('unit_of_measure', v)}
            />
          </Field>
        </div>

        {/* Tax Type + Rate */}
        <div className="pm-grid-2">
          <Field label="Tax Type">
            <SelectInput
              options={TAX_TYPE_OPTIONS}
              value={form.tax_type}
              onChange={(v) => set('tax_type', v)}
            />
          </Field>
          <Field
            label="Tax Rate (%)"
            hint={form.tax_type === 'exempt' ? '— exempt' : ''}
          >
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="7.5"
              value={form.tax_type === 'exempt' ? '0' : form.tax_rate}
              onChange={(e) => set('tax_rate', e.target.value)}
              disabled={form.tax_type === 'exempt'}
            />
          </Field>
        </div>

        {/* VAT info callout */}
        {form.tax_type === 'vat' && (
          <div className="pm-vat-note">
            <i className="fas fa-circle-info" />
            <span>Standard Nigerian VAT rate is 7.5%. Only change if this product has a different applicable rate.</span>
          </div>
        )}

        {/* Stock Quantity + Reorder Level */}
        <div className="pm-section-label">
          <i className="fas fa-warehouse" /> Stock Management
        </div>

        <div className="pm-grid-2">
          <Field label="Current Stock Quantity" error={errors.stock_quantity}>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.stock_quantity}
              onChange={(e) => set('stock_quantity', e.target.value)}
              error={errors.stock_quantity}
            />
          </Field>
          <Field
            label="Reorder Level"
            hint="Alert threshold"
            error={errors.reorder_level}
          >
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.reorder_level}
              onChange={(e) => set('reorder_level', e.target.value)}
              error={errors.reorder_level}
            />
          </Field>
        </div>

        <div className="pm-stock-note">
          <i className="fas fa-circle-info" />
          <span>Stock is deducted automatically only when a <strong>final invoice</strong> is issued.</span>
        </div>

        <div className="pm-actions">
          <button className="pm-btn pm-cancel" onClick={onClose} disabled={loading} type="button">
            Cancel
          </button>
          <button className="pm-btn pm-submit" onClick={handleSubmit} disabled={loading} type="button">
            {loading
              ? <><span className="pm-spinner" /> Saving...</>
              : isEdit ? 'Save Changes' : 'Create Product'
            }
          </button>
        </div>
      </SlideOver>

      {/* Inline Quick-Add Category modal — layered on top of slide-over */}
      <QuickAddCategory
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        onCreated={handleCategoryCreated}
        theme={theme}
      />
    </>
  );
};

// ── CATEGORY FORM MODAL (standalone, used on Categories page) ─────
const EMPTY_CATEGORY = { name: '', description: '' };

const validateCategory = (form) => {
  const e = {};
  if (!form.name.trim()) e.name = 'Category name is required.';
  if (form.name.length > 100) e.name = 'Cannot exceed 100 characters.';
  return e;
};

export const CategoryFormModal = ({ open, onClose, category = null }) => {
  const { theme } = useThemeStore();
  const { createCategory, editCategory } = useProductStore();
  const { showToast } = useToastStore();
  const isEdit = !!category;

  const [form, setFormState] = useState({ ...EMPTY_CATEGORY });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormState(category ? { name: category.name || '', description: category.description || '' } : { ...EMPTY_CATEGORY });
      setErrors({});
    }
  }, [open, category]);

  const set = (key, val) => {
    setFormState((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const handleSubmit = async () => {
    const errs = validateCategory(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null };
      const res = isEdit
        ? await editCategory(category.id, payload)
        : await createCategory(payload);
      showToast(res.message || `Category ${isEdit ? 'updated' : 'created'} successfully.`, 'success');
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Something went wrong.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      disabled={loading}
      title={isEdit ? 'Edit Category' : 'Add New Category'}
      subtitle={
        isEdit
          ? `Editing "${category?.name}"`
          : 'Create a new product category.'
      }
      theme={theme}
    >
      <Field label="Category Name" required error={errors.name}>
        <Input
          placeholder="e.g. Kitchenware"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
        />
      </Field>

      <Field label="Description">
        <Textarea
          placeholder="Optional description of this category..."
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <div className="pm-actions">
        <button className="pm-btn pm-cancel" onClick={onClose} disabled={loading} type="button">
          Cancel
        </button>
        <button className="pm-btn pm-submit" onClick={handleSubmit} disabled={loading} type="button">
          {loading
            ? <><span className="pm-spinner" /> Saving...</>
            : isEdit ? 'Save Changes' : 'Create Category'
          }
        </button>
      </div>
    </SlideOver>
  );
};

export default { ProductFormModal, CategoryFormModal };

// pages/quotations/LineItemsBuilder.jsx
import React, { useState, useEffect, useRef } from 'react';
import useThemeStore from '../../stores/useThemeStore';
import productService from '../../services/productService';
import { ProductFormModal } from '../products/ProductModals';
import useProductStore from '../../stores/useProductStore';
import './LineItemsBuilder.css';

// ── Helpers ───────────────────────────────────────────────────────
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const calcItem = (item) => {
  const qty     = parseFloat(item.quantity)       || 0;
  const price   = parseFloat(item.unit_price)     || 0;
  const taxRate = parseFloat(item.tax_rate)       || 0;
  const discVal = parseFloat(item.discount_value) || 0;
  const gross   = qty * price;
  const discAmt = item.discount_type === 'fixed' ? Math.min(discVal, gross) : 0;
  const net     = gross - discAmt;
  const taxAmt  = round2(net * (taxRate / 100));
  const lineTotal = round2(net);
  return { ...item, discount_amount: round2(discAmt), tax_amount: taxAmt, line_total: lineTotal };
};

const calcTotals = (items, docDiscountType, docDiscountValue) => {
  const subtotal  = round2(items.reduce((s, i) => s + i.line_total, 0));
  const taxAmount = round2(items.reduce((s, i) => s + i.tax_amount, 0));
  const discAmt   = docDiscountType === 'percentage' && docDiscountValue > 0
    ? round2(subtotal * (parseFloat(docDiscountValue) / 100))
    : 0;
  const taxable = round2(subtotal - discAmt);
  const total   = round2(taxable + taxAmount);
  return { subtotal, discount_amount: discAmt, taxable_amount: taxable, tax_amount: taxAmount, total_amount: total };
};

const EMPTY_ITEM = {
  product_id: null, description: '', quantity: 1,
  unit_price: 0, tax_rate: 7.5,
  discount_type: 'none', discount_value: 0,
  discount_amount: 0, tax_amount: 0, line_total: 0,
};

// ── NoSpinInput — number input: no arrows, no scroll-to-change ────
const NoSpinInput = ({ className, value, onChange, ...rest }) => (
  <input
    type="number"
    className={`no-spin${className ? ` ${className}` : ''}`}
    value={value}
    onChange={onChange}
    onWheel={(e) => e.target.blur()}   // prevents scroll wheel changing value
    {...rest}
  />
);

// ── Product Search (shows 50 on focus, filters as user types) ─────
const ProductSearch = ({ onSelect, theme, onProductCreated }) => {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const initialRef = useRef(false);   // have we loaded the initial 50?
  const initialData = useRef([]);     // cache the initial 50
  const wrapRef     = useRef(null);
  const inputRef    = useRef(null);
  const searchTimer = useRef(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load initial 50 when field is focused for the first time
  const loadInitial = async () => {
    if (initialRef.current) {
      setResults(initialData.current);
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const res = await productService.searchProducts('');
      const data = (res.data.data || []).slice(0, 50);
      initialData.current = data;
      initialRef.current  = true;
      setResults(data);
      setOpen(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const handleFocus = () => {
    if (!query.trim()) loadInitial();
    else setOpen(true);
  };

  // Debounced search while typing
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) {
      // Reset to initial list when query is cleared
      if (initialRef.current) {
        setResults(initialData.current);
        setOpen(true);
      }
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await productService.searchProducts(query);
        setResults(res.data.data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const pick = (product) => {
    onSelect(product);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="ps-wrap" ref={wrapRef}>
      <div className="ps-search-row">
        <div className="ps-input-row">
          <i className="fas fa-magnifying-glass ps-icon" />
          <input
            ref={inputRef}
            className={`ps-input theme-${theme}`}
            placeholder="Click to browse or type to search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
          />
          {loading && <span className="ps-spinner" />}
          {query && (
            <button
              className="ps-clear-query"
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            >
              <i className="fas fa-xmark" />
            </button>
          )}
        </div>
        <button
          type="button"
          className="ps-new-btn"
          onClick={() => setProductModalOpen(true)}
          title="Create a new product without leaving this page"
        >
          <i className="fas fa-plus" /> New
        </button>
      </div>

      {/* Inline product creation modal */}
      <ProductFormModal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          // Reset initial cache so newly created product appears on next focus
          initialRef.current = false;
          if (onProductCreated) onProductCreated();
        }}
      />

      {open && (
        <div className={`ps-dropdown theme-${theme}`}>
          {results.length === 0 && !loading && (
            <div className="ps-no-result">
              {query ? `No products found for "${query}"` : 'No active products found'}
            </div>
          )}
          {results.map((p) => (
            <button key={p.id} className="ps-result" onClick={() => pick(p)} type="button">
              <div className="ps-result-left">
                <span className="ps-result-name">{p.name}</span>
                <span className="ps-result-sku">{p.sku} · {p.category_name}</span>
              </div>
              <div className="ps-result-right">
                <span className="ps-result-price">₦{Number(p.unit_price).toLocaleString()}</span>
                <span className={`ps-result-stock ${
                  p.stock_status === 'out_of_stock' ? 'stock-out' :
                  p.stock_status === 'low_stock'    ? 'stock-low' : 'stock-ok'
                }`}>
                  {p.stock_quantity} left
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Single Line Item Row ──────────────────────────────────────────
const ItemRow = ({ item, index, onChange, onRemove, theme, canRemove }) => {
  const update = (key, val) => onChange(index, calcItem({ ...item, [key]: val }));

  const toggleDiscount = () =>
    update('discount_type', item.discount_type === 'fixed' ? 'none' : 'fixed');

  return (
    <div className={`li-row theme-${theme}`}>
      <div className="li-row-header">
        <span className="li-row-num">{index + 1}</span>
        {canRemove && (
          <button className="li-remove" onClick={() => onRemove(index)} type="button" title="Remove">
            <i className="fas fa-xmark" />
          </button>
        )}
      </div>

      {/* Description */}
      <div className="li-field li-desc">
        <label className="li-label">Description <span className="li-req">*</span></label>
        <textarea
          className={`li-input li-textarea theme-${theme}`}
          placeholder="Product or service description..."
          rows={2}
          value={item.description}
          onChange={(e) => onChange(index, { ...item, description: e.target.value })}
        />
        {item.product_id && (
          <div className="li-product-linked">
            <span className="li-product-tag"><i className="fas fa-link" /> Linked to product</span>
            <button
              type="button"
              className="li-unlink-btn"
              title="Unlink product (keep description & price)"
              onClick={() => onChange(index, { ...item, product_id: null })}
            >
              <i className="fas fa-xmark" /> Unlink
            </button>
          </div>
        )}
      </div>

      {/* Qty · Price · VAT · Discount */}
      <div className="li-field-row">
        <div className="li-field">
          <label className="li-label">Qty <span className="li-req">*</span></label>
          <NoSpinInput
            className={`li-input theme-${theme}`}
            min="0.01" step="1" placeholder="1"
            value={item.quantity}
            onChange={(e) => update('quantity', e.target.value)}
          />
        </div>

        <div className="li-field li-field-price">
          <label className="li-label">Unit Price (₦) <span className="li-req">*</span></label>
          <div className="li-price-wrap">
            <span className="li-price-sym">₦</span>
            <NoSpinInput
              className={`li-input li-price-input theme-${theme}`}
              min="0" step="0.01" placeholder="0.00"
              value={item.unit_price}
              onChange={(e) => update('unit_price', e.target.value)}
            />
          </div>
        </div>

        <div className="li-field">
          <label className="li-label">VAT %</label>
          <NoSpinInput
            className={`li-input theme-${theme}`}
            min="0" max="100" step="0.01" placeholder="7.5"
            value={item.tax_rate}
            onChange={(e) => update('tax_rate', e.target.value)}
          />
        </div>

        <div className="li-field">
          <label className="li-label">Discount</label>
          <div className="li-disc-wrap">
            <button
              type="button"
              className={`li-disc-toggle ${item.discount_type === 'fixed' ? 'is-active' : ''}`}
              onClick={toggleDiscount}
              title={item.discount_type === 'fixed' ? 'Remove discount' : 'Add fixed discount'}
            >
              <i className={`fas ${item.discount_type === 'fixed' ? 'fa-tag' : 'fa-plus'}`} />
            </button>
            {item.discount_type === 'fixed' && (
              <NoSpinInput
                className={`li-input theme-${theme}`}
                min="0" step="0.01" placeholder="0.00"
                value={item.discount_value}
                onChange={(e) => update('discount_value', e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Totals chips */}
      <div className="li-totals">
        {item.discount_amount > 0 && (
          <span className="li-total-chip disc">
            -₦{Number(item.discount_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </span>
        )}
        {item.tax_amount > 0 && (
          <span className="li-total-chip tax">
            +₦{Number(item.tax_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} VAT
          </span>
        )}
        <span className="li-total-chip total">
          ₦{Number(item.line_total).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

// ── Main export ───────────────────────────────────────────────────
const LineItemsBuilder = ({
  items, onChange,
  docDiscountType, docDiscountValue, onDocDiscountChange,
  currency = 'NGN',
}) => {
  const { theme } = useThemeStore();
  const sym = currency === 'USD' ? '$' : '₦';

  const addItem    = () => onChange([...items, { ...EMPTY_ITEM }]);
  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i));
  const updateItem = (i, updated) => onChange(items.map((item, idx) => idx === i ? updated : item));

  const handleProductSelect = (product) => {
    const newItem = calcItem({
      ...EMPTY_ITEM,
      product_id:  product.id,
      description: product.name,
      unit_price:  product.unit_price,
      tax_rate:    product.tax_rate ?? 7.5,
    });
    onChange([...items, newItem]);
  };

  const totals  = calcTotals(items, docDiscountType, docDiscountValue);
  const fmtAmt  = (n) => sym + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

  return (
    <div className="lib-wrap">

      {/* Product catalogue search */}
      <div className="lib-search-section">
        <p className="lib-search-label">
          <i className="fas fa-boxes-stacked" /> Add from product catalogue
        </p>
        <ProductSearch
          onSelect={handleProductSelect}
          theme={theme}
          onProductCreated={() => {
            // invalidate initial cache so next focus reloads with new product
            // (ProductSearch handles this internally)
          }}
        />
      </div>

      {/* Line items */}
      <div className="lib-items">
        {items.map((item, i) => (
          <ItemRow
            key={i} item={item} index={i}
            onChange={updateItem} onRemove={removeItem}
            theme={theme} canRemove={items.length > 1}
          />
        ))}
      </div>

      <button className="lib-add-btn" onClick={addItem} type="button">
        <i className="fas fa-plus" /> Add Line Item
      </button>

      {/* Totals summary */}
      <div className={`lib-totals theme-${theme}`}>
        <div className="lib-totals-inner">
          <div className="lib-total-row">
            <span>Subtotal</span>
            <span>{fmtAmt(totals.subtotal)}</span>
          </div>

          <div className="lib-total-row lib-discount-row">
            <div className="lib-disc-toggle-wrap">
              <span>Discount</span>
              <div className="lib-disc-controls">
                <button
                  type="button"
                  className={`lib-disc-type-btn ${docDiscountType === 'percentage' ? 'is-active' : ''}`}
                  onClick={() => onDocDiscountChange('discount_type', docDiscountType === 'percentage' ? 'none' : 'percentage')}
                >
                  % off
                </button>
                {docDiscountType === 'percentage' && (
                  <NoSpinInput
                    className={`lib-disc-input theme-${theme}`}
                    min="0" max="100" step="0.1" placeholder="0"
                    value={docDiscountValue}
                    onChange={(e) => onDocDiscountChange('discount_value', e.target.value)}
                  />
                )}
              </div>
            </div>
            <span className="lib-disc-amount">
              {totals.discount_amount > 0 ? `-${fmtAmt(totals.discount_amount)}` : '—'}
            </span>
          </div>

          <div className="lib-total-row lib-tax-row">
            <span>VAT (on taxable amount)</span>
            <span>{fmtAmt(totals.tax_amount)}</span>
          </div>

          <div className="lib-total-row lib-grand-total">
            <span>Total</span>
            <span>{fmtAmt(totals.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export { calcTotals, calcItem, EMPTY_ITEM };
export default LineItemsBuilder;

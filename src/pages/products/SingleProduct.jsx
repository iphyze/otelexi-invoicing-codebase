// pages/products/SingleProduct.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useProductStore from '../../stores/useProductStore';
import useToastStore from '../../stores/useToastStore';
import ConfirmModal from '../../components/modals/ConfirmModal';
import { ProductFormModal } from './ProductModals';
import './SingleProduct.css';

// ── Info Row ──────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, children }) => {
  if (!value && !children) return null;
  return (
    <div className="sp-info-row">
      <div className="sp-info-icon"><i className={`fas ${icon}`} /></div>
      <div className="sp-info-body">
        <span className="sp-info-label">{label}</span>
        {children ?? <span className="sp-info-value">{value}</span>}
      </div>
    </div>
  );
};

// ── Badge ─────────────────────────────────────────────────────────
const Badge = ({ children, variant = 'default' }) => (
  <span className={`sp-badge sp-badge-${variant}`}>{children}</span>
);

// ── Skeleton ──────────────────────────────────────────────────────
const Skeleton = ({ theme }) => (
  <div className={`sp-skeleton theme-${theme}`}>
    <div className="sp-skel-hero">
      <div className="sp-skel-avatar" />
      <div className="sp-skel-lines">
        <div className="sp-skel-block" style={{ width: '40%' }} />
        <div className="sp-skel-block" style={{ width: '60%', height: 14 }} />
        <div className="sp-skel-block" style={{ width: '25%', height: 12 }} />
      </div>
    </div>
    <div className="sp-skel-grid">
      {[...Array(2)].map((_, c) => (
        <div key={c} className="sp-skel-col">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="sp-skel-row-wrap">
              <div className="sp-skel-icon" />
              <div className="sp-skel-text">
                <div className="sp-skel-block" style={{ width: '30%', height: 10 }} />
                <div className="sp-skel-block" style={{ width: `${50 + (i % 3) * 15}%`, height: 13 }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ── Stock Indicator ───────────────────────────────────────────────
const StockIndicator = ({ product }) => {
  const pct = product.reorder_level > 0
    ? Math.min(100, (product.stock_quantity / (product.reorder_level * 3)) * 100)
    : product.stock_quantity > 0 ? 100 : 0;

  const color =
    product.stock_status === 'out_of_stock' ? '#ef4444' :
    product.stock_status === 'low_stock'    ? '#f97316' :
    '#10b981';

  return (
    <div className="sp-stock-indicator">
      <div className="sp-stock-bar-wrap">
        <div
          className="sp-stock-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="sp-stock-numbers">
        <span style={{ color }}>
          {product.stock_quantity} {product.unit_of_measure}(s) in stock
        </span>
        {product.reorder_level > 0 && (
          <span className="sp-stock-reorder">
            Reorder at {product.reorder_level}
          </span>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────
const SingleProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const {
    fetchSingleProduct, selectedProduct: product, singleLoading,
    deleteProducts, deactivateProducts,
    fetchCategoryOptions,
  } = useProductStore();

  const [nav, setNav] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, type: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!id) return;
    setFetchError(null);
    fetchSingleProduct(id).catch((err) => {
      setFetchError(err.response?.data?.message || 'Failed to load product.');
    });
  }, [id, retryCount]);

  useEffect(() => {
    fetchCategoryOptions();
  }, []);

  useEffect(() => {
    document.title = product ? `Otelex | ${product.name}` : 'Otelex | Product';
  }, [product]);

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      if (confirm.type === 'delete') {
        await deleteProducts([product.id]);
        showToast('Product deleted.', 'success');
        navigate('/products');
      } else if (confirm.type === 'deactivate') {
        await deactivateProducts([product.id]);
        showToast('Product deactivated.', 'success');
        setRetryCount((c) => c + 1);
      }
      setConfirm({ open: false, type: '' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const uomLabel = { single: 'Single Unit', set: 'Set', carton: 'Carton', dozen: 'Dozen (12)' };
  const stockStatusLabel = {
    in_stock:     { label: 'In Stock',     cls: 'sp-badge-stock-ok'  },
    low_stock:    { label: 'Low Stock',    cls: 'sp-badge-stock-low' },
    out_of_stock: { label: 'Out of Stock', cls: 'sp-badge-stock-out' },
  };

  const stockBadge = stockStatusLabel[product?.stock_status] || stockStatusLabel['in_stock'];

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle={product?.name || 'Product Details'}
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Products', to: '/products' },
            { label: product?.name || 'Details', active: true },
          ]}
        />

        <div className="sp-wrapper">

          {/* Loading */}
          {singleLoading && <Skeleton theme={theme} />}

          {/* Error */}
          {fetchError && !singleLoading && (
            <div className={`sp-error theme-${theme}`}>
              <div className="sp-error-icon"><i className="fas fa-triangle-exclamation" /></div>
              <h4>Failed to Load Product</h4>
              <p>{fetchError}</p>
              <button className="sp-retry-btn" onClick={() => setRetryCount((c) => c + 1)} type="button">
                <i className="fas fa-rotate-right" /> Retry
              </button>
            </div>
          )}

          {/* Content */}
          {product && !singleLoading && (
            <>
              {/* ── Hero ── */}
              <motion.div
                className={`sp-hero theme-${theme}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="sp-hero-left">
                  <div className="sp-hero-avatar">{product.name?.[0]?.toUpperCase()}</div>
                  <div className="sp-hero-text">
                    <h1 className="sp-hero-name">{product.name}</h1>
                    <div className="sp-hero-badges">
                      <Badge variant={product.is_active ? 'active' : 'inactive'}>
                        <i className={`fas ${product.is_active ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="sku">SKU: {product.sku}</Badge>
                      <Badge variant="category">
                        <i className="fas fa-tag" /> {product.category?.name || '—'}
                      </Badge>
                      <span className={`sp-badge ${stockBadge.cls}`}>
                        {stockBadge.label}
                      </span>
                    </div>
                    <p className="sp-hero-since">
                      <i className="fas fa-calendar-plus" />
                      Added {new Date(product.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="sp-hero-actions">
                  <button className="sp-action-btn primary" onClick={() => setEditOpen(true)} type="button">
                    <i className="fas fa-pen" /> Edit
                  </button>
                  <div className="sp-action-sep" />
                  {product.is_active === 1 && (
                    <button className="sp-action-btn warning"
                      onClick={() => setConfirm({ open: true, type: 'deactivate' })} type="button">
                      <i className="fas fa-toggle-off" /> Deactivate
                    </button>
                  )}
                  <button className="sp-action-btn danger"
                    onClick={() => setConfirm({ open: true, type: 'delete' })} type="button">
                    <i className="fas fa-trash" /> Delete
                  </button>
                </div>
              </motion.div>

              {/* ── Detail Grid ── */}
              <div className="sp-grid">

                {/* Pricing & Tax */}
                <motion.div
                  className={`sp-card theme-${theme}`}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.06 }}
                >
                  <h3 className="sp-card-title"><i className="fas fa-tag" /> Pricing & Tax</h3>
                  <div className="sp-info-list">
                    <InfoRow icon="fa-money-bill" label="Unit Price">
                      <span className="sp-info-value sp-price-value">
                        ₦{Number(product.unit_price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </InfoRow>
                    <InfoRow icon="fa-cube" label="Unit of Measure"
                      value={uomLabel[product.unit_of_measure] || product.unit_of_measure} />
                    <InfoRow icon="fa-percent" label="Tax Type">
                      <span className={`sp-info-value sp-tax-pill ${product.tax_type === 'vat' ? 'vat' : 'exempt'}`}>
                        {product.tax_type === 'vat' ? `VAT ${product.tax_rate}%` : 'Tax Exempt'}
                      </span>
                    </InfoRow>
                    {product.description && (
                      <InfoRow icon="fa-align-left" label="Description" value={product.description} />
                    )}
                    <InfoRow icon="fa-tags" label="Category"
                      value={product.category?.name || '—'} />
                    {product.category?.description && (
                      <InfoRow icon="fa-circle-info" label="Category Note"
                        value={product.category.description} />
                    )}
                  </div>
                </motion.div>

                {/* Stock & System */}
                <motion.div
                  className={`sp-card theme-${theme}`}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                >
                  <h3 className="sp-card-title"><i className="fas fa-warehouse" /> Stock</h3>
                  <div className="sp-info-list">
                    <InfoRow icon="fa-boxes-stacked" label="Current Stock">
                      <span className="sp-info-value">
                        {product.stock_quantity} {product.unit_of_measure}(s)
                      </span>
                    </InfoRow>
                    <InfoRow icon="fa-triangle-exclamation" label="Reorder Level"
                      value={`${product.reorder_level} ${product.unit_of_measure}(s)`} />

                    {/* Stock bar */}
                    <div style={{ paddingLeft: '48px', paddingTop: '4px', paddingBottom: '8px' }}>
                      <StockIndicator product={product} />
                    </div>

                    <InfoRow icon="fa-circle-info" label="Stock Deduction">
                      <span className="sp-info-value" style={{ opacity: 0.6, fontSize: '12.5px' }}>
                        Deducted only when a final invoice is issued
                      </span>
                    </InfoRow>
                  </div>

                  <div className="sp-card-divider" />
                  <h3 className="sp-card-title"><i className="fas fa-clock" /> System Info</h3>
                  <div className="sp-info-list">
                    <InfoRow icon="fa-calendar-plus" label="Created"
                      value={product.created_at ? new Date(product.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
                    <InfoRow icon="fa-calendar-check" label="Last Updated"
                      value={product.updated_at ? new Date(product.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <ProductFormModal
        open={editOpen}
        onClose={() => { setEditOpen(false); setRetryCount((c) => c + 1); }}
        product={product}
      />

      <ConfirmModal
        open={confirm.open && confirm.type === 'delete'}
        onClose={() => setConfirm({ open: false, type: '' })}
        onConfirm={handleConfirm}
        title="Delete Product"
        message="Permanently delete this product? Line items in existing invoices/quotations will be preserved but unlinked."
        confirmText="Yes, Delete" variant="danger" loading={actionLoading}
      />
      <ConfirmModal
        open={confirm.open && confirm.type === 'deactivate'}
        onClose={() => setConfirm({ open: false, type: '' })}
        onConfirm={handleConfirm}
        title="Deactivate Product"
        message="Deactivate this product? It won't appear in new quotations or invoices until reactivated."
        confirmText="Deactivate" variant="warning" loading={actionLoading}
      />
    </div>
  );
};

export default SingleProduct;

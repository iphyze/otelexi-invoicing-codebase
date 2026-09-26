// utils/notificationDisplay.js
// Shared notification presentation + navigation rules used by the header panel
// and the full Notifications page.

export const NOTIFICATION_TYPE_META = {
  'invoice.created':              { icon: 'fa-file-invoice',          color: '#2563eb', label: 'Invoice Created' },
  'invoice.finalized':            { icon: 'fa-paper-plane',           color: '#2563eb', label: 'Invoice Finalized' },
  'invoice.paid':                 { icon: 'fa-circle-check',          color: '#10b981', label: 'Invoice Paid' },
  'invoice.cancelled':            { icon: 'fa-ban',                   color: '#ef4444', label: 'Invoice Cancelled' },
  'invoice.reversed':             { icon: 'fa-rotate-left',           color: '#ef4444', label: 'Invoice Reversed' },
  'invoice.overdue':              { icon: 'fa-triangle-exclamation',  color: '#f59e0b', label: 'Invoice Overdue' },
  'invoice.overdue_batch':        { icon: 'fa-triangle-exclamation',  color: '#f59e0b', label: 'Overdue Alert' },

  'payment.received':             { icon: 'fa-money-bill-wave',       color: '#10b981', label: 'Payment Received' },
  'payment_link.created':         { icon: 'fa-link',                  color: '#0ea5e9', label: 'Payment Request Created' },
  'payment_link.cancelled':       { icon: 'fa-link-slash',            color: '#ef4444', label: 'Payment Request Cancelled' },
  'credit_note.issued':           { icon: 'fa-file-circle-minus',     color: '#f97316', label: 'Credit Note Issued' },
  'refund.processed':             { icon: 'fa-money-bill-transfer',   color: '#f97316', label: 'Refund Processed' },

  'quotation.created':            { icon: 'fa-file-circle-plus',      color: '#6366f1', label: 'Quotation Created' },
  'quotation.sent':               { icon: 'fa-paper-plane',           color: '#6366f1', label: 'Quotation Sent' },
  'quotation.resent':             { icon: 'fa-rotate',                color: '#6366f1', label: 'Quotation Re-sent' },
  'quotation.accepted':           { icon: 'fa-circle-check',          color: '#10b981', label: 'Quotation Accepted' },
  'quotation.rejected':           { icon: 'fa-circle-xmark',          color: '#ef4444', label: 'Quotation Rejected' },
  'quotation.reopened':           { icon: 'fa-folder-open',           color: '#0ea5e9', label: 'Quotation Reopened' },
  'quotation.expired':            { icon: 'fa-clock',                 color: '#f59e0b', label: 'Quotation Expired' },
  'quotation.converted_to_proforma': { icon: 'fa-arrow-right-arrow-left', color: '#8b5cf6', label: 'Converted to Proforma' },
  'quotation.converted_to_invoice':  { icon: 'fa-arrow-right-arrow-left', color: '#8b5cf6', label: 'Converted to Invoice' },

  'proforma.created':             { icon: 'fa-file-circle-plus',      color: '#8b5cf6', label: 'Proforma Created' },
  'proforma.sent':                { icon: 'fa-paper-plane',           color: '#8b5cf6', label: 'Proforma Sent' },
  'proforma.resent':              { icon: 'fa-rotate',                color: '#8b5cf6', label: 'Proforma Re-sent' },
  'proforma.approved':            { icon: 'fa-file-circle-check',     color: '#10b981', label: 'Proforma Approved' },
  'proforma.rejected':            { icon: 'fa-circle-xmark',          color: '#ef4444', label: 'Proforma Rejected' },
  'proforma.expired':             { icon: 'fa-clock',                 color: '#f59e0b', label: 'Proforma Expired' },
  'proforma.converted_to_invoice': { icon: 'fa-arrow-right-arrow-left', color: '#8b5cf6', label: 'Converted to Invoice' },

  'delivery_note.created':        { icon: 'fa-truck-ramp-box',        color: '#0ea5e9', label: 'Delivery Note Created' },
  'delivery_note.dispatched':     { icon: 'fa-truck-fast',            color: '#0ea5e9', label: 'Delivery Dispatched' },
  'delivery_note.delivered':      { icon: 'fa-circle-check',      color: '#10b981', label: 'Delivery Completed' },
  'delivery_note.cancelled':      { icon: 'fa-ban',                   color: '#ef4444', label: 'Delivery Cancelled' },
  'delivery_note.status_updated': { icon: 'fa-truck',                 color: '#0ea5e9', label: 'Delivery Updated' },

  'stock.adjusted':               { icon: 'fa-boxes-stacked',         color: '#0ea5e9', label: 'Stock Adjusted' },
  'stock.low':                    { icon: 'fa-box-open',              color: '#f59e0b', label: 'Low Stock' },
  'product.bulk_imported':        { icon: 'fa-file-import',           color: '#14b8a6', label: 'Products Imported' },
};

export const getNotificationMeta = (type) => (
  NOTIFICATION_TYPE_META[type] || { icon: 'fa-bell', color: '#64748b', label: 'Notification' }
);

export const getNotificationRoute = (modelType, modelId) => {
  if (!modelType) return null;

  const id = Number(modelId);
  const hasId = Number.isFinite(id) && id > 0;

  switch (modelType) {
    case 'Invoice':
      return hasId ? `/invoices/${id}` : '/invoices';
    case 'Quotation':
      return hasId ? `/quotations/${id}` : '/quotations';
    case 'ProformaInvoice':
    case 'Proforma':
      return hasId ? `/proformas/${id}` : '/proformas';
    case 'DeliveryNote':
      return hasId ? `/delivery-notes/${id}` : '/delivery-notes';
    case 'Product':
      return hasId ? `/products/${id}` : '/products';
    case 'Payment':
      return '/payments';
    case 'PaymentLink':
      return '/payment-links';
    case 'StockAdjustment':
      return '/inventory/stock-movements';
    // Historical credit-note notifications stored the credit-note id rather
    // than the parent invoice id, so route those safely to the invoice list.
    case 'CreditNote':
      return '/invoices';
    default:
      return null;
  }
};

export const notificationTimeAgo = (dateStr, { long = false } = {}) => {
  if (!dateStr) return '';

  const timestamp = new Date(dateStr).getTime();
  if (!Number.isFinite(timestamp)) return '';

  const diff = Math.max(0, Date.now() - timestamp);
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return long ? `${mins} minute${mins !== 1 ? 's' : ''} ago` : `${mins}m ago`;
  if (hours < 24) return long ? `${hours} hour${hours !== 1 ? 's' : ''} ago` : `${hours}h ago`;
  if (days < 7) return long ? `${days} day${days !== 1 ? 's' : ''} ago` : `${days}d ago`;

  return new Date(dateStr).toLocaleDateString('en-GB', long
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { day: 'numeric', month: 'short' });
};

// pages/customerPortal/CustomerPortalPublic.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import customerPortalService from '../../services/customerPortalService';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import LogoLight from '../../assets/images/otelexi/logo-light.png';
import LogoDark from '../../assets/images/otelexi/logo-dark.png';
import './CustomerPortalPublic.css';

const formatCurrency = (amount, currency = 'NGN') => {
  const normalized = String(currency || 'NGN').toUpperCase();
  try {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: normalized, minimumFractionDigits: 2 }).format(Number(amount || 0));
  } catch {
    const symbol = normalized === 'USD' ? '$' : '₦';
    return `${symbol}${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  }
};

const formatDate = (value, withTime = false) => {
  if (!value) return 'Not specified';
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

const statusIcon = {
  sent: 'fa-paper-plane', partial: 'fa-clock', overdue: 'fa-triangle-exclamation', paid: 'fa-circle-check',
  active: 'fa-lock-open', pending: 'fa-clock', processing: 'fa-spinner', delivered: 'fa-circle-check', dispatched: 'fa-truck-fast',
};

const CustomerPortalPublic = () => {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { document.title = 'Otelex | Customer Portal'; }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPortal = async () => {
      const cleanToken = decodeURIComponent(token || '').trim();
      if (!cleanToken) {
        setError('A valid customer portal token is required.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await customerPortalService.getPublicCustomerPortal(cleanToken);
        if (!cancelled) setPortal(response.data?.data || null);
      } catch (err) {
        if (!cancelled) {
          setPortal(null);
          setError(err.response?.data?.message || 'Customer portal could not be loaded right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadPortal();
    return () => { cancelled = true; };
  }, [token]);

  const company = portal?.company || {};
  const client = portal?.client || {};
  const invoice = portal?.invoice || {};
  const bank = portal?.bank || {};
  const requests = portal?.payment_requests || [];
  const deliveryNotes = portal?.delivery_notes || [];
  const receipts = portal?.receipts || [];
  const payableRequests = requests.filter((request) => ['pending', 'processing'].includes(request.status) && request.payment_url);
  const manualRequest = requests.find((request) => request.provider === 'manual' && ['pending', 'processing'].includes(request.status));

  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const logo = useMemo(() => {
    const raw = String(company.logo_path || '').trim();
    if (!raw) return '';

    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) {
      return raw;
    }

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost/otelex-server/api';
      const apiUrl = new URL(apiBase);

      if (raw.startsWith('/')) {
        return `${apiUrl.origin}${raw}`;
      }

      const basePath = apiUrl.pathname.replace(/\/api\/?$/, '/');
      return new URL(raw, `${apiUrl.origin}${basePath}`).toString();
    } catch {
      return raw;
    }
  }, [company.logo_path]);

  const portalLogo = !logoLoadFailed && logo ? logo : (theme === 'dark' ? LogoDark : LogoLight);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logo]);

  const copyText = async (value, label) => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied.`, 'success');
    } catch {
      showToast(`Could not copy ${label.toLowerCase()}.`, 'error');
    }
  };

  return (
    <div className={`customer-public-root theme-${theme}`}>
      <div className="customer-public-bg"><span /><span /><span /></div>
      <div className="customer-public-grid" />

      <main className="customer-public-shell">
        <section className="customer-public-brand-card">
          <div className="customer-public-brand-mark">
            <img
              src={portalLogo}
              alt={company.company_name || 'Otelex'}
              onError={() => setLogoLoadFailed(true)}
            />
          </div>
          <div>
            <span className="customer-public-eyebrow">Secure customer portal</span>
            <h1>{company.company_name || 'Otelex Hospitality Supplies Ltd'}</h1>
            <p>{company.address ? `${company.address}${company.city ? `, ${company.city}` : ''}${company.state ? `, ${company.state}` : ''}` : 'Invoice, payment, receipt and delivery status in one place.'}</p>
          </div>
        </section>

        {loading ? (
          <section className="customer-public-card customer-public-loading-card">
            <span className="customer-public-spinner" />
            <h2>Loading customer portal...</h2>
            <p>Please wait while we confirm the secure link.</p>
          </section>
        ) : error ? (
          <section className="customer-public-card customer-public-empty-card">
            <div className="customer-public-state-icon danger"><i className="fas fa-link-slash" /></div>
            <h2>Customer portal not available</h2>
            <p>{error}</p>
            <div className="customer-public-actions center">
              <button type="button" className="customer-public-btn ghost" onClick={() => navigate(-1)}>
                <i className="fas fa-arrow-left" /> Go Back
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="customer-public-card customer-public-summary-card">
              <div className={`customer-public-state ${invoice.status}`}>
                <div className="customer-public-state-icon"><i className={`fas ${statusIcon[invoice.status] || 'fa-file-invoice'}`} /></div>
                <div>
                  <span>{invoice.status_label || invoice.status}</span>
                  <h2>{invoice.invoice_number}</h2>
                  <p>{client.company_name || 'Customer'} · Issued {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}</p>
                </div>
              </div>

              <div className="customer-public-amount-grid">
                <div className="primary">
                  <span>Balance Due</span>
                  <strong>{formatCurrency(invoice.balance_due, invoice.currency)}</strong>
                </div>
                <div>
                  <span>Invoice Total</span>
                  <strong>{formatCurrency(invoice.total_amount, invoice.currency)}</strong>
                </div>
                <div>
                  <span>Amount Paid</span>
                  <strong>{formatCurrency(invoice.amount_paid, invoice.currency)}</strong>
                </div>
                <div>
                  <span>VAT</span>
                  <strong>{formatCurrency(invoice.tax_amount, invoice.currency)}</strong>
                </div>
              </div>

              {invoice.is_overdue && Number(invoice.balance_due || 0) > 0 ? (
                <div className="customer-public-alert danger">
                  <i className="fas fa-triangle-exclamation" /> This invoice is {invoice.days_overdue} day{invoice.days_overdue === 1 ? '' : 's'} overdue.
                </div>
              ) : null}
            </section>

            <div className="customer-public-layout">
              <section className="customer-public-card customer-public-section-card">
                <div className="customer-public-section-head">
                  <div>
                    <span className="customer-public-section-label"><i className="fas fa-credit-card" /> Payment Options</span>
                    <h2>Complete or confirm payment</h2>
                  </div>
                </div>

                {payableRequests.length ? (
                  <div className="customer-public-payment-actions">
                    {payableRequests.map((request) => (
                      <a key={request.id} className={`customer-public-pay-btn ${request.provider}`} href={request.payment_url} target="_blank" rel="noreferrer">
                        <i className={`fas ${request.provider === 'paystack' ? 'fa-shield-halved' : 'fa-building-columns'}`} />
                        <span>{request.provider === 'paystack' ? 'Pay with Paystack' : 'Open payment request'}</span>
                        <strong>{formatCurrency(request.amount, request.currency)}</strong>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="customer-public-muted">There is no active online payment request attached to this invoice yet. You can still pay by bank transfer using the details below.</p>
                )}

                <div className="customer-public-bank-panel">
                  <div>
                    <span>Bank</span>
                    <strong>{bank.bank_name || 'Not configured'}</strong>
                  </div>
                  <div>
                    <span>Account Name</span>
                    <strong>{bank.account_name || company.company_name || 'Otelex Hospitality Supplies Ltd'}</strong>
                  </div>
                  <div>
                    <span>Account Number</span>
                    <button type="button" onClick={() => copyText(bank.account_number, 'Account number')}>
                      <strong>{bank.account_number || 'Not configured'}</strong>
                      {bank.account_number ? <i className="fas fa-copy" /> : null}
                    </button>
                  </div>
                  <div>
                    <span>Reference</span>
                    <button type="button" onClick={() => copyText(manualRequest?.reference || invoice.invoice_number, 'Payment reference')}>
                      <strong>{manualRequest?.reference || invoice.invoice_number}</strong>
                      <i className="fas fa-copy" />
                    </button>
                  </div>
                </div>
              </section>

              <aside className="customer-public-card customer-public-contact-card">
                <span className="customer-public-section-label"><i className="fas fa-building" /> Customer Details</span>
                <h2>{client.company_name}</h2>
                <div className="customer-public-contact-list">
                  {client.email && <p><i className="fas fa-envelope" /> {client.email}</p>}
                  {client.phone && <p><i className="fas fa-phone" /> {client.phone}</p>}
                  {(client.address || client.city || client.state) && <p><i className="fas fa-location-dot" /> {[client.address, client.city, client.state, client.country].filter(Boolean).join(', ')}</p>}
                  {client.tax_id && <p><i className="fas fa-receipt" /> Tax ID: {client.tax_id}</p>}
                </div>
                <div className="customer-public-support-box">
                  <span>Need help?</span>
                  <p>{company.email || company.phone ? `${company.email || ''} ${company.phone || ''}` : 'Contact Otelex for support.'}</p>
                </div>
              </aside>
            </div>

            <section className="customer-public-card customer-public-section-card">
              <div className="customer-public-section-head">
                <div>
                  <span className="customer-public-section-label"><i className="fas fa-list" /> Invoice Items</span>
                  <h2>Items supplied</h2>
                </div>
              </div>
              <div className="customer-public-table-wrap">
                <table className="customer-public-table">
                  <thead>
                    <tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>VAT</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>{index + 1}</td>
                        <td><strong>{item.description}</strong>{item.product_sku && <small>{item.product_sku}</small>}</td>
                        <td>{Number(item.quantity || 0).toLocaleString('en-NG')} {item.product_uom || ''}</td>
                        <td>{formatCurrency(item.unit_price, invoice.currency)}</td>
                        <td>{formatCurrency(item.tax_amount, invoice.currency)}</td>
                        <td>{formatCurrency(item.line_total, invoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="customer-public-layout">
              <section className="customer-public-card customer-public-section-card">
                <span className="customer-public-section-label"><i className="fas fa-truck-fast" /> Delivery Notes</span>
                <h2>Delivery progress</h2>
                {deliveryNotes.length ? (
                  <div className="customer-public-stack-list">
                    {deliveryNotes.map((note) => (
                      <article key={note.id} className="customer-public-mini-card">
                        <div className="customer-public-mini-head">
                          <strong>{note.delivery_note_number}</strong>
                          <span className={`customer-public-pill ${note.status}`}>{note.status_label}</span>
                        </div>
                        <p><i className="fas fa-calendar" /> Delivery date: {formatDate(note.delivery_date)}</p>
                        {note.dispatch_date && <p><i className="fas fa-truck" /> Dispatch date: {formatDate(note.dispatch_date)}</p>}
                        {note.delivery_address && <p><i className="fas fa-location-dot" /> {note.delivery_address}</p>}
                        {note.receiver_name && <p><i className="fas fa-signature" /> Received by {note.receiver_name}</p>}
                        {note.items?.length ? <small>{note.items.length} item line{note.items.length === 1 ? '' : 's'} attached</small> : null}
                      </article>
                    ))}
                  </div>
                ) : <p className="customer-public-muted">No delivery note has been published for this invoice yet.</p>}
              </section>

              <section className="customer-public-card customer-public-section-card">
                <span className="customer-public-section-label"><i className="fas fa-receipt" /> Receipts</span>
                <h2>Payment receipts</h2>
                {receipts.length ? (
                  <div className="customer-public-stack-list">
                    {receipts.map((receipt) => (
                      <article key={receipt.id} className="customer-public-mini-card">
                        <div className="customer-public-mini-head">
                          <strong>{receipt.receipt_number}</strong>
                          <span className="customer-public-pill paid">Paid</span>
                        </div>
                        <p><i className="fas fa-money-bill" /> {formatCurrency(receipt.amount_received, invoice.currency)}</p>
                        <p><i className="fas fa-calendar" /> {formatDate(receipt.payment_date)}</p>
                        {receipt.payment_reference && <p><i className="fas fa-hashtag" /> {receipt.payment_reference}</p>}
                        <small>Balance after payment: {formatCurrency(receipt.balance_after_payment, invoice.currency)}</small>
                      </article>
                    ))}
                  </div>
                ) : <p className="customer-public-muted">No receipt has been issued for this invoice yet.</p>}
              </section>
            </div>

            {company.legal_footer && <p className="customer-public-footer-note">{company.legal_footer}</p>}
          </>
        )}
      </main>
    </div>
  );
};

export default CustomerPortalPublic;

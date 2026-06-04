import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import paymentService from '../../services/paymentService';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import './PaymentRequestPublic.css';

const formatCurrency = (amount, currency = 'NGN') => {
  const numeric = Number(amount || 0);
  const normalizedCurrency = String(currency || 'NGN').toUpperCase();

  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch {
    const symbol = normalizedCurrency === 'USD' ? '$' : '₦';
    return `${symbol}${numeric.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  }
};

const formatDate = (value) => {
  if (!value) return 'Not specified';
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusCopy = {
  pending: {
    icon: 'fa-clock',
    title: 'Payment request is active',
    text: 'Please use the details below and quote the payment reference when making payment.',
  },
  processing: {
    icon: 'fa-spinner',
    title: 'Payment is being confirmed',
    text: 'The payment request is being processed. Contact Otelex if you have already paid.',
  },
  paid: {
    icon: 'fa-circle-check',
    title: 'Payment has been confirmed',
    text: 'This payment request has already been settled. Please do not pay again.',
  },
  failed: {
    icon: 'fa-triangle-exclamation',
    title: 'Payment request needs attention',
    text: 'This request could not be completed. Please contact Otelex before making another attempt.',
  },
  expired: {
    icon: 'fa-calendar-xmark',
    title: 'Payment request has expired',
    text: 'This request is no longer active. Please contact Otelex for an updated payment request.',
  },
  cancelled: {
    icon: 'fa-ban',
    title: 'Payment request was cancelled',
    text: 'This request is no longer valid. Please contact Otelex for support.',
  },
};

const PaymentRequestPublic = () => {
  const { reference = '' } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Otelex | Payment Request';
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPaymentRequest = async () => {
      const cleanReference = decodeURIComponent(reference || '').trim();
      if (!cleanReference) {
        setError('A valid payment request reference is required.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const response = await paymentService.getPublicPaymentRequest(cleanReference);
        if (!cancelled) setRequest(response.data?.data || null);
      } catch (err) {
        if (!cancelled) {
          setRequest(null);
          setError(err.response?.data?.message || 'Payment request could not be loaded right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPaymentRequest();
    return () => { cancelled = true; };
  }, [reference]);

  const company = request?.company || {};
  const bank = request?.bank || {};
  const activeStatus = request?.is_expired ? 'expired' : request?.status;
  const statusMeta = statusCopy[activeStatus] || statusCopy.pending;
  const canPay = Boolean(request?.can_be_paid);

  const publicLogo = useMemo(() => {
    const logo = String(company.logo_path || '').trim();
    return logo || '';
  }, [company.logo_path]);

  const copyToClipboard = async (value, label) => {
    const text = String(value || '').trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied.`, 'success');
    } catch {
      showToast(`Could not copy ${label.toLowerCase()}.`, 'error');
    }
  };

  const openPaystack = () => {
    if (!request?.paystack_url || !canPay) return;
    window.location.href = request.paystack_url;
  };

  return (
    <div className={`payment-public-root theme-${theme}`}>
      <div className="payment-public-bg">
        <span className="payment-public-orb orb-one" />
        <span className="payment-public-orb orb-two" />
        <span className="payment-public-orb orb-three" />
      </div>
      <div className="payment-public-grid" />

      <main className="payment-public-shell">
        <section className="payment-public-brand-card">
          <div className="payment-public-brand-mark">
            {publicLogo ? <img src={publicLogo} alt={company.company_name || 'Otelex'} /> : <i className="fas fa-file-invoice-dollar" />}
          </div>
          <div>
            <span className="payment-public-eyebrow">Secure payment request</span>
            <h1>{company.company_name || 'Otelex Hospitality Supplies Ltd'}</h1>
            <p>{company.address ? `${company.address}${company.city ? `, ${company.city}` : ''}${company.state ? `, ${company.state}` : ''}` : 'Hospitality supplies, invoicing and payment confirmation.'}</p>
          </div>
        </section>

        {loading ? (
          <section className="payment-public-card payment-public-loading-card">
            <span className="payment-public-spinner" />
            <h2>Loading payment request...</h2>
            <p>Please wait while we confirm the payment details.</p>
          </section>
        ) : error ? (
          <section className="payment-public-card payment-public-empty-card">
            <div className="payment-public-state-icon danger"><i className="fas fa-link-slash" /></div>
            <h2>Payment request not available</h2>
            <p>{error}</p>
            <div className="payment-public-actions center">
              <button type="button" className="payment-public-btn ghost" onClick={() => navigate(-1)}>
                <i className="fas fa-arrow-left" /> Go Back
              </button>
            </div>
          </section>
        ) : (
          <div className="payment-public-layout">
            <section className="payment-public-card payment-public-summary-card">
              <div className={`payment-public-state ${activeStatus}`}>
                <div className="payment-public-state-icon"><i className={`fas ${statusMeta.icon}`} /></div>
                <div>
                  <span>{request.status_label || activeStatus}</span>
                  <h2>{statusMeta.title}</h2>
                  <p>{statusMeta.text}</p>
                </div>
              </div>

              <div className="payment-public-amount-box">
                <span>Amount requested</span>
                <strong>{formatCurrency(request.amount, request.currency)}</strong>
                <small>Invoice {request.invoice_number}</small>
              </div>

              <div className="payment-public-info-grid">
                <div>
                  <span>Payment Reference</span>
                  <button type="button" onClick={() => copyToClipboard(request.reference, 'Payment reference')}>
                    <strong>{request.reference}</strong>
                    <i className="fas fa-copy" />
                  </button>
                </div>
                <div>
                  <span>Customer</span>
                  <strong>{request.client_name || 'Customer'}</strong>
                </div>
                <div>
                  <span>Request Type</span>
                  <strong>{request.provider === 'paystack' ? 'Paystack Checkout' : 'Manual Payment'}</strong>
                </div>
                <div>
                  <span>Expires</span>
                  <strong>{formatDate(request.expires_at)}</strong>
                </div>
              </div>

              {request.provider === 'paystack' ? (
                <div className="payment-public-paystack-panel">
                  <i className="fas fa-shield-halved" />
                  <div>
                    <h3>Pay securely with Paystack</h3>
                    <p>You will be redirected to Paystack Checkout to complete this payment securely.</p>
                  </div>
                  <button type="button" className="payment-public-btn primary" disabled={!canPay || !request.paystack_url} onClick={openPaystack}>
                    <i className="fas fa-lock" /> Pay Now
                  </button>
                </div>
              ) : null}
            </section>

            <aside className="payment-public-card payment-public-bank-card">
              <span className="payment-public-section-label"><i className="fas fa-building-columns" /> Bank payment details</span>
              <h2>Transfer to Otelex</h2>
              <p className="payment-public-muted">Use the account details below and quote the payment reference when sending proof of payment.</p>

              <div className="payment-public-bank-list">
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
                  <button type="button" onClick={() => copyToClipboard(bank.account_number, 'Account number')}>
                    <strong>{bank.account_number || 'Not configured'}</strong>
                    {bank.account_number ? <i className="fas fa-copy" /> : null}
                  </button>
                </div>
                {bank.bank_branch ? (
                  <div>
                    <span>Branch</span>
                    <strong>{bank.bank_branch}</strong>
                  </div>
                ) : null}
              </div>

              <div className="payment-public-alert">
                <i className="fas fa-circle-info" />
                <p>Payment is confirmed only after Otelex verifies and records it. Please send your payment proof/reference to the team after transfer.</p>
              </div>

              <div className="payment-public-contact">
                {company.phone ? <a href={`tel:${String(company.phone).split('|')[0].trim()}`}><i className="fas fa-phone" /> {company.phone}</a> : null}
                {company.email ? <a href={`mailto:${String(company.email).split('|')[0].trim()}`}><i className="fas fa-envelope" /> {company.email}</a> : null}
                {company.website ? <span><i className="fas fa-globe" /> {company.website}</span> : null}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};

export default PaymentRequestPublic;

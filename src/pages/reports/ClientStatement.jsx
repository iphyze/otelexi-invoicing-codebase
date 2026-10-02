// pages/reports/ClientStatement.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { pdf } from '@react-pdf/renderer';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import DatePicker from '../../components/DatePicker';
import ClientStatementPDF from '../../components/pdf/ClientStatementPDF';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import reportService from '../../services/reportService';
import clientService from '../../services/clientService';
import './Reports.css';

const localIsoDate = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);
const todayIso = () => localIsoDate();
const monthStartIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatMoney = (amount, currency = 'NGN') => {
  const code = String(currency || 'NGN').toUpperCase();
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    const symbol = code === 'USD' ? '$' : '₦';
    return `${symbol}${Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

const TYPE_META = {
  invoice: { label: 'Invoice', icon: 'fa-file-invoice', className: 'invoice' },
  payment: { label: 'Payment', icon: 'fa-receipt', className: 'payment' },
  credit_note: { label: 'Credit Note', icon: 'fa-file-circle-minus', className: 'credit-note' },
  refund: { label: 'Refund', icon: 'fa-arrow-rotate-left', className: 'refund' },
};

const ClientStatement = () => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();

  const [nav, setNav] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [statement, setStatement] = useState(null);
  const [knownCurrencies, setKnownCurrencies] = useState([]);
  const [errors, setErrors] = useState({});
  const [filters, setFilters] = useState({
    client_id: '',
    from: monthStartIso(),
    to: todayIso(),
    currency: 'NGN',
  });

  useEffect(() => { document.title = 'Otelex | Client Statement'; }, []);

  useEffect(() => {
    let cancelled = false;
    const loadClients = async () => {
      setClientsLoading(true);
      try {
        const [activeRes, inactiveRes] = await Promise.all([
          clientService.getClients({ status: 'active', limit: 1000, page: 1, sortBy: 'company_name', sortOrder: 'ASC' }),
          clientService.getClients({ status: 'inactive', limit: 1000, page: 1, sortBy: 'company_name', sortOrder: 'ASC' }),
        ]);
        if (cancelled) return;

        const combined = [...(activeRes.data?.data || []), ...(inactiveRes.data?.data || [])]
          .sort((a, b) => String(a.company_name || '').localeCompare(String(b.company_name || '')));
        setClients(combined);
      } catch (err) {
        if (!cancelled) showToast(err.response?.data?.message || 'Failed to load clients.', 'error');
      } finally {
        if (!cancelled) setClientsLoading(false);
      }
    };

    loadClients();
    return () => { cancelled = true; };
  }, [showToast]);

  const clientOptions = useMemo(() => clients.map((client) => ({
    value: client.id,
    label: `${client.company_name}${client.is_active ? '' : ' (Inactive)'}`,
    icon: 'fa-building',
  })), [clients]);

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === String(filters.client_id)) || null,
    [clients, filters.client_id]
  );

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    setStatement(null);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((item) => String(item.id) === String(clientId));
    const preferredCurrency = String(client?.currency || 'NGN').toUpperCase();
    setFilters((current) => ({
      ...current,
      client_id: clientId,
      currency: preferredCurrency,
    }));
    setKnownCurrencies(clientId ? [preferredCurrency] : []);
    setErrors((current) => ({ ...current, client_id: '' }));
    setStatement(null);
  };

  const validate = () => {
    const next = {};
    if (!filters.client_id) next.client_id = 'Please select a client.';
    if (!filters.from) next.from = 'From date is required.';
    if (!filters.to) next.to = 'To date is required.';
    if (filters.from && filters.to && filters.from > filters.to) next.to = 'To date cannot be earlier than From date.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const loadStatement = useCallback(async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await reportService.getClientStatement({
        client_id: Number(filters.client_id),
        from: filters.from,
        to: filters.to,
        currency: filters.currency,
      });
      const data = response.data?.data || null;
      setStatement(data);
      if (Array.isArray(data?.available_currencies)) {
        setKnownCurrencies(data.available_currencies.map((value) => String(value).toUpperCase()));
      }

      if (data?.period?.currency && data.period.currency !== filters.currency) {
        setFilters((current) => ({ ...current, currency: data.period.currency }));
      }
    } catch (err) {
      setStatement(null);
      showToast(err.response?.data?.message || 'Failed to generate client statement.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  const currencyOptions = useMemo(() => {
    const fallback = selectedClient?.currency || filters.currency || 'NGN';
    const available = knownCurrencies.length
      ? knownCurrencies
      : (statement?.available_currencies?.length ? statement.available_currencies : [fallback]);
    return [...new Set(available.filter(Boolean).map((value) => String(value).toUpperCase()))];
  }, [knownCurrencies, statement, selectedClient, filters.currency]);

  const currency = statement?.period?.currency || filters.currency || 'NGN';
  const summary = statement?.summary || null;
  const ledger = statement?.ledger || [];

  const balanceClass = (value) => {
    const number = Number(value || 0);
    if (Math.abs(number) < 0.005) return 'settled';
    return number > 0 ? 'receivable' : 'client-credit';
  };

  const openLedgerDocument = (entry) => {
    if (entry?.invoice_id) navigate(`/invoices/${entry.invoice_id}`);
  };


  const exportExcel = async () => {
    if (!statement?.client?.id || !statement?.period) {
      showToast('Generate the client statement before exporting.', 'warning');
      return;
    }

    setExportingExcel(true);
    try {
      const response = await reportService.downloadClientStatementExcel({
        client_id: Number(statement.client.id),
        from: statement.period.from,
        to: statement.period.to,
        currency: statement.period.currency || currency,
      });

      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      if (blob.type?.includes('application/json')) {
        const errorPayload = JSON.parse(await blob.text());
        throw new Error(errorPayload?.message || 'Excel statement could not be generated.');
      }

      const safeClient = String(statement.client.company_name || 'Client')
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '') || 'Client';
      const fileName = `Otelex_Client_Statement_${safeClient}_${statement.period.currency}_${statement.period.from}_${statement.period.to}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Client statement Excel file downloaded.', 'success');
    } catch (err) {
      showToast(err.message || err.response?.data?.message || 'Failed to download the Excel statement.', 'error');
    } finally {
      setExportingExcel(false);
    }
  };


  const exportPdf = async () => {
    if (!statement?.client?.id || !statement?.period) {
      showToast('Generate the client statement before exporting.', 'warning');
      return;
    }

    setExportingPdf(true);
    try {
      const blob = await pdf(<ClientStatementPDF statement={statement} />).toBlob();
      if (!blob || blob.size === 0) throw new Error('Generated PDF was empty.');

      const safeClient = String(statement.client.company_name || 'Client')
        .replace(/[^a-z0-9_-]+/gi, '_')
        .replace(/^_+|_+$/g, '') || 'Client';
      const fileName = `Otelex_Client_Statement_${safeClient}_${statement.period.currency}_${statement.period.from}_${statement.period.to}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1500);
      showToast('Client statement PDF downloaded.', 'success');
    } catch (err) {
      console.error('Failed to generate client statement PDF:', err);
      showToast('Failed to generate the PDF statement.', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Client Statement"
          links={[
            { label: 'Dashboard', to: '/' },
            { label: 'Reports', to: '/reports/sales' },
            { label: 'Client Statement', active: true },
          ]}
        />

        <div className={`rpt-filter-bar rpt-statement-filter theme-${theme}`}>
          <div className="rpt-filter-group rpt-statement-client-filter">
            <label className="rpt-filter-label">Client</label>
            <SelectInput
              options={clientOptions}
              value={filters.client_id}
              onChange={handleClientChange}
              placeholder={clientsLoading ? 'Loading clients...' : 'Select client...'}
              searchable
              clearable
              disabled={clientsLoading}
              error={errors.client_id}
            />
          </div>

          <div className="rpt-filter-group rpt-statement-date-filter">
            <DatePicker
              label="From"
              value={filters.from}
              onChange={(value) => setFilter('from', value)}
              maxDate={filters.to || todayIso()}
              error={errors.from}
            />
          </div>

          <div className="rpt-filter-group rpt-statement-date-filter">
            <DatePicker
              label="To"
              value={filters.to}
              onChange={(value) => setFilter('to', value)}
              minDate={filters.from}
              maxDate={todayIso()}
              error={errors.to}
            />
          </div>

          {filters.client_id && currencyOptions.length > 0 && (
            <div className="rpt-filter-group">
              <label className="rpt-filter-label">Currency</label>
              <div className={`rpt-currency-toggle ${currencyOptions.length === 1 ? 'is-single' : ''}`}>
                {currencyOptions.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`rpt-cur-btn ${filters.currency === code ? 'is-active' : ''}`}
                    onClick={() => setFilter('currency', code)}
                    aria-pressed={filters.currency === code}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="rpt-run-btn" onClick={loadStatement} disabled={loading || clientsLoading} type="button">
            {loading
              ? <><span className="rpt-spinner" /> Generating...</>
              : <><i className="fas fa-chart-line" /> Generate Statement</>}
          </button>


          <button
            className="rpt-export-btn"
            onClick={exportExcel}
            disabled={!statement || loading || exportingExcel}
            type="button"
          >
            {exportingExcel
              ? <><span className="rpt-spinner" /> Preparing Excel...</>
              : <><i className="fas fa-file-excel" /> Download Excel</>}
          </button>

          <button
            className="rpt-export-btn rpt-export-pdf-btn"
            onClick={exportPdf}
            disabled={!statement || loading || exportingPdf}
            type="button"
          >
            {exportingPdf
              ? <><span className="rpt-spinner" /> Preparing PDF...</>
              : <><i className="fas fa-file-pdf" /> Download PDF</>}
          </button>
        </div>

        {!statement && !loading && (
          <motion.section
            className={`rpt-card rpt-statement-welcome theme-${theme}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rpt-statement-welcome-icon"><i className="fas fa-file-invoice-dollar" /></div>
            <div>
              <h3>Generate a client receivables statement</h3>
              <p>Select a client and reporting period to view opening balance, debit and credit activity, and the running closing balance.</p>
            </div>
          </motion.section>
        )}

        {loading && !statement && (
          <div className="rpt-loading">
            <div className={`rpt-shimmer theme-${theme}`} style={{ height: 104 }} />
            <div className={`rpt-shimmer theme-${theme}`} style={{ height: 280 }} />
          </div>
        )}

        {statement && summary && (
          <>
            <motion.section
              className={`rpt-card rpt-statement-head theme-${theme}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="rpt-statement-client">
                <span className="rpt-statement-eyebrow"><i className="fas fa-building" /> Client Statement</span>
                <h2>{statement.client?.company_name}</h2>
                <p>
                  {statement.client?.email || 'No email on file'}
                  {statement.client?.phone ? ` · ${statement.client.phone}` : ''}
                </p>
              </div>
              <div className="rpt-statement-period">
                <span>Statement Period</span>
                <strong>{formatDate(statement.period?.from)} — {formatDate(statement.period?.to)}</strong>
                <div className="rpt-statement-period-meta">
                  <span className="rpt-statement-currency">{currency}</span>
                  <span>{summary.transaction_count} transaction{summary.transaction_count === 1 ? '' : 's'}</span>
                  <span className={`rpt-balance-position ${balanceClass(summary.closing_balance)}`}>
                    {summary.balance_position === 'client_credit' ? 'Client Credit' : summary.balance_position === 'settled' ? 'Settled' : 'Receivable'}
                  </span>
                </div>
              </div>
            </motion.section>

            {statement.has_multiple_currencies && (
              <div className="rpt-statement-currency-note">
                <i className="fas fa-circle-info" />
                This client has activity in more than one currency. Each currency is shown separately so balances are never combined incorrectly.
              </div>
            )}

            <div className="rpt-kpi-grid rpt-statement-kpis">
              {[
                { label: 'Opening Balance', value: summary.opening_balance, icon: 'fa-scale-balanced', color: '#6366f1', cls: '' },
                { label: 'Total Debit', value: summary.total_debits, icon: 'fa-arrow-trend-up', color: '#ef4444', cls: 'rpt-val-red' },
                { label: 'Total Credit', value: summary.total_credits, icon: 'fa-arrow-trend-down', color: '#10b981', cls: 'rpt-val-green' },
                { label: 'Closing Balance', value: summary.closing_balance, icon: 'fa-wallet', color: '#1a56db', cls: balanceClass(summary.closing_balance) },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  className={`rpt-kpi-card rpt-statement-kpi theme-${theme}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="rpt-kpi-icon" style={{ background: `${item.color}18`, color: item.color }}>
                    <i className={`fas ${item.icon}`} />
                  </div>
                  <div>
                    <p className="rpt-kpi-label">{item.label}</p>
                    <h3 className={`rpt-kpi-value ${item.cls}`}>{formatMoney(item.value, currency)}</h3>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.section
              className={`rpt-card rpt-statement-ledger-card theme-${theme}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <div className="rpt-statement-table-head">
                <div>
                  <h4 className="rpt-card-title"><i className="fas fa-list-ul" /> Statement Activity</h4>
                  <p>Debit increases the receivable balance; credit reduces it.</p>
                </div>
                <span className="rpt-statement-count">{ledger.length} period entr{ledger.length === 1 ? 'y' : 'ies'}</span>
              </div>

              <div className="rpt-table-wrap">
                <table className="rpt-table rpt-statement-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference</th>
                      <th>Transaction</th>
                      <th>Description</th>
                      <th className="rpt-num">Debit</th>
                      <th className="rpt-num">Credit</th>
                      <th className="rpt-num">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="rpt-statement-opening-row">
                      <td>{formatDate(statement.period?.from)}</td>
                      <td><span className="rpt-statement-opening-ref">OPENING</span></td>
                      <td><span className="rpt-txn-badge opening"><i className="fas fa-scale-balanced" /> Opening Balance</span></td>
                      <td>Balance brought forward before this statement period</td>
                      <td className="rpt-num">—</td>
                      <td className="rpt-num">—</td>
                      <td className={`rpt-num rpt-statement-balance ${balanceClass(summary.opening_balance)}`}>{formatMoney(summary.opening_balance, currency)}</td>
                    </tr>

                    {ledger.map((entry, index) => {
                      const meta = TYPE_META[entry.transaction_type] || { label: entry.type_label || 'Transaction', icon: 'fa-circle-dot', className: 'other' };
                      return (
                        <tr
                          key={`${entry.transaction_type}-${entry.id}-${index}`}
                          className={entry.invoice_id ? 'rpt-row-link' : ''}
                          onClick={() => openLedgerDocument(entry)}
                          title={entry.invoice_id ? 'Open related invoice' : undefined}
                        >
                          <td>{formatDate(entry.transaction_date)}</td>
                          <td>
                            <span className={entry.invoice_id ? 'rpt-link-cell' : ''}>{entry.reference || '—'}</span>
                            {entry.related_reference && <small className="rpt-statement-related">{entry.related_reference}</small>}
                          </td>
                          <td>
                            <span className={`rpt-txn-badge ${meta.className}`}>
                              <i className={`fas ${meta.icon}`} /> {entry.type_label || meta.label}
                            </span>
                          </td>
                          <td className="rpt-statement-desc">
                            <span>{entry.description || '—'}</span>
                            {entry.notes && <small>{entry.notes}</small>}
                          </td>
                          <td className="rpt-num rpt-val-red">{Number(entry.debit || 0) > 0 ? formatMoney(entry.debit, currency) : '—'}</td>
                          <td className="rpt-num rpt-val-green">{Number(entry.credit || 0) > 0 ? formatMoney(entry.credit, currency) : '—'}</td>
                          <td className={`rpt-num rpt-statement-balance ${balanceClass(entry.balance)}`}>{formatMoney(entry.balance, currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="rpt-total-row rpt-statement-total-row">
                      <td colSpan="4">Period Totals</td>
                      <td className="rpt-num rpt-val-red">{formatMoney(summary.total_debits, currency)}</td>
                      <td className="rpt-num rpt-val-green">{formatMoney(summary.total_credits, currency)}</td>
                      <td className={`rpt-num rpt-statement-balance ${balanceClass(summary.closing_balance)}`}>{formatMoney(summary.closing_balance, currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {ledger.length === 0 && (
                <div className="rpt-statement-no-activity">
                  <i className="fas fa-calendar-check" />
                  <div>
                    <strong>No transactions within this period.</strong>
                    <span>The opening balance is still carried forward correctly.</span>
                  </div>
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientStatement;

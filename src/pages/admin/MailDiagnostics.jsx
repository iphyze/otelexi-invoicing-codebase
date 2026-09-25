import React, { useCallback, useEffect, useRef, useState } from 'react';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import adminService from '../../services/adminService';
import useAuthStore from '../../stores/useAuthStore';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import './MailDiagnostics.css';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx'];

const PROVIDER_OPTIONS = [
  { value: '', label: 'All providers' },
  { value: 'zoho', label: 'Zoho Mail' },
  { value: 'brevo', label: 'Brevo' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'soft_bounced', label: 'Soft bounced' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'spam', label: 'Spam' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'failed', label: 'Failed' },
];

const formatMailStatus = (status = '') => status
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const formatMailDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
};

const ResultPanel = ({ result, type }) => {
  if (!result) return null;

  const success = Boolean(result.success);
  return (
    <div className={`mail-result ${success ? 'success' : 'error'}`} role="status">
      <div className="mail-result-icon">
        <i className={`fas ${success ? 'fa-circle-check' : 'fa-circle-exclamation'}`} />
      </div>
      <div>
        <strong>{success ? `${type} successful` : `${type} failed`}</strong>
        <p>{result.message}</p>
        <div className="mail-result-meta">
          {result.code && <span>Code: {result.code}</span>}
          {Number.isFinite(result.duration_ms) && <span>{result.duration_ms} ms</span>}
          {result.attachment?.name && <span>Attachment: {result.attachment.name}</span>}
        </div>
      </div>
    </div>
  );
};

const MailDiagnostics = () => {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const fileRef = useRef(null);

  const [nav, setNav] = useState(false);
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [form, setForm] = useState({
    recipient: '',
    subject: 'Otelex SMTP Test',
    message: 'This is a test email sent from the Otelex Super Admin mail diagnostics page.',
  });

  const [history, setHistory] = useState([]);
  const [historySummary, setHistorySummary] = useState({});
  const [historyMeta, setHistoryMeta] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [historyFilters, setHistoryFilters] = useState({
    search: '',
    provider: '',
    status: '',
    page: 1,
    limit: 20,
  });

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await adminService.getMailDeliveryHistory(historyFilters);
      setHistory(response.data?.data || []);
      setHistorySummary(response.data?.summary || {});
      setHistoryMeta(response.data?.meta || null);
    } catch (error) {
      setHistoryError(error.response?.data?.message || 'Mail delivery history could not be loaded.');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilters]);

  useEffect(() => {
    document.title = 'Otelex | Mail Diagnostics';

    const load = async () => {
      setLoadingConfig(true);
      setConfigError('');
      try {
        const response = await adminService.getMailDiagnostics();
        setConfig(response.data?.data || null);
      } catch (error) {
        setConfigError(error.response?.data?.message || 'Mail configuration could not be loaded.');
      } finally {
        setLoadingConfig(false);
      }
    };

    load();
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (user?.email && !form.recipient) {
      setForm((current) => ({ ...current, recipient: user.email }));
    }
  }, [user?.email]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (sendResult) setSendResult(null);
  };

  const handleConnectionTest = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const response = await adminService.testMailConnection();
      const result = response.data?.data || null;
      setConnectionResult(result);
      showToast(result?.success ? 'SMTP connection passed.' : (result?.message || 'SMTP connection failed.'), result?.success ? 'success' : 'error');
    } catch (error) {
      showToast(error.response?.data?.message || 'SMTP connection test failed.', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAttachment = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setAttachment(null);
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      showToast('Allowed files: PDF, PNG, JPG, TXT, CSV, DOC, DOCX, XLS and XLSX.', 'error');
      event.target.value = '';
      setAttachment(null);
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      showToast('Attachment must not exceed 10 MB.', 'error');
      event.target.value = '';
      setAttachment(null);
      return;
    }

    setAttachment(file);
    setSendResult(null);
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!form.recipient.trim() || !form.subject.trim() || !form.message.trim()) {
      showToast('Recipient, subject and message are required.', 'error');
      return;
    }

    const payload = new FormData();
    payload.append('recipient', form.recipient.trim());
    payload.append('subject', form.subject.trim());
    payload.append('message', form.message.trim());
    if (attachment) payload.append('attachment', attachment);

    setSending(true);
    setSendResult(null);
    try {
      const response = await adminService.sendTestEmail(payload);
      const result = response.data?.data || null;
      setSendResult(result);
      showToast(result?.success ? 'Test email submitted successfully.' : (result?.message || 'Test email failed.'), result?.success ? 'success' : 'error');
      loadHistory();
    } catch (error) {
      showToast(error.response?.data?.message || 'The test email could not be processed.', 'error');
    } finally {
      setSending(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Mail Diagnostics"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Administration', to: '/admin/audit-logs' }, { label: 'Mail Diagnostics', active: true }]}
        />

        <div className="maildiag-wrapper">
          <section className="maildiag-hero">
            <div>
              <span className="maildiag-eyebrow">Super Admin</span>
              <h1>Mail Diagnostics</h1>
              <p>Verify Zoho SMTP, send controlled test messages, and review delivery activity across the configured mail providers.</p>
            </div>
            <div className="maildiag-security">
              <i className="fas fa-shield-halved" />
              <div><strong>Restricted tool</strong><span>Super Admin access only</span></div>
            </div>
          </section>

          <div className="maildiag-grid">
            <div className="maildiag-main">
              <section className="maildiag-card">
                <div className="maildiag-card-head">
                  <div>
                    <h2>Send Test Email</h2>
                    <p>Leave the attachment empty to test a standard email, or add one to test multipart delivery.</p>
                  </div>
                  <span className="maildiag-chip"><i className="fas fa-paper-plane" /> Zoho SMTP</span>
                </div>

                <form className="maildiag-form" onSubmit={handleSend}>
                  <div className="maildiag-field">
                    <label htmlFor="mail-recipient">Recipient email</label>
                    <div className="maildiag-input-wrap">
                      <i className="fas fa-envelope" />
                      <input
                        id="mail-recipient"
                        type="email"
                        value={form.recipient}
                        onChange={(event) => setField('recipient', event.target.value)}
                        placeholder="name@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className="maildiag-field">
                    <label htmlFor="mail-subject">Subject</label>
                    <div className="maildiag-input-wrap">
                      <i className="fas fa-tag" />
                      <input
                        id="mail-subject"
                        value={form.subject}
                        onChange={(event) => setField('subject', event.target.value)}
                        maxLength={180}
                        required
                      />
                    </div>
                  </div>

                  <div className="maildiag-field">
                    <label htmlFor="mail-message">Message</label>
                    <textarea
                      id="mail-message"
                      value={form.message}
                      onChange={(event) => setField('message', event.target.value)}
                      maxLength={10000}
                      rows={6}
                      required
                    />
                  </div>

                  <div className="maildiag-field">
                    <label>Attachment <span className="maildiag-optional">Optional · max 10 MB</span></label>
                    {!attachment ? (
                      <label className="maildiag-upload" htmlFor="mail-attachment">
                        <i className="fas fa-paperclip" />
                        <div><strong>Choose a test attachment</strong><span>PDF, image, text, Word or Excel</span></div>
                        <span className="maildiag-upload-action">Browse</span>
                      </label>
                    ) : (
                      <div className="maildiag-file">
                        <i className="fas fa-file-lines" />
                        <div><strong>{attachment.name}</strong><span>{formatSize(attachment.size)}</span></div>
                        <button type="button" onClick={removeAttachment} aria-label="Remove attachment"><i className="fas fa-xmark" /></button>
                      </div>
                    )}
                    <input
                      ref={fileRef}
                      id="mail-attachment"
                      className="maildiag-file-input"
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.doc,.docx,.xls,.xlsx"
                      onChange={handleAttachment}
                    />
                  </div>

                  <button className="maildiag-primary-btn" type="submit" disabled={sending}>
                    {sending ? <><span className="maildiag-spinner" /> Sending test...</> : <><i className="fas fa-paper-plane" /> Send Test Email</>}
                  </button>
                </form>

                <ResultPanel result={sendResult} type="Email test" />
              </section>
            </div>

            <aside className="maildiag-sidebar">
              <section className="maildiag-card">
                <div className="maildiag-card-head">
                  <div><h2>SMTP Configuration</h2><p>Password is never displayed.</p></div>
                </div>

                {loadingConfig ? (
                  <div className="maildiag-config-loading">Loading configuration...</div>
                ) : configError ? (
                  <div className="maildiag-config-error"><i className="fas fa-triangle-exclamation" /> {configError}</div>
                ) : (
                  <div className="maildiag-config-list">
                    <div><span>Status</span><strong className={config?.configured ? 'ok' : 'bad'}>{config?.configured ? 'Configured' : 'Incomplete'}</strong></div>
                    {config?.configured ? <>
                      <div><span>SMTP host</span><strong>{config.host}</strong></div>
                      <div><span>Port</span><strong>{config.port}</strong></div>
                      <div><span>Encryption</span><strong>{String(config.encryption || '').toUpperCase()}</strong></div>
                      <div><span>Username</span><strong>{config.username}</strong></div>
                      <div><span>From address</span><strong>{config.from_address}</strong></div>
                      <div><span>Certificate check</span><strong>{config.verify_peer ? 'Enabled' : 'Disabled'}</strong></div>
                    </> : <p className="maildiag-config-message">{config?.message || 'SMTP configuration is incomplete.'}</p>}
                  </div>
                )}
              </section>

              <section className="maildiag-card">
                <div className="maildiag-card-head">
                  <div><h2>Connection Test</h2><p>Connect and authenticate without sending mail.</p></div>
                </div>
                <button className="maildiag-secondary-btn" type="button" onClick={handleConnectionTest} disabled={testingConnection || config?.configured === false}>
                  {testingConnection ? <><span className="maildiag-spinner dark" /> Testing...</> : <><i className="fas fa-plug-circle-check" /> Test SMTP Connection</>}
                </button>
                <ResultPanel result={connectionResult} type="Connection test" />
              </section>

              <section className="maildiag-card maildiag-help">
                <div className="maildiag-card-head"><div><h2>What this checks</h2></div></div>
                <div className="maildiag-help-list">
                  <div><i className="fas fa-server" /><span>Hosting server can reach Zoho SMTP.</span></div>
                  <div><i className="fas fa-key" /><span>Mailbox credentials authenticate successfully.</span></div>
                  <div><i className="fas fa-lock" /><span>TLS certificate negotiation succeeds.</span></div>
                  <div><i className="fas fa-paperclip" /><span>Optional attachment delivery works.</span></div>
                </div>
              </section>
            </aside>
          </div>

          <section className="maildiag-card maildiag-history-card">
            <div className="maildiag-card-head maildiag-history-head">
              <div>
                <h2>Delivery Activity</h2>
                <p>Provider submission status, Brevo delivery events and automatic fallback attempts from the last recorded sends.</p>
              </div>
              <button className="maildiag-history-refresh" type="button" onClick={loadHistory} disabled={historyLoading}>
                <i className={`fas ${historyLoading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} /> Refresh
              </button>
            </div>

            <div className="maildiag-history-stats">
              <div><span>Last 30 days</span><strong>{Number(historySummary.total || 0).toLocaleString()}</strong></div>
              <div><span>Delivered</span><strong className="success">{Number(historySummary.delivered || 0).toLocaleString()}</strong></div>
              <div><span>Pending / deferred</span><strong>{Number(historySummary.pending || 0).toLocaleString()}</strong></div>
              <div><span>Failed / bounced</span><strong className="danger">{Number(historySummary.failed || 0).toLocaleString()}</strong></div>
              <div><span>Fallback used</span><strong>{Number(historySummary.fallback_used || 0).toLocaleString()}</strong></div>
            </div>

            <div className="maildiag-history-filters">
              <div className="maildiag-history-search">
                <i className="fas fa-magnifying-glass" />
                <input
                  value={historySearchInput}
                  onChange={(event) => setHistorySearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setHistoryFilters((current) => ({ ...current, search: historySearchInput.trim(), page: 1 }));
                    }
                  }}
                  placeholder="Search recipient, subject or tracking ID..."
                />
                <button type="button" onClick={() => setHistoryFilters((current) => ({ ...current, search: historySearchInput.trim(), page: 1 }))}>Search</button>
              </div>
              <SelectInput
                options={PROVIDER_OPTIONS}
                value={historyFilters.provider}
                onChange={(value) => setHistoryFilters((current) => ({ ...current, provider: value || '', page: 1 }))}
                clearable
              />
              <SelectInput
                options={STATUS_OPTIONS}
                value={historyFilters.status}
                onChange={(value) => setHistoryFilters((current) => ({ ...current, status: value || '', page: 1 }))}
                clearable
              />
            </div>

            <div className="maildiag-history-table-wrap">
              <table className="maildiag-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Recipient / Subject</th>
                    <th>Requested</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan="6" className="maildiag-history-empty">Loading delivery activity...</td></tr>
                  ) : historyError ? (
                    <tr><td colSpan="6" className="maildiag-history-empty error">{historyError}</td></tr>
                  ) : history.length === 0 ? (
                    <tr><td colSpan="6" className="maildiag-history-empty">No matching mail activity found.</td></tr>
                  ) : history.map((item) => (
                    <tr key={item.id}>
                      <td className="maildiag-history-date">{formatMailDate(item.created_at)}</td>
                      <td>
                        <div className="maildiag-history-recipient"><strong>{item.recipient_email}</strong><span>{item.subject}</span></div>
                      </td>
                      <td><span className="maildiag-provider-pill neutral">{item.requested_provider === 'system' ? 'System Default' : formatMailStatus(item.requested_provider)}</span></td>
                      <td>
                        <span className={`maildiag-provider-pill ${item.provider || 'neutral'}`}>{item.provider ? formatMailStatus(item.provider) : '—'}</span>
                        {item.fallback_used && <span className="maildiag-fallback-note">Fallback</span>}
                      </td>
                      <td>
                        <span className={`maildiag-status-pill status-${item.status}`}>{formatMailStatus(item.status)}</span>
                        {item.failure_reason && <span className="maildiag-failure-reason" title={item.failure_reason}>{item.failure_reason}</span>}
                      </td>
                      <td>
                        <div className="maildiag-attempts">
                          {(item.attempts || []).length === 0 ? <span>—</span> : item.attempts.map((attempt, index) => (
                            <span key={`${item.id}-${attempt.provider}-${index}`} className={attempt.success ? 'ok' : 'failed'} title={attempt.code || ''}>
                              {formatMailStatus(attempt.provider)} <i className={`fas ${attempt.success ? 'fa-check' : 'fa-xmark'}`} />
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {historyMeta && historyMeta.total_pages > 1 && (
              <div className="maildiag-history-pagination">
                <button
                  type="button"
                  disabled={historyMeta.page <= 1}
                  onClick={() => setHistoryFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
                >Previous</button>
                <span>Page {historyMeta.page} of {historyMeta.total_pages}</span>
                <button
                  type="button"
                  disabled={historyMeta.page >= historyMeta.total_pages}
                  onClick={() => setHistoryFilters((current) => ({ ...current, page: current.page + 1 }))}
                >Next</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MailDiagnostics;

import React, { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header';
import NavBar from '../../components/NavBar';
import PageNav from '../../components/PageNav';
import SelectInput from '../../components/SelectInput';
import adminService from '../../services/adminService';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import './MailSettings.css';

const PROVIDERS = {
  zoho: {
    label: 'Zoho Mail',
    icon: 'fa-envelope',
    description: 'SMTP mailbox delivery through the configured Zoho account.',
  },
  brevo: {
    label: 'Brevo',
    icon: 'fa-paper-plane',
    description: 'Transactional email delivery through the Brevo API.',
  },
};

const Toggle = ({ checked, onChange, disabled = false, label, note }) => (
  <div className="mailset-toggle-row">
    <button
      type="button"
      className={`mailset-toggle ${checked ? 'is-on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="mailset-toggle-thumb" />
    </button>
    <div className="mailset-toggle-copy">
      <strong>{label}</strong>
      {note && <span>{note}</span>}
    </div>
  </div>
);

const TestResult = ({ result }) => {
  if (!result) return null;
  return (
    <div className={`mailset-test-result ${result.success ? 'success' : 'error'}`}>
      <i className={`fas ${result.success ? 'fa-circle-check' : 'fa-circle-exclamation'}`} />
      <div>
        <strong>{result.success ? 'Connection passed' : 'Connection failed'}</strong>
        <span>{result.message}</span>
        {Number.isFinite(result.duration_ms) && <small>{result.duration_ms} ms</small>}
      </div>
    </div>
  );
};

const MailSettings = () => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const [nav, setNav] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [testing, setTesting] = useState({ zoho: false, brevo: false });
  const [testResults, setTestResults] = useState({ zoho: null, brevo: null });

  const load = async () => {
    setLoading(true);
    try {
      const response = await adminService.getMailSettings();
      const settings = response.data?.data || null;
      setData(settings);
      setForm(settings ? {
        default_provider: settings.default_provider || 'zoho',
        zoho_enabled: Boolean(settings.providers?.zoho?.enabled),
        brevo_enabled: Boolean(settings.providers?.brevo?.enabled),
        fallback_enabled: Boolean(settings.fallback_enabled),
        fallback_provider: settings.fallback_provider || 'brevo',
      } : null);
    } catch (error) {
      showToast(error.response?.data?.message || 'Mail settings could not be loaded.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Otelex | Mail Settings';
    load();
  }, []);

  const enabledProviders = useMemo(() => {
    if (!form) return [];
    return Object.keys(PROVIDERS).filter((key) => form[`${key}_enabled`]);
  }, [form]);

  const providerOptions = Object.entries(PROVIDERS).map(([value, provider]) => ({
    value,
    label: provider.label,
    icon: provider.icon,
  }));

  const setProviderEnabled = (provider, enabled) => {
    const otherProvider = provider === 'zoho' ? 'brevo' : 'zoho';
    const info = data?.providers?.[provider];

    if (enabled && info?.configured === false) {
      showToast(`${PROVIDERS[provider].label} must be configured on the server before it can be enabled.`, 'error');
      return;
    }

    if (!enabled && !form?.[`${otherProvider}_enabled`]) {
      showToast('At least one mail provider must remain enabled.', 'error');
      return;
    }

    setForm((current) => {
      const next = { ...current, [`${provider}_enabled`]: enabled };

      if (!enabled && current.default_provider === provider) {
        next.default_provider = otherProvider;
      }
      if (!enabled && current.fallback_provider === provider) {
        next.fallback_enabled = false;
        next.fallback_provider = provider;
      }

      return next;
    });
  };

  const changeDefaultProvider = (provider) => {
    if (!form?.[`${provider}_enabled`]) {
      showToast(`${PROVIDERS[provider].label} must be enabled before it can be the default.`, 'error');
      return;
    }

    const alternate = provider === 'zoho' ? 'brevo' : 'zoho';
    setForm((current) => ({
      ...current,
      default_provider: provider,
      fallback_provider: current.fallback_provider === provider ? alternate : current.fallback_provider,
    }));
  };

  const setFallbackEnabled = (enabled) => {
    if (enabled && enabledProviders.length < 2) {
      showToast('Enable both providers before enabling automatic fallback.', 'error');
      return;
    }

    const alternate = form.default_provider === 'zoho' ? 'brevo' : 'zoho';
    setForm((current) => ({
      ...current,
      fallback_enabled: enabled,
      fallback_provider: enabled ? alternate : current.fallback_provider,
    }));
  };

  const testProvider = async (provider) => {
    setTesting((current) => ({ ...current, [provider]: true }));
    setTestResults((current) => ({ ...current, [provider]: null }));
    try {
      const response = await adminService.testMailProvider(provider);
      const result = response.data?.data || null;
      setTestResults((current) => ({ ...current, [provider]: result }));
      showToast(result?.success ? `${PROVIDERS[provider].label} connection passed.` : (result?.message || 'Connection test failed.'), result?.success ? 'success' : 'error');
    } catch (error) {
      showToast(error.response?.data?.message || `${PROVIDERS[provider].label} connection test failed.`, 'error');
    } finally {
      setTesting((current) => ({ ...current, [provider]: false }));
    }
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const response = await adminService.updateMailSettings(form);
      const settings = response.data?.data || null;
      setData(settings);
      if (settings) {
        setForm({
          default_provider: settings.default_provider,
          zoho_enabled: Boolean(settings.providers?.zoho?.enabled),
          brevo_enabled: Boolean(settings.providers?.brevo?.enabled),
          fallback_enabled: Boolean(settings.fallback_enabled),
          fallback_provider: settings.fallback_provider || (settings.default_provider === 'zoho' ? 'brevo' : 'zoho'),
        });
      }
      showToast('Mail settings saved successfully.', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Mail settings could not be saved.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form || !data) {
    return (
      <div className={`main-container theme-${theme}`}>
        <Header setNav={setNav} nav={nav} />
        <NavBar setNav={setNav} nav={nav} />
        <div className="page-content">
          <PageNav pageTitle="Mail Settings" links={[{ label: 'Dashboard', to: '/' }, { label: 'Administration', to: '/admin/audit-logs' }, { label: 'Mail Settings', active: true }]} />
          <div className="mailset-loading"><span className="mailset-spinner" /> Loading mail settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="Mail Settings"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Administration', to: '/admin/audit-logs' }, { label: 'Mail Settings', active: true }]}
        />

        <div className="mailset-wrapper">
          <div className={`mailset-notice theme-${theme}`}>
            <i className="fas fa-shield-halved" />
            <div>
              <strong>Mail credentials stay on the server.</strong>
              <span>This page controls routing only. SMTP passwords and Brevo API keys remain protected in the backend <code>.env</code> file.</span>
            </div>
          </div>

          <div className="mailset-layout">
            <div className="mailset-main">
              <section className={`mailset-card theme-${theme}`}>
                <div className="mailset-card-head">
                  <div>
                    <span className="mailset-eyebrow">Routing</span>
                    <h2>Default Mail Provider</h2>
                    <p>System-generated emails use this provider unless an authorised user explicitly selects another provider.</p>
                  </div>
                  <span className="mailset-source">{data.source === 'database' ? 'Admin setting' : '.env default'}</span>
                </div>
                <div className="mailset-select-row">
                  <SelectInput
                    options={providerOptions}
                    value={form.default_provider}
                    onChange={changeDefaultProvider}
                    placeholder="Select default provider"
                  />
                </div>
              </section>

              <div className="mailset-provider-grid">
                {Object.entries(PROVIDERS).map(([key, provider]) => {
                  const info = data.providers?.[key] || {};
                  const isEnabled = Boolean(form[`${key}_enabled`]);
                  return (
                    <section className={`mailset-card mailset-provider-card theme-${theme}`} key={key}>
                      <div className="mailset-provider-title">
                        <div className="mailset-provider-icon"><i className={`fas ${provider.icon}`} /></div>
                        <div>
                          <h2>{provider.label}</h2>
                          <p>{provider.description}</p>
                        </div>
                        <span className={`mailset-status ${info.configured ? 'ready' : 'missing'}`}>
                          <i className={`fas ${info.configured ? 'fa-circle-check' : 'fa-circle-exclamation'}`} />
                          {info.configured ? 'Configured' : 'Not configured'}
                        </span>
                      </div>

                      <Toggle
                        checked={isEnabled}
                        onChange={(enabled) => setProviderEnabled(key, enabled)}
                        label={`Enable ${provider.label}`}
                        note={isEnabled ? 'Available for application email delivery.' : 'Not available for application email delivery.'}
                      />

                      <div className="mailset-provider-meta">
                        {key === 'zoho' ? (
                          <>
                            <div><span>Host</span><strong>{info.host || '—'}</strong></div>
                            <div><span>Port / security</span><strong>{info.port ? `${info.port} / ${String(info.encryption || '').toUpperCase()}` : '—'}</strong></div>
                          </>
                        ) : (
                          <div><span>API endpoint</span><strong>{info.api_base_url || '—'}</strong></div>
                        )}
                        <div><span>Sender</span><strong>{info.from_address || '—'}</strong></div>
                        {key === 'brevo' && (
                          <>
                            <div><span>Delivery webhook</span><strong className={info.webhook_token_configured ? 'ok' : ''}>{info.webhook_token_configured ? 'Token ready' : 'Token missing'}</strong></div>
                            <div><span>Webhook URL</span><strong>{info.webhook_url || '—'}</strong></div>
                          </>
                        )}
                      </div>

                      {key === 'brevo' && info.webhook_token_configured && (
                        <p className="mailset-provider-note"><i className="fas fa-webhook" /> Configure this URL in Brevo transactional webhooks and send <code>X-Otelex-Webhook-Token</code> with the value stored in the backend environment.</p>
                      )}
                      {!info.configured && info.message && <p className="mailset-provider-warning"><i className="fas fa-circle-info" /> {info.message}</p>}

                      <button
                        type="button"
                        className="mailset-test-btn"
                        onClick={() => testProvider(key)}
                        disabled={testing[key]}
                      >
                        {testing[key] ? <><span className="mailset-spinner small" /> Testing...</> : <><i className="fas fa-plug-circle-check" /> Test {provider.label}</>}
                      </button>
                      <TestResult result={testResults[key]} />
                    </section>
                  );
                })}
              </div>

              <section className={`mailset-card theme-${theme}`}>
                <div className="mailset-card-head compact">
                  <div>
                    <span className="mailset-eyebrow">Resilience</span>
                    <h2>Automatic Fallback</h2>
                    <p>When a system-default send fails with a retryable provider error, Otelex can try the secondary provider.</p>
                  </div>
                </div>

                <Toggle
                  checked={form.fallback_enabled}
                  onChange={setFallbackEnabled}
                  label="Enable automatic fallback"
                  note="Explicit provider selections never fall back automatically, preventing unexpected provider switching."
                />

                {form.fallback_enabled && (
                  <div className="mailset-fallback-select">
                    <label>Fallback provider</label>
                    <SelectInput
                      options={providerOptions.filter((option) => option.value !== form.default_provider && form[`${option.value}_enabled`])}
                      value={form.fallback_provider}
                      onChange={(value) => setForm((current) => ({ ...current, fallback_provider: value }))}
                      placeholder="Select fallback provider"
                    />
                  </div>
                )}
              </section>
            </div>

            <aside className="mailset-sidebar">
              <section className={`mailset-card theme-${theme}`}>
                <h3><i className="fas fa-route" /> Current Routing</h3>
                <div className="mailset-routing-summary">
                  <div><span>Default</span><strong>{PROVIDERS[form.default_provider]?.label}</strong></div>
                  <div><span>Zoho</span><strong className={form.zoho_enabled ? 'ok' : ''}>{form.zoho_enabled ? 'Enabled' : 'Disabled'}</strong></div>
                  <div><span>Brevo</span><strong className={form.brevo_enabled ? 'ok' : ''}>{form.brevo_enabled ? 'Enabled' : 'Disabled'}</strong></div>
                  <div><span>Fallback</span><strong>{form.fallback_enabled ? PROVIDERS[form.fallback_provider]?.label : 'Off'}</strong></div>
                </div>
                <button type="button" className="mailset-save-btn" onClick={save} disabled={saving}>
                  {saving ? <><span className="mailset-spinner" /> Saving...</> : <><i className="fas fa-floppy-disk" /> Save Mail Settings</>}
                </button>
              </section>

              <section className={`mailset-card mailset-help theme-${theme}`}>
                <h3><i className="fas fa-circle-info" /> Configuration</h3>
                <p>Configure Zoho SMTP and the Brevo API key in the backend <code>.env</code>, then return here to enable and test each provider.</p>
                <a href="/admin/mail-diagnostics" onClick={(event) => { event.preventDefault(); window.location.assign('/admin/mail-diagnostics'); }}>
                  Open Mail Diagnostics <i className="fas fa-arrow-right" />
                </a>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailSettings;

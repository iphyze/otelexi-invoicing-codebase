// pages/settings/CompanySettings.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useSettingsStore from '../../stores/useSettingsStore';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import { useNavigate } from 'react-router-dom';
import './CompanySettings.css';
import LogoPlaceHolder from '../../assets/images/otelexi/logo-placeholder.png';

const Section = ({ icon, title, children, theme }) => (
  <div className={`set-section theme-${theme}`}>
    <div className="set-section-header">
      <div className="set-section-icon"><i className={`fas ${icon}`} /></div>
      <h3 className="set-section-title">{title}</h3>
    </div>
    <div className="set-section-body">{children}</div>
  </div>
);

const Field = ({ label, required, hint, error, children }) => (
  <div className="set-field">
    <label className="set-label">
      {label}
      {required && <span className="set-req">*</span>}
      {hint && <span className="set-hint">{hint}</span>}
    </label>
    {children}
    {error && <span className="set-error"><i className="fas fa-circle-exclamation" /> {error}</span>}
  </div>
);

const CompanySettings = () => {
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const { settings, loading, saving, fetchSettings, updateSettings, uploadLogo } = useSettingsStore();

  const [nav, setNav] = useState(false);
  const [form, setFormState] = useState(null);
  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const fileInputRef = useRef(null);

  // Guard: redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      navigate('/profile');
      return;
    }
    document.title = 'Otelex | Company Settings';
    fetchSettings().catch(() => { });
  }, []);

  useEffect(() => {
    if (settings && !form) {
      setFormState({ ...settings });
      if (settings.logo_path) setLogoPreview(settings.logo_path);
    }
  }, [settings]);

  const setField = (key, val) => {
    setFormState((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form?.company_name?.trim()) e.company_name = 'Company name is required.';
    if (!form?.address?.trim()) e.address = 'Address is required.';
    if (!form?.city?.trim()) e.city = 'City is required.';
    if (!form?.state?.trim()) e.state = 'State is required.';
    if (!form?.phone?.trim()) e.phone = 'Phone is required.';
    if (!form?.email?.trim()) e.email = 'Email is required.';
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); showToast('Please fix the errors below.', 'error'); return; }

    try {
      const payload = { ...form };
      delete payload.logo_path; // logo handled separately
      await updateSettings(payload);
      showToast('Company settings saved successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings.', 'error');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Logo must be under 2MB.', 'error'); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type)) { showToast('Only JPG and PNG logos are allowed.', 'error'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    try {
      await uploadLogo(logoFile);
      setLogoFile(null);
      showToast('Logo uploaded successfully.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Logo upload failed.', 'error');
    } finally { setLogoUploading(false); }
  };

  const TABS = [
    { key: 'company', label: 'Company', icon: 'fa-building' },
    { key: 'bank', label: 'Bank Details', icon: 'fa-building-columns' },
    { key: 'legal', label: 'Legal & Branding', icon: 'fa-scale-balanced' },
  ];

  if (loading || !form) {
    return (
      <div className={`main-container theme-${theme}`}>
        <Header setNav={setNav} nav={nav} />
        <NavBar setNav={setNav} nav={nav} />
        <div className="page-content">
          <PageNav pageTitle="Company Settings" links={[{ label: 'Dashboard', to: '/' }, { label: 'Settings', active: true }]} />
          <div className="set-loading">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`set-shimmer theme-${theme}`} style={{ width: `${50 + i * 10}%`, height: 18, marginBottom: 14 }} />
            ))}
          </div>
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
          pageTitle="Company Settings"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'Settings', active: true }]}
        />

        {/* Admin-only notice */}
        <div className={`set-admin-notice theme-${theme}`}>
          <i className="fas fa-shield-halved" />
          <span>These settings apply globally to all documents (invoices, quotations, proformas). Only Admins can modify them.</span>
        </div>

        {/* Tabs */}
        <div className={`set-tabs theme-${theme}`}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`set-tab ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`fas ${tab.icon}`} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="set-layout">
          <div className="set-main">

            {/* ── Company Tab ── */}
            {activeTab === 'company' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <Section icon="fa-building" title="Company Information" theme={theme}>
                  <div className="set-grid-2">
                    <Field label="Company Name" required error={errors.company_name}>
                      <input className={`set-input theme-${theme} ${errors.company_name ? 'has-error' : ''}`}
                        placeholder="e.g. Otelex Ltd" value={form.company_name || ''}
                        onChange={(e) => setField('company_name', e.target.value)} />
                    </Field>
                    <Field label="Website" hint="Optional">
                      <input className={`set-input theme-${theme}`}
                        placeholder="e.g. www.otelexng.com" value={form.website || ''}
                        onChange={(e) => setField('website', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Address" required error={errors.address}>
                    <textarea className={`set-input set-textarea theme-${theme} ${errors.address ? 'has-error' : ''}`}
                      placeholder="Full street address..." rows={2} value={form.address || ''}
                      onChange={(e) => setField('address', e.target.value)} />
                  </Field>
                  <div className="set-grid-3">
                    <Field label="City" required error={errors.city}>
                      <input className={`set-input theme-${theme} ${errors.city ? 'has-error' : ''}`}
                        placeholder="e.g. Lagos" value={form.city || ''}
                        onChange={(e) => setField('city', e.target.value)} />
                    </Field>
                    <Field label="State" required error={errors.state}>
                      <input className={`set-input theme-${theme} ${errors.state ? 'has-error' : ''}`}
                        placeholder="e.g. Lagos State" value={form.state || ''}
                        onChange={(e) => setField('state', e.target.value)} />
                    </Field>
                    <Field label="Country">
                      <input className={`set-input theme-${theme}`}
                        placeholder="e.g. Nigeria" value={form.country || ''}
                        onChange={(e) => setField('country', e.target.value)} />
                    </Field>
                  </div>
                  <div className="set-grid-2">
                    <Field label="Phone" required error={errors.phone}>
                      <input className={`set-input theme-${theme} ${errors.phone ? 'has-error' : ''}`}
                        placeholder="+234 ..." value={form.phone || ''}
                        onChange={(e) => setField('phone', e.target.value)} />
                    </Field>
                    <Field label="Email" required error={errors.email}>
                      <input type="email" className={`set-input theme-${theme} ${errors.email ? 'has-error' : ''}`}
                        placeholder="info@company.com" value={form.email || ''}
                        onChange={(e) => setField('email', e.target.value)} />
                    </Field>
                  </div>
                  <Field label="VAT / TIN Number" hint="Optional">
                    <input className={`set-input theme-${theme}`}
                      placeholder="e.g. 12345678-0001" value={form.vat_number || ''}
                      onChange={(e) => setField('vat_number', e.target.value)} />
                  </Field>
                </Section>
              </motion.div>
            )}

            {/* ── Bank Details Tab ── */}
            {activeTab === 'bank' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <Section icon="fa-building-columns" title="Bank Details" theme={theme}>
                  <p className="set-section-note">
                    <i className="fas fa-circle-info" /> These details appear on all invoices and quotations sent to clients.
                  </p>
                  <div className="set-grid-2">
                    <Field label="Bank Name">
                      <input className={`set-input theme-${theme}`}
                        placeholder="e.g. ABC Bank Limited" value={form.bank_name || ''}
                        onChange={(e) => setField('bank_name', e.target.value)} />
                    </Field>
                    <Field label="Branch">
                      <input className={`set-input theme-${theme}`}
                        placeholder="e.g. Victoria Island Branch" value={form.bank_branch || ''}
                        onChange={(e) => setField('bank_branch', e.target.value)} />
                    </Field>
                  </div>
                  <div className="set-grid-2">
                    <Field label="Account Name">
                      <input className={`set-input theme-${theme}`}
                        placeholder="e.g. Otelex Ltd" value={form.account_name || ''}
                        onChange={(e) => setField('account_name', e.target.value)} />
                    </Field>
                    <Field label="Account Number">
                      <input className={`set-input theme-${theme}`}
                        placeholder="e.g. 1234567890" value={form.account_number || ''}
                        onChange={(e) => setField('account_number', e.target.value)} />
                    </Field>
                  </div>
                </Section>
              </motion.div>
            )}

            {/* ── Legal & Branding Tab ── */}
            {activeTab === 'legal' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <Section icon="fa-image" title="Company Logo" theme={theme}>
                  <p className="set-section-note">
                    <i className="fas fa-circle-info" /> Max 2MB · JPG or PNG only · Displayed on PDF documents.
                  </p>
                  <div className="set-logo-area">
                    <div className={`set-logo-preview theme-${theme}`}>
                      {logoPreview
                        ? <img src={logoPreview} alt="Company logo" className="set-logo-img" />
                        : <div className="set-logo-placeholder"><i className="fas fa-image" /><span>No logo uploaded</span></div>
                      }
                    </div>
                    <div className="set-logo-actions">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        className="set-file-hidden"
                        onChange={handleLogoChange}
                      />
                      <button type="button" className={`set-logo-select theme-${theme}`} onClick={() => fileInputRef.current?.click()}>
                        <i className="fas fa-upload" /> Choose Logo
                      </button>
                      {logoFile && (
                        <button type="button" className="set-logo-upload-btn" onClick={handleLogoUpload} disabled={logoUploading}>
                          {logoUploading ? <><span className="set-spinner" /> Uploading...</> : <><i className="fas fa-cloud-arrow-up" /> Upload Now</>}
                        </button>
                      )}
                      {logoFile && <p className="set-logo-filename"><i className="fas fa-file-image" /> {logoFile.name}</p>}
                    </div>
                  </div>
                </Section>

                <Section icon="fa-scale-balanced" title="Legal Footer" theme={theme}>
                  <Field label="Legal Footer Text" hint="Appears at the bottom of all documents">
                    <textarea
                      className={`set-input set-textarea theme-${theme}`}
                      placeholder="e.g. Goods sold are not returnable unless defective. E&OE."
                      rows={4}
                      value={form.legal_footer || ''}
                      onChange={(e) => setField('legal_footer', e.target.value)}
                    />
                  </Field>
                  <p className="set-char-count">{(form.legal_footer || '').length} characters</p>
                </Section>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="set-sidebar">
            <div className={`set-save-card theme-${theme}`}>
              <h4 className="set-save-title"><i className="fas fa-floppy-disk" /> Save Changes</h4>
              <p className="set-save-note">Changes are applied immediately to all new documents.</p>

              {settings && (
                <div className="set-last-updated">
                  <i className="fas fa-clock" />
                  <span>Last updated: {settings.updated_at
                    ? new Date(settings.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Never'
                  }</span>
                </div>
              )}

              <button className="set-save-btn" onClick={handleSave} disabled={saving} type="button">
                {saving ? <><span className="set-spinner" /> Saving...</> : <><i className="fas fa-floppy-disk" /> Save Settings</>}
              </button>

              <div className="set-quick-info">
                <div className="set-qi-row">
                  <span>Company</span>
                  <span>{form.company_name || '—'}</span>
                </div>
                <div className="set-qi-row">
                  <span>Email</span>
                  <span>{form.email || '—'}</span>
                </div>
                <div className="set-qi-row">
                  <span>Bank</span>
                  <span>{form.bank_name || '—'}</span>
                </div>
                <div className="set-qi-row">
                  <span>Account #</span>
                  <span>{form.account_number || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySettings;

// pages/users/Profile.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useAuthStore from '../../stores/useAuthStore';
import useUserStore from '../../stores/useUserStore';
import useToastStore from '../../stores/useToastStore';
import './Profile.css';

const ROLE_META = {
  super_admin: { label: 'Super Administrator', icon: 'fa-crown', color: '#2563eb' },
  admin:      { label: 'Administrator', icon: 'fa-shield-halved', color: '#8b5cf6' },
  sales:      { label: 'Sales Staff',   icon: 'fa-handshake',     color: '#3b82f6' },
  accounting: { label: 'Accounting',    icon: 'fa-calculator',    color: '#10b981' },
};

const Profile = () => {
  const { theme } = useThemeStore();
  const { user: me, logout } = useAuthStore();
  const { showToast } = useToastStore();
  const { updateProfile } = useUserStore();
  const navigate = useNavigate();

  const [nav, setNav] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setFormState] = useState({
    currentPassword: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => { document.title = 'Otelex | My Profile'; }, []);

  const set = (key, val) => {
    setFormState((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.currentPassword) e.currentPassword = 'Current password is required.';
    if (!form.password)        e.password = 'New password is required.';
    if (form.password && form.password.length < 8) e.password = 'Minimum 8 characters.';
    if (form.password && !/[^a-zA-Z0-9]/.test(form.password)) e.password = 'Must contain a special character.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const res = await updateProfile({ currentPassword: form.currentPassword, password: form.password });
      showToast(res.message || 'Password updated successfully. Please sign in again.', 'success');
      setFormState({ currentPassword: '', password: '', confirmPassword: '' });
      setErrors({});

      if (res.data?.requires_reauthentication) {
        await logout({ callApi: false });
        navigate('/login', { replace: true });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update password.', 'error');
    } finally { setSaving(false); }
  };

  const roleMeta = ROLE_META[me?.role] || {};
  const initials = me?.name?.split(' ').slice(0,2).map((n) => n[0]).join('').toUpperCase();
  const fmtDate  = (d) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';

  return (
    <div className={`main-container theme-${theme}`}>
      <Header setNav={setNav} nav={nav} />
      <NavBar setNav={setNav} nav={nav} />

      <div className="page-content">
        <PageNav
          pageTitle="My Profile"
          links={[{ label: 'Dashboard', to: '/' }, { label: 'My Profile', active: true }]}
        />

        <div className="pro-layout">

          {/* ── Profile card ── */}
          <motion.div
            className={`pro-card theme-${theme}`}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          >
            {/* Avatar */}
            <div className="pro-avatar-section">
              <div className="pro-avatar" style={{ background: `linear-gradient(135deg, ${roleMeta.color || '#1a56db'}, ${roleMeta.color || '#1e3a8a'}88)` }}>
                {initials}
              </div>
              <div className="pro-avatar-info">
                <h2 className="pro-name">{me?.name}</h2>
                <span className="pro-role-badge" style={{ color: roleMeta.color, background: `${roleMeta.color}18` }}>
                  <i className={`fas ${roleMeta.icon}`} /> {roleMeta.label}
                </span>
              </div>
            </div>

            <div className="pro-divider" />

            {/* Account info */}
            <div className="pro-info-section">
              <h4 className="pro-section-title"><i className="fas fa-circle-info" /> Account Information</h4>
              <div className="pro-info-list">
                {[
                  { icon: 'fa-user',         label: 'Full Name',   value: me?.name },
                  { icon: 'fa-envelope',      label: 'Email',       value: me?.email },
                  { icon: 'fa-shield-halved', label: 'Role',        value: roleMeta.label },
                  { icon: 'fa-clock',         label: 'Last Login',  value: fmtDate(me?.last_login) },
                  { icon: 'fa-calendar',      label: 'Member Since',value: me?.created_at ? new Date(me.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                ].map((row) => (
                  <div key={row.label} className="pro-info-row">
                    <div className="pro-info-icon"><i className={`fas ${row.icon}`} /></div>
                    <div className="pro-info-body">
                      <span className="pro-info-label">{row.label}</span>
                      <span className="pro-info-value">{row.value || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Password change ── */}
          <motion.div
            className={`pro-card theme-${theme}`}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }}
          >
            <div className="pro-pw-header">
              <div className="pro-pw-icon"><i className="fas fa-lock" /></div>
              <div>
                <h3 className="pro-pw-title">Change Password</h3>
                <p className="pro-pw-sub">Secure your account with a strong password.</p>
              </div>
            </div>

            <div className="pro-pw-rules">
              <span><i className="fas fa-check" /> At least 8 characters</span>
              <span><i className="fas fa-check" /> One special character (@, #, _, etc.)</span>
            </div>

            <div className="pro-form">
              {/* Current password */}
              <div className="pro-field">
                <label className="pro-label">Current Password <span className="pro-req">*</span></label>
                <div className="pro-pw-wrap">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className={`pro-input theme-${theme} ${errors.currentPassword ? 'has-error' : ''}`}
                    placeholder="Your current password"
                    value={form.currentPassword}
                    onChange={(e) => set('currentPassword', e.target.value)}
                  />
                  <button type="button" className="pro-pw-eye" onClick={() => setShowCurrent((v) => !v)}>
                    <i className={`fas ${showCurrent ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
                {errors.currentPassword && <span className="pro-error"><i className="fas fa-circle-exclamation" /> {errors.currentPassword}</span>}
              </div>

              {/* New password */}
              <div className="pro-field">
                <label className="pro-label">New Password <span className="pro-req">*</span></label>
                <div className="pro-pw-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className={`pro-input theme-${theme} ${errors.password ? 'has-error' : ''}`}
                    placeholder="Min. 8 chars + special character"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                  />
                  <button type="button" className="pro-pw-eye" onClick={() => setShowNew((v) => !v)}>
                    <i className={`fas ${showNew ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
                {errors.password && <span className="pro-error"><i className="fas fa-circle-exclamation" /> {errors.password}</span>}
                {form.password && !errors.password && (
                  <div className="pro-pw-strength">
                    <div className={`pro-strength-bar ${form.password.length >= 12 && /[^a-zA-Z0-9]/.test(form.password) ? 'strong' : form.password.length >= 8 ? 'medium' : 'weak'}`} />
                    <span>{form.password.length >= 12 && /[^a-zA-Z0-9]/.test(form.password) ? 'Strong' : form.password.length >= 8 ? 'Fair' : 'Too short'}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="pro-field">
                <label className="pro-label">Confirm New Password <span className="pro-req">*</span></label>
                <div className="pro-pw-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className={`pro-input theme-${theme} ${errors.confirmPassword ? 'has-error' : ''}`}
                    placeholder="Repeat your new password"
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                  />
                  <button type="button" className="pro-pw-eye" onClick={() => setShowConfirm((v) => !v)}>
                    <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
                {errors.confirmPassword && <span className="pro-error"><i className="fas fa-circle-exclamation" /> {errors.confirmPassword}</span>}
                {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword && (
                  <span className="pro-match"><i className="fas fa-circle-check" /> Passwords match</span>
                )}
              </div>

              <button className="pro-save-btn" onClick={handleSave} disabled={saving} type="button">
                {saving ? <><span className="pro-spinner" /> Updating...</> : <><i className="fas fa-lock" /> Update Password</>}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

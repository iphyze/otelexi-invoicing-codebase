// pages/users/UserModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../stores/useThemeStore';
import useUserStore from '../../stores/useUserStore';

const ROLE_OPTS = [
  { value: 'super_admin', label: 'Super Admin', icon: 'fa-crown', desc: 'Full access, security settings and financial reversals.' },
  { value: 'admin', label: 'Admin', icon: 'fa-shield-halved', desc: 'Daily operations without user, settings or reversal control.' },
  { value: 'sales', label: 'Sales', icon: 'fa-handshake', desc: 'Clients and sales document workflows.' },
  { value: 'accounting', label: 'Accounting', icon: 'fa-calculator', desc: 'Payments, receipts, reminders and reports.' },
];

const UserModal = ({ open, user, onClose, onSuccess }) => {
  const { theme } = useThemeStore();
  const { createUser, editUser } = useUserStore();
  const isEdit = !!user;

  const [mounted, setMounted] = useState(false);
  const [active, setActive]   = useState(false);
  const timer = useRef(null);

  const [form, setFormState] = useState({ name: '', email: '', password: '', role: 'sales', is_active: 1 });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      clearTimeout(timer.current);
      setFormState(isEdit
        ? { name: user.name, email: user.email, password: '', role: user.role, is_active: user.is_active }
        : { name: '', email: '', password: '', role: 'sales', is_active: 1 }
      );
      setErrors({});
      setShowPassword(false);
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
      setTimeout(() => nameRef.current?.focus(), 120);
    } else {
      setActive(false);
    }
  }, [open]);

  useEffect(() => {
    if (mounted && !active) {
      timer.current = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer.current);
    }
  }, [active, mounted]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, saving]);

  const set = (key, val) => {
    setFormState((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name = 'Name is required.';
    if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters.';
    if (!form.email.trim()) e.email = 'Email is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email format.';
    if (!isEdit || form.password) {
      if (!isEdit && !form.password) e.password = 'Password is required.';
      if (form.password && form.password.length < 12) e.password = 'Password must be at least 12 characters.';
      const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((rx) => rx.test(form.password)).length;
      if (form.password && form.password.length < 16 && classes < 3) e.password = 'Use at least 3 character types, or a 16+ character passphrase.';
    }
    if (!form.role) e.role = 'Please select a role.';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const payload = { id: user.id, name: form.name, email: form.email, role: form.role, is_active: Number(form.is_active) };
        if (form.password) payload.password = form.password;
        const res = await editUser(payload);
        onSuccess(res.message || 'User updated successfully.');
      } else {
        const res = await createUser({ name: form.name, email: form.email, password: form.password, role: form.role, is_active: Number(form.is_active) });
        onSuccess(res.message || 'User created successfully.');
      }
      onClose();
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Something went wrong.' });
    } finally { setSaving(false); }
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`so-backdrop ${active ? 'so-visible' : ''}`} onClick={() => !saving && onClose()}>
      <div className={`so-panel um-panel theme-${theme} ${active ? 'so-panel-in' : 'so-panel-out'}`} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="so-header">
          <div>
            <h3 className="so-title">{isEdit ? 'Edit User' : 'New User'}</h3>
            <p className="so-subtitle">{isEdit ? `Editing ${user.name}` : 'Create a new system user account.'}</p>
          </div>
          <button className="so-close" onClick={onClose} disabled={saving} type="button">
            <i className="fas fa-xmark" />
          </button>
        </div>

        <div className="so-body um-body">
          {errors._global && (
            <div className="um-global-error"><i className="fas fa-circle-exclamation" /> {errors._global}</div>
          )}

          {/* Name */}
          <div className="um-field">
            <label className="um-label">Full Name <span className="um-req">*</span></label>
            <input
              ref={nameRef}
              className={`um-input theme-${theme} ${errors.name ? 'has-error' : ''}`}
              placeholder="e.g. Adebayo Johnson"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
            {errors.name && <span className="um-error"><i className="fas fa-circle-exclamation" /> {errors.name}</span>}
          </div>

          {/* Email */}
          <div className="um-field">
            <label className="um-label">Email Address <span className="um-req">*</span></label>
            <input
              type="email"
              className={`um-input theme-${theme} ${errors.email ? 'has-error' : ''}`}
              placeholder="user@otelexng.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
            />
            {errors.email && <span className="um-error"><i className="fas fa-circle-exclamation" /> {errors.email}</span>}
          </div>

          {/* Password */}
          <div className="um-field">
            <label className="um-label">
              Password {isEdit && <span className="um-hint">Leave blank to keep current</span>}
              {!isEdit && <span className="um-req">*</span>}
            </label>
            <div className="um-password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`um-input theme-${theme} ${errors.password ? 'has-error' : ''}`}
                placeholder={isEdit ? 'Enter new password to change...' : 'Min. 12 chars; strong passphrase recommended'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
              <button type="button" className="um-toggle-pw" onClick={() => setShowPassword((v) => !v)}>
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            {errors.password && <span className="um-error"><i className="fas fa-circle-exclamation" /> {errors.password}</span>}
            {!isEdit && (
              <p className="um-pw-hint">Use at least 12 characters and 3 character types, or a passphrase of 16+ characters.</p>
            )}
          </div>

          {/* Role */}
          <div className="um-field">
            <label className="um-label">Role <span className="um-req">*</span></label>
            <div className="um-role-grid">
              {ROLE_OPTS.map((r) => (
                <button
                  key={r.value} type="button"
                  className={`um-role-btn theme-${theme} ${form.role === r.value ? 'is-active' : ''}`}
                  onClick={() => set('role', r.value)}
                >
                  <i className={`fas ${r.icon}`} />
                  <strong>{r.label}</strong>
                  <span>{r.desc}</span>
                </button>
              ))}
            </div>
            {errors.role && <span className="um-error"><i className="fas fa-circle-exclamation" /> {errors.role}</span>}
          </div>

          {/* Status toggle */}
          <div className="um-field">
            <label className="um-label">Account Status</label>
            <div className="um-status-toggle">
              <button
                type="button"
                className={`um-status-btn ${form.is_active ? 'is-active' : ''} theme-${theme}`}
                onClick={() => set('is_active', form.is_active ? 0 : 1)}
              >
                <div className="um-status-track">
                  <div className="um-status-thumb" />
                </div>
                <span>{form.is_active ? 'Active — user can log in' : 'Inactive — user cannot log in'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="um-footer">
          <button className="um-btn um-cancel" onClick={onClose} disabled={saving} type="button">Cancel</button>
          <button className="um-btn um-submit" onClick={handleSubmit} disabled={saving} type="button">
            {saving
              ? <><span className="um-spinner" /> {isEdit ? 'Saving...' : 'Creating...'}</>
              : <><i className={`fas ${isEdit ? 'fa-floppy-disk' : 'fa-user-plus'}`} /> {isEdit ? 'Save Changes' : 'Create User'}</>
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default UserModal;

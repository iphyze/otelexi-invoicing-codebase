// pages/users/Profile.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NavBar from '../../components/NavBar';
import Header from '../../components/Header';
import PageNav from '../../components/PageNav';
import useThemeStore from '../../stores/useThemeStore';
import useAuthStore from '../../stores/useAuthStore';
import useUserStore from '../../stores/useUserStore';
import useToastStore from '../../stores/useToastStore';
import ConfirmModal from '../../components/modals/ConfirmModal';
import OtpInput from '../../components/inputs/OtpInput';
import authSessionService from '../../services/authSessionService';
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [nav, setNav] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setFormState] = useState({
    currentPassword: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [maxDevices, setMaxDevices] = useState(2);
  const [sessionAction, setSessionAction] = useState(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [mfaStatus, setMfaStatus] = useState({ loading: true, emailEnabled: false, maskedEmail: '' });
  const [mfaDialog, setMfaDialog] = useState(null);
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaResending, setMfaResending] = useState(false);
  const [mfaResendSeconds, setMfaResendSeconds] = useState(0);

  useEffect(() => { document.title = 'Otelex | My Profile'; }, []);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await authSessionService.getSessions();
      const data = response.data?.data || {};
      const ordered = [...(data.sessions || [])].sort((a, b) => Number(b.current) - Number(a.current));
      setSessions(ordered);
      setMaxDevices(Number(data.max_devices) || 2);
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to load active devices.', 'error');
    } finally {
      setSessionsLoading(false);
    }
  };

  const loadMfaStatus = async () => {
    setMfaStatus((current) => ({ ...current, loading: true }));
    try {
      const response = await authSessionService.getMfaStatus();
      const data = response.data?.data || {};
      setMfaStatus({
        loading: false,
        emailEnabled: Boolean(data.email_enabled),
        maskedEmail: data.masked_email || '',
      });
    } catch (error) {
      setMfaStatus((current) => ({ ...current, loading: false }));
      showToast(error.response?.data?.message || 'Unable to load email verification settings.', 'error');
    }
  };

  useEffect(() => {
    if (me?.id) {
      loadSessions();
      loadMfaStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id]);

  useEffect(() => {
    if (mfaDialog?.stage !== 'code' || mfaResendSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setMfaResendSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [mfaDialog?.stage, mfaResendSeconds]);

  const set = (key, val) => {
    setFormState((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.currentPassword) e.currentPassword = 'Current password is required.';
    if (!form.password)        e.password = 'New password is required.';
    if (form.password && form.password.length < 12) e.password = 'Minimum 12 characters.';
    const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((rx) => rx.test(form.password)).length;
    if (form.password && form.password.length < 16 && classes < 3) e.password = 'Use at least 3 character types, or a 16+ character passphrase.';
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

  const handleSessionAction = async () => {
    if (!sessionAction) return;
    setSessionActionLoading(true);
    try {
      const response = sessionAction.type === 'others'
        ? await authSessionService.revokeOtherSessions()
        : await authSessionService.revokeSession(sessionAction.session.session_key);

      showToast(response.data?.message || 'Device signed out successfully.', 'success');
      setSessionAction(null);
      await loadSessions();
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to sign out the selected device.', 'error');
    } finally {
      setSessionActionLoading(false);
    }
  };

  const closeMfaDialog = () => {
    if (mfaLoading || mfaResending) return;
    setMfaDialog(null);
    setMfaPassword('');
    setMfaCode('');
    setMfaResendSeconds(0);
  };

  const openMfaDialog = (action) => {
    setMfaPassword('');
    setMfaCode('');
    setMfaDialog({ stage: 'password', action });
  };

  useEffect(() => {
    if (searchParams.get('setupMfa') !== '1' || mfaStatus.loading) return;

    if (!mfaStatus.emailEnabled) {
      openMfaDialog('enable');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('setupMfa');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mfaStatus.loading, mfaStatus.emailEnabled]);

  const startMfaChange = async () => {
    if (!mfaDialog?.action || !mfaPassword) {
      showToast('Enter your current password to continue.', 'warning');
      return;
    }

    setMfaLoading(true);
    try {
      const response = await authSessionService.startMfaSetup(mfaDialog.action, mfaPassword);
      const data = response.data?.data || {};
      setMfaDialog({
        stage: 'code',
        action: mfaDialog.action,
        challenge: data.mfa_challenge,
        maskedEmail: data.masked_email || mfaStatus.maskedEmail,
      });
      setMfaPassword('');
      setMfaCode('');
      setMfaResendSeconds(Number(data.resend_after) || 60);
      showToast(response.data?.message || 'Verification code sent.', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to start this security change.', 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyMfaChange = async () => {
    const code = mfaCode.replace(/\D/g, '').slice(0, 6);
    if (!mfaDialog?.challenge || code.length !== 6) {
      showToast('Enter the 6-digit verification code.', 'warning');
      return;
    }

    setMfaLoading(true);
    try {
      const response = await authSessionService.verifyMfaSetup(mfaDialog.action, mfaDialog.challenge, code);
      const data = response.data?.data || {};
      setMfaStatus({
        loading: false,
        emailEnabled: Boolean(data.email_enabled),
        maskedEmail: data.masked_email || mfaStatus.maskedEmail,
      });
      showToast(response.data?.message || 'Email verification settings updated.', 'success');
      setMfaDialog(null);
      setMfaPassword('');
      setMfaCode('');
      setMfaResendSeconds(0);
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to verify the code.', 'error');
    } finally {
      setMfaLoading(false);
    }
  };

  const resendMfaChangeCode = async () => {
    if (!mfaDialog?.challenge || mfaResendSeconds > 0 || mfaResending) return;
    setMfaResending(true);
    try {
      const response = await authSessionService.resendMfaCode(mfaDialog.challenge);
      const data = response.data?.data || {};
      setMfaCode('');
      setMfaResendSeconds(Number(data.resend_after) || 60);
      showToast(response.data?.message || 'A new verification code has been sent.', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to resend the verification code.', 'error');
    } finally {
      setMfaResending(false);
    }
  };

  const deviceIcon = (type) => {
    if (type === 'mobile') return 'fa-mobile-screen-button';
    if (type === 'tablet') return 'fa-tablet-screen-button';
    return 'fa-desktop';
  };

  const formatSessionDate = (value) => {
    if (!value) return 'Unknown';
    const parsed = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
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
              <span><i className="fas fa-check" /> At least 12 characters</span>
              <span><i className="fas fa-check" /> 3 character types, or a 16+ character passphrase</span>
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
                    placeholder="Min. 12 chars; strong passphrase recommended"
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
                    <div className={`pro-strength-bar ${form.password.length >= 16 ? 'strong' : form.password.length >= 12 ? 'medium' : 'weak'}`} />
                    <span>{form.password.length >= 16 ? 'Strong' : form.password.length >= 12 ? 'Fair' : 'Too short'}</span>
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

          <motion.div
            className={`pro-card pro-mfa-card theme-${theme}`}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className="pro-mfa-head">
              <div className="pro-pw-header pro-session-heading">
                <div className="pro-pw-icon"><i className="fas fa-envelope-circle-check" /></div>
                <div>
                  <h3 className="pro-pw-title">Email Multi-Factor Authentication</h3>
                  <p className="pro-pw-sub">Require a one-time email code after your password when signing in.</p>
                </div>
              </div>
              <span className={`pro-mfa-status ${mfaStatus.emailEnabled ? 'enabled' : 'disabled'}`}>
                <i className={`fas ${mfaStatus.emailEnabled ? 'fa-circle-check' : 'fa-circle'}`} />
                {mfaStatus.loading ? 'Checking...' : mfaStatus.emailEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <div className="pro-mfa-body">
              <div className="pro-mfa-copy">
                <strong>{mfaStatus.emailEnabled ? 'Extra sign-in protection is active' : 'Add an extra sign-in step'}</strong>
                <span>
                  {mfaStatus.emailEnabled
                    ? `Verification codes will be sent to ${mfaStatus.maskedEmail || 'your account email'}.`
                    : `When enabled, a 6-digit code will be sent to ${mfaStatus.maskedEmail || 'your account email'} after your password is accepted.`}
                </span>
              </div>
              <button
                type="button"
                className={`pro-mfa-action ${mfaStatus.emailEnabled ? 'disable' : 'enable'}`}
                onClick={() => openMfaDialog(mfaStatus.emailEnabled ? 'disable' : 'enable')}
                disabled={mfaStatus.loading}
              >
                <i className={`fas ${mfaStatus.emailEnabled ? 'fa-shield-halved' : 'fa-shield'}`} />
                {mfaStatus.emailEnabled ? 'Disable Email MFA' : 'Enable Email MFA'}
              </button>
            </div>
            <div className="pro-mfa-foot">
              <i className="fas fa-circle-info" /> Your current password and an email verification code are required to change this setting.
            </div>
          </motion.div>

          <motion.div
            className={`pro-card pro-session-card theme-${theme}`}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}
          >
            <div className="pro-session-head">
              <div className="pro-pw-header pro-session-heading">
                <div className="pro-pw-icon"><i className="fas fa-laptop-file" /></div>
                <div>
                  <h3 className="pro-pw-title">Active Sessions</h3>
                  <p className="pro-pw-sub">Your account can be active on up to {maxDevices} devices at the same time.</p>
                </div>
              </div>
              <button
                type="button"
                className="pro-session-all-btn"
                onClick={() => setSessionAction({ type: 'others' })}
                disabled={sessionsLoading || sessions.filter((session) => !session.current).length === 0}
              >
                <i className="fas fa-right-from-bracket" /> Sign out other devices
              </button>
            </div>

            {sessionsLoading ? (
              <div className="pro-session-loading"><span className="pro-spinner" /> Loading active devices...</div>
            ) : sessions.length === 0 ? (
              <div className="pro-session-empty"><i className="fas fa-shield-halved" /> No active sessions found.</div>
            ) : (
              <div className="pro-session-list">
                {sessions.map((session) => (
                  <div key={session.session_key} className={`pro-session-row ${session.current ? 'current' : ''}`}>
                    <div className="pro-session-device-icon">
                      <i className={`fas ${deviceIcon(session.device_type)}`} />
                    </div>
                    <div className="pro-session-copy">
                      <div className="pro-session-name-line">
                        <strong>{session.device_name || 'Active device'}</strong>
                        {session.current && <span className="pro-session-current"><i className="fas fa-circle-check" /> This device</span>}
                      </div>
                      <span>{session.ip_address || 'Unknown IP'} · Last active {formatSessionDate(session.last_activity_at)}</span>
                      <small>Signed in {formatSessionDate(session.signed_in_at)}</small>
                    </div>
                    {!session.current && (
                      <button
                        type="button"
                        className="pro-session-revoke-btn"
                        onClick={() => setSessionAction({ type: 'single', session })}
                      >
                        Sign out
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <ConfirmModal
        open={mfaDialog?.stage === 'password'}
        onClose={closeMfaDialog}
        onCancel={closeMfaDialog}
        onConfirm={startMfaChange}
        title={mfaDialog?.action === 'disable' ? 'Disable email MFA?' : 'Enable email MFA?'}
        message="Confirm your current password before we send a verification code to your account email."
        confirmText="Send verification code"
        cancelText="Cancel"
        variant={mfaDialog?.action === 'disable' ? 'warning' : 'primary'}
        loading={mfaLoading}
        closeOnBackdrop={!mfaLoading}
        extraContent={(
          <div className="pro-mfa-modal-field">
            <label htmlFor="mfa-current-password">Current Password</label>
            <input
              id="mfa-current-password"
              type="password"
              value={mfaPassword}
              onChange={(e) => setMfaPassword(e.target.value)}
              placeholder="Enter your current password"
              autoComplete="current-password"
              disabled={mfaLoading}
            />
          </div>
        )}
      />

      <ConfirmModal
        open={mfaDialog?.stage === 'code'}
        onClose={closeMfaDialog}
        onCancel={closeMfaDialog}
        onConfirm={verifyMfaChange}
        title="Verify your email"
        message={`Enter the 6-digit code sent to ${mfaDialog?.maskedEmail || 'your account email'}.`}
        confirmText={mfaDialog?.action === 'disable' ? 'Verify & disable' : 'Verify & enable'}
        cancelText="Cancel"
        variant="primary"
        loading={mfaLoading}
        closeOnBackdrop={!mfaLoading && !mfaResending}
        extraContent={(
          <div className="pro-mfa-modal-code">
            <OtpInput
              value={mfaCode}
              onChange={setMfaCode}
              autoFocus
              disabled={mfaLoading}
              ariaLabel="Email MFA verification code"
            />
            <button
              type="button"
              onClick={resendMfaChangeCode}
              disabled={mfaResending || mfaResendSeconds > 0 || mfaLoading}
            >
              {mfaResending ? 'Sending...' : mfaResendSeconds > 0 ? `Resend in ${mfaResendSeconds}s` : 'Resend code'}
            </button>
          </div>
        )}
      />

      <ConfirmModal
        open={Boolean(sessionAction)}
        onClose={() => setSessionAction(null)}
        onCancel={() => setSessionAction(null)}
        onConfirm={handleSessionAction}
        title={sessionAction?.type === 'others' ? 'Sign out other devices?' : 'Sign out this device?'}
        message={sessionAction?.type === 'others'
          ? 'Every other active Otelex session will be revoked. This device will stay signed in.'
          : `${sessionAction?.session?.device_name || 'This device'} will need to sign in again.`}
        confirmText="Sign out"
        cancelText="Cancel"
        variant="warning"
        loading={sessionActionLoading}
      />
    </div>
  );
};

export default Profile;

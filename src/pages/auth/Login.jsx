import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import AuthShell from '../../components/auth/AuthShell';
import ConfirmModal from '../../components/modals/ConfirmModal';
import OtpInput from '../../components/inputs/OtpInput';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import useThemeStore from '../../stores/useThemeStore';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyEmailMfa, resendEmailMfa, replaceDeviceForLogin } = useAuthStore();
  const { showToast } = useToastStore();
  const { theme } = useThemeStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState(null);
  const [selectedSessionKey, setSelectedSessionKey] = useState('');
  const [replacingDevice, setReplacingDevice] = useState(false);

  const [mfaState, setMfaState] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [verifyingMfa, setVerifyingMfa] = useState(false);
  const [resendingMfa, setResendingMfa] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true });
    document.title = 'Otelex | Login';
  }, []);

  useEffect(() => {
    if (!mfaState) {
      setResendSeconds(0);
      return undefined;
    }

    setResendSeconds(Number(mfaState.resendAfter) || 60);
    const timer = window.setInterval(() => {
      setResendSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mfaState]);

  const validate = () => {
    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Please enter a valid email address.';

    if (!form.password) nextErrors.password = 'Password is required.';
    else if (form.password.length < 6) nextErrors.password = 'Password must be at least 6 characters.';

    return nextErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    const result = await login(form.email.trim(), form.password);
    setLoading(false);

    if (result.success) {
      showToast('Welcome back!', 'success');
      navigate('/');
      return;
    }

    if (result.mfaRequired) {
      setForm((current) => ({ ...current, password: '' }));
      setMfaState({
        challenge: result.mfaChallenge,
        maskedEmail: result.maskedEmail,
        expiresIn: result.expiresIn,
        resendAfter: result.resendAfter,
      });
      setMfaCode('');
      setMfaError('');
      return;
    }

    if (result.deviceLimit) {
      setDeviceLimit(result);
      setSelectedSessionKey(result.sessions?.[0]?.session_key || '');
      return;
    }

    showToast(result.error, 'error');
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    const code = mfaCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6 || !mfaState?.challenge) {
      setMfaError('Enter the 6-digit verification code.');
      return;
    }

    setVerifyingMfa(true);
    setMfaError('');
    const result = await verifyEmailMfa(mfaState.challenge, code);
    setVerifyingMfa(false);

    if (result.success) {
      showToast('Verification successful. Welcome back!', 'success');
      navigate('/');
      return;
    }

    if (result.deviceLimit) {
      setMfaState(null);
      setMfaCode('');
      setDeviceLimit(result);
      setSelectedSessionKey(result.sessions?.[0]?.session_key || '');
      return;
    }

    setMfaError(result.error || 'Unable to verify the code.');
  };

  const handleMfaResend = async () => {
    if (!mfaState?.challenge || resendSeconds > 0 || resendingMfa) return;

    setResendingMfa(true);
    const result = await resendEmailMfa(mfaState.challenge);
    setResendingMfa(false);

    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }

    setMfaState((current) => ({
      ...current,
      maskedEmail: result.maskedEmail || current.maskedEmail,
      expiresIn: result.expiresIn,
      resendAfter: result.resendAfter,
    }));
    setMfaCode('');
    setMfaError('');
    showToast(result.message || 'A new verification code has been sent.', 'success');
  };

  const handleReplaceDevice = async () => {
    if (!deviceLimit?.loginChallenge || !selectedSessionKey) {
      showToast('Select a device to sign out first.', 'warning');
      return;
    }

    setReplacingDevice(true);
    const result = await replaceDeviceForLogin(deviceLimit.loginChallenge, selectedSessionKey);
    setReplacingDevice(false);

    if (result.success) {
      setDeviceLimit(null);
      showToast('Device signed out. Welcome back!', 'success');
      navigate('/');
      return;
    }

    if (result.deviceLimit) {
      setDeviceLimit(result);
      setSelectedSessionKey(result.sessions?.[0]?.session_key || '');
      showToast(result.error, 'warning');
      return;
    }

    setDeviceLimit(null);
    setSelectedSessionKey('');
    showToast(result.error, 'error');
  };

  const formatSessionTime = (value) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const isMfaStep = Boolean(mfaState);

  return (
    <>
      <AuthShell
        theme={theme}
        pageKey="login"
        eyebrow={isMfaStep ? 'Two-step verification' : 'Secure sign in'}
        title={isMfaStep ? 'Verify your sign in' : 'Welcome back'}
        subtitle={isMfaStep
          ? `We sent a 6-digit verification code to ${mfaState?.maskedEmail || 'your email address'}.`
          : 'Sign in to manage quotations, proformas, invoices, receipts and business activity with confidence.'}
        securityBadges={[
          { icon: 'fa-lock', label: '256-bit SSL' },
          { icon: 'fa-cookie-bite', label: 'Secure session cookies' },
          { icon: 'fa-user-shield', label: 'Role-based access' },
        ]}
        sideTitle="Operate your invoicing workflow from a secure, polished environment."
        sideDescription="Otelex helps your team stay organised and professional with streamlined business documents, secure sessions and dependable financial workflow control."
      >
        {isMfaStep ? (
          <form className="auth-form" onSubmit={handleMfaVerify} noValidate>
            <div className="auth-mfa-note">
              <span className="auth-mfa-icon"><i className="fas fa-envelope-circle-check" /></span>
              <div>
                <strong>Check your email</strong>
                <span>Enter the code sent to {mfaState.maskedEmail}. The code expires in about {Math.ceil((mfaState.expiresIn || 600) / 60)} minutes.</span>
              </div>
            </div>

            <div className={`auth-field ${mfaError ? 'has-error' : ''}`}>
              <label>Verification Code</label>
              <OtpInput
                value={mfaCode}
                onChange={(value) => {
                  setMfaCode(value);
                  if (mfaError) setMfaError('');
                }}
                autoFocus
                disabled={verifyingMfa}
                ariaLabel="Sign-in verification code"
              />
              {mfaError ? (
                <span className="auth-field-error">
                  <i className="fas fa-circle-exclamation" /> {mfaError}
                </span>
              ) : null}
            </div>

            <button type="submit" className="auth-primary-btn" disabled={verifyingMfa || mfaCode.length !== 6}>
              {verifyingMfa ? (
                <><span className="auth-spinner" /> Verifying...</>
              ) : (
                <><i className="fas fa-shield-halved" /> Verify & Sign In</>
              )}
            </button>

            <div className="auth-mfa-actions">
              <button
                type="button"
                className="auth-text-btn"
                onClick={handleMfaResend}
                disabled={resendingMfa || resendSeconds > 0}
              >
                {resendingMfa
                  ? 'Sending...'
                  : resendSeconds > 0
                    ? `Resend code in ${resendSeconds}s`
                    : 'Resend verification code'}
              </button>
              <button
                type="button"
                className="auth-text-btn"
                onClick={() => {
                  setMfaState(null);
                  setMfaCode('');
                  setMfaError('');
                  setForm((current) => ({ ...current, password: '' }));
                }}
                disabled={verifyingMfa || resendingMfa}
              >
                Back to sign in
              </button>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className={`auth-field ${errors.email ? 'has-error' : ''}`}>
              <label htmlFor="email">Email Address</label>
              <div className="auth-input-wrap">
                <i className="fas fa-envelope auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@otelex.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              {errors.email ? (
                <span className="auth-field-error">
                  <i className="fas fa-circle-exclamation" />
                  {errors.email}
                </span>
              ) : null}
            </div>

            <div className={`auth-field ${errors.password ? 'has-error' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="auth-input-wrap">
                <i className="fas fa-lock auth-input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="auth-toggle-pw"
                  onClick={() => setShowPassword((value) => !value)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
              {errors.password ? (
                <span className="auth-field-error">
                  <i className="fas fa-circle-exclamation" />
                  {errors.password}
                </span>
              ) : null}
            </div>

            <div className="auth-inline-row">
              <span className="auth-mini-note">
                <i className="fas fa-shield-halved" aria-hidden="true" />{' '}
                Session-protected access for authorised users only.
              </span>
              <Link to="/forgot-password" className="auth-inline-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? (
                <><span className="auth-spinner" /> Signing in...</>
              ) : (
                <><i className="fas fa-right-to-bracket" /> Sign In</>
              )}
            </button>
          </form>
        )}
      </AuthShell>

      <ConfirmModal
        open={Boolean(deviceLimit)}
        onClose={() => { setDeviceLimit(null); setSelectedSessionKey(''); }}
        onCancel={() => { setDeviceLimit(null); setSelectedSessionKey(''); }}
        onConfirm={handleReplaceDevice}
        title="Active device limit reached"
        message={`Your account allows up to ${deviceLimit?.maxDevices || 2} active devices. Select one to sign out before continuing.`}
        confirmText="Sign out & continue"
        cancelText="Cancel sign in"
        variant="warning"
        loading={replacingDevice}
        closeOnBackdrop={!replacingDevice}
        extraContent={(
          <div className="login-device-list">
            {(deviceLimit?.sessions || []).map((session) => (
              <label
                key={session.session_key}
                className={`login-device-option ${selectedSessionKey === session.session_key ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="login-device-session"
                  value={session.session_key}
                  checked={selectedSessionKey === session.session_key}
                  onChange={() => setSelectedSessionKey(session.session_key)}
                  disabled={replacingDevice}
                />
                <span className="login-device-icon">
                  <i className={`fas ${session.device_type === 'mobile' ? 'fa-mobile-screen-button' : session.device_type === 'tablet' ? 'fa-tablet-screen-button' : 'fa-desktop'}`} />
                </span>
                <span className="login-device-copy">
                  <strong>{session.device_name || 'Active device'}</strong>
                  <small>{session.ip_address || 'Unknown IP'} · Active {formatSessionTime(session.last_activity_at)}</small>
                </span>
                <span className="login-device-radio" aria-hidden="true" />
              </label>
            ))}
          </div>
        )}
      />
    </>
  );
};

export default Login;

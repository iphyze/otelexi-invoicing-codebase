import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import AuthShell from '../../components/auth/AuthShell';
import api from '../../services/api';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import './Login.css';
import './ForgotPassword.css';

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return score;
};

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#10b981'];
const STRENGTH_CLASSES = ['', 'strength-weak', 'strength-fair', 'strength-good', 'strength-strong', 'strength-strong'];

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { label: 'At least one uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { label: 'At least one number', test: (password) => /[0-9]/.test(password) },
  { label: 'At least one special character', test: (password) => /[^a-zA-Z0-9]/.test(password) },
];

const ResetPassword = () => {
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');
  const invalidToken = !token || token.length < 10;

  const [form, setForm] = useState({ password: '', password_confirmation: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true });
    document.title = 'Otelex | Reset Password';
  }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.password) nextErrors.password = 'Password is required.';
    else if (form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    else if (!/[^a-zA-Z0-9]/.test(form.password)) nextErrors.password = 'Password must contain at least one special character.';

    if (!form.password_confirmation) nextErrors.password_confirmation = 'Please confirm your password.';
    else if (form.password !== form.password_confirmation) nextErrors.password_confirmation = 'Passwords do not match.';

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });
      setDone(true);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
      showToast(message, 'error');
      setErrors({ password: message });
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(form.password);
  const strengthPercent = form.password ? (strength / 5) * 100 : 0;
  const strengthColor = STRENGTH_COLORS[strength] || '#ef4444';
  const strengthLabel = STRENGTH_LABELS[strength] || '';
  const strengthClass = STRENGTH_CLASSES[strength] || '';
  const passwordsMatch = Boolean(form.password && form.password_confirmation && form.password === form.password_confirmation);

  if (invalidToken) {
    return (
      <AuthShell
        theme={theme}
        pageKey="reset-password-invalid"
        eyebrow="Reset link invalid"
        title="This reset link is no longer valid"
        subtitle="The link may have expired or become invalid. Request a fresh reset link to continue securely."
        securityBadges={[
          { icon: 'fa-link-slash', label: 'Expired link blocked' },
          { icon: 'fa-shield-halved', label: 'Protected recovery flow' },
          { icon: 'fa-key', label: 'Fresh reset required' },
        ]}
        sideTitle="Invalid or expired reset links are automatically blocked."
        sideDescription="This prevents old recovery URLs from being reused and helps keep user credentials secure across your business workspace."
      >
        <div className="auth-status-card auth-status-card--danger">
          <div className="auth-status-card__icon">
            <i className="fas fa-link-slash" />
          </div>
          <h3>Invalid link</h3>
          <p>This password reset link is invalid or has expired. Please request a new password reset link to continue.</p>
          <div className="auth-status-card__actions">
            <Link to="/forgot-password" className="auth-primary-btn">
              <i className="fas fa-paper-plane" />
              Request New Link
            </Link>
            <Link to="/login" className="auth-outline-btn">
              <i className="fas fa-arrow-left" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        theme={theme}
        pageKey="reset-password-success"
        eyebrow="Password updated"
        title="Your password has been changed"
        subtitle="You can now sign in with your new password and continue securely in Otelex."
        securityBadges={[
          { icon: 'fa-check-circle', label: 'Password updated' },
          { icon: 'fa-rotate', label: 'Session refresh protected' },
          { icon: 'fa-shield-halved', label: 'Recovery completed securely' },
        ]}
      >
        <div className="auth-status-card">
          <div className="auth-status-card__icon">
            <i className="fas fa-circle-check" />
          </div>
          <h3>Password updated successfully</h3>
          <p>Your password has been reset. You can now sign in using your new credentials.</p>
          <div className="auth-status-card__actions">
            <button type="button" className="auth-primary-btn" onClick={() => navigate('/login')}>
              <i className="fas fa-right-to-bracket" />
              Sign In Now
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      theme={theme}
      pageKey="reset-password"
      eyebrow="Choose a new password"
      title="Create a strong new password"
      subtitle="Use a strong password that you have not used elsewhere. This helps protect access to your invoicing workspace."
      securityBadges={[
        { icon: 'fa-key', label: 'Protected reset token' },
        { icon: 'fa-lock', label: 'Password policy enforced' },
        { icon: 'fa-user-shield', label: 'Secure account recovery' },
      ]}
      sideTitle="Reset credentials with clear guidance and strong protection."
      sideDescription="Otelex combines a guided password reset flow with strong validation so users can recover access confidently and securely."
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className={`auth-field ${errors.password ? 'has-error' : ''}`}>
          <label htmlFor="password">New Password</label>
          <div className="auth-input-wrap">
            <i className="fas fa-lock auth-input-icon" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
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

          {form.password ? (
            <div className="auth-strength">
              <div className="auth-strength__bar">
                <div
                  className="auth-strength__fill"
                  style={{ width: `${strengthPercent}%`, background: strengthColor }}
                />
              </div>
              <span className={`auth-strength__label ${strengthClass}`}>{strengthLabel}</span>
            </div>
          ) : null}
        </div>

        {form.password ? (
          <div className="auth-requirements">
            {PASSWORD_REQUIREMENTS.map((requirement) => (
              <div
                key={requirement.label}
                className={`auth-requirement ${requirement.test(form.password) ? 'met' : ''}`}
              >
                <i className={`fas ${requirement.test(form.password) ? 'fa-circle-check' : 'fa-circle'}`} />
                {requirement.label}
              </div>
            ))}
          </div>
        ) : null}

        <div className={`auth-field ${errors.password_confirmation ? 'has-error' : ''}`}>
          <label htmlFor="password_confirmation">Confirm New Password</label>
          <div className="auth-input-wrap">
            <i className="fas fa-lock auth-input-icon" />
            <input
              id="password_confirmation"
              type={showConfirm ? 'text' : 'password'}
              value={form.password_confirmation}
              onChange={(e) => setField('password_confirmation', e.target.value)}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              disabled={loading}
            />
            <button
              type="button"
              className="auth-toggle-pw"
              onClick={() => setShowConfirm((value) => !value)}
              tabIndex={-1}
              aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
            >
              <i className={`fas ${showConfirm ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
          {errors.password_confirmation ? (
            <span className="auth-field-error">
              <i className="fas fa-circle-exclamation" />
              {errors.password_confirmation}
            </span>
          ) : null}

          {form.password && form.password_confirmation ? (
            <span className={`auth-password-match ${passwordsMatch ? 'match' : 'no-match'}`}>
              <i className={`fas ${passwordsMatch ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </span>
          ) : null}
        </div>

        <div className="auth-note-box">
          When this reset is completed, you should use the new password for future sign-ins. Avoid reusing passwords across other services.
        </div>

        <div className="auth-form-actions">
          <button type="submit" className="auth-primary-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="auth-spinner" />
                Resetting password...
              </>
            ) : (
              <>
                <i className="fas fa-key" />
                Reset Password
              </>
            )}
          </button>

          <div className="auth-link-block">
            <Link to="/login" className="auth-secondary-link">
              <i className="fas fa-arrow-left" />
              {' '}Back to Sign In
            </Link>
          </div>
        </div>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;

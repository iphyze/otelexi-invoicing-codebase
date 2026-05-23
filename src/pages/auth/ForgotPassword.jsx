import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import AuthShell from '../../components/auth/AuthShell';
import api from '../../services/api';
import useThemeStore from '../../stores/useThemeStore';
import './Login.css';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const { theme } = useThemeStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true });
    document.title = 'Otelex | Forgot Password';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      theme={theme}
      pageKey="forgot-password"
      eyebrow="Credential recovery"
      title={sent ? 'Check your inbox' : 'Reset your password'}
      subtitle={
        sent
          ? 'If the email is registered, we have sent a secure password reset link with guidance on the next step.'
          : 'Enter the email address linked to your account and we will send you a secure password reset link.'
      }
      securityBadges={[
        { icon: 'fa-envelope-open-text', label: 'Encrypted delivery' },
        { icon: 'fa-link', label: 'One-time reset link' },
        { icon: 'fa-shield-halved', label: 'Protected recovery flow' },
      ]}
      sideTitle="Recover account access without compromising security."
      sideDescription="The password recovery flow is designed to stay discreet, safe and professional while helping authorised users regain access quickly."
    >
      {sent ? (
        <div className="auth-status-card">
          <div className="auth-status-card__icon">
            <i className="fas fa-envelope-circle-check" />
          </div>
          <h3>Reset link sent</h3>
          <p>
            If <strong>{email}</strong> is registered, you will receive a password reset link within a few minutes.
            Please check your spam folder if you do not see it.
          </p>
          <div className="auth-note-box">
            For security reasons, we show the same response even when an email address is not registered.
          </div>
          <div className="auth-status-card__actions">
            <Link to="/login" className="auth-primary-btn">
              <i className="fas fa-arrow-left" />
              Back to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className={`auth-field ${error ? 'has-error' : ''}`}>
            <label htmlFor="email">Email Address</label>
            <div className="auth-input-wrap">
              <i className="fas fa-envelope auth-input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="admin@otelex.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            {error ? (
              <span className="auth-field-error">
                <i className="fas fa-circle-exclamation" />
                {error}
              </span>
            ) : null}
          </div>

          <div className="auth-note-box">
            <strong>Security note:</strong> a protected reset link will be emailed only if the account exists and is active.
          </div>

          <div className="auth-form-actions">
            <button type="submit" className="auth-primary-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-spinner" />
                  Sending link...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane" />
                  Send Reset Link
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
      )}
    </AuthShell>
  );
};

export default ForgotPassword;

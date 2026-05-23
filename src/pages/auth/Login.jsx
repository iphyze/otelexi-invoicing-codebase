import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import AuthShell from '../../components/auth/AuthShell';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import useThemeStore from '../../stores/useThemeStore';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { showToast } = useToastStore();
  const { theme } = useThemeStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true });
    document.title = 'Otelex | Login';
  }, []);

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
    } else {
      showToast(result.error, 'error');
    }
  };

  return (
    <AuthShell
      theme={theme}
      pageKey="login"
      eyebrow="Secure sign in"
      title="Welcome back"
      subtitle="Sign in to manage quotations, proformas, invoices, receipts and business activity with confidence."
      securityBadges={[
        { icon: 'fa-lock', label: '256-bit SSL' },
        { icon: 'fa-cookie-bite', label: 'Secure session cookies' },
        { icon: 'fa-user-shield', label: 'Role-based access' },
      ]}
      sideTitle="Operate your invoicing workflow from a secure, polished environment."
      sideDescription="Otelex helps your team stay organised and professional with streamlined business documents, secure sessions and dependable financial workflow control."
    >
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
            <>
              <span className="auth-spinner" />
              Signing in...
            </>
          ) : (
            <>
              <i className="fas fa-right-to-bracket" />
              Sign In
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;

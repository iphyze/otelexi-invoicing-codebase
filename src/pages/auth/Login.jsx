// pages/auth/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';
import useToastStore from '../../stores/useToastStore';
import useThemeStore from '../../stores/useThemeStore';
import LogoLight from '../../assets/images/otelexi/logo-light.png';
import LogoDark from '../../assets/images/otelexi/logo-dark.png';
import './Login.css';
import AOS from 'aos';
import 'aos/dist/aos.css';

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
    const e = {};
    if (!form.email.trim())
      e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Please enter a valid email address.';
    if (!form.password)
      e.password = 'Password is required.';
    else if (form.password.length < 6)
      e.password = 'Password must be at least 6 characters.';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      showToast('Welcome back!', 'success');
      navigate('/');
    } else {
      showToast(result.error, 'error');
    }
  };

  return (
    <div className={`login-root theme-${theme}`}>
      {/* Background blobs */}
      <div className="login-bg">
        <span className="lb lb-1" />
        <span className="lb lb-2" />
        <span className="lb lb-3" />
      </div>

      {/* Card */}
      <div className="login-card" data-aos="fade-up">

        {/* Brand */}
        <div className="login-brand">
          <img
            src={theme === 'dark' ? LogoDark : LogoLight}
            alt="Otelex Ltd"
            className="login-logo-img"
          />
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>

          {/* Email */}
          <div className={`login-field ${errors.email ? 'has-error' : ''}`}>
            <label htmlFor="email">Email Address</label>
            <div className="login-input-wrap">
              <i className="fas fa-envelope login-input-icon" />
              <input
                id="email" type="email" name="email"
                value={form.email} onChange={handleChange}
                placeholder="admin@otelex.com"
                autoComplete="email" disabled={loading}
              />
            </div>
            {errors.email && (
              <span className="login-field-error">
                <i className="fas fa-circle-exclamation" /> {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className={`login-field ${errors.password ? 'has-error' : ''}`}>
            <label htmlFor="password">Password</label>
            <div className="login-input-wrap">
              <i className="fas fa-lock login-input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password} onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password" disabled={loading}
              />
              <button
                type="button" className="login-toggle-pw"
                onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            {errors.password && (
              <span className="login-field-error">
                <i className="fas fa-circle-exclamation" /> {errors.password}
              </span>
            )}
          </div>

          {/* Forgot */}
          <div className="login-forgot">
            <a href="/forgot-password">Forgot password?</a>
          </div>

          {/* Submit */}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading
              ? <><span className="login-spinner" /> Signing in...</>
              : <><i className="fas fa-right-to-bracket" /> Sign In</>
            }
          </button>
        </form>

        <p className="login-footer-text">
          &copy; {new Date().getFullYear()} Otelex Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
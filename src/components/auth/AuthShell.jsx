import React from 'react';
import LogoLight from '../../assets/images/otelexi/logo-light.png';
import LogoDark from '../../assets/images/otelexi/logo-dark.png';
import AuthThemeToggle from './AuthThemeToggle';

const DEFAULT_FEATURES = [
  {
    icon: 'fa-shield-halved',
    title: 'Protected access',
    text: 'Role-aware authentication with secure session handling and controlled access to your invoicing workspace.',
  },
  {
    icon: 'fa-file-invoice-dollar',
    title: 'Business-ready workflows',
    text: 'Manage quotations, proformas, invoices, receipts and client activity from one professional environment.',
  },
  {
    icon: 'fa-chart-line',
    title: 'Operational confidence',
    text: 'Designed for accurate document handling, payment tracking and dependable business reporting.',
  },
];

const DEFAULT_BADGES = [
  { icon: 'fa-lock', label: '256-bit SSL' },
  { icon: 'fa-cookie-bite', label: 'Secure cookies' },
  { icon: 'fa-user-shield', label: 'Protected access' },
];

const AuthShell = ({
  theme,
  pageKey = 'auth',
  eyebrow = 'Secure workspace',
  title,
  subtitle,
  sideTitle = 'Invoicing that feels modern, controlled and dependable.',
  sideDescription = 'Access Otelex confidently with a polished, secure experience built for professional teams and everyday business operations.',
  features = DEFAULT_FEATURES,
  securityBadges = DEFAULT_BADGES,
  children,
  footerNote,
}) => {
  const logoSrc = theme === 'dark' ? LogoDark : LogoLight;

  return (
    <div className={`auth-root theme-${theme}`}>
      <div className="auth-bg" aria-hidden="true">
        <span className="auth-orb auth-orb--one" />
        <span className="auth-orb auth-orb--two" />
        <span className="auth-orb auth-orb--three" />
        <span className="auth-grid" />
        <span className="auth-rings auth-rings--one" />
        <span className="auth-rings auth-rings--two" />
      </div>

      <div className="auth-shell" data-page={pageKey}>
        <aside className="auth-aside" data-aos="fade-right">
          <div className="auth-aside__brand">
            <div className="auth-aside__brand-mark">
              <img src={logoSrc} alt="Otelex Ltd" className="auth-aside__logo" />
            </div>
            <div className="auth-aside__brand-text">
              <span className="auth-aside__eyebrow">Otelex Hospitality Supplies Ltd.</span>
              <span className="auth-aside__caption">Professional invoicing workspace</span>
            </div>
          </div>

          <div className="auth-aside__hero">
            <h1>{sideTitle}</h1>
            <p>{sideDescription}</p>
          </div>

          <div className="auth-aside__features">
            {features.map((feature) => (
              <div className="auth-feature" key={feature.title}>
                <div className="auth-feature__icon" aria-hidden="true">
                  <i className={`fas ${feature.icon}`} />
                </div>
                <div className="auth-feature__body">
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-aside__trust">
            <span className="auth-aside__trust-label">Trusted protection</span>
            <div className="auth-aside__trust-grid">
              {securityBadges.map((badge) => (
                <span className="auth-badge auth-badge--aside" key={badge.label}>
                  <i className={`fas ${badge.icon}`} aria-hidden="true" />
                  {badge.label}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section className="auth-main" data-aos="fade-left">
          <div className="auth-main__toolbar">
            <AuthThemeToggle />
          </div>

          <div className="auth-main__card">
            <div className="auth-main__brand">
              <img src={logoSrc} alt="Otelex Ltd" className="auth-main__logo" />
            </div>

            <div className="auth-main__intro">
              <span className="auth-main__eyebrow">{eyebrow}</span>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>

            {children}

            <div className="auth-main__security">
              <span className="auth-main__security-title">Protected by enterprise-grade safeguards</span>
              <div className="auth-main__security-grid">
                {securityBadges.map((badge) => (
                  <span className="auth-badge" key={badge.label}>
                    <i className={`fas ${badge.icon}`} aria-hidden="true" />
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="auth-main__footer">
              <p>© {new Date().getFullYear()} Otelex Ltd. All rights reserved.</p>
              <p className="auth-main__designer">Designed by Dynamix Field Ltd.</p>
              {footerNote ? <p className="auth-main__footer-note">{footerNote}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuthShell;

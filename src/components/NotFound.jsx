import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useThemeStore from '../stores/useThemeStore';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();

  useEffect(() => {
    document.title = 'Otelex | Page Not Found';
  }, []);

  return (
    <div className={`notfound-root theme-${theme}`}>
      {/* Background blobs */}
      <div className="nf-bg">
        <span className="nf-blob nf-blob-1" />
        <span className="nf-blob nf-blob-2" />
        <span className="nf-blob nf-blob-3" />
      </div>

      {/* Grid overlay texture */}
      <div className="nf-grid" />

      <div className="nf-content">
        {/* Floating icon */}
        <div className="nf-icon-wrap">
          <div className="nf-icon-ring nf-ring-1" />
          <div className="nf-icon-ring nf-ring-2" />
          <div className="nf-icon-ring nf-ring-3" />
          <div className="nf-icon">
            <i className="fas fa-file-circle-xmark" />
          </div>
        </div>

        {/* 404 number */}
        <div className="nf-number">
          <span className="nf-digit">4</span>
          <span className="nf-digit nf-digit-zero">0</span>
          <span className="nf-digit">4</span>
        </div>

        <h1 className="nf-title">Page Not Found</h1>
        <p className="nf-desc">
          The page you're looking for doesn't exist or has been moved.<br />
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="nf-actions">
          <button className="nf-btn-primary" onClick={() => navigate('/')}>
            <i className="fas fa-gauge-high" />
            Back to Dashboard
          </button>
          <button className="nf-btn-ghost" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left" />
            Go Back
          </button>
        </div>

        {/* Quick links */}
        <div className="nf-links">
          <span className="nf-links-label">Quick links:</span>
          <a href="/clients" className="nf-quick-link">Clients</a>
          <span className="nf-dot" />
          <a href="/invoices" className="nf-quick-link">Invoices</a>
          <span className="nf-dot" />
          <a href="/quotations" className="nf-quick-link">Quotations</a>
          <span className="nf-dot" />
          <a href="/reports/sales" className="nf-quick-link">Reports</a>
        </div>
      </div>

      {/* Brand watermark */}
      <div className="nf-brand">
        <i className="fas fa-file-invoice" />
        <span>Otelex</span>
      </div>
    </div>
  );
};

export default NotFound;
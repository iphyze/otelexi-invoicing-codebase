import React from 'react';
import useThemeStore from '../stores/useThemeStore';
import LogoLight from '../assets/images/otelexi/logo-light.png';
import LogoDark from '../assets/images/otelexi/logo-dark.png';
import './SessionLoader.css';

const SessionLoader = () => {
  const theme = useThemeStore((state) => state.theme);

  return (
    <div className={`session-loader-root theme-${theme}`} role="status" aria-live="polite">
      <div className="session-loader-bg" aria-hidden="true">
        <span className="session-loader-blob session-loader-blob-one" />
        <span className="session-loader-blob session-loader-blob-two" />
      </div>

      <div className="session-loader-card">
        <img
          src={theme === 'dark' ? LogoDark : LogoLight}
          alt="Otelex Ltd"
          className="session-loader-logo"
        />

        <div className="session-loader-spinner" aria-hidden="true">
          <span className="session-loader-spinner-ring" />
          <span className="session-loader-spinner-dot" />
        </div>

        <p className="session-loader-title">Preparing your workspace</p>
        <p className="session-loader-subtitle">Securing your session...</p>
      </div>
    </div>
  );
};

export default SessionLoader;
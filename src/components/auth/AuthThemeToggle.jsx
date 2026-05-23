import React from 'react';
import useThemeStore from '../../stores/useThemeStore';

const AuthThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="auth-theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <span className="auth-theme-toggle__icon" aria-hidden="true">
        <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`} />
      </span>
      <span className="auth-theme-toggle__label">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};

export default AuthThemeToggle;

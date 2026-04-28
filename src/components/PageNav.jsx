import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useThemeStore from '../stores/useThemeStore';
import './PageNav.css';

/**
 * PageNav — breadcrumb bar
 *
 * Usage:
 *   <PageNav
 *     pageTitle="Invoice List"
 *     links={[
 *       { label: 'Dashboard', to: '/' },
 *       { label: 'Invoices', to: '/invoices' },
 *       { label: 'Invoice List', active: true },
 *     ]}
 *   />
 */
const PageNav = ({ pageTitle, links = [] }) => {
  const { theme } = useThemeStore();

  return (
    <motion.div
      className={`page-nav-wrapper theme-${theme}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="page-nav-inner">
        <h1 className="page-nav-title">{pageTitle}</h1>
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          {links.map((link, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span className="breadcrumb-sep">
                  <i className="fas fa-chevron-right" />
                </span>
              )}
              {link.active || !link.to ? (
                <span className="breadcrumb-item active">{link.label}</span>
              ) : (
                <Link to={link.to} className="breadcrumb-item link">
                  {link.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </motion.div>
  );
};

export default PageNav;
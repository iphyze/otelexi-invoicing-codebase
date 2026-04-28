// pages/clients/ClientStats.jsx
import React from 'react';
import { motion } from 'framer-motion';
import useClientStore from '../../stores/useClientStore';
import './ClientStats.css';

const cards = [
  { key: 'total', label: 'Total Clients', icon: 'fa-users', gradient: ['#1a56db', '#2563eb'], glow: 'rgba(26,86,219,0.28)' },
  { key: 'active', label: 'Active Clients', icon: 'fa-user-check', gradient: ['#10b981', '#059669'], glow: 'rgba(16,185,129,0.28)' },
  { key: 'inactive', label: 'Inactive', icon: 'fa-user-slash', gradient: ['#f59e0b', '#d97706'], glow: 'rgba(245,158,11,0.28)' },
  { key: 'totalContacts', label: 'Total Contacts', icon: 'fa-address-book', gradient: ['#8b5cf6', '#7c3aed'], glow: 'rgba(139,92,246,0.28)' },
];

const ClientStats = () => {
  const stats = useClientStore((s) => s.stats);

  return (
    <div className="cs-grid">
      {cards.map((card, i) => {
        const val = stats[card.key];
        return (
          <motion.div
            key={card.key}
            className="cs-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
          >
            {/* Coloured left accent bar */}
            <div
              className="cs-accent-bar"
              style={{ background: `linear-gradient(180deg, ${card.gradient[0]}, ${card.gradient[1]})` }}
            />

            {/* Icon block */}
            <div
              className="cs-icon-wrap"
              style={{
                background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})`,
                boxShadow: `0 8px 20px ${card.glow}`,
              }}
            >
              <i className={`fas ${card.icon}`} />
            </div>

            {/* Text */}
            <div className="cs-body">
              <p className="cs-label">{card.label}</p>
              <h3 className="cs-value">
                {val !== undefined && val !== null ? val : <span className="cs-skel" />}
              </h3>
            </div>

            {/* Background blob for depth */}
            <div
              className="cs-blob"
              style={{ background: `radial-gradient(circle at top right, ${card.gradient[0]}18, transparent 70%)` }}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export default ClientStats;
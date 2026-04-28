// pages/products/ProductStats.jsx
import React from 'react';
import { motion } from 'framer-motion';
import useProductStore from '../../stores/useProductStore';
import './ProductStats.css';

const cards = [
  {
    key: 'total',
    label: 'Total Products',
    icon: 'fa-boxes-stacked',
    gradient: ['#1a56db', '#2563eb'],
    glow: 'rgba(26,86,219,0.28)',
  },
  {
    key: 'active',
    label: 'Active Products',
    icon: 'fa-circle-check',
    gradient: ['#10b981', '#059669'],
    glow: 'rgba(16,185,129,0.28)',
  },
  {
    key: 'inactive',
    label: 'Inactive',
    icon: 'fa-circle-xmark',
    gradient: ['#f59e0b', '#d97706'],
    glow: 'rgba(245,158,11,0.28)',
  },
  {
    key: 'lowStock',
    label: 'Low Stock',
    icon: 'fa-triangle-exclamation',
    gradient: ['#f97316', '#ea580c'],
    glow: 'rgba(249,115,22,0.28)',
  },
  {
    key: 'outOfStock',
    label: 'Out of Stock',
    icon: 'fa-ban',
    gradient: ['#ef4444', '#dc2626'],
    glow: 'rgba(239,68,68,0.28)',
  },
];

const ProductStats = () => {
  const stats = useProductStore((s) => s.stats);

  return (
    <div className="ps-grid">
      {cards.map((card, i) => {
        const val = stats[card.key];
        return (
          <motion.div
            key={card.key}
            className="ps-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
          >
            <div
              className="ps-accent-bar"
              style={{
                background: `linear-gradient(180deg, ${card.gradient[0]}, ${card.gradient[1]})`,
              }}
            />
            <div
              className="ps-icon-wrap"
              style={{
                background: `linear-gradient(135deg, ${card.gradient[0]}, ${card.gradient[1]})`,
                boxShadow: `0 8px 20px ${card.glow}`,
              }}
            >
              <i className={`fas ${card.icon}`} />
            </div>
            <div className="ps-body">
              <p className="ps-label">{card.label}</p>
              <h3 className="ps-value">
                {val !== undefined && val !== null ? val : <span className="ps-skel" />}
              </h3>
            </div>
            <div
              className="ps-blob"
              style={{
                background: `radial-gradient(circle at top right, ${card.gradient[0]}18, transparent 70%)`,
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
};

export default ProductStats;

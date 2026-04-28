// components/SelectInput.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import useThemeStore from '../stores/useThemeStore';
import './SelectInput.css';

/**
 * SelectInput — custom styled select with optional search
 *
 * Props:
 *   options      — [{ value, label, icon? }]
 *   value        — current value
 *   onChange     — (value) => void
 *   placeholder  — string
 *   searchable   — boolean (default false)
 *   clearable    — boolean (default false)
 *   disabled     — boolean
 *   error        — string
 *   label        — string
 *   required     — boolean
 *   size         — 'sm' | 'md'
 */
const SelectInput = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  searchable = false,
  clearable = false,
  disabled = false,
  error,
  label,
  required = false,
  size = 'md',
  className = '',
}) => {
  const { theme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHl] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const filtered = searchable && query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) closeDropdown();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (open && searchable) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open, searchable]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const item = listRef.current.querySelectorAll('.si-option')[highlighted];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted, open]);

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setHl(options.findIndex((o) => String(o.value) === String(value)) || 0);
  };

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  // Second click on trigger closes — but only if NOT searchable (search input has its own click)
  const handleTriggerClick = () => {
    if (open && !searchable) {
      closeDropdown();
    } else if (!open) {
      openDropdown();
    }
    // if open && searchable: do nothing — let user type in search input
  };

  const selectOption = (opt) => {
    onChange(opt.value);
    closeDropdown();
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDropdown(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setHl((h) => Math.min(h + 1, filtered.length - 1)); break;
      case 'ArrowUp': e.preventDefault(); setHl((h) => Math.max(h - 1, 0)); break;
      case 'Enter': e.preventDefault(); if (filtered[highlighted]) selectOption(filtered[highlighted]); break;
      case 'Escape': closeDropdown(); break;
      default: break;
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`si-wrapper ${className}`} ref={wrapRef}>
      {label && (
        <label className={`si-label theme-${theme}`}>
          {label}{required && <span className="si-required">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div
        className={`si-trigger theme-${theme} size-${size} ${open ? 'is-open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'is-disabled' : ''}`}
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="si-value">
          {selected ? (
            <span className="si-selected-label">
              {selected.icon && <i className={`fas ${selected.icon} si-opt-icon`} />}
              {selected.label}
            </span>
          ) : (
            <span className="si-placeholder">{placeholder}</span>
          )}
        </div>
        <div className="si-controls">
          {clearable && selected && (
            <button className="si-clear" onClick={handleClear} type="button" tabIndex={-1}>
              <i className="fas fa-xmark" />
            </button>
          )}
          <i className={`fas fa-chevron-down si-arrow ${open ? 'rotated' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className={`si-dropdown theme-${theme}`} role="listbox">
          {searchable && (
            <div className={`si-search-wrap theme-${theme}`}>
              <i className="fas fa-magnifying-glass si-search-icon" />
              <input
                ref={inputRef}
                className={`si-search theme-${theme}`}
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHl(0); }}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()} // prevent trigger click from closing
              />
            </div>
          )}
          <div className="si-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="si-empty">No options found</div>
            ) : (
              filtered.map((opt, idx) => (
                <div
                  key={opt.value}
                  className={`si-option ${String(opt.value) === String(value) ? 'is-selected' : ''} ${idx === highlighted ? 'is-highlighted' : ''}`}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setHl(idx)}
                  role="option"
                  aria-selected={String(opt.value) === String(value)}
                >
                  {opt.icon && <i className={`fas ${opt.icon} si-opt-icon`} />}
                  <span>{opt.label}</span>
                  {String(opt.value) === String(value) && (
                    <i className="fas fa-check si-check" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {error && <span className="si-error"><i className="fas fa-circle-exclamation" /> {error}</span>}
    </div>
  );
};

export default SelectInput;
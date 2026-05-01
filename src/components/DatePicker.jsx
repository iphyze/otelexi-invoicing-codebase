// components/DatePicker.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../stores/useThemeStore';
import './DatePicker.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n) => String(n).padStart(2, '0');

// Parse YYYY-MM-DD → Date (local time, avoids UTC shift)
const parseDate = (str) => {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

// Format Date → YYYY-MM-DD
const toISO = (date) =>
  date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : '';

// Format Date → display string (e.g. "27 Apr 2026")
const toDisplay = (date) =>
  date
    ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

/**
 * DatePicker
 * Props:
 *   value        — YYYY-MM-DD string
 *   onChange     — (isoString) => void
 *   placeholder  — string
 *   error        — string
 *   disabled     — boolean
 *   minDate      — YYYY-MM-DD string
 *   maxDate      — YYYY-MM-DD string
 *   label        — string (optional, renders label above)
 *   required     — boolean
 *   hint         — string (optional small label right-side)
 */
const DatePicker = ({
  value, onChange, placeholder = 'Select date',
  error, disabled, minDate, maxDate,
  label, required, hint,
}) => {
  const { theme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('days'); // 'days' | 'months' | 'years'
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const selected = parseDate(value);
  const today = new Date();
  const minD = parseDate(minDate);
  const maxD = parseDate(maxDate);

  // Calendar cursor — defaults to selected month or today
  const [cursor, setCursor] = useState(() => {
    const d = parseDate(value) || new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Sync cursor when value changes externally
  useEffect(() => {
    if (value) {
      const d = parseDate(value);
      if (d) setCursor({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
        setView('days');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') { setOpen(false); setView('days'); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const isDisabledDate = (y, m, d) => {
    const dt = new Date(y, m, d);
    if (minD && dt < minD) return true;
    if (maxD && dt > maxD) return true;
    return false;
  };

  const isToday = (y, m, d) =>
    y === today.getFullYear() && m === today.getMonth() && d === today.getDate();

  const isSelected = (y, m, d) =>
    selected &&
    y === selected.getFullYear() &&
    m === selected.getMonth() &&
    d === selected.getDate();

  const selectDay = (y, m, d) => {
    if (isDisabledDate(y, m, d)) return;
    onChange(toISO(new Date(y, m, d)));
    setOpen(false);
    setView('days');
  };

  const prevMonth = () => setCursor((c) => {
    const m = c.month === 0 ? 11 : c.month - 1;
    const y = c.month === 0 ? c.year - 1 : c.year;
    return { year: y, month: m };
  });

  const nextMonth = () => setCursor((c) => {
    const m = c.month === 11 ? 0 : c.month + 1;
    const y = c.month === 11 ? c.year + 1 : c.year;
    return { year: y, month: m };
  });

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  // ── Panel position — recalculates on scroll & resize ────────────
  const [panelStyle, setPanelStyle] = useState({});

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 320 && rect.top > 320;
    setPanelStyle({
      position: 'fixed',
      left: Math.min(rect.left, window.innerWidth - 292),
      top: openUp ? rect.top - 8 : rect.bottom + 6,
      transform: openUp ? 'translateY(-100%)' : 'none',
      width: Math.max(rect.width, 280),
      zIndex: 9900,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    // true = capture phase catches ALL scroll containers (page, sidebar, overflow divs)
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // ── Build calendar grid ─────────────────────────────────────────
  const { year, month } = cursor;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevDays = getDaysInMonth(year, month === 0 ? 11 : month - 1);

  const cells = [];
  // Leading cells from prev month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, month: month - 1, year: month === 0 ? year - 1 : year, outside: true });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, outside: false });
  }
  // Trailing cells
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, month: month + 1, year: month === 11 ? year + 1 : year, outside: true });
  }

  // Year range for year picker
  const yearStart = Math.floor(year / 12) * 12;
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i);

  const panel = (
    <div
      ref={panelRef}
      className={`dp-panel theme-${theme}`}
      style={panelStyle}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div className="dp-header">
        {view === 'days' && (
          <>
            <button className="dp-nav" onClick={prevMonth} type="button"><i className="fas fa-chevron-left" /></button>
            <div className="dp-header-center">
              <button className="dp-header-btn" onClick={() => setView('months')} type="button">
                {MONTHS[month]}
              </button>
              <button className="dp-header-btn" onClick={() => setView('years')} type="button">
                {year}
              </button>
            </div>
            <button className="dp-nav" onClick={nextMonth} type="button"><i className="fas fa-chevron-right" /></button>
          </>
        )}
        {view === 'months' && (
          <>
            <button className="dp-nav" onClick={() => setCursor((c) => ({ ...c, year: c.year - 1 }))} type="button"><i className="fas fa-chevron-left" /></button>
            <button className="dp-header-btn dp-header-title" onClick={() => setView('years')} type="button">{year}</button>
            <button className="dp-nav" onClick={() => setCursor((c) => ({ ...c, year: c.year + 1 }))} type="button"><i className="fas fa-chevron-right" /></button>
          </>
        )}
        {view === 'years' && (
          <>
            <button className="dp-nav" 
            // onClick={() => setCursor((c) => ({ ...c }))} type="button"
              onClick={() => { const s = yearStart - 12; setCursor((c) => ({ ...c, year: s + 6 })); }} ><i className="fas fa-chevron-left" /></button>
            <span className="dp-header-title">{yearStart}–{yearStart + 11}</span>
            <button className="dp-nav" type="button"
              onClick={() => { const s = yearStart + 12; setCursor((c) => ({ ...c, year: s + 6 })); }}><i className="fas fa-chevron-right" /></button>
          </>
        )}
      </div>

      {/* ── Day view ── */}
      {view === 'days' && (
        <>
          <div className="dp-weekdays">
            {DAYS.map((d) => <span key={d} className="dp-weekday">{d}</span>)}
          </div>
          <div className="dp-grid">
            {cells.map((cell, i) => (
              <button
                key={i}
                type="button"
                className={[
                  'dp-day',
                  cell.outside ? 'dp-day-outside' : '',
                  isSelected(cell.year, cell.month, cell.day) ? 'dp-day-selected' : '',
                  isToday(cell.year, cell.month, cell.day) ? 'dp-day-today' : '',
                  isDisabledDate(cell.year, cell.month, cell.day) ? 'dp-day-disabled' : '',
                ].join(' ')}
                onClick={() => selectDay(cell.year, cell.month, cell.day)}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Month view ── */}
      {view === 'months' && (
        <div className="dp-month-grid">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              type="button"
              className={`dp-month-btn ${i === month ? 'dp-month-selected' : ''}`}
              onClick={() => { setCursor((c) => ({ ...c, month: i })); setView('days'); }}
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* ── Year view ── */}
      {view === 'years' && (
        <div className="dp-year-grid">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              className={`dp-year-btn ${y === year ? 'dp-year-selected' : ''}`}
              onClick={() => { setCursor((c) => ({ ...c, year: y })); setView('months'); }}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="dp-footer">
        <button
          type="button"
          className="dp-today-btn"
          onClick={() => {
            const t = new Date();
            selectDay(t.getFullYear(), t.getMonth(), t.getDate());
          }}
        >
          <i className="fas fa-calendar-day" /> Today
        </button>
        {value && (
          <button type="button" className="dp-clear-btn" onClick={clear}>
            <i className="fas fa-xmark" /> Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="dp-wrapper">
      {label && (
        <label className="dp-label">
          {label}
          {required && <span className="dp-req">*</span>}
          {hint && <span className="dp-hint">{hint}</span>}
        </label>
      )}
      <div
        ref={triggerRef}
        className={[
          'dp-trigger',
          `theme-${theme}`,
          open ? 'dp-open' : '',
          error ? 'dp-error' : '',
          disabled ? 'dp-disabled' : '',
        ].join(' ')}
        onClick={() => { if (!disabled) { setOpen((v) => !v); setView('days'); } }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); } }}
      >
        <i className="fas fa-calendar dp-trigger-icon" />
        <span className={`dp-trigger-text ${!selected ? 'dp-placeholder' : ''}`}>
          {selected ? toDisplay(selected) : placeholder}
        </span>
        {value && !disabled && (
          <button className="dp-clear-x" type="button" onClick={clear} tabIndex={-1}>
            <i className="fas fa-xmark" />
          </button>
        )}
        <i className={`fas fa-chevron-down dp-chevron ${open ? 'dp-chevron-up' : ''}`} />
      </div>
      {error && <span className="dp-err-msg"><i className="fas fa-circle-exclamation" /> {error}</span>}
      {open && createPortal(panel, document.body)}
    </div>
  );
};

export default DatePicker;
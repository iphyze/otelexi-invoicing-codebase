import React, { useEffect, useMemo, useRef } from 'react';
import './OtpInput.css';

const normalizeCode = (value, length) => String(value || '').replace(/\D/g, '').slice(0, length);

const OtpInput = ({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  autoFocus = false,
  ariaLabel = 'Verification code',
  className = '',
}) => {
  const refs = useRef([]);
  const digits = useMemo(() => {
    const code = normalizeCode(value, length);
    return Array.from({ length }, (_, index) => code[index] || '');
  }, [value, length]);

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const firstEmpty = digits.findIndex((digit) => digit === '');
    const index = firstEmpty === -1 ? length - 1 : firstEmpty;
    const timer = window.setTimeout(() => refs.current[index]?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [autoFocus, disabled, length]); // intentionally not tied to every digit change

  const emit = (nextDigits) => {
    onChange?.(normalizeCode(nextDigits.join(''), length));
  };

  const handleChange = (index, rawValue) => {
    const incoming = String(rawValue || '').replace(/\D/g, '');
    if (!incoming) {
      const next = [...digits];
      next[index] = '';
      emit(next);
      return;
    }

    const next = [...digits];
    let cursor = index;
    for (const digit of incoming) {
      if (cursor >= length) break;
      next[cursor] = digit;
      cursor += 1;
    }
    emit(next);
    refs.current[Math.min(cursor, length - 1)]?.focus();
  };

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = '';
        emit(next);
        return;
      }
      if (index > 0) {
        next[index - 1] = '';
        emit(next);
        refs.current[index - 1]?.focus();
      }
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      const next = [...digits];
      next[index] = '';
      emit(next);
      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      refs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      refs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = normalizeCode(event.clipboardData?.getData('text') || '', length);
    if (!pasted) return;
    event.preventDefault();
    onChange?.(pasted);
    refs.current[Math.min(pasted.length, length) - 1]?.focus();
  };

  return (
    <div className={`otp-input ${className}`.trim()} role="group" aria-label={ariaLabel} onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => { refs.current[index] = node; }}
          className="otp-input__box"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          disabled={disabled}
          aria-label={`${ariaLabel} digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
};

export default OtpInput;

import React, { useEffect, useMemo, useState } from 'react';
import SelectInput from '../SelectInput';
import mailService from '../../services/mailService';
import './MailProviderSelect.css';

const PROVIDER_ICONS = {
  system: 'fa-gears',
  zoho: 'fa-envelope',
  brevo: 'fa-paper-plane',
};

const PROVIDER_LABELS = {
  zoho: 'Zoho Mail',
  brevo: 'Brevo',
};

const MailProviderSelect = ({ value = 'system', onChange, disabled = false, compact = false }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    mailService.getProviderOptions()
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setLoadError(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const options = useMemo(() => {
    const defaultProvider = summary?.default_provider;
    const defaultLabel = PROVIDER_LABELS[defaultProvider] || 'Configured Provider';
    const rows = [{
      value: 'system',
      label: `System Default (${defaultLabel})`,
      icon: PROVIDER_ICONS.system,
    }];

    (summary?.providers || []).forEach((provider) => {
      rows.push({
        value: provider.value,
        label: provider.label || PROVIDER_LABELS[provider.value] || provider.value,
        icon: PROVIDER_ICONS[provider.value],
      });
    });

    return rows;
  }, [summary]);

  useEffect(() => {
    if (loading || loadError) return;
    if (!options.some((option) => option.value === value)) onChange?.('system');
  }, [loading, loadError, onChange, options, value]);

  const fallbackCopy = summary?.fallback_enabled
    ? `System Default can fall back to ${PROVIDER_LABELS[summary?.fallback_provider] || 'the secondary provider'} when eligible.`
    : 'System Default uses the provider selected in Administration → Mail Settings.';

  return (
    <div className={`mps-wrap ${compact ? 'is-compact' : ''}`}>
      <SelectInput
        label="Send Via"
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
        placeholder={loading ? 'Loading mail providers...' : 'Select mail provider'}
        size={compact ? 'sm' : 'md'}
      />
      <small className={`mps-note ${loadError ? 'is-error' : ''}`}>
        {loadError
          ? 'Provider choices could not be loaded. System Default will be used.'
          : value === 'system'
            ? fallbackCopy
            : `Use ${PROVIDER_LABELS[value] || value} only for this email. Automatic fallback is skipped.`}
      </small>
    </div>
  );
};

export default MailProviderSelect;

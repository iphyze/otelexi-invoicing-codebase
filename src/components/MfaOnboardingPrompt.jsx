import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmModal from './modals/ConfirmModal';
import useAuthStore from '../stores/useAuthStore';
import useToastStore from '../stores/useToastStore';
import authSessionService from '../services/authSessionService';

const MfaOnboardingPrompt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, user } = useAuthStore();
  const { showToast } = useToastStore();
  const checkedUserRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !user?.id) {
      checkedUserRef.current = null;
      setOpen(false);
      return;
    }

    if (checkedUserRef.current === user.id) return;
    checkedUserRef.current = user.id;

    const params = new URLSearchParams(location.search);
    if (location.pathname === '/profile' && params.get('setupMfa') === '1') {
      return;
    }

    let cancelled = false;
    authSessionService.getMfaStatus()
      .then((response) => {
        if (!cancelled && response.data?.data?.setup_prompt_required) {
          setOpen(true);
        }
      })
      .catch(() => {
        // Optional onboarding must never interrupt a valid authenticated session.
      });

    return () => { cancelled = true; };
  }, [status, user?.id, location.pathname, location.search]);

  const handleSetupNow = () => {
    setOpen(false);
    navigate('/profile?setupMfa=1');
  };

  const handleNotNow = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await authSessionService.updateMfaOnboarding('dismiss');
      setOpen(false);
      showToast('You can enable email MFA later from My Profile.', 'info');
    } catch (error) {
      showToast(error.response?.data?.message || 'Unable to save your MFA preference.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ConfirmModal
      open={open}
      onClose={handleNotNow}
      onCancel={handleNotNow}
      onConfirm={handleSetupNow}
      title="Secure your account with email MFA?"
      message="Add a second verification step to your account. When enabled, Otelex will email you a one-time code after your password is accepted."
      confirmText="Set up now"
      cancelText="Not now"
      variant="primary"
      loading={saving}
      closeOnBackdrop={false}
      icon="fa-shield-halved"
    />
  );
};

export default MfaOnboardingPrompt;

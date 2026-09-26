import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ConfirmModal from '../modals/ConfirmModal';
import useThemeStore from '../../stores/useThemeStore';
import useToastStore from '../../stores/useToastStore';
import './PwaInstallPrompt.css';

const DISMISS_KEY = 'otelex-pwa-install-dismissed';
const UPDATE_DEFER_KEY = 'otelex-pwa-update-deferred-until';
const UPDATE_DEFER_MS = 30 * 60 * 1000;

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator?.standalone === true;
};

const isIosDevice = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const PwaInstallPrompt = () => {
  const { pathname } = useLocation();
  const { theme } = useThemeStore();
  const { showToast } = useToastStore();
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneMode());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updateRegistration, setUpdateRegistration] = useState(null);
  const [applyingUpdate, setApplyingUpdate] = useState(false);
  const [updateDeferredUntil, setUpdateDeferredUntil] = useState(() => {
    try {
      return Number(sessionStorage.getItem(UPDATE_DEFER_KEY) || 0);
    } catch {
      return 0;
    }
  });

  const ios = useMemo(() => isIosDevice(), []);
  const excludedPublicRoute = pathname.startsWith('/payment-request/')
    || pathname.startsWith('/customer-portal/');

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setInstalled(false);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setIosGuideOpen(false);
      showToast('Otelex has been installed successfully.', 'success');
    };

    const standaloneQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = (event) => {
      if (event.matches) setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    standaloneQuery?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      standaloneQuery?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, [showToast]);

  useEffect(() => {
    const handleUpdateAvailable = (event) => {
      const registration = event.detail?.registration;
      if (registration?.waiting && Date.now() >= updateDeferredUntil) {
        setUpdateRegistration(registration);
      }
    };

    let hasReportedOffline = !navigator.onLine;

    const handleOffline = () => {
      hasReportedOffline = true;
      showToast('You are offline. Live Otelex data will be available again when your connection returns.', 'warning');
    };

    const handleOnline = () => {
      if (hasReportedOffline) {
        showToast('Connection restored. Otelex is back online.', 'success');
      }
      hasReportedOffline = false;
    };

    window.addEventListener('otelex:pwa-update-available', handleUpdateAvailable);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('otelex:pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [showToast, updateDeferredUntil]);

  const canOfferInstall = !installed && !dismissed && !excludedPublicRoute && (Boolean(installEvent) || ios);
  const canShowUpdate = Boolean(updateRegistration?.waiting) && !excludedPublicRoute;


  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Session storage can be unavailable in hardened/private browser modes.
    }
  };

  const handleInstall = async () => {
    if (ios && !installEvent) {
      setIosGuideOpen(true);
      return;
    }

    if (!installEvent || installing) return;

    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;

      setInstallEvent(null);
      if (choice?.outcome !== 'accepted') {
        setDismissed(true);
        try {
          sessionStorage.setItem(DISMISS_KEY, '1');
        } catch {
          // Ignore storage errors; the browser has already dismissed the prompt.
        }
      }
    } catch {
      showToast('The install prompt could not be opened. You can still install Otelex from your browser menu.', 'warning');
    } finally {
      setInstalling(false);
    }
  };

  const handleApplyUpdate = () => {
    const waitingWorker = updateRegistration?.waiting;
    if (!waitingWorker || applyingUpdate) return;

    setApplyingUpdate(true);
    let reloading = false;

    const reloadWithNewWorker = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker?.addEventListener('controllerchange', reloadWithNewWorker, { once: true });
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });

    // Safety fallback for browsers that activate the worker but delay the
    // controllerchange event until the page is reloaded.
    window.setTimeout(reloadWithNewWorker, 5000);
  };

  const dismissUpdate = () => {
    if (applyingUpdate) return;
    const deferredUntil = Date.now() + UPDATE_DEFER_MS;
    setUpdateDeferredUntil(deferredUntil);
    setUpdateRegistration(null);
    try {
      sessionStorage.setItem(UPDATE_DEFER_KEY, String(deferredUntil));
    } catch {
      // A short in-memory defer still applies when session storage is unavailable.
    }
  };

  if (!canOfferInstall && !canShowUpdate && !iosGuideOpen) return null;

  return (
    <>
      {canOfferInstall ? (
      <aside className={`pwa-install-card theme-${theme}`} aria-label="Install Otelex app">
        <div className="pwa-install-icon" aria-hidden="true">
          <i className="fas fa-mobile-screen-button" />
        </div>
        <div className="pwa-install-copy">
          <strong>Install Otelex</strong>
          <span>{ios ? 'Add Otelex to your Home Screen.' : 'Open Otelex like a desktop or mobile app.'}</span>
        </div>
        <button
          type="button"
          className="pwa-install-action"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? <span className="pwa-install-spinner" /> : <i className="fas fa-arrow-down-to-line" />}
          {installing ? 'Opening...' : 'Install'}
        </button>
        <button type="button" className="pwa-install-dismiss" onClick={dismiss} aria-label="Dismiss install prompt">
          <i className="fas fa-xmark" />
        </button>
      </aside>
      ) : null}

      <ConfirmModal
        open={iosGuideOpen}
        onClose={() => setIosGuideOpen(false)}
        onCancel={() => setIosGuideOpen(false)}
        onConfirm={() => setIosGuideOpen(false)}
        title="Install Otelex on iPhone or iPad"
        message="Safari installs web apps through the Share menu. Follow the steps below to add Otelex to your Home Screen."
        confirmText="Got it"
        cancelText="Not now"
        variant="primary"
        icon="fa-mobile-screen-button"
        extraContent={(
          <div className="pwa-ios-steps">
            <div><span>1</span><p>Tap the <strong>Share</strong> button in Safari.</p></div>
            <div><span>2</span><p>Choose <strong>Add to Home Screen</strong>.</p></div>
            <div><span>3</span><p>Tap <strong>Add</strong> to finish installing Otelex.</p></div>
          </div>
        )}
      />

      <ConfirmModal
        open={canShowUpdate}
        onClose={dismissUpdate}
        onCancel={dismissUpdate}
        onConfirm={handleApplyUpdate}
        title="Otelex update ready"
        message="A newer version of Otelex is ready. Refresh to load the latest fixes and improvements."
        confirmText="Refresh now"
        cancelText="Later"
        variant="info"
        icon="fa-arrows-rotate"
        loading={applyingUpdate}
        closeOnBackdrop={!applyingUpdate}
        extraContent={(
          <div className="pwa-update-note">
            <i className="fas fa-circle-info" aria-hidden="true" />
            <span>If you are editing a form, save it before refreshing. Unsaved form changes are not submitted automatically.</span>
          </div>
        )}
      />
    </>
  );
};

export default PwaInstallPrompt;

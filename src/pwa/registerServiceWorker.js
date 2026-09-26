const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
const MIN_UPDATE_CHECK_GAP = 60 * 1000;

const dispatchPwaEvent = (name, detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

const notifyUpdateAvailable = (registration) => {
  if (!registration?.waiting || !navigator.serviceWorker.controller) return;
  dispatchPwaEvent('otelex:pwa-update-available', { registration });
};

const watchInstallingWorker = (registration) => {
  const worker = registration?.installing;
  if (!worker) return;

  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      notifyUpdateAvailable(registration);
    }
  });
};

export const registerOtelexServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const serviceWorkerUrl = `${baseUrl}sw.js`;
      const registration = await navigator.serviceWorker.register(serviceWorkerUrl, {
        scope: baseUrl,
        updateViaCache: 'none',
      });

      let lastUpdateCheck = 0;
      const checkForUpdate = async ({ force = false } = {}) => {
        const now = Date.now();
        if (!force && now - lastUpdateCheck < MIN_UPDATE_CHECK_GAP) return;
        lastUpdateCheck = now;

        try {
          await registration.update();
          notifyUpdateAvailable(registration);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Otelex PWA update check failed.', error);
          }
        }
      };

      registration.addEventListener('updatefound', () => {
        watchInstallingWorker(registration);
      });

      // An update may already be waiting when the app starts (for example,
      // when the user previously chose "Later"). Surface it immediately.
      notifyUpdateAvailable(registration);

      const intervalId = window.setInterval(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          checkForUpdate();
        }
      }, UPDATE_CHECK_INTERVAL);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          checkForUpdate();
        }
      };

      const handleOnline = () => {
        checkForUpdate({ force: true });
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);

      // Keep cleanup available for hot-reload/dev environments without
      // changing production behaviour.
      if (import.meta.hot) {
        import.meta.hot.dispose(() => {
          window.clearInterval(intervalId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('online', handleOnline);
        });
      }

      dispatchPwaEvent('otelex:pwa-ready', { registration });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Otelex PWA service worker could not be registered.', error);
      }
    }
  }, { once: true });
};

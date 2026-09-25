const CHANNEL_NAME = 'otelex-auth-session';
const STORAGE_KEY = 'otelex:auth-session-event';
const TAB_ID = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let sharedChannel = null;

const getChannel = () => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!sharedChannel) sharedChannel = new BroadcastChannel(CHANNEL_NAME);
  return sharedChannel;
};

export const publishSessionEvent = (type, payload = {}) => {
  if (typeof window === 'undefined') return;

  const event = {
    type,
    payload,
    source: TAB_ID,
    at: Date.now(),
  };

  getChannel()?.postMessage(event);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Cross-tab synchronization is best-effort; authentication remains server-enforced.
  }
};

export const subscribeSessionEvents = (callback) => {
  if (typeof window === 'undefined' || typeof callback !== 'function') return () => {};

  const handleEvent = (event) => {
    if (!event || event.source === TAB_ID) return;
    callback(event);
  };

  const channel = getChannel();
  const channelHandler = (message) => handleEvent(message.data);
  channel?.addEventListener('message', channelHandler);

  const storageHandler = (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      handleEvent(JSON.parse(event.newValue));
    } catch {
      // Ignore malformed cross-tab events.
    }
  };

  window.addEventListener('storage', storageHandler);

  return () => {
    channel?.removeEventListener('message', channelHandler);
    window.removeEventListener('storage', storageHandler);
  };
};

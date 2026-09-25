import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import useAuthStore from '../stores/useAuthStore';
import ConfirmModal from './modals/ConfirmModal';
import { publishSessionEvent, subscribeSessionEvents } from '../utils/sessionSync';
import './SessionTimeoutManager.css';

const MIN_ACTIVITY_EVENT_GAP_MS = 1000;

const SessionTimeoutManager = () => {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const sessionPolicy = useAuthStore((state) => state.sessionPolicy);
  const logout = useAuthStore((state) => state.logout);
  const clearSession = useAuthStore((state) => state.clearSession);

  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const lastActivityRef = useRef(Date.now());
  const lastHeartbeatRef = useRef(0);
  const lastEventRef = useRef(0);
  const lastBroadcastRef = useRef(0);
  const heartbeatInFlightRef = useRef(false);
  const timeoutInFlightRef = useRef(false);
  const warningOpenRef = useRef(false);

  const idleSeconds = Math.max(60, Number(sessionPolicy?.idle_timeout_seconds) || 600);
  const warningSeconds = Math.max(15, Number(sessionPolicy?.idle_warning_seconds) || 60);
  const heartbeatSeconds = Math.max(30, Number(sessionPolicy?.heartbeat_interval_seconds) || 60);

  useEffect(() => {
    warningOpenRef.current = warningOpen;
  }, [warningOpen]);

  const sendHeartbeat = useCallback(async (force = false) => {
    if (status !== 'authenticated' || !user || heartbeatInFlightRef.current) return;

    const now = Date.now();
    if (!force && now - lastHeartbeatRef.current < heartbeatSeconds * 1000) return;

    heartbeatInFlightRef.current = true;
    try {
      await api.post('/auth/activity');
      lastHeartbeatRef.current = Date.now();
    } catch {
      // The API interceptor handles expired/revoked sessions centrally.
    } finally {
      heartbeatInFlightRef.current = false;
    }
  }, [heartbeatSeconds, status, user]);

  const recordActivity = useCallback((broadcast = true) => {
    if (status !== 'authenticated' || !user) return;

    const now = Date.now();
    if (now - lastEventRef.current < MIN_ACTIVITY_EVENT_GAP_MS) return;

    lastEventRef.current = now;
    lastActivityRef.current = now;
    timeoutInFlightRef.current = false;

    if (warningOpenRef.current) {
      setWarningOpen(false);
    }

    if (broadcast && now - lastBroadcastRef.current >= 5000) {
      lastBroadcastRef.current = now;
      publishSessionEvent('activity', { at: now });
    }

    void sendHeartbeat(false);
  }, [sendHeartbeat, status, user]);

  const handleTimeout = useCallback(async () => {
    if (timeoutInFlightRef.current) return;
    timeoutInFlightRef.current = true;
    setWarningOpen(false);
    await logout({
      reason: 'idle_timeout',
      message: `You were signed out after ${Math.max(1, Math.ceil(idleSeconds / 60))} minutes of inactivity.`,
    });
  }, [idleSeconds, logout]);

  const handleStaySignedIn = useCallback(async () => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastEventRef.current = now;
    timeoutInFlightRef.current = false;
    setWarningOpen(false);
    lastBroadcastRef.current = now;
    publishSessionEvent('activity', { at: now });
    await sendHeartbeat(true);
  }, [sendHeartbeat]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      setWarningOpen(false);
      timeoutInFlightRef.current = false;
      return undefined;
    }

    const now = Date.now();
    lastActivityRef.current = now;
    lastEventRef.current = 0;
    lastHeartbeatRef.current = 0;
    timeoutInFlightRef.current = false;
    void sendHeartbeat(true);

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    const activityHandler = () => recordActivity(true);

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, activityHandler, { passive: true });
    });

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') recordActivity(true);
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    const unsubscribe = subscribeSessionEvents((event) => {
      if (event.type === 'activity') {
        const eventAt = Number(event.payload?.at) || Date.now();
        lastActivityRef.current = Math.max(lastActivityRef.current, eventAt);
        timeoutInFlightRef.current = false;
        if (warningOpenRef.current) setWarningOpen(false);
      }

      if (event.type === 'signed_out') {
        clearSession({
          reason: event.payload?.reason || null,
          message: event.payload?.message || null,
          broadcast: false,
        });
      }
    });

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const secondsLeft = Math.max(0, idleSeconds - elapsedSeconds);

      if (secondsLeft <= 0) {
        void handleTimeout();
        return;
      }

      if (secondsLeft <= warningSeconds) {
        setRemainingSeconds(secondsLeft);
        setWarningOpen(true);
      } else if (warningOpenRef.current) {
        setWarningOpen(false);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, activityHandler);
      });
      document.removeEventListener('visibilitychange', visibilityHandler);
      unsubscribe();
    };
  }, [clearSession, handleTimeout, idleSeconds, recordActivity, sendHeartbeat, status, user, warningSeconds]);

  if (status !== 'authenticated' || !user) return null;

  return (
    <ConfirmModal
      open={warningOpen}
      onClose={() => {}}
      onCancel={() => logout()}
      onConfirm={handleStaySignedIn}
      title="Session expiring soon"
      message="You will be signed out automatically because there has been no activity."
      confirmText="Stay signed in"
      cancelText="Sign out"
      variant="warning"
      closeOnBackdrop={false}
      extraContent={(
        <div className="session-timeout-countdown" aria-live="polite">
          <span>{remainingSeconds}</span>
          <small>seconds remaining</small>
        </div>
      )}
    />
  );
};

export default SessionTimeoutManager;

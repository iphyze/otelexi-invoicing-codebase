import api from './api';

const authSessionService = {
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (sessionKey) => api.post('/auth/sessions/revoke', { session_key: sessionKey }),
  revokeOtherSessions: () => api.post('/auth/sessions/revoke-others'),

  getMfaStatus: () => api.get('/auth/mfa/status'),
  updateMfaOnboarding: (action) => api.post('/auth/mfa/onboarding', { action }),
  startMfaSetup: (action, currentPassword) => api.post('/auth/mfa/setup', {
    action,
    current_password: currentPassword,
  }),
  verifyMfaSetup: (action, mfaChallenge, code) => api.post('/auth/mfa/setup/verify', {
    action,
    mfa_challenge: mfaChallenge,
    code,
  }),
  resendMfaCode: (mfaChallenge) => api.post('/auth/mfa/resend', {
    mfa_challenge: mfaChallenge,
  }),
};

export default authSessionService;

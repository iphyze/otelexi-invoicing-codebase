import api from './api';

let cachedOptions = null;
let pendingRequest = null;

const mailService = {
  getProviderOptions: async ({ refresh = false } = {}) => {
    if (!refresh && cachedOptions) return cachedOptions;
    if (!refresh && pendingRequest) return pendingRequest;

    pendingRequest = api.get('/mail/providers')
      .then((response) => {
        cachedOptions = response.data?.data || null;
        return cachedOptions;
      })
      .finally(() => {
        pendingRequest = null;
      });

    return pendingRequest;
  },
  clearProviderOptionsCache: () => {
    cachedOptions = null;
  },
};

export default mailService;

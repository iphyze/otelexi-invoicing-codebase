import axios from 'axios';

const api = axios.create({
    baseURL: 'https://api.otelexi.com/otelex-server/api',
    // baseURL: 'http://localhost/otelex-server/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        // Read from Zustand's persist key, not a standalone 'token' key
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                const token = parsed?.state?.token;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch {
                // malformed storage — ignore
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
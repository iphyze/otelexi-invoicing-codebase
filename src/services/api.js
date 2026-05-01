import axios from 'axios';
// Import the store to access the logout function
import useAuthStore from '../stores/useAuthStore'; 

const api = axios.create({
    // baseURL: 'https://api.otelexi.com/otelex-server/api',
    baseURL: 'http://localhost/otelex-server/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor (Attaches token)
api.interceptors.request.use(
    (config) => {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                const token = parsed?.state?.token;
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (e) {
                // malformed storage — ignore
                console.error("Storage parse error", e);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// *** NEW: Response Interceptor (Handles Global 401 Errors) ***
api.interceptors.response.use(
    (response) => {
        // Any status code that lie within the range of 2xx cause this function to trigger
        return response;
    },
    (error) => {
        // Any status codes that falls outside the range of 2xx cause this function to trigger
        const originalRequest = error.config;

        // Check for 401 Unauthorized error (Invalid Signature, Expired, etc.)
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Optional: Prevent infinite loops if the login request itself fails
            originalRequest._retry = true; 

            // 1. Logout from Zustand (Clears token and localStorage)
            useAuthStore.getState().logout();

            // 2. Redirect to Login
            // We use window.location.href because this interceptor runs outside React components,
            // so we can't use useNavigate() directly.
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
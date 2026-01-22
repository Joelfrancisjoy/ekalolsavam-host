import axios from 'axios';
import authManager from '../utils/authManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Import auth debugger with fallback
let authDebugger = null;
try {
    authDebugger = require('../utils/authDebugger').default;
} catch (e) {
    // Fallback if modules not available
    authDebugger = {
        logApiCall: () => { },
        logTokenRefresh: () => { },
        logRedirect: () => { }
    };
}

// Helper function to safely call authDebugger methods
const safeLogApiCall = (url, status, error) => {
    try {
        if (authDebugger && typeof authDebugger.logApiCall === 'function') {
            authDebugger.logApiCall(url, status, error);
        }
    } catch (e) {
        // Ignore logging errors
    }
};

const safeLogTokenRefresh = (success, details) => {
    try {
        if (authDebugger && typeof authDebugger.logTokenRefresh === 'function') {
            authDebugger.logTokenRefresh(success, details);
        }
    } catch (e) {
        // Ignore logging errors
    }
};

const http = axios.create({
    baseURL: API_URL,
});

// Track if we're currently refreshing to avoid multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Add a request interceptor to include the auth token
http.interceptors.request.use(
    (config) => {
        const tokens = authManager.getTokens();
        if (tokens.access) {
            config.headers.Authorization = `Bearer ${tokens.access}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle auth errors with refresh
http.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Enhanced logging for debugging
        console.log('HTTP Error intercepted:', {
            status: error.response?.status,
            url: originalRequest?.url,
            method: originalRequest?.method,
            hasResponse: !!error.response,
            message: error.message
        });

        // Log API call for debugging
        safeLogApiCall(originalRequest?.url, error.response?.status, error);

        // Check if this is a network error (no response) - don't redirect for network issues
        if (!error.response) {
            console.warn('Network error detected, not redirecting to login:', error.message);
            return Promise.reject(error);
        }

        // Only handle 401 errors for authentication, and avoid certain endpoints
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Don't redirect for certain endpoints that are expected to fail
            const url = originalRequest?.url || '';
            const isCurrentUserEndpoint = url.includes('/api/auth/current/');
            const isHealthCheck = url.includes('/api/health/');

            if (isHealthCheck) {
                console.log('Health check failed, not redirecting');
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If we're already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return http.request(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const tokens = authManager.getTokens();
            if (tokens.refresh) {
                try {
                    console.log('Attempting token refresh for URL:', url);
                    safeLogTokenRefresh(false, 'attempting');
                    const res = await axios.post(`${API_URL}/api/token/refresh/`, { refresh: tokens.refresh });
                    const newAccess = res.data?.access;

                    if (newAccess) {
                        console.log('Token refresh successful');
                        safeLogTokenRefresh(true);
                        authManager.setTokens(newAccess, tokens.refresh);
                        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                        processQueue(null, newAccess);
                        isRefreshing = false;
                        return http.request(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);
                    safeLogTokenRefresh(false, refreshError);
                    processQueue(refreshError, null);
                    isRefreshing = false;

                    // Only redirect if refresh explicitly failed with 401/403
                    // AND it's not the current user endpoint (which is expected to fail initially)
                    if ((refreshError.response?.status === 401 || refreshError.response?.status === 403) && !isCurrentUserEndpoint) {
                        console.log('Refresh token invalid, using auth manager to redirect');
                        authManager.redirectToLogin('refresh token invalid');
                    } else {
                        console.log('Not redirecting for current user endpoint or other error');
                    }
                    return Promise.reject(refreshError);
                }
            } else {
                console.log('No refresh token available');
                isRefreshing = false;

                // Only redirect if we're not already on login page and it's not a current user check
                if (!isCurrentUserEndpoint && window.location.pathname !== '/login') {
                    console.log('No refresh token, using auth manager to redirect');
                    authManager.redirectToLogin('no refresh token');
                }
            }
        }

        return Promise.reject(error);
    }
);

export default http;

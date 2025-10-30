import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const axiosInstance = axios.create({
    baseURL: API_URL,
});

// Flag to prevent multiple refresh attempts
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

// Request interceptor to add token to headers
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refresh_token');

            if (!refreshToken) {
                // No refresh token, redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                // Try to refresh the token
                const response = await axios.post(`${API_URL}/api/token/refresh/`, {
                    refresh: refreshToken
                });

                const { access, refresh } = response.data;

                // Store new tokens
                localStorage.setItem('access_token', access);
                if (refresh) {
                    // If server sends new refresh token (rotation enabled)
                    localStorage.setItem('refresh_token', refresh);
                }

                // Update the original request with new token
                originalRequest.headers['Authorization'] = `Bearer ${access}`;

                // Process queued requests
                processQueue(null, access);

                isRefreshing = false;

                // Retry the original request
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                processQueue(refreshError, null);
                isRefreshing = false;

                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;

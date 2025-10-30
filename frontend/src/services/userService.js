import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
            error.config._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh: refreshToken });
                    const newToken = response.data.access;
                    localStorage.setItem('access_token', newToken);
                    error.config.headers.Authorization = `Bearer ${newToken}`;
                    return api.request(error.config);
                } catch (_) {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            } else {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const userService = {
    login: async (username, password) => {
        const res = await api.post('/api/auth/login/', { username, password });
        return res.data;
    },

    register: async (data) => {
        const isFormData = (typeof FormData !== 'undefined') && (data instanceof FormData);
        const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' };
        const payload = isFormData ? data : (data || {});
        const res = await api.post('/api/auth/register/', payload, { headers });
        return res.data;
    },

    googleAuth: async (token) => {
        const res = await api.post('/api/auth/google/', { token });
        return res.data;
    },

    list: async (params = {}) => {
        const res = await api.get('/api/auth/users/', { params });
        return res.data;
    },
    update: async (id, data) => {
        const res = await api.patch(`/api/auth/users/${id}/`, data);
        return res.data;
    },
    remove: async (id) => {
        const res = await api.delete(`/api/auth/users/${id}/`);
        return res.data;
    },
    acceptPendingPassword: async () => {
        const res = await api.post('/api/auth/password/accept-pending/');
        return res.data;
    },
    setNewPassword: async (newPassword) => {
        const res = await api.post('/api/auth/password/set-new/', { new_password: newPassword });
        return res.data;
    },
};

export default userService;
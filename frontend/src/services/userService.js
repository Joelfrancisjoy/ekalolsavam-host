import http from './http-common';
import authManager from '../utils/authManager';

export const userService = {
    login: async (username, password) => {
        const res = await http.post('/api/auth/login/', { username, password });
        return res.data;
    },

    register: async (data) => {
        const isFormData = (typeof FormData !== 'undefined') && (data instanceof FormData);
        const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' };
        const payload = isFormData ? data : (data || {});
        const res = await http.post('/api/auth/register/', payload, { headers });
        return res.data;
    },

    googleAuth: async (token) => {
        const res = await http.post('/api/auth/google/', { token });
        return res.data;
    },

    list: async (params = {}) => {
        const res = await http.get('/api/auth/users/', { params });
        return res.data;
    },
    update: async (id, data) => {
        const res = await http.patch(`/api/auth/users/${id}/`, data);
        return res.data;
    },
    remove: async (id) => {
        const res = await http.delete(`/api/auth/users/${id}/`);
        return res.data;
    },
    acceptPendingPassword: async () => {
        const res = await http.post('/api/auth/password/accept-pending/');
        return res.data;
    },
    setNewPassword: async (newPassword) => {
        const res = await http.post('/api/auth/password/set-new/', { new_password: newPassword });
        return res.data;
    },
};

export default userService;
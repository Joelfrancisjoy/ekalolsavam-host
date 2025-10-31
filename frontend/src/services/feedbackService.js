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

const feedbackService = {
    // Submit feedback with sentiment analysis
    submitFeedback: async (feedbackData) => {
        const res = await api.post('/api/feedback/submit/', feedbackData);
        return res.data;
    },
    
    // Get all feedback (admin only)
    listFeedback: async (params = {}) => {
        const res = await api.get('/api/feedback/admin/list/', { params });
        return res.data;
    },
    
    // Get feedback analytics summary (admin only)
    getFeedbackAnalytics: async () => {
        const res = await api.get('/api/feedback/admin/summary/');
        return res.data;
    },
};

export default feedbackService;

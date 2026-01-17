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
        if (error.response?.status === 401) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh: refreshToken });
                    const newToken = response.data.access;
                    localStorage.setItem('access_token', newToken);
                    error.config.headers.Authorization = `Bearer ${newToken}`;
                    return api.request(error.config);
                } catch (refreshError) {
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

const resultService = {
    // List published results (optionally by event)
    list: async (params = {}) => {
        const res = await api.get('/api/scores/results/', { params });
        return res.data;
    },
    // For judges to see published results for their events
    listForJudge: async () => {
        const res = await api.get('/api/scores/judge-results/');
        return res.data;
    },
    // Student re-check workflow
    getResultDetails: async (resultId) => {
        const res = await api.get(`/api/scores/student/results/${resultId}/`);
        return res.data;
    },
    submitRecheckRequest: async (resultId, reason = '') => {
        const res = await api.post('/api/scores/student/result-recheck/', {
            result: resultId,
            reason: reason,
        });
        return res.data;
    },

    // Student accepted re-check details + payment
    getAcceptedRecheckDetails: async (recheckRequestId) => {
        const res = await api.get(`/api/scores/student/recheck-request/${recheckRequestId}/`);
        return res.data;
    },
    payForAcceptedRecheck: async (recheckRequestId) => {
        const res = await api.post(`/api/scores/student/recheck-request/${recheckRequestId}/pay/`);
        return res.data;
    },

    // Judge re-check workflow
    getJudgeRecheckRequests: async () => {
        const res = await api.get('/api/scores/judge/recheck-requests/');
        return res.data;
    },
};

export default resultService;
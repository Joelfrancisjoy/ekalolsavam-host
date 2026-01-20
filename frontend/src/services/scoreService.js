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

const scoreService = {
    submitBundle: async ({ eventId, participantId, items }) => {
        const res = await api.post('/api/scores/submit/', {
            eventId,
            participantId,
            items,
        });
        return res.data;
    },
    listMyScores: async () => {
        const res = await api.get('/api/scores/');
        return res.data;
    },
    getSummary: async (eventId) => {
        const res = await api.get('/api/scores/summary/', { params: { event: eventId } });
        return res.data;
    },
    getEventCriteria: async (eventId) => {
        const res = await api.get('/api/scores/criteria/', { params: { event: eventId } });
        return res.data;
    },
    // Student scores with feedback
    getStudentScores: async () => {
        const res = await api.get('/api/scores/student/');
        return res.data;
    },
    // Student re-check workflow endpoints
    getResultDetails: async (resultId) => {
        const res = await api.get(`/api/scores/student/results/${resultId}/`);
        return res.data;
    },
    submitRecheckRequest: async (resultId) => {
        const res = await api.post('/api/scores/student/result-recheck/', {
            result: resultId
        });
        return res.data;
    },
    // Anomaly endpoints
    getEventAnomalies: async () => {
        const res = await api.get('/api/scores/event-anomalies/');
        return res.data;
    },
    getFlaggedScores: async (params = {}) => {
        const res = await api.get('/api/scores/flagged/', { params });
        return res.data;
    },
    reviewFlaggedScore: async (scoreId, approved, notes) => {
        const res = await api.post(`/api/scores/flagged/${scoreId}/review/`, {
            approved,
            notes
        });
        return res.data;
    },
};

export default scoreService;





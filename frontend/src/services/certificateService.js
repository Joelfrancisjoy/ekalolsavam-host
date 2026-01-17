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

const certificateService = {
    list: async () => {
        const res = await api.get('/api/certificates/');
        return res.data;
    },
    generate: async ({ participant, event, school_name, district_name, category, certificate_type, prize }) => {
        const res = await api.post('/api/certificates/generate/', {
            participant,
            event,
            school_name,
            district_name,
            category,
            certificate_type,
            prize
        });
        return res.data;
    },
    downloadPdfUrl: (certificateId) => `${API_BASE_URL}/api/certificates/download/${certificateId}/`,
};

export default certificateService;
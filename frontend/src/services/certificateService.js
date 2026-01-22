import http from './http-common';
import authManager from '../utils/authManager';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const certificateService = {
    list: async () => {
        const res = await http.get('/api/certificates/');
        return res.data;
    },
    generate: async ({ participant, event, school_name, district_name, category, certificate_type, prize }) => {
        const res = await http.post('/api/certificates/generate/', {
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
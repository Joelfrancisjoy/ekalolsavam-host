import http from './http-common';
import authManager from '../utils/authManager';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const scoreService = {
    submitBundle: async ({ eventId, participantId, items }) => {
        const res = await http.post('/api/scores/submit/', {
            eventId,
            participantId,
            items,
        });
        return res.data;
    },
    listMyScores: async () => {
        const res = await http.get('/api/scores/');
        return res.data;
    },
    getSummary: async (eventId) => {
        const res = await http.get('/api/scores/summary/', { params: { event: eventId } });
        return res.data;
    },
    getEventCriteria: async (eventId) => {
        const res = await http.get('/api/scores/criteria/', { params: { event: eventId } });
        return res.data;
    },
    // Student scores with feedback
    getStudentScores: async () => {
        const res = await http.get('/api/scores/student/');
        return res.data;
    },
    // Student re-check workflow endpoints
    getResultDetails: async (resultId) => {
        const res = await http.get(`/api/scores/student/results/${resultId}/`);
        return res.data;
    },
    submitRecheckRequest: async (resultId) => {
        const res = await http.post('/api/scores/student/result-recheck/', {
            result: resultId
        });
        return res.data;
    },
    // Anomaly endpoints
    getEventAnomalies: async () => {
        const res = await http.get('/api/scores/event-anomalies/');
        return res.data;
    },
    getFlaggedScores: async (params = {}) => {
        const res = await http.get('/api/scores/flagged/', { params });
        return res.data;
    },
    reviewFlaggedScore: async (scoreId, approved, notes) => {
        const res = await http.post(`/api/scores/flagged/${scoreId}/review/`, {
            approved,
            notes
        });
        return res.data;
    },
};

export default scoreService;





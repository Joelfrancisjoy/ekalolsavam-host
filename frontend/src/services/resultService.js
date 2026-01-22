import http from './http-common';
import authManager from '../utils/authManager';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const resultService = {
    // List published results (optionally by event)
    list: async (params = {}) => {
        const res = await http.get('/api/scores/results/', { params });
        return res.data;
    },
    // For judges to see published results for their events
    listForJudge: async () => {
        const res = await http.get('/api/scores/judge-results/');
        return res.data;
    },
    // Student re-check workflow
    getResultDetails: async (resultId) => {
        const res = await http.get(`/api/scores/student/results/${resultId}/`);
        return res.data;
    },
    submitRecheckRequest: async (resultId, reason = '') => {
        const res = await http.post('/api/scores/student/result-recheck/', {
            result: resultId,
            reason: reason,
        });
        return res.data;
    },

    // Student accepted re-check details + payment
    getAcceptedRecheckDetails: async (recheckRequestId) => {
        const res = await http.get(`/api/scores/student/recheck-request/${recheckRequestId}/`);
        return res.data;
    },
    payForAcceptedRecheck: async (recheckRequestId) => {
        const res = await http.post(`/api/scores/student/recheck-request/${recheckRequestId}/pay/`);
        return res.data;
    },

    // Judge re-check workflow
    getJudgeRecheckRequests: async () => {
        const res = await http.get('/api/scores/judge/recheck-requests/');
        return res.data;
    },
};

export default resultService;
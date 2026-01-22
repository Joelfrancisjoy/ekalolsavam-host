import http from './http-common';
import authManager from '../utils/authManager';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const feedbackService = {
    // Submit feedback with sentiment analysis
    submitFeedback: async (feedbackData) => {
        const res = await http.post('/api/feedback/submit/', feedbackData);
        return res.data;
    },
    
    // Get all feedback (admin only)
    listFeedback: async (params = {}) => {
        const res = await http.get('/api/feedback/admin/list/', { params });
        return res.data;
    },
    
    // Get feedback analytics summary (admin only)
    getFeedbackAnalytics: async () => {
        const res = await http.get('/api/feedback/admin/summary/');
        return res.data;
    },
};

export default feedbackService;

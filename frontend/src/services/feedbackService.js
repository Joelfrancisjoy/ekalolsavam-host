import http from './http-common';
import { API_ROUTES } from './apiRoutes';

const feedbackService = {
    // Submit feedback with sentiment analysis
    submitFeedback: async (feedbackData) => {
        const res = await http.post(API_ROUTES.feedback.create, feedbackData);
        return res.data;
    },

    // Get all feedback (admin only)
    listFeedback: async (params = {}) => {
        const res = await http.get(API_ROUTES.feedback.adminList, { params });
        return res.data;
    },

    // Get feedback analytics summary (admin only)
    getFeedbackAnalytics: async () => {
        const res = await http.get(API_ROUTES.feedback.analytics);
        return res.data;
    },
};

export default feedbackService;
